var vm = require("vm");
var fs = require("fs");

var runnable = function(path, context) {
  var data = fs.readFileSync(path);
  if (!context)context ={};
  context.console=console;
  vm.runInNewContext(data, context, path);
}
var _getFilePackageByPath = function(path,filename){
	if (typeof filename !='undefined'){
		if (fs.existsSync(path +'/'+ filename)) {//首先判断filename是否存在
			return (path +'/'+ filename);
		}
	}
	//不存在则退化到执行package.js
	return fs.existsSync(path + '/package.js')?(path + '/package.js'):false;
	
}
var evalByPackageJS = function(path,context,filename){
	var url = _getFilePackageByPath(path,filename);
	if (!url){
		return ;
	}
	var entireContent = fs.readFileSync(url, 'utf-8');
    var contentReg = /packages\s*\(\s*(.*)\s*\)/mg;
    var commentReg = /\/\/.*(\n|\r)|(\/\*(.*?)\*\/)/mg;
    var dirnameList = [];
         
    //去掉在package.js里的注释
    entireContent = entireContent.replace(commentReg, '');  

    //去掉换行符、换页符、回车符等
    entireContent = entireContent.replace(/\n|\r|\t|\v|\f/g, '');
    
    //取出参数， 存于dirnameList
    var result = contentReg.exec(entireContent);
    if (result === null) {
        return;
    }
    entireContent = result[1];
    entireContent = entireContent.replace(/'|"/mg, '');
    dirnameList = entireContent.split(',');
    
    dirnameList.forEach(function(dirname){
        dirname = dirname.trim();
        if(!dirname)return;
        
        var reg = /.js$/g,
            cssReg = /.css$/g;
        
        var fileUrl = path + '/' + dirname;
        if(reg.test(dirname)){
            //eval(fs.readFileSync(fileUrl, 'utf-8'));
            runnable(fileUrl,context);
        }else if(cssReg.test(dirname)){
            
        }else{
            evalByPackageJS(fileUrl,context,filename);
        }
    });
}

runnable.evalByPackageJS = evalByPackageJS;

module.exports = runnable;