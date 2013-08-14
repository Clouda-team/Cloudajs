var sumeru = require(__dirname + '/../src/newPkg.js')();
require(__dirname + '/../src/log.js')(sumeru);

module.exports = function(directory, dstDir){
    if (!dstDir){
        dstDir = directory;
    }

    var fs = require('fs');
    var path = require('path');

    //先当作绝对路径处理， 如果该路径不存在， 再当相对路径处理。
    var baseDir = path.join(directory,'config');//__dirname + '/../../config';

    var header = "var runnable = function(sumeru){";
    var tail = "};if(typeof module!=\'undefined\' && typeof exports != \'undefined\'){module.exports = runnable;}"
    var tmpPath = path.join(dstDir, 'server/tmp');
    var tmpConfigPath = path.join(tmpPath, '/config');

    if(!fs.existsSync(tmpPath)){
	   fs.mkdirSync(tmpPath)
    }


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



    if (fs.existsSync(tmpConfigPath)){

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
    		    if (isFwFile(filename)){
    		        fs.unlinkSync(filename);
    		    }
    		}
    	    }
    	    //fs.rmdirSync(dir);
    	};
    	rmdir(tmpConfigPath);	
    }
    
    if(!fs.existsSync(tmpConfigPath)){
	   fs.mkdirSync(tmpConfigPath);
    }




    var buildConfig = function(dir){
    	var list = fs.readdirSync(dir);
    	for(var i = 0; i < list.length; i++) {
    	    var filename = path.join(dir, list[i]);
    	    if (!isFwFile(filename)){
    		continue;
    	    }
    	    var stat = fs.statSync(filename);
    	    if(filename == "." || filename == "..") {
    		// pass these files
    	    } else if(stat.isDirectory()) {
    		
    		  buildConfig(filename);
    	    } else {
    	        
    	        var dstPath = path.join(tmpConfigPath, path.basename(filename)); 
        		if ((path.extname(filename) ==  '.js') && (path.basename(filename)) !== 'package.js'){		            
        		    var content = fs.readFileSync(filename);    
        		    fs.writeFileSync(dstPath , header + content + tail, 'utf8');
        		}else{
        		    var content = fs.readFileSync(filename);
    	    	    fs.writeFileSync(dstPath , content, 'utf8');
        
        		}
    	    }
    	}
    	
        sumeru.dev('build config done');
    }

    buildConfig(baseDir);
}

