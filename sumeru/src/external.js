"use strict";
var runnable = function(fw, findDiff, publishBaseDir, externalConfig, http, serverObjectId, url){

	//package
	var external = fw.addSubPackage('external');
	//constants
	var REQUEST_TIMEOUT = 6 * 1000;    //request timeout config
	var urlParser = fw.IS_SUMERU_SERVER && url;
	//data managers
	var remoteDataMgr = {};		//fetched and dev resolved data manager from external server
	var localDataMgr = {};		//executed data manager by sumeru
	var urlMgr = {};			//url manager arranged by modelName, record all subscribes.
	var fetchTimer = {};        //fetch timer
	
	
	//localData Constructor
	function LocalData(){
		this.data = [];
	};
	
	LocalData.prototype = {
		
		getData : function(){
			return this.data;
		},

		insert : function(item){
			this.data.push(item);
		},
		
		remove : function(smr_id){
			var item = this.find(smr_id);
			if(item){
				var index = this.data.indexOf(item);
				this.data.splice(index, 1);
				return true;
			}
			return false;
		},
		
		update : function(oldItem, newItem){
			var index = this.data.indexOf(oldItem);
			this.data.splice(index, 1, newItem);
		},
		
		find : function(smr_id){
			
			var ret = this.data.filter(function(item){
				return item.smr_id === smr_id;
			});
			
			if(ret.length > 1){
				fw.log("ERROR: uniqueColumn data is not unique, it may cause error. ");
			}
			
			if(ret.length){
				return ret[0];
			}
			
			return null;
			
		},
		
		findOne : function(key, value){
			
			if(!key || !value){
				return null;
			}

			var ret = this.data.filter(function(item){
				return item[key] === value;
			});
			
			if(ret.length > 1){
				fw.log("ERROR: uniqueColume data is not unique, it may cause error. ");
			}
			
			if(ret.length){
				return ret[0];
			}
			
			return null;
		}
		
	}
	
	
	/**
	 * http.get util for external fetch
	 * @param {String} url: set external source localtion
	 * @param {Function} cb: success handler/callback
	 * @param {Function} errorHandler: error handler will be called automatically when error occurs in the get request.  
	 * @param {Function} timeoutHandler: timeout handler will be called automatically when a get request is timeout.
	 */
	function _doGet(url, cb, errorHandler, timeoutHandler){
		
		var chunks = [];
		var size = 0;
		
		var getRequest = http.get(url, function(res){
		
			var data = null;
			
			res.on('data', function(chunk){
				
				chunks.push(chunk);
				size += chunk.length;
				
			});
			
			res.on('end', function(){
				
				switch(chunks.length){
					case 0 : 
						data = new Buffer(0);
						break;
					case 1 :
						data = chunks[0]; 
						break;
					default : 
						data = new Buffer(size);
						for (var i = 0, pos = 0, l = chunks.length; i < l; i++) {
							var buf = chunks[i];
							buf.copy(data, pos);
							pos += buf.length;
						}
						break;
				}
				
				cb(data);
				
			});
			
		});
		
		//error handler
		getRequest.on('error', function(err){
			fw.log("Error when do external fetch", url);
			errorHandler && errorHandler(err);
			cb([]);
		});
		
		//timeout handler
		getRequest.setTimeout( REQUEST_TIMEOUT, function(info){
			fw.log("Timeout when do external fetch", url);
			timeoutHandler && timeoutHandler();
			cb([]);
		});
		
	}
	
	
	/**
	 * http post util for external post
	 * @param {String} options: set external source localtion
	 * @param {String} postData: post data sent to external server.
	 * @param {Function} cb: success handler/callback
	 * @param {Function} errorHandler: error handler will be called automatically when error occurs in the get request.  
	 * @param {Function} timeoutHandler: timeout handler will be called automatically when a get request is timeout.
	 */
	function _doPost(options, postData, cb, errorHandler, timeoutHandler){
		
		var chunks = [];
		var size = 0;
		
		var postRequest = http.request(options, function(res){
			
			var data = null;
			
			res.on('data', function(chunk){
				
				chunks.push(chunk);
				size += chunk.length;
				
			});
			
			res.on('end', function(){
				
				switch(chunks.length){
					case 0 : 
						data = new Buffer(0);
						break;
					case 1 :
						data = chunks[0]; 
						break;
					default : 
						data = new Buffer(size);
						for (var i = 0, pos = 0, l = chunks.length; i < l; i++) {
							var buf = chunks[i];
							buf.copy(data, pos);
							pos += buf.length;
						}
						break;
				}
				
				cb(data);
				
			});
			
		});

		postRequest.write(postData);
		postRequest.end();
		
		//error handler
		postRequest.on('error', function(err){
			fw.log("Error when do external post");
			options && postData && fw.log(options, postData);
			errorHandler && errorHandler(err);
			cb([]);
		});
		
		//timeout handler
		postRequest.setTimeout( REQUEST_TIMEOUT, function(){
			fw.log("Timeout when do external post");
			options && postData && fw.log(options, postData);
			timeoutHandler && timeoutHandler();
			cb([]);
		});
		
	}

	//在各种post成功后，更新本地数据
	/* function _updateLocalData(modelName, pubName, url, type, data){

		var localData = localDataMgr[url];

		if(type === 'insert'){
			var struct = fw.server_model.getModelTemp(modelName);
			var newItem = fw.utils.deepClone(struct);
			for(var p in newItem){
				newItem[p] = data[p];
			}
			newItem.smr_id = data.smr_id;
			localData.insert(newItem);
		}else if(type === 'delete'){
			localData.remove(data.smr_id);
		}else if(type === 'update'){
			//抓取回来以后会自动update, 这里不用做localUpdate
		}

	} */
	
	/**
	 * @method _resolve: resolve fetched originData to Array. 处理抓取的原始数据
	 * @param {Buffer} originData : origin data
	 * @param {String} pubName : publish name
	 * @return {Array} return the resolved data
	 */
	function _resolve(originData, pubName, url){
		var config = externalConfig[pubName];
		var data = config.buffer ? originData : originData.toString();
		if(!config.resolve){ //强制有resolve函数
			fw.log('Need resolve method for external fetch!');
			return;
		} 
		try{
			var remoteData = config.resolve(data);
			remoteData = Array.isArray(remoteData) ? remoteData : [remoteData];
			return remoteData;
		}catch(e){
			fw.log("Please check fetch url, 3rd-party server encounters an error: ", url, "\n" ,data, "\n");
			return ;
		}
		
	}
	
	/**
	 * @method _process: 处理外部数据，将其转成本地数据
	 * @param {String} modelName : name of model
	 * @param {String} pubName : publish name
	 * @param {String} url : external data source url
	 * @return {Array} return the processed localData
	 */
	function _process(modelName, pubName, url){
		
		var struct = fw.server_model.getModelTemp(modelName);
		var config = externalConfig[pubName];
		var remoteData = remoteDataMgr[url];
		var ret = new LocalData();

		if(remoteData){
			remoteData.forEach(function(item){
			
				var newItem = fw.utils.deepClone(struct);
				for(var p in newItem){
					newItem[p] = item[p];
				}

				var unique = config.uniqueColumn || config.keyColume;
				var oldItem = null;

				if(unique){
					oldItem = localDataMgr[url] && localDataMgr[url].findOne(unique, newItem[unique]);
				}
				
				if(oldItem){
					newItem.smr_id = oldItem.smr_id;
				}else{
					newItem.smr_id = serverObjectId.ObjectId();
				}
				ret.insert(newItem);
				
			});

			localDataMgr[url] = null;

		}

		return ret;

	}
	
	/**
	 * @method _sync: 同步外部数据
	 * @param {String} modelName : name of model
	 * @param {String} pubName : publish name
	 * @param {String} url : external data source url
	 * @param {Function} callback : publish callback
	 * @param {Function} afterSync : after _doGet response from 3rd-party server.
	 */
	function _sync(modelName, pubName, url, callback, afterSync){

		var config = externalConfig[pubName];
		var method = config.method || "get";

		var _doSync = function(data){

			if(typeof remoteDataMgr[url] === "undefined"){ var firstFetch = true; }	//首次抓取不必trigger_push
			var remoteData = _resolve(data, pubName, url);	//处理原始数据
			if(firstFetch){
				remoteDataMgr[url] = remoteData;
				localDataMgr[url] = _process(modelName, pubName, url);
				var dataArray = fw.utils.deepClone(localDataMgr[url].getData());
				callback(dataArray);
			}else{
				var diff = (JSON.stringify(remoteData) === JSON.stringify(remoteDataMgr[url])); //这里可以不需要Diff工具，直接stringify对比
				if(!diff && remoteData){
					remoteDataMgr[url] = remoteData;
					localDataMgr[url] = _process(modelName, pubName, url);
					fw.netMessage.sendLocalMessage({modelName : modelName}, 'trigger_push');
				}
			}

			afterSync && afterSync();
		}

		if(method.toLowerCase() === "post"){

			var postData = encodeURIComponent(config.postData); 	//args为postData
			try{
				var postOptions = urlParser && urlParser.parse(url);
			}catch(e){
				return fw.log("externalConfig: fetchUrl must return a url \n\n", url);
			}
			
			if(!postOptions.hostname || !postOptions.pathname){
				return fw.log('unexpected post url', url);
			}

			var opts = {
				hostname : postOptions.hostname,
				path : postOptions.pathname,
				port : postOptions.port || 80,
				method : 'POST',
				headers: {
			        'Content-Type': 'application/x-www-form-urlencoded',
			        'Content-Length': postData.length
			    }
			};
			try{
				_doPost(opts, postData, _doSync);
			}catch(e){
				fw.log("Fetch by post request failed", e);
				return;
			}
		}else{
			try{
				_doGet(url, _doSync);	
			}catch(e){
				fw.log("Fetch by get request failed", e);
			}
		}

	}


	//优先处理prepare方法，再次deInser/doDelete/doUpdate
	function _getPostData(config, type, data, modelName, pubName){
		
		var prefix = "on";
		var handler, ret;

		if(config.prepare){
			handler = config.prepare;
		}else{
			var handlerName = prefix + type.charAt(0).toUpperCase() + type.substring(1);
			handler = config[handlerName];
		}

		if(!handler){ fw.log("External Post", pubName, "unhandled operation type of", type); return false; } //hander未定义
		//hack doDelele/toUpdate 增量只给了smr_id, 需要查到item, 并提供给devloper
		if(type === 'delete'){
			var item;
			for(var i=0, l=urlMgr[modelName].length; i<l ;i++){
				var url = urlMgr[modelName][i];
				item = localDataMgr[url].find(data.smr_id);
				if(item){break;}
			}
			if(item){ ret = item; }

		}else if( type === 'update' ){


			var item;
			for(var i=0, l=urlMgr[modelName].length; i<l ;i++){
				var url = urlMgr[modelName][i];
				
				item = localDataMgr[url].find(data.smr_id);
				if(item){break;}
			}

			if(item){
				ret = fw.utils.merge(data, item);	//更新操作, 提供最新数据
			}
		}else{
			ret = data;
		}

		if(typeof ret === "undefined"){
			fw.log("Cannot find model ", data.smr_id ,"external post");
		}
		if(config.prepare){
			return handler(type, ret);
		}else{
			return handler(ret);
		}

	}

	//优先处理getOptions函数, 再次是deleteUrl/insertUrl/updateUrl
	function _getPostOptions(config, type, args){
		
		var suffix = 'Url';
		var opts;
		args = args.concat();	//copy args
		if(config.postUrl){
			Array.prototype.unshift.call(args, type);
			opts = config.postUrl.apply(null, args);
		}else{
			opts = config[type + suffix].apply(null, args);
		}
		
		if(!opts) { fw.log("External Post ", pubName, "options have no post config!" ); return false; }

		return opts;
	}

	//receiver of fw.external.post()
	//a low-level channel for client do post request.
	fw.netMessage.setReceiver({
	    onMessage : {
	        target : "SEND_EXTERNAL_POST",
	        overwrite: true,
	        handle : function(pack,target,conn) {
	            var cbn = pack.cbn;
	            var postData = encodeURIComponent(JSON.stringify(pack.postData));
	            var defaultOptions = {
					method : 'POST',
					headers: {
				        'Content-Type': 'application/x-www-form-urlencoded',
				        'Content-Length': postData.length
				    }
				};

				var opts = Library.objUtils.extend(true, defaultOptions, pack.options);
				//var opts = fw.utils.merge( pack.options, defaultOptions);

		        _doPost(opts, postData, function(data){
		        	fw.netMessage.sendMessage(data.toString(),cbn,conn._sumeru_socket_id);
		        });
	            
	            
	        }
	    }
	});

	//receiver of fw.external.get()
	//a low-level channel for client do get request.
	fw.netMessage.setReceiver({
	    onMessage : {
	        target : "SEND_EXTERNAL_GET",
	        overwrite: true,
	        handle : function(pack,target,conn) {
	            var cbn = pack.cbn;
	            var url = pack.url;
	            var buffer = pack.buffer;
		        _doGet(url, function(data){
		        	data = buffer ? data : data.toString();
		        	fw.netMessage.sendMessage(data,cbn,conn._sumeru_socket_id);
		        });
	        }
	    }
	});

	//receiver of sumeru.external.sync
	fw.netMessage.setReceiver({
	    onMessage : {
	        target : "SEND_SYNC_REQUEST",
	        overwrite: true,
	        handle : function(pack,target,conn) {
	            var cbn = pack.cbn;
	            var modelName = pack.modelName;
	            var pubName = pack.pubName;
	            var url = pack.url;

	            var urls = urlMgr[modelName];
	            var config = externalConfig[pubName];
	            
	            if(!urls || !config){
	            	fw.netMessage.sendMessage({msg:"unknown modelName or pubName"},cbn,conn._sumeru_socket_id);
	            	return false;
	            }

	            if(urls.indexOf(url) < 0){
	            	fw.netMessage.sendMessage({msg:"unknown url"},cbn,conn._sumeru_socket_id);
	            	return false;
	            }

	            _sync(modelName, pubName, url, function(){}, function(){
	            	fw.netMessage.sendMessage({msg:"ok"},cbn,conn._sumeru_socket_id);
	            });
	            
	        }
	    }
	});

	//---------------------------------- 以下为external接口 -------------------------------//
	/**
	 * package: external
	 * method name: externalFetch
	 * @param {String} modelName: name of the model
	 * @param {String} pubName: name of external publish
	 * @param {Array} args: subscribe arguments
	 * @param {Function} callback: subscribe callback.
	 */
	function externalFetch(modelName, pubName, args, callback){

		var config = externalConfig[pubName];
		var method = config.method || "get";
		var url;
		if(method.toLowerCase() === "post"){
			url = (config.fetchUrl && config.fetchUrl.apply(null, args));
			config.postData = args[args.length - 1] || ""; //规定最后一个参数为postdata
		}else{
			url = (config.fetchUrl && config.fetchUrl.apply(null, args)) || config.geturl(args); //兼容老的geturl方法	
		}
		
		//分modelName存下每一个做过external.fetch的url
		if(!urlMgr[modelName]){ urlMgr[modelName] = []; }
		if(urlMgr[modelName].indexOf(url) < 0){
			urlMgr[modelName].push(url);
		}
		
		var localData = localDataMgr[url];
		if(localData){
			var dataArray = fw.utils.deepClone(localData.getData());  //生成一个对象，否则本地update导致数据同步异常
			callback(dataArray);							//run subsribe callback
		}else{
			_sync(modelName, pubName, url, callback);		//同步数据
		}

		if(config.fetchInterval && !fetchTimer[url]){
			fetchTimer[url] = setInterval(function(){
				_sync(modelName, pubName, url, callback);
			}, config.fetchInterval);
		}
		
	}
	
	
	/**
	 * package: external
	 * method name: externalPost
	 * @param {String} modelName: name of the model
	 * @param {String} pubName: name of external publish
	 * @param {String} type: delta operation type, the possible values are 'delete', 'insert' or 'update';
	 * @param {Object} data: delta value generated by sumeru.
	 * @param {ArrayLike} args: subscribe arguments.
	 */
	function externalPost(modelName, pubName, type, smrdata, args, postCallback){
		
		//generate postData and options by developers' config.
		var config = externalConfig[pubName];
		args = args.concat();	//copy args
		Array.prototype.pop.call(args); //remove callback
		var d = _getPostData(config, type, smrdata, modelName, pubName),
			opt = _getPostOptions(config, type, args);

		if(!(d && opt)){return false;}	//post config error, stop post

		var postData = encodeURIComponent(JSON.stringify(d)); //final postData
		var defaultOptions = {
			method : 'POST',
			headers: {
		        'Content-Type': 'application/x-www-form-urlencoded',
		        'Content-Length': postData.length
		    }
		};

		var opts = Library.objUtils.extend(true, defaultOptions, opt); //final options

		_doPost(opts, postData, function(data){
		 	//成功的情况下，重新拉取数据
			urlMgr[modelName].forEach(function(refetchurl){
				//_updateLocalData(modelName, pubName, refetchurl, type, smrdata);
				_sync(modelName, pubName, refetchurl, function(){});		//POST完成后重新抓取三方数据,trigger_push不用主动callback	
			});

			postCallback();

		});
		
	}

	/**
	 * package: external
	 * method name: sendPost
	 * description : send post request from client to external server 
	 * @param {Object} options: set external source localtion
	 * @param {Object} postData: post data sent to external server.
	 * @param {Function} cb: get callback, result for getData;
	 */
	function sendGetRequest(url, cb, buffer){
		//server
		if(fw.IS_SUMERU_SERVER){
			_doGet(url, function(data){
	        	data = buffer ? data : data.toString();
	        	cb(data);
	        });
		} else { //client
			if(!url || !cb){ fw.log('Please specify url and callback for sumeru.external.get!');}
			var cbn = "WAITING_EXTERNAL_GET_CALLBACK_" + fw.utils.randomStr(8);

			fw.netMessage.setReceiver({
		        onMessage : {
		            target : cbn,
		            overwrite: true,
		            once:true,
		            handle : function(data){
		            	cb(data);
		            }
		        }
		    });

			fw.netMessage.sendMessage({
		        cbn : cbn,
		        url : url,
		        buffer : buffer
		    }, "SEND_EXTERNAL_GET");
		}
	    
	}
	
	/**
	 * package: external
	 * method name: sendPost
	 * description : send post request from client to external server 
	 * @param {Object} options: set external source localtion
	 * @param {Object} postData: post data sent to external server.
	 * @param {Function} cb: post callback, result for;
	 */
	function sendPostRequest(options, postData, cb){
		//server
		if(fw.IS_SUMERU_SERVER){
            postData = encodeURIComponent(JSON.stringify(postData));
            var defaultOptions = {
				method : 'POST',
				headers: {
			        'Content-Type': 'application/x-www-form-urlencoded',
			        'Content-Length': postData.length
			    }
			};

			var opts = Library.objUtils.extend(true, defaultOptions, options);

	        _doPost(opts, postData, function(data){
	        	cb(data);
	        });

		} else { //client
			if(!options || !postData){fw.log("please specify options or postData for sumeru.external.post");return false;}
			cb = cb || function(){};

			var cbn = "WAITING_EXTERNAL_POST_CALLBACK_" + fw.utils.randomStr(8);

			fw.netMessage.setReceiver({
		        onMessage : {
		            target : cbn,
		            overwrite: true,
		            once:true,
		            handle : function(data){
		            	cb(data);
		            }
		        }
		    });

			fw.netMessage.sendMessage({
		        cbn : cbn,
		        options : options,
		        postData : postData
		    }, "SEND_EXTERNAL_POST");
		}

	}

	/**
	 * package: external
	 * method name: sync
	 * description : mandatory sync existed remote data
	 * @param {String} modelName: sync modelName
	 * @param {String} pubName: sync pubName.
	 * @param {String} url: sync url.
	 * @param {Function} cb: sync callback, result for;
	 */
	function synchronize(modelName, pubName, url, cb){

		if(fw.IS_SUMERU_SERVER){
            var urls = urlMgr[modelName];
            var config = externalConfig[pubName];

            _sync(modelName, pubName, url, function(){}, function(){
            	cb({msg:"ok"});
            });
		} else { //client
			if(arguments.length < 3){
				fw.log("please sepecify modelName, pubName and url in order.");
				return false;
			}

			var cbn = "WAITING_SYNC_CALLBACK_" + fw.utils.randomStr(8);

			fw.netMessage.setReceiver({
		        onMessage : {
		            target : cbn,
		            overwrite: true,
		            once:true,
		            handle : function(data){
		            	cb && cb(data);
		            }
		        }
		    });

			fw.netMessage.sendMessage({
		        cbn : cbn,
		        modelName : modelName,
		        pubName : pubName,
		        url : url
		    }, "SEND_SYNC_REQUEST");
		}
		

	}
	
	external.__reg('doFetch', externalFetch, 'private');		//external.fetch
	external.__reg('doPost', externalPost, 'private');		//external.post
	external.__reg('get', sendGetRequest);
	external.__reg('post', sendPostRequest);
	external.__reg('sync', synchronize);
	
}

if(typeof module !='undefined' && module.exports){
    module.exports = runnable;
}else{
    runnable(sumeru);
}