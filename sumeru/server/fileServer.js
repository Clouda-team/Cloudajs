var fw = require(__dirname + '/../src/newPkg.js')();
require(__dirname  + '/../src/log.js')(fw);

var config = fw.config;


//startup a server
var path = require('path'),
    fs = require('fs'),
    zlib = require('zlib'),
    fileUpload = require(__dirname + "/fileUpload.js");//用于文件处理

    module.exports = function(req, res){
        //localBase 为sumeru和 apps所在的根目录。
        var frkDir = __dirname + '/../../',
            localBase = process.appDir,
            filePath = req.url,
            range = typeof req.headers.range == 'string' ? req.headers.range : undefined;
        
        filePath = decodeURI(filePath.replace(/\.\.\//g, ''));
        
        
        localBase = path.normalize(localBase);
        var view_from_cache = fw.config.get('view_from_cache');
        
        //黑名单的配置需要同步至bae的lighttpd配置中
        var deniedList = [ //黑名单
            new RegExp('^/publish/'),
            new RegExp('^/server_config/')
        ];
        
        for (var i=0; i < deniedList.length; i++) {
            if (deniedList[i].test(filePath)) {
                res.writeHead(403);//forbidden
                res.end();        
                return;
            };
        };
        
        //把问号后面去掉
        var uriObj  = fw.uri.getInstance(filePath);
        
        //清除?后面的东西
        filePath = filePath.replace(/\?.*/,"");
        
        if ( !fs.existsSync(localBase+filePath) ){//存在文件，则保持
            filePath = uriObj.path;
        }
        
        
        if(filePath == '/'){
            filePath = localBase + '/index.html';
        } else {
            var sumerujs = '/sumeru.js';
            var sumerudir = /sumeru\//g;
            var viewdir = /\/view\//;
            var sumeruPath = path.join(localBase, fw.config.get('sumeruPath'));

            if(sumerujs === filePath){
                filePath = sumeruPath + '/src/sumeru.js';
            }else if(view_from_cache && viewdir.test(filePath)){//hack it！在bin/view目录下读取编译后的
                if (filePath.indexOf("/bin")==0){
                	filePath = localBase + filePath;
                }else{
                	filePath = localBase +"/bin"+ filePath;
                }
                
            }else if(sumerudir.test(filePath)){
                filePath = sumeruPath + '/' + 
                    filePath.slice(filePath.lastIndexOf('sumeru/') + 'sumeru/'.length);
            }else{
                filePath = localBase + filePath;
            }
        }

        
        // fw.log('file server accessing ' + path.normalize(filePath));
        
        var extensionName = path.extname(filePath).toLowerCase(),
            contentType = 'text/html';
        var extMap = sumeru.config.get("mime");
        if (!extMap){//兼容没有设置mime情况
            extMap = {
                '.js' : 'text/javascript',
                '.css' : 'text/css',
                '.jpg' : 'image/jpeg',
                '.jpeg' : 'image/jpeg',
                '.png' : 'image/jpeg',
                '.ico' : 'image/jpeg',
                '.json' : 'text/json',
                '.manifest' : 'text/cache-manifest'
            };
        }
        var _binaryMap = ['.jpg','.jpeg','.png','.gif','.bmp','.mp3', '.ico', '.png'],
            binaryMap = {};
        
        _binaryMap.forEach(function(item){
            binaryMap[item] = true;
        });
        
        if(extMap[extensionName]){
            contentType = extMap[extensionName];
        }
        //ADDED BY SUNDONG
        if (uriObj.router && uriObj.router.type == 'file'){//deal upload
            /*
                pattern    :   '/files', //pattern用于定义匹配上传文件的uri
                type  :   'file',
                max_size_allowed:'10M',//support k,m
                file_ext_allowed:'' ,//allow all use '' , other use js array ["jpg",'gif','png','ico']
                upload_dir:"public",//default dir is public
                rename:function(filename){//if rename_function is defined,the uploaded filename will be deal with this function.
                    return filename+"_haha";
                }
            */
            if (req.method.toLowerCase() == 'post') {
                // parse a file upload
                var form = new fileUpload({hash:"sha1"});
                //uriObj.router
                if (uriObj.router.max_size_allowed) {
                    form.maxFieldsSize = uriObj.router.max_size_allowed;
                }
                
                var pubdir = (uriObj.router.upload_dir||"upload");//相对路径
                var wholepubdir = process.appDir + '/'+pubdir + "/";//绝对路径
                fs.exists(wholepubdir,function(exists){
                    if (!exists){
                        fs.mkdirSync(wholepubdir);
                    }
                });
                //form.uploadDir = process.tmpDir;//在build/build.js中定义临时目录  //process.env.TMP || process.env.TMPDIR || process.env.TEMP || '/tmp' || process.cwd();//localBase + '/upload/';上传到临时目录
                var tmpdir = (fw.config.get("tmp_dir") || "tmp");
                form.uploadDir = process.appDir + '/'+tmpdir + "/";
                fs.exists(form.uploadDir,function(exists){
                    if (!exists){
                        fs.mkdirSync(form.uploadDir);
                    }
                    form.parse(req, function(err, fields, files) {
                      res.writeHead(200, {'content-type': 'text/plain'});
                      //上传成功。重命名到上传目录
                      for(var n in files){
                          if (files[n].size == 0 && files[n].name == "" ) continue; 
                          //if rename function exists,rename first.
                          if (typeof uriObj.router.rename === 'function'){
                              var tmp = form._dealFileExtention(files[n].name);
                              var filepart1 = tmp[0],
                              filepart2 = tmp[1];
                              files[n].name = (uriObj.router.rename(filepart1)||"") + filepart2;
                          }
                          //then find a name to rename & save
                          var pubfilepath = form._parseFilePath(wholepubdir + files[n].name);
                          fs.renameSync(files[n].path, pubfilepath);//files[n].path 是临时文件的路径，savefilepath是排除了重复的文件
                          var pubfilelink = (fw.config.get("site_url") || "")+ "/" + pubdir + pubfilepath.substring(pubfilepath.lastIndexOf("/"));
                          res.end(form._outputSuccess(pubfilelink));
                          break;//暂不支持一个form多个上传文件，其实支持也很简单但是没有必要，正常情况一个文件一个文件上传处理即可。
                     }
                     res.end(form._outputError((err && err.toString() )|| "no files"));
                });
                  
                  
                });
            
                return;
              }
            res.end('need request post...');
            return ;
        }
        fs.exists(filePath, function(exists){
            if(exists){
                
                res.setHeader('Date', new Date().toString());
                //res.setHeader('Expires', new Date(new Date().getTime() + 24 * 3600 * 1000).toString());
                //必须设置下面三个参数， 才能保证浏览器正常更新服务器的文件
                res.setHeader('Cache-Control' , 'no-cache');
                res.setHeader('Expires', '0');
                res.setHeader('Vary', 'Accept-Encoding');
                
                var acceptEncoding = req.headers['accept-encoding'];
                if(!acceptEncoding){
                    acceptEncoding = '';
                }
                
                fs.readFile(filePath, 'utf-8', function(error, entireContent){
                    if(error){
                        res.writeHead(500);
                        res.end();
                    } else {
                        //进行view partial的拼装，处理include逻辑
                        if(filePath.indexOf('/view/') != -1 || filePath.indexOf('/viewEngine/') != -1){
                            if (view_from_cache){//不拼装，直接返回
                                res.writeHead(200, {'Content-Type' : contentType});
                                res.end(entireContent, 'utf-8');
                                return ;
                            }
                            var asyncPartialMap = {},
                                //partialCount = 0,
                                //检测循环引用
                                isCircularRef = function(token, stack){
                                    var found = false;
                                    for (var i = 0, l = stack.length; i < l; i++){
                                        if(stack[i] == token){
                                            found = true;
                                            fw.dev('circular Ref Found :', token, stack);
                                            return found;
                                        }
                                    }
                                    
                                    return found;
                                },
                                
                                
                                parsePartial = function(parseToken, refStack, content, callback){
                                    //先去掉所有HTML的注释
                                    var commentRegExp = /(<!--([\s\S]*?)-->)/mg; // means <!--xxx-->
                                    fw.dev('view remove comment', content.match(commentRegExp));
                                    
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
                                    
                                    fw.dev('branchNum', branchNum, parseToken);
                                    
                                    if(syntaxMatcher.length == 0){
                                        //替换为实际内容（再无进一步include命令的）
                                        fw.dev('hit plain text', parseToken);
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
                                                        /*if(i == l - 1 && !haveReachedParse){
                                                            callback();
                                                        } else {
                                                            fw.dev('partialCount ciruclar - before', partialCount);
                                                            //partialCount--;
                                                            fw.dev('partialCount circular - after', partialCount);
                                                        }*/
                                                        //这里其实是continue的意思，但由于构造了闭包，所以直接return当前闭包即可
                                                        return;
                                                    }
                                                    
                                                    haveReachedParse = true;
                                                    
                                                    fw.dev('checkCache', (partialName), typeof asyncPartialMap[(partialName)]);
                                                    
                                                    if(typeof asyncPartialMap[partialName] == 'undefined'){
                                                        
                                                        fs.readFile(path.dirname(filePath) + '/' + partialName + '.html', 'utf-8', function(error, content){
                                                            if(error){
                                                                fw.log(error);
                                                                res.writeHead(500);
                                                                res.end('error occured when processing view partial:' + partialName, 'utf-8');
                                                                return;
                                                            }
                                                            
                                                            //开始解析之前，先把内容include进来
                                                            fw.dev('pre replace ---', matched[0]);
                                                            entireContent = entireContent.replace(matched[0], content);
                                                            asyncPartialMap[partialName] = content;
                                                            
                                                            parsePartial(partialName, _refStack, content, function(){
                                                                
                                                                /*fw.dev('partialCount - before', partialCount);
                                                                partialCount--;
                                                                fw.dev('partialCount - after', partialCount);
                                                                */
                                                                if(--branchNum == 0){
                                                                    callback();
                                                                }
                                                            });
                                                        });
                                                    } else {
                                                        fw.dev('hitCacheViewPartial', matched[0]);
                                                        entireContent = entireContent.replace(matched[0], asyncPartialMap[partialName]);
                                                        
                                                        parsePartial(matched[1], _refStack, asyncPartialMap[matched[1]], function(){
                                                            /*fw.dev('partialCount cache - before', partialCount);
                                                            partialCount--;
                                                            fw.dev('partialCount cache - after', partialCount);
                                                            */
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
                                
                            var currentPageToken = path.basename(filePath).split('.')[0];
                            
                            /*
                            var tplRoleRegExp = /<!--[\s]*tpl-role[\s]*=[\s]*([\s\S]*?)-->([\s\S]*)<!--[\s]*\/tpl-role[\s]*-->/m; 
                            // means <!--tpl-role=page_unit-->**<!--/tpl-role-->
                            var reverseTplRoleRegExp = /!!--[\s]*tpl-role[\s]*=[\s]*([\s\S]*?)--!!([\s\S]*)!!--[\s]*\/tpl-role[\s]*--!!/m;
                            // 被临时转义以后的tpl-role语法标记的匹配正则
                            */
                            
                            parsePartial(currentPageToken, [], entireContent, function(){
                                
                                /*到了这里，所有的include块都已经被解析完成，如果还存在{{>，要不然是触犯了正则匹配中的小数点，要不然是触犯了循环引用。
                                      无论如何，在这里都处理掉剩余的{{> 避免handlebars报错
                                * */
                                entireContent = entireContent.replace(/{{>\s*([^}\s*]+)}}/mig, "<p style='color:red'>error including : $1</p>");
                                
                                /*
                                //将被临时替换的tpl-role从！！--换回<!--注释形式
                                entireContent = entireContent.replace(reverseTplRoleRegExp, function($0){
                                    $0 = $0.replace(/!!--/g,'<!--');
                                    $0 = $0.replace(/--!!/g, '-->');
                                    return $0;
                                });
                                */

                                res.writeHead(200, {'Content-Type' : contentType});
                                res.end(entireContent, 'utf-8');
                                //fw.dev('partialCount', partialCount);
                                /*if(partialCount == 0){
                                    
                                    /*到了这里，所有的include块都已经被解析完成，如果还存在{{>，要不然是触犯了正则匹配中的小数点，要不然是触犯了循环引用。
                                      无论如何，在这里都处理掉剩余的{{> 避免handlebars报错
                                    
                                    entireContent = entireContent.replace(/{{>\s*([^}\s*]+)}}/mig, "<p style='color:red'>error including : $1</p>");
                                    res.writeHead(200, {'Content-Type' : contentType});
                                    res.end(entireContent, 'utf-8');
                                } else {
                                    partialCount++;
                                }*/
                            });
                        } else if(extensionName == '.html'){
                            //view from cache : true以后，controller的模板也会走入这里
                            if (uriObj.controller === 0){
                                res.writeHead(404);
                                res.end();
                                return ;
                            }else if (filePath.search("json.html")!=-1){
                            	res.writeHead(200, {"Content-Type": "application/json"});
                            }else{
                            	res.writeHead(200, {"Content-Type": "text/html"});
                            }
                            
                            	if (fw.config.get("site_url")){
                                	entireContent = entireContent.replace(/<base[\s\S]*?>/g,"").replace("<head>",'<head><base href="'+fw.config.get("site_url")+'" />');
                                }
                                
                                if ( uriObj.controller !=null) {
                                    /*
                                     server_auth 说明
                                     1.在请求来时注册client，进行注册逻辑
                                     2.将clientId传入controller
                                     3.在controller的每一个subscribe中传入clientId
                                     4.由于后续客户端渲染开始，因此不清理client，交给后续socket断开或者心跳清理
                                     * */
                                    //1. 解析出clientId
                                    var clientId = Library.cookie.parseCookie(req.headers.cookie,'clientId');
                                    var authMethod = Library.cookie.parseCookie(req.headers.cookie,'authMethod');
                                    //2.认证，进行clientId进行auth认证
                                    var client = fw.clientTracer.findClient(clientId);
                                    var verify_callback = function(){
                                        // conn.userInfo = this.userInfo;
                                        //3.hou
                                        var domarr = entireContent.split('<body');
                                        if (domarr.length!=2){
                                            try{
                                                fw.router.start_routeing(req.url,clientId,"",function(page){
                                                     res.end(page);
                                                });
                                           }catch(e){
                                               fw.dev("error when server render....");
                                               res.end();
                                           }
                                            return ;
                                        }
                                        
                                        res.write(domarr[0]+'<body');//这部分无需等待
                                        try{
                                            //split by <body>,speedup render js,css
                                            fw.router.start_routeing(req.url,clientId,domarr[1],function(page){
                                                 res.end(page);
                                            });
                                        }catch(e){
                                            fw.dev("error when server render....");
                                            console.dir(e);
                                            res.end(domarr[1]);
                                        }
                                        client && client.removeListener("verifty",verify_callback);
                                    };
                                    if (client && client.userInfo === false){
                                        client.on('verify',verify_callback);
                                        client.__verify(authMethod);
                                    }else{
                                        verify_callback();
                                    }
                                    
                                }else if (uriObj.controller === 0){
                                    
                                }else{
                                    res.end(entireContent);
                                }
                                
                        } else if(extensionName == '.js' || extensionName == '.css'){
                            
                            
                            var raw = fs.createReadStream(filePath, {
                                encoding : 'utf8'
                            });
                            
                            if(acceptEncoding.match(/\bdeflate\b/)){
                                res.setHeader('Content-Encoding' , 'deflate');
                                res.writeHead(200, {'Content-Type' : contentType});
                                raw.pipe(zlib.createDeflate()).pipe(res);
                            } else if (acceptEncoding.match(/\bgzip\b/)){
                                res.setHeader('Content-Encoding' , 'gzip');
                                res.writeHead(200, {'Content-Type' : contentType});
                                raw.pipe(zlib.createGzip()).pipe(res);
                            } else {
                                res.writeHead(200, {'Content-Type' : contentType});
                                raw.pipe(res);
                            }
                            
                        } else if(binaryMap[extensionName] == true){
                            fs.stat(filePath, function(err, stat){
                        
                            var info = {
                                start : 0,
                                end : stat.size - 1,
                                size : stat.size,
                                isRangeRequest : false
                            };
                                
                            if(range !== undefined && (range = range.match(/bytes=(.+)-(.+)?/)) != null){
                                // Check range contains numbers and they fit in the file.
                                // Make sure info.start & info.end are numbers (not strings) or stream.pipe errors out if start > 0.
                                info.start = Library.objUtils.isNumber(range[1]) && range[1] >= 0 && range[1] < info.end ? range[1] - 0 : info.start;
                                info.end = Library.objUtils.isNumber(range[2]) && range[2] > info.start && range[2] <= info.end ? range[2] - 0 : info.end;
                                info.rangeRequest = true;
                            }
                            
                            info.length = info.end - info.start + 1;
                            
                            var resCode = 200;
                            
                            var  header = {
                                'Prama' : 'public',
                                'Cache-Control' : 'public',
                                'Connection' : 'keep-alive',
                                'Content-Type'  : contentType,
                                'Content-Length' : stat.size,
                                'Content-Disposition' : 'inline;filename=' + path.basename(filePath) + ';',
                                'Last-Modified' : stat.mtime.toUTCString(),
                                'Content-Transfer-Encoding' : 'binary'
                            };

                            
                            if(info.rangeRequest){
                                resCode = 206;
                                header['Status'] = '206 Partial Content';
                                header['Accept-Ranges'] = 'bytes';
                                header['Content-Range'] = 'bytes ' + info.start + '-' + info.end + '/' + info.size;
                            }
                            
                            res.writeHead(200, header);
    
                            var util = require('util');
                            var raw = fs.createReadStream(filePath, {
                                flags : 'r',
                                start : info.start,
                                end : info.end
                            });
                            util.pump(raw, res);
                        });
                        //浏览器对manifest文件不进行缓存
                        }else if(extensionName === '.manifest'){
                            res.setHeader('Cache-Control' , 'no-cache');
                            res.setHeader('Expires', '0');
                            res.writeHead(200, {'Content-Type' : contentType});
                            res.end(entireContent, 'utf-8');
                        }else {
                            res.writeHead(200, {'Content-Type' : 'application/octet-stream'});//for download
                            res.end(entireContent, 'utf-8');
                        }
                        
                    }
                });
            } else {
                res.writeHead(404);
                res.end();
            }
        });
    };

