(function(W){
    var sumeru = {};
    if (typeof module === 'undefined' || typeof exports === 'undefined'){
    	sumeru.packages = (function(){
    	    var currentBaseDir = null;
    	    var _loadScript = function(options){
    		    var xhr = new window.XMLHttpRequest();
    			var error = false;
    			xhr.onreadystatechange = function(){
    			   if (xhr.readyState == 4) {
    					if (xhr.status >= 200 && xhr.status < 300 && !error) {
    						options.callback(xhr.responseText);
    					} else {
    						console.error('请求 ' + options.url + ' 失败');
    					}
    				}
    			};
    			
    			try{
    				xhr.open('GET', options.url, false);
    				xhr.send(null);
    			}catch(e){
    				error = true;
    				console.log('error:' + options.url);
    			}
    		};
    		
    		var getBaseDir = function(){
    		    //if(currentBaseDir)return currentBaseDir;
    			
    		    var scripts = document.getElementsByTagName('script');
    			var len = scripts.length;
    			
    			for(var i=0, s, l, src; i < len; i++ ){
    			    s = scripts[i];
    				l = 'package.js'.length;
    				src = s.src;
    				
    				if(src.slice(-l) === 'package.js'){
    				    s.parentNode.removeChild(s);
    				    return src.slice(0, src.lastIndexOf('/'));
    				}
    			}
    			return (currentBaseDir || null);
    		}
    	    
    	    return function(){
    		    if(arguments.length === 0)return;
    			
    			var baseDir = getBaseDir();
    			var directorys = [];
    			var args = Array.prototype.slice.call(arguments, 0);
    			
    			args.forEach(function(dirname, index){
    			    //var reg = /.css$|.js$/g;
    				if(dirname && dirname.indexOf('.js') > -1){
    				    var url = baseDir + '/' + dirname;// + '?'+Date.now();
    				    document.write('<script src="'+ url +'"></script>');
    				}else if(dirname && dirname.indexOf('.css') > -1){
                        var url = baseDir + '/' + dirname;// + '?'+Date.now();
                        document.write('<link rel="stylesheet" href="' + url + '" />');
    				} else{
    				    directorys.push(dirname);
    				}
    			});
    			
    			directorys.forEach(function(dirname){
    			    var callback = function(content){
    				    eval(content);
    				}
    				currentBaseDir = baseDir + '/' + dirname;
    			    _loadScript({url : currentBaseDir + '/package.js', callback : callback});
    			});
    	    }
    	})();
    	
    	W.sumeru = sumeru;
    	
    	var thisScript = 'sumeru.js';
    	var getThisScriptRoot = function(){
    		
    		var scripts = document.getElementsByTagName('script');
    		var len = scripts.length;
    		
    		for(var i=0, s, l, src; i < len; i++ ){
    			s = scripts[i];
    			l = thisScript.length;
    			src = s.src;
    			
    			if(src.slice(-l) === thisScript){
    				s.parentNode.removeChild(s);
    				return src.slice(0, src.lastIndexOf('/'));
    			}
    		}
    		return null;
    	}
    	getThisScriptRoot(thisScript);
    	document.write('<script src="sumeru/package.js"></script>');
    }else{//if server model
	
    	var fs = require('fs');
        var path = require('path');
    	var buildServer = function(fw){
    	    var loadList = [
    		'src/utils.js',
    		'src/sense.js',
    		'src/config.js',
    		'src/netMessage.js',
    		'src/frameworkConfig.js',
    		'src/library.js',
            'src/validation.js',
            'src/validationRules.js',
            'library/obj.js',
            'library/asyncCallbackHandler.js'
    	    ];
    
    	    sumeru = fw;
    	    	    
    	    for(var i=0; i<loadList.length; i++){
    		    require(__dirname + '/' + loadList[i])(sumeru);
    	    }

    	    //var configPath = fw.config.get('configPath'); 
    	    //console.log(configPath);
    	    this.sumeru = sumeru;
    
    	    //WorkRound for router
    	    sumeru.router = {};
    	    sumeru.router.add = function(){};
    	    
            //
            var appPath  = __dirname + '/../app' + (process.argv[2] ? '/' +process.argv[2] : ''),
                allTheDirFiles = [],
                modelBaseDir = appPath + '/model',
                findAllTheDirFiles = function(theDir) {                                 //遍历theDir目录下的所有文件， 并存于allTheDirFiles数组。
                    var theDirFiles = fs.readdirSync(theDir);
                    for (var i = 0, len = theDirFiles.length; i < len; i++) {
                        var thePath = theDir + '/' + theDirFiles[i];
                        theDirFiles[i].indexOf('.') === -1 ? 
                          findAllTheDirFiles(thePath) : allTheDirFiles.push(thePath);
                    }
                };
            //读取config文件
            var configPath = appPath + '/config';
            if (fs.existsSync(configPath)) {
                findAllTheDirFiles(configPath);
                allTheDirFiles.forEach(function(file) {
                    if (path.extname(file) == '.js' &&
                        file.indexOf('package.js') == -1) {
                        var content = fs.readFileSync(file, 'utf-8');
                        eval(content);
                    };
                });
            } else {
                console.log(configPath + ' didnot existed.');
            }
    	}
    	module.exports =  buildServer;
    }
})(this);
