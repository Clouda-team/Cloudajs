var fs = require('fs');
var path = require('path');
var shell = require('shelljs');

var buildDir = __dirname + '/../bin';
var deployDir = __dirname + '/../deploy';
var buildAppContent = ''; 
var buildAppCssContent = '';
var offline_manifest = __dirname + '/../bin/cache.manifest';

!fs.existsSync(buildDir) && fs.mkdirSync(buildDir);
!fs.existsSync(deployDir) && fs.mkdirSync(deployDir);

var readPackage = function(path){
    var url = path + '/package.js';
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
            buildAppContent += ';'+fs.readFileSync(fileUrl, 'utf-8');
        }else if(cssReg.test(dirname)){
            buildAppCssContent += fs.readFileSync(fileUrl, 'utf-8');
        }else{
            readPackage(fileUrl);
        }
    });
}
readPackage(__dirname + '/../');
fs.writeFileSync(buildDir + '/app.js', buildAppContent);
fs.writeFileSync(buildDir + '/app.css', buildAppCssContent);

//build sumeru
require(__dirname + '/../../../sumeru/build/build.js');

shell.cp('-r', __dirname + '/../../../sumeru/bin/sumeru.js', buildDir);
shell.cp('-r', __dirname + '/../../../sumeru/bin/sumeru.css', buildDir);

//build deploy
shell.cp('-r', buildDir + '/sumeru.js', deployDir);
shell.cp('-r', buildDir + '/sumeru.css', deployDir);
shell.cp('-r', buildDir + '/app.js', deployDir);
shell.cp('-r', __dirname + '/../view', deployDir);
shell.cp('-r', __dirname + '/../index.html', deployDir);




//build manifest file
var first_line_str = 'CACHE MANIFEST \n#version:'+Date.now() + '\n';
var cache_title = 'CACHE:\n';

//扫描view目录并列入缓存清单
var baseViewDir = __dirname + '/../view';
var allFiles = [];
var cacheViewStr = '';
var readAllFileInView = function(bsvdir, httpBase){
    if(path.existsSync(bsvdir)){
        var theDirFiles = fs.readdirSync(bsvdir);
        if(theDirFiles && theDirFiles.length > 0){
            for(var i=0; i < theDirFiles.length; i++){
                if(theDirFiles[i].indexOf('.') > -1){
                    allFiles.push(httpBase + '/' + theDirFiles[i]);
                }else{
                    readAllFileInView(bsvdir + '/' + theDirFiles[i], httpBase + '/' + theDirFiles[i]);
                }
            }
        }
    }
};
readAllFileInView(baseViewDir,  '../view');
allFiles.forEach(function(cfile){
    cacheViewStr += cfile + '\n';
});

var cache_res_list = '../index.html\nsumeru.css\n';
    cache_res_list += 'sumeru.js\n';
    cache_res_list += cacheViewStr;

var network_title = 'NETWORK:\n';
var network_res_list = '*'

var cache_content_str = first_line_str + cache_title + cache_res_list + network_title + network_res_list;
if(fs.existsSync(offline_manifest)){
    fs.unlinkSync(offline_manifest);
}
fs.writeFileSync(offline_manifest, cache_content_str, 'utf8');