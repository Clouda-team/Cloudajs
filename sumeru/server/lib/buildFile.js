/**
 * build file
 */

var fs = require('fs');
var path = require('path');
var fw = require(__dirname + '/../../src/newPkg.js')();


//遍历删除一个目录中的所有内容
var rmdir = function(dir) {
    var list = fs.readdirSync(dir);
    for(var i = 0; i < list.length; i++) {
        var filename = path.join(dir, list[i]);
        var stat = fs.statSync(filename);

        if(filename == "." || filename == "..") {
            // pass these files
        } else if(stat.isDirectory()) {
            // rmdir recursively
            rmdir(filename);
        } else {
            // rm fiilename
            fs.unlinkSync(filename);
        }
    }
    fs.rmdirSync(dir);
};

//读取所有文件内容，并保存在字符串中
//遍历删除一个目录中的所有内容
var readfile = function(dir) {
    var cnt = '';
    var list = fs.readdirSync(dir);
    for(var i = 0; i < list.length; i++) {
	    if(list[i].indexOf('package') === -1){
			var filename = path.join(dir, list[i]);
			var stat = fs.statSync(filename);

			if(filename == "." || filename == "..") {
				// pass these files
			} else if(stat.isDirectory()) {
				// read dir recursively
				cnt += readfile(filename);
			} else {
				// read file
				cnt += fs.readFileSync(filename, 'utf8');
			}
		}
    }
    
    return cnt;
};

module.exports = {
    rmdir : rmdir,
    readfile : readfile
}