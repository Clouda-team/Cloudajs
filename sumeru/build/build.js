var path = require('path');
var fs = require('fs');
var build, buildList;

var baseDir = path.join(__dirname, '../../');
var sumeruDir = path.join(__dirname, '/../');

/**BAE环境模拟测试用**/
//process.BAE = 'bae';
/*******************/

if (typeof process.BAE !== 'undefined'){
    dstDir = path.join(baseDir, '/__bae__');
console.log('BAE MODE');
    var serverDir = path.join(dstDir, '/server');
    var binDir = path.join(dstDir, '/bin');
    var tmpDir = path.join(serverDir, '/tmp');
    var staticDir = path.join(dstDir,'/static');

    if (!fs.existsSync(dstDir)){
    	fs.mkdirSync(dstDir);
    };
    if (!fs.existsSync(serverDir)){
    	fs.mkdirSync(serverDir);
    };
    if (!fs.existsSync(tmpDir)){
    	fs.mkdirSync(tmpDir);
    };
    if (!fs.existsSync(binDir)){
    	fs.mkdirSync(binDir);
    }
    if (!fs.existsSync(staticDir)){
    	fs.mkdirSync(staticDir);
    }
}else{
console.log('NON BAE MODE');
    dstDir = sumeruDir;
}
console.log('BaseDir :' + baseDir);
console.log('DstDir :' + dstDir);

process.baseDir = baseDir;
process.dstDir = dstDir;

var buildListPath = path.join(__dirname,'/buildList.json');	
if(!fs.existsSync(buildListPath)){
     return;
}

build = require(buildListPath);		
buildList = build.buildList; 

if (typeof buildList == 'undefined' || buildList.length <= 0){
    console.log('Error: read buildList.json, build failed');
    return;
}


if (baseDir.charAt(baseDir.length-1) == '/'){
    //去掉尾部的'/'
    baseDir = baseDir.slice(0,baseDir.length - 1);
}

var buildDir  = __dirname + '/';
for (var i = 0; i< buildList.length; i++){
    require(path.join(buildDir, buildList[i].path))(sumeruDir, dstDir);
}


//build Apps
var shell = require('shelljs');

//build app resource
var manifestFileName = 'cache.manifest';
var buildAppResource = function(appDir, binDir){
    var buildAppContent = '';
    var buildAppCssContent = '';

    function readPackage(path){
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
    };
    readPackage(appDir);
    fs.writeFileSync(binDir + '/app.js', buildAppContent, 'utf-8');
    fs.writeFileSync(binDir + '/app.css', buildAppCssContent, 'utf-8');
};


var buildManifest = function(appDir, binDir){
    var first_line_str = 'CACHE MANIFEST \n#version:'+Date.now() + '\n';
    var cache_title = 'CACHE:\n';
    

    //扫描view目录并列入缓存清单
    var baseViewDir = path.join(appDir, 'view');
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
    readAllFileInView(baseViewDir,  'view');

    var cdir = build.cacheDirectory;
    if(cdir){
        var appDir = path.join(baseDir, 'app');
        cdir.forEach(function(dir){
            var pt = path.join(appDir, dir);
            if(fs.existsSync(pt)){
                 readAllFileInView(pt, dir);
            }
        });
    }

    allFiles.forEach(function(cfile){
        cacheViewStr += cfile + '\n';
    });

    var cache_res_list = '../index.html\nsumeru.css\n';
    cache_res_list += 'sumeru.js\n';
    cache_res_list += cacheViewStr;

    var network_title = 'NETWORK:\n';
    var network_res_list = '*'
    
    var offline_manifest = binDir + '/cache.manifest';
    var cache_content_str = first_line_str + cache_title + cache_res_list + network_title + network_res_list;
    if(fs.existsSync(offline_manifest)){
        fs.unlinkSync(offline_manifest);
    }

    fs.writeFileSync(offline_manifest, cache_content_str, 'utf-8');
};

var copySumeruFile2AppBin = function(){
    var appDir = path.join(baseDir, 'app');
    var apps = fs.readdirSync(appDir);
    
    apps = [''].concat(apps);

    apps.forEach(function(dir){
        if(dir && dir.indexOf('.') > -1) return;

        var dir = path.join(appDir, dir);
        var binDir = path.join(dir, 'bin');

        if(fs.existsSync(path.join(dir, 'package.js')) &&
            fs.existsSync(path.join(dir, 'view'))){

            if(!fs.existsSync(binDir)){
                fs.mkdirSync(binDir);
            }
            shell.cp('-rf', path.join(sumeruDir, 'bin/sumeru.js'), binDir);
            shell.cp('-rf', path.join(sumeruDir, 'bin/sumeru.css'), binDir);
            buildAppResource(dir, binDir);
        }
    });

    
    buildManifest(appDir, path.join(dstDir, 'bin'));
}
copySumeruFile2AppBin();








