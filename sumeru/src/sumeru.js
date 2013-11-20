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
                            options.callback(xhr.responseText, options.url);
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
                    sumeru.log('error:' + options.url);
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
                var blanket_scripts = [];
                var directorys = [];
                var args = Array.prototype.slice.call(arguments, 0);
                
                args.forEach(function(dirname, index){
                    //var reg = /.css$|.js$/g;
                    if(dirname && dirname.indexOf('.js') > -1){
                        var url = baseDir + '/' + dirname;// + '?'+Date.now();
                        
                        
                        //if (sumeru.config.get('runtest')) { //why not work
                        if(typeof blanket != 'undefined') {
                        	//document.write('<script data-cover data-cover-flags="debug" src="'+ url +'"></script>');
                            //document.write('<script data-cover data-cover-flags="debug" type = "text/template" src="'+ url +'"></script>');
                        	if (QUnit.urlParams.coverage && baseDir.indexOf('/src') > -1) {
                        		blanket_scripts.push(url);
                        	} else {
                                document.write('<script src="'+ url +'">\x3C/script>');
                        	}
                        } else {
                        	document.write('<script src="'+ url +'">\x3C/script>');
                        }
                        
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
                
                blanket_scripts.forEach(function(uri){
                    var callback = function(content, url){
                    	blanket.instrument({
                            inputFile: content,
                            inputFileName: url
                        },function(instrumented){
                            try{
                                blanket.utils.blanketEval(instrumented);
                            	//document.write('<script>'+ instrumented +'</script>');
                            }
                            catch(err){
                                if (blanket.options("ignoreScriptError")){
                                    //we can continue like normal if
                                    //we're ignoring script errors,
                                    //but otherwise we don't want
                                    //to completeLoad or the error might be
                                    //missed.
                                    if (blanket.options("debug")) { sumeru.log("BLANKET-There was an error loading the file:"+url); }
                                }else{
                                    throw new Error("Error parsing instrumented code: "+err);
                                }
                            }
                        });
                    };
                    _loadScript({url : uri, callback : callback});
                });
            };
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
        document.write('<script src="sumeru/src/package.js">\x3C/script>');
    }else{//if server
    
        //evalByPackageJS has been moved. common read things to readClientFile.js
        var buildServer = function(fw){
        	var readClientFile = require(__dirname+"/../server/readClientFile.js");
            
            var loadList = [
                'log.js',
                'utils.js',
                'sense.js',
                'config.js',
                'netMessage.js',
                'frameworkConfig.js',
                'library.js',
                'validation.js',
                'validationRules.js',
                '../library/obj.js',
                '../library/cookie.js',
                '../library/asyncCallbackHandler.js'
            ];
    
            sumeru = fw;
                    
            for(var i=0; i<loadList.length; i++){
                require(__dirname + '/' + loadList[i])(sumeru);
            }

            this.sumeru = sumeru;
    
            //WorkRound for router
            if (!sumeru.router){//不覆盖server的 
                sumeru.router = {};
                sumeru.router.add = function(){};
            }
            
            //
            var appPath  = process.appDir;
                
            //读取config文件
            var configPath = appPath + '/config';
            readClientFile.evalByPackageJS(configPath,{process:process,sumeru:sumeru});
            
            //读取server config文件
            configPath = appPath + '/server_config';
            readClientFile.evalByPackageJS(configPath,{process:process,sumeru:sumeru});        
        };
        module.exports =  buildServer;
    }
})(this);
