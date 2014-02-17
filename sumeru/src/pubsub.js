var runnable = function(fw,PublishContainer){

    fw.addSubPackage('pubsub');

    var subscribeMgr = {};//TODO 这个在server运行的时候，当并发很多(>10/s)时，可能出现后一个请求覆盖前一个引起callback未执行的bug，server渲染自动终止。这里需要重新设计
    var publishModelMap = {a:1};
    var subscribeMgrKeys = []; //有序的key记录，每个key都是一个pubname，用于断线重连后按顺序redo subscribe

    var pubsubObject = function(){
        
    };
    var arrPop = Array.prototype.pop;
    var arrSlice = Array.prototype.slice;
    
    pubsubObject.prototype = {
        subscribe : function(pubName, /*arg1, arg2, arg3*/ onComplete){
            var _pubmap = publishModelMap[pubName.replace(/@@_sumeru_@@_page_([\d]+)/, '')];
            var modelName = _pubmap['modelname'];
            var plainStruct = _pubmap['plainstruct'];
            if (typeof modelName == 'undefined') {
                throw "publish " + pubName + ' NOT FOUND';
            };
            
            modelName = 'Model.' + modelName;
			
            var env = null;
            if ( typeof this === 'object' && typeof this.isWaiting !== 'undefined' ) {
                env = this ;//this是env
                env.wait();//自动调用wait方法
            }

            var completeCallback = arrPop.call(arguments);
            var args = arrSlice.call(arguments,1);

            var collection;
            var cache = fw.cache.getPubData(pubName,args);
            if(cache!=null){
                try{
                    cache = JSON.parse(cache);
                    collection = fw.collection.create({modelName : modelName}, cache);
                    collection.pubName = pubName;
                }catch(e){
                    collection = fw.collection.create({modelName : modelName});
                    collection.pubName = pubName;
                }
            }else{
                collection = fw.collection.create({modelName : modelName});
                collection.pubName = pubName;
            }
            
            //在collection上记了一下他是从哪个publish上来的
            
            //send the subscribe netMessage
            var version = collection.getVersion();
            var id =  this.__UK;
            
            if(!subscribeMgr[pubName]){
                subscribeMgrKeys.push(pubName);
                subscribeMgr[pubName] = {
                    modelName    :    modelName,
                    plainStruct  :    plainStruct,
                    args   : args,
                    topPriority : false, //是否在redo subscribe时要保证先进行
                    stub    :    []
                };
            }
            
            //因为有再次订阅会两次返回，所以查看stub是否存在以后几个
            //每次订阅都需要触发其他订阅的重新callback,如果是，这里补充env.wait
            //否则不补充env.wait
            for(var i=0,len = subscribeMgr[pubName].stub.length;i<len;i++){
                if (subscribeMgr[pubName].stub[i].id === id){
                    env && env.wait();
                }
            }
            
            var callbackStr = Function.toString.call(completeCallback);
            
            var sourceCustomClosure = this.subscribe.caller;  
            
            // 清理相同env下,相同customClosure所做的订阅
            subscribeMgr[pubName]['stub'] = subscribeMgr[pubName]['stub'].filter(function(item){
                
                if(item.id == id && item.sourceCustomClosure == sourceCustomClosure && item.callbackStr == callbackStr){
                    return false;
                }
                
                return true;
            });
            //去重之后，包装原有callback，添加处理wait的方法
            var tmpfunc = function( ){
            	try{
            		completeCallback.apply(undefined,arguments);
                }catch(e){
                	console.warn("error when pubsub callback on line 84 \n" + e.stack || e);
                }
                if(env){
                    env.start();//自动调用start方法
                }
            };
            subscribeMgr[pubName]['stub'].push({
                id : id,
                sourceCustomClosure : sourceCustomClosure,
                collection    :    collection,
                callback      :    tmpfunc,
                callbackStr   :    callbackStr,
                args   : args,
                env           :    this
            });
            
            var sendObj = {
                name    :    pubName,
                //去掉第一个pubname，去掉最后一个回调函数
                args    :    args,
                uk:id,
                version :    version
            };
            if (env && env.clientId){//from server controller
                 sendObj.clientId = env.clientId;
            }
            fw.netMessage.sendMessage(sendObj,'subscribe', function(err){
                sumeru.log("error : subscribe " + err);
            },function(){
                sumeru.dev("send subscribe " + pubName, version || 'no version');
            });
            //for offline render中会执行callback，里面会用到return的 collection，所以需要延迟执行。--jin
            if(cache!=null){
                //collection.render();
                setTimeout((function(c){return function(){c.render()}})(collection),0);
            }
            return collection;
            //when data received from server, will run the onComplete
        },
        
        subscribeByPage : function(pubName, options, /*arg1, arg2,...*/ onComplete){
            var defaultOptions = {
                pagesize : 10,
                page : 1,
                uniqueField : 'time'
            };
            
            options = Library.objUtils.extend(defaultOptions, options);
            
            var args = arguments;
            //替换pubName
            args[0] = pubName + '@@_sumeru_@@_page_' + options.page;
            
            var collection = this.subscribe.apply(this, args);
            
            return collection;
        },
        
        prioritySubscribe : function(pubName, /*arg1, arg2,...*/ onComplete){
            var args = arguments;
            var collection = this.subscribe.apply(this, args);
            
            subscribeMgr[pubName].topPriority = true;
            
            return collection;
        }
    };
    
    /**
     * 断线重连后，重做所有subcribe
     */
    var redoAllSubscribe = function (){
        redoAllPrioritySubscribe_(redoAllNormalSubscribe_);
    };
    
    var redoAllPrioritySubscribe_ = function(callback){
        cbHandler = Library.asyncCallbackHandler.create(function(){
            callback();
            fw.pubsub.__reg('_priorityAsyncHandler', undefined, true);
        });
        
        fw.pubsub.__reg('_priorityAsyncHandler', cbHandler, true);
        cbHandler.add();

        //找出所有有优先级的订阅，发起并等待它们执行完毕
        for(var i = 0, l = subscribeMgrKeys.length; i < l; i++){
            
            var pubname = subscribeMgrKeys[i];
            if (pubname == 'auth-init') { //auth-init由auth init负责调用，不需要再重复redo了。
                continue;
            };
            if (!(pubname in subscribeMgr)) {
                continue;
            };
            if (subscribeMgr[pubname].topPriority === false) {
                continue;
            };
            
            cbHandler.add();
            
            //redo all priority subscribe netMessage
            var version = subscribeMgr[pubname].stub[0].collection.getVersion();
            fw.netMessage.sendMessage({
                name    :    pubname,
                //去掉第一个pubname，去掉最后一个回调函数
                args    :    subscribeMgr[pubname]['args'],
                version :    version
            },'subscribe' , function(err){
                fw.log("error : redoPrioritySubscribe", err);
            } , function(){
                fw.dev("sending redo priority subscribe " + pubname, version || "no version(redo)");
            });
        }
        
        cbHandler.enableCallback();
        cbHandler.decrease();

    };
    var redoAllNormalSubscribe_ = function(){
        //执行所有普通订阅
        for(var i = 0, l = subscribeMgrKeys.length; i < l; i++){
            
            var pubname = subscribeMgrKeys[i];
            if (pubname == 'auth-init') { //auth-init由auth init负责调用，不需要再重复redo了。
                continue;
            };
            if (!(pubname in subscribeMgr)) {
                continue;
            };
            if (subscribeMgr[pubname].topPriority === true) {
                continue;
            };
            
            var version = subscribeMgr[pubname].stub[0].collection.getVersion();
            //redo normal subscribe netMessage
            fw.netMessage.sendMessage({
                name    :    pubname,
                //去掉第一个pubname，去掉最后一个回调函数
                args    :    subscribeMgr[pubname]['args'],
                version :    version
            },'subscribe' , function(err){
                fw.log("Err : redoNormalSubscribe", err);
            } , function(){
                fw.dev("sending redo priority subscribe " + pubname, version || "no version(redo)");
            });
        }    
    };
    fw.pubsub.__reg("clearClient",function(client_id){//server controller destroy
    	for(var pubName in subscribeMgr){
    		subscribeMgr[pubName]['stub'] = subscribeMgr[pubName]['stub'].filter(function(item){
	            if(item.id == client_id || !item.id){
	                return false;
	            }
	            return true;
	        });
	        if (subscribeMgr[pubName]['stub'].length == 0){
	        	delete subscribeMgr[pubName];
	        }
    	}
    });
    fw.pubsub.__reg('clear',function(){
        var item;
        for(var pubName in subscribeMgr){
            item = subscribeMgr[pubName].stub || {};
            for(var key = item.length -1; key >= 0; key--){
                if(item[key].env.isDestroy){
                    item[key].collection = null;
                    item[key].callback = null;
                    item[key].env = null;
                    item.splice(key,1);
                };
            }
            if (item.length == 0) {
                //FIXME 不用实时回收，因为很多情况下refresh会unsub然后又sub
                //如果stub已经为空，通知Server，当前Client可以unsubscribe这个pubName了 
                fw.netMessage.sendMessage({
                    name : pubName
                }, 'unsubscribe', function(err){}, function(){
                    fw.dev('unsubscribing', pubName);
                });
                
                delete subscribeMgr[pubName];
                subscribeMgrKeys = subscribeMgrKeys.filter(function(item){
                    if (item == pubName) {
                        return false;
                    };
                    return true;
                });
            };
        }
    },true);
    
    fw.pubsub.__reg('_pubsubObject', pubsubObject, true);
    fw.pubsub.__reg('_subscribeMgr', subscribeMgr, true);
    fw.pubsub.__reg('_publishModelMap', publishModelMap, true);
    fw.pubsub.__reg('_redoAllSubscribe', redoAllSubscribe, true);
    
    /**
     * 延迟执行数据同步相关：
     */
    fw.pubsub.__reg('_postponeQueue', [], 'private');
    
    var postponeQueue = fw.pubsub._postponeQueue;
    /**
     * 释放后执行数据同步
     */
    var releaseHold = function(collection){
        if (postponeQueue.length === 0) {
            return;
        };
        
        postponeQueue.forEach(function(item, index){
            if (item.collection == collection) {
                //执行后删除该记录
                item.runner();
                postponeQueue.splice(index, 1);
            };
        });
    };
    
    fw.pubsub.__reg('_releaseHold', releaseHold, 'private');
    
    if (typeof PublishContainer !='undefined' ){//server no echo
    	(function(PublishContainer){
	    	for (var pubname in PublishContainer){
	            publishModelMap[pubname] = {
		            'modelname' : PublishContainer[pubname]['modelName'],
		        	'plainstruct' : PublishContainer[pubname]['plainStruct']
	            };
	        }
	    })(PublishContainer)
    }
    
};
if(typeof module !='undefined' && module.exports){
    module.exports = runnable;
    
}else{//这里是前端
    runnable(sumeru);
}
