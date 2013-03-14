var path = require('path');
var fs = require('fs');
var build, buildList;

baseDir = path.join(__dirname, '/../');

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
   console.log('NONE BAE MODE');
   
    dstDir = baseDir;
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
for (var i = 0; i< buildList.length; i++){
    console.log('Building '+buildList[i].name);
    require(path.join(baseDir, buildList[i].path))(baseDir, dstDir);
}


    //console.log(tmpDir + ' \n '+ binDir);    
