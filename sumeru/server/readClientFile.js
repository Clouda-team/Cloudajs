var vm = require("vm");
var fs = require("fs");

var runnable = function(path, context) {
  var data = fs.readFileSync(path);
  if (!context)context ={};
  context.console=console;
  vm.runInNewContext(data, context, path);
}
var evalByPackageJS = function(path,context,filename){
	var url = (typeof filename =='undefined')?(path + '/package.js'):(path +"/"+filename);

    if (!fs.existsSync(url)) {
        return;
    };
    var entireContent = fs.readFileSync(url, 'utf-8');
    var contentReg = /packages\s*\(\s*(.*)\s*\)/mg;
    var dirnameList = [];
    
    //去掉换行符、换页符、回车符等
    entireContent = entireContent.replace(/\n|\r|\t|\v|\f/g, '');
    
    //取出参数， 存于dirnameList
    var result = contentReg.exec(entireContent);
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