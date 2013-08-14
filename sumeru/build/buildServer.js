
var sumeru = require(__dirname + '/../src/newPkg.js')();
require(__dirname + '/../src/log.js')(sumeru);

module.exports = function(appDir, destBinDir){
   
    var fs = require('fs');
    var path = require('path');

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
    
    //遍历读取一个目录中的所有内容
    var readfile = function(dir) {
		var cnt = '';
		var list = fs.readdirSync(dir);
		for(var i = 0; i < list.length; i++) {
		    if(list[i].indexOf('package') === -1){
			var filename = path.join(dir, list[i]);
			if ('.svn' == path.basename(filename) || '.git' == path.basename(filename)){
				continue;
			}

			var stat = fs.statSync(filename);

			if(filename == "." || filename == "..") {
			    // pass these files
			} else if(stat.isDirectory()) {
			    // read dir recursively
			    cnt += readfile(filename);
			} else {
			    // read file
			    if (isFwFile(filename)){
				cnt += fs.readFileSync(filename, 'utf8');
			    }
			}
		    }
		}
		return cnt;
    };

    
   
    if(!fs.existsSync(appDir)){
	    return false;
    }else{
    	!fs.existsSync(destBinDir) && fs.mkdirSync(destBinDir);

		if(!fs.existsSync(path.join(appDir, 'view'))){
	        sumeru.log('the view dir does not existed in ' + appDir + ' directory');
		}else{
		    
		    //build view files
		    
		    var allViewFiles = [];
		    
		    var findFile = function(dirName){
				var dir = appDir + '/' + dirName;
				var theDirFiles = fs.readdirSync(dir);
				for(var i=0, len = theDirFiles.length; i < len; i++){		   
				    var content = theDirFiles[i];
				    if(content.indexOf('.') > -1){
					    allViewFiles.push(dirName + '/' + content);
				    }else{
					    findFile(dirName + '/' + content);
				    }
				}
		    };
		    //找出所有的文件并存于allViewFiles中
		    findFile('view');

	        var buildFile = function(filePath){
				var directoryPath = path.join(appDir, filePath);
				if(!isFwFile(directoryPath))return;


				fs.exists(directoryPath, function(exists){
				    if(exists){
    				    fs.readFile(directoryPath, 'utf-8', function(error, entireContent){
    					    if(error){
    						    sumeru.log('Read file error ', directoryPath);
    					    } else {
    
    						//进行view partial的拼装，处理include逻辑l
    						var asyncPartialMap = {},
    						//partialCount = 0,
    						//检测循环引用
    						isCircularRef = function(token, stack){
    						    var found = false;
    						    for (var i = 0, l = stack.length; i < l; i++){
    							if(stack[i] == token){
    							    found = true;
    							    
    							    return found;
    							}
    						    }
    						    
    						    return found;
    						},
    						
    						
    						parsePartial = function(parseToken, refStack, content, callback){
    						    //先去掉所有HTML的注释
    						    var commentRegExp = /(<!--([\s\S]*?)-->)/mg; // means <!--xxx-->
    						    
    						    entireContent = entireContent.replace(commentRegExp, '');
    						    content = content.replace(commentRegExp, '');
    						    
    						    var _refStack = JSON.parse(JSON.stringify(refStack));
    						    _refStack.push(parseToken);
    						    
    						    
    						    /*NOTES:这里为了考虑循环引用的路径一致，禁止了include时使用../的能力。
    						      在写正则的时候为了方便，直接把策略写成了include的token中不能包括小数点。
    						      这样等于同时也禁止了写.html这类后缀的能力，感觉挺好，先这样*/
    						    var syntaxMatcher = content.match(/{{>\s*([^}\.\s*]+)}}/mig);
    						    if(syntaxMatcher === null){
    							syntaxMatcher = [];//兼容下列循环和length判断
    						    }
    						    
    						    var branchNum = syntaxMatcher.length || 1;
    						    //partialCount += branchNum;
    						    
    						    
    						    if(syntaxMatcher.length == 0){
    							//替换为实际内容（再无进一步include命令的）
    							asyncPartialMap[parseToken] = content;
    							var replaceSeg = new RegExp('{{>\\s*' + parseToken +  '\\s*}}');
    							entireContent = entireContent.replace(replaceSeg, content);
    							callback();
    							return;
    						    } else {
    							var haveReachedParse = false;
    							
    							
    							for(var i = 0, l = syntaxMatcher.length; i < l; i++){
    							    var matched = syntaxMatcher[i].match(/{{>\s*([^}\.\s*]+)}}/i);
    							    //因为整体逻辑中有readFile导致异步，创建闭包保持matched的值不被后续循环污染
    							    (function(matched){
    								if(matched.length == 2){
    								    var partialName = matched[1];
    								    //check circular include
    								    if(isCircularRef(partialName, _refStack)){
    									entireContent = entireContent.replace(matched[0], "<p style='color:red'>circular include found : " + partialName + '</p>');
    									
    									//如果本次循环都全部触发了循环引用检查，那么手动触发一次回调，使上层递归继续执行
    									//partialCount--;
    									if(--branchNum == 0){
    									    callback();
    									}
    									
    									//这里其实是continue的意思，但由于构造了闭包，所以直接return当前闭包即可
    									return;
    								    }
    								    
    								    haveReachedParse = true;
    								    
    								    
    								    
    								    if(typeof asyncPartialMap[partialName] == 'undefined'){
    									
    									fs.readFile(path.dirname(directoryPath) + '/' + partialName + '.html', 'utf-8', function(error, content){
    									    if(error){
    									      sumeru.log(error);
    										  return;
    									    }
    									    
    									    //开始解析之前，先把内容include进来
    									    entireContent = entireContent.replace(matched[0], content);
    									    asyncPartialMap[partialName] = content;
    									    
    									    parsePartial(partialName, _refStack, content, function(){
    										
    										
    										if(--branchNum == 0){
    										    callback();
    										}
    									    });
    									});
    								    } else {
    									entireContent = entireContent.replace(matched[0], asyncPartialMap[partialName]);
    									
    									parsePartial(matched[1], _refStack, asyncPartialMap[matched[1]], function(){
    									    
    									    if(--branchNum == 0){
    										callback();
    									    }
    									});
    									//entireContent = entireContent.replace(matched[0], asyncPartialMap[partialName]);
    									//callback();
    								    }
    								}
    							    })(matched);
    							}
    						    }
    						    
    						};
    						
    						var currentPageToken = path.basename(directoryPath).split('.')[0];
    						parsePartial(currentPageToken, [], entireContent, function(){
    						    /*到了这里，所有的include块都已经被解析完成，如果还存在{{>，要不然是触犯了正则匹配中的小数点，要不然是触犯了循环引用。
    						      无论如何，在这里都处理掉剩余的{{> 避免handlebars报错
    						      * */
    						    entireContent = entireContent.replace(/{{>\s*([^}\s*]+)}}/mig, "<p style='color:red'>error including : $1</p>");
    						    //res.writeHead(200, {'Content-Type' : contentType});
    						    //res.end(entireContent, 'utf-8');
    						    
    						    
    						    var fileName = filePath.slice(filePath.lastIndexOf('/')+1);
    						    
    						    var relativeDir = filePath.slice(0, filePath.lastIndexOf('/'));
    						    relativeDir = relativeDir.split('/');
    						    
    						    var target_path = destBinDir;
    						    //fs.existsSync(target_path); && rmdir(target_path);
    						    //fs.existsSync(target_path) && fs.mkdirSync(target_path);
    						    
    						    for(var i=0, len=relativeDir.length; i < len; i++){
        							if(relativeDir[i]){
        							    target_path = target_path + '/' + relativeDir[i];
        							    !fs.existsSync(target_path) && fs.mkdirSync(target_path);
        							}
    						    }
    						    if (fs.existsSync(path.join(target_path,fileName))){
    							     fs.unlinkSync(path.join(target_path, fileName));
    						    }
    
    						    fs.writeFileSync(target_path + '/' + fileName, entireContent, 'utf8');
    						    
    						});
    						
    					    }
    					});
				    } else {
					    sumeru.log('File :' + filePath + ' does not exist.');
				    }
				});
		    };
		    
		    allViewFiles.forEach(function(filePath){
		    	buildFile(filePath);
		    });
		}
    }
}
