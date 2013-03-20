process.BAE = 'bae';
var path = require('path');
var fs = require('fs');
//判断build的文件是否是fw本身的文件
    var isFwFile = function(filename){
	
	var name = path.basename(filename);
	var ext = path.extname(filename);

	if (('.svn' === name) || ('.git' === name)){
	    return false;
	}

	var stat = fs.statSync(filename);
	if (stat.isDirectory()){
	    return true;
	}

	if (('.js'!== ext) && ('.json' !== ext) && ('.html' !== ext) && ('.css' !== ext)){
	    return false;
	}
	return true;//check ok
    }

//遍历删除一个目录中的所有内容,保留文件夹
var rmdir = function(dir) {
    var list = fs.readdirSync(dir);
    for(var i = 0; i < list.length; i++) {
        var filename = path.join(dir, list[i]);
        var stat = fs.statSync(filename);

        if(filename == "." || filename == "..") {
	    // pass these files
        } else if(stat.isDirectory()) {
	    rmdir(filename);
        } else {
	    // rm fiilename
	    if (isFwFile(filename)){
		fs.unlinkSync(filename);
	    }
        }
    }
//    fs.rmdirSync(dir);
};

//删除某个文件夹，包括文件下面的所有文件和它本身
var rmdirx = function(dir) {
    var list = fs.readdirSync(dir);
    for(var i = 0; i < list.length; i++) {
        var filename = path.join(dir, list[i]);
        var stat = fs.statSync(filename);

        if(filename == "." || filename == "..") {
	    // pass these files
        } else if(stat.isDirectory()) {
	    // rmdir recursively
	    rmdirx(filename);
        } else {
	    // rm fiilename
		fs.unlinkSync(filename);
        }
    }
    fs.rmdirSync(dir);
};


var basedir = path.join(__dirname, '../../');
console.log('Home Dir =' +  basedir);

require('./build.js');
setTimeout(function(){
	rmdir(path.join(basedir, '__bae__'));
	if (fs.existsSync(path.join(basedir,'__bae__/bin/cache.manifest')))
	{
 		fs.unlinkSync(path.join(basedir,'__bae__/bin/cache.manifest'));	
	}
},4000);

var hiUpload = path.join(basedir,'__bae__/static/hiUpload');
console.log(hiUpload);
if (!fs.existsSync(hiUpload)){
    fs.mkdirSync(hiUpload);
};
var head = path.join(hiUpload,'head');
if (!fs.existsSync(head)){
    fs.mkdirSync(head);
};
var cface = path.join(hiUpload,'cface');
if (!fs.existsSync(cface)){
    fs.mkdirSync(cface);
};




