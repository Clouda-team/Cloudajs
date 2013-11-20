var runnable = function(fw){	
	
    var _controller = fw.controller;
    var _model = fw.model;
    var isServer = fw.IS_SUMERU_SERVER;
    
    function mergeArray(array, struct){
        var structGroupType,structGroupCnt;
        for (var i = 0, ilen = struct.length; i < ilen; i++){
            structGroupType = struct[i]['type'];
            structGroupCnt = struct[i]['cnt'];
            if(structGroupType=="append"){
                array.splice(array.length,0,structGroupCnt);
            }else if(structGroupType=="update"){
                array[structGroupCnt['id']] = structGroupCnt['cnt'];
            }else if(structGroupType=="splice"){
                array.splice(structGroupCnt);
            }
        }
    };
    function mergeObj(obj, struct){
        var structGroupType,structGroupCnt;
        for (var i = 0, ilen = struct.length; i < ilen; i++){
            structGroupType = struct[i].type;
            structGroupCnt = struct[i].cnt;
            if(structGroupType=="insert"){
                for(var p in structGroupCnt){
                    obj[p] = structGroupCnt[p];
                }
            }else if(structGroupType=="update"){
                for(var p in structGroupCnt){
                    obj[p] = structGroupCnt[p];
                }
            }else if(structGroupType=="delete"){
                for(var p,plen=structGroupCnt.length; p<plen; p++){
                    obj[p] = undefined;
                }
            }
        }
    };
    function mergeModel(model, struct){
        var structGroupType,structGroupCnt;
        var modelName = model._modelName;
        var modelFieldsMap = fw.model._getModelTemp(modelName)._fieldsMap,
            fieldType,subModelName,subModelRelation;
        for (var i = 0, ilen = struct.length; i < ilen; i++){
            structGroupType = struct[i].type;
            structGroupCnt = struct[i].cnt;

            if(structGroupType=="insert"){
                for(var p in structGroupCnt){
                    fieldType = modelFieldsMap[p]['type'];
                    if(fieldType=="model"){
                        subModelName = modelFieldsMap[p]['model'];
                        subModelRelation = modelFieldsMap[p]['relation'];
                        if(subModelRelation=="many"){
                            var subCollection = fw.collection.create({modelName : subModelName},structGroupCnt[p]);
                            model._baseSet(p, subCollection);
                        }else{
                            subModel = fw.model.create(subModelName, structGroupCnt[p]);
                            model._baseSet(p, subModel);
                        }
                    }else{
                        model._baseSet(p, structGroupCnt[p]);
                    }
                } 
            }else if(structGroupType=="update"){

                for(var p in structGroupCnt){
                    fieldType = modelFieldsMap[p]['type'];
                    if(fieldType=="model"){
                        subModelName = modelFieldsMap[p]['model'];
                        subModelRelation = modelFieldsMap[p]['relation'];
                        if(subModelRelation=="many"){
                            mergeCollection(model[p],structGroupCnt[p]);
                        }else{
                            mergeModel(model[p],structGroupCnt[p]);
                        }
                    }else if(fieldType=="array"){
                        model._baseSet(p, structGroupCnt[p]);
                        /*不好判断，暂时直接赋值。mergeArray(model[p],structGroupCnt[p]);*/
                    }else if(fieldType=="object"){
                        mergeObj(model[p],structGroupCnt[p]);
                    }else{
                        model._baseSet(p, structGroupCnt[p]);
                    }
                } 
            }else if(structGroupType=="delete"){
                for(var j=0,jlen = structGroupCnt.length;j<jlen;j++){
                    model._delete(structGroupCnt[j]);
                }
            }

        }
    }
    /**
     * Merge服务器下发的增量数据
     * 由syncCollection调用
     */
    function mergeCollection(collection, delta, serverVersion){

        //增量
        var doReactiveProcess = false;
        for (var i = 0, ilen = delta.length; i < ilen; i++){
            var struct = delta[i];
            //此处顺序为，先insert，delete,然后update
            if(struct.type == 'insert'){
                var structData = struct['cnt'];
                var is_exist = collection.find({smr_id : structData.smr_id});
                if (is_exist.length) {
                    /*当本次存在id相同的项目时，认为是latency compensation的server回发请求，
                    但由于服务器上可能通过beforeInsert来修改数据，因此在这里先移除本地数据，再使用服务器的数据*/
                   /*FIXME 这里应该有一个标记，判断数据是否被服务器修改过，否则每次都reactive性能太差*/
                    /*collection.remove({
                        'smr_id' : structData.smr_id
                    });
                   
                    /*collection.update({
                        _id : structData._id
                    }, {
                        __clientId : structData.__clientId
                    })*/
                    doReactiveProcess = false;
                } else {
                    var externalInfo = fw.pubsub._subscribeMgr[collection.pubName].externalInfo;
                    if(externalInfo){
                        var uc = externalInfo.uniqueColumn;
                        var criteria = {};
                        criteria[uc] = structData[uc];
                        var is_uc_exist = collection.find(criteria);
                        if(is_uc_exist.length){
                            is_uc_exist[0].set("smr_id", structData.smr_id);
                        }else{
                            collection.add(structData);
                        }
                    }else{
                        collection.add(structData);
                    }
                    doReactiveProcess = true;  
                }
            } else if (struct.type == 'delete'){
                var structData = struct['cnt'];
                //属于server下发的删除，只做remove即可，因为不知道到底是数据被删除，还是仅因为不符合pubfunc规则而被移除了
                
                collection.remove({
                    'smr_id IN' : structData //这里已经是经过server变换的smr_id数组了
                });
                doReactiveProcess = true;
                
            } else if (struct.type == 'update'){

                var model = collection.find({
                    smr_id    :  struct.id
                });

                if(model.length>0){
                    model = model[0];
                }else{
                    continue;
                }
                var structData = mergeModel(model,struct['cnt']);
                /*var updateMap = {};
          
                updateMap = structData;
                //FIXME 这里是setdirty唯一的问题，服务器下发的update会把dirty位搞脏。但不造成实际bug影响，因会触发diff，发现并无实质更新
                collection.update(updateMap, {
                    smr_id    :  struct.id
                });*/
                doReactiveProcess = true;
            }
            //更新client collection version
            collection.setVersion(serverVersion);
        }
        return doReactiveProcess;
    }


    function deltaProcess (collection, delta) {
        
        var i = [];   //inserted item
        var d = [];   //deleted item
        var u = [];   //updated item

        delta.forEach(function(item){

            if (item.type === 'insert') {
                i.push(item.cnt);
            } else if (item.type === 'delete') {
                item.cnt.forEach(function(smr_id){
                    d.push(smr_id);    
                });
            } else if (item.type === 'update') {
                var cnt = item.cnt;
                var smr_id = item.id;
                item.cnt.forEach(function(upd){
                    u.push({
                        cnt : upd.cnt,
                        smr_id : smr_id
                    });
                });
            }

        });

        if(i.length){ collection.onInsert && collection.onInsert(i); }
        if(d.length){ collection.onDelete && collection.onDelete(d); }
        if(u.length){ collection.onUpdate && collection.onUpdate(u); }

    }
	
	function syncCollection(type, pubname, val, item, isPlainStruct, serverVersion){
	    var collection = item.collection,
            doReactiveProcess = false,
            delta = [];
        
        if(isPlainStruct){//publish callback是传过来的data是个简单对象。不是一个collection
            collection = val;
            doReactiveProcess = true;
        }else{
            if(type == 'data_write_from_server_delta'){
                delta = val;
                doReactiveProcess = mergeCollection(collection, delta, serverVersion);
            } else {
                //全量
                if(!collection._isSynced() || collection.stringify() !== JSON.stringify(val)){
                    collection.setData(val);
                    collection.setVersion(serverVersion);
                    doReactiveProcess = true;
                }
            }
        }
        
        if(!isPlainStruct)collection._takeSnapshot();


        //onInser, onUpdate, onDelete callback
        deltaProcess(collection, delta);

        if(doReactiveProcess === true){
            
            //因为JS的单线程执行，只要callback中没有setTimeout等异步调用，全局变量tapped_blocks就不会产生类似多进程同时写的冲突。
            //FIX BY SUNDONG,tapped_blocks在callback不要清空已经bind的东西
            //添加修正，由于前端渲染是实时进行，所以在前端的回调中，要清空已渲染的
            var tapped_blocks = [];
            if (_controller._tapped_blocks && isServer) {
                tapped_blocks = _controller._tapped_blocks;
            }else{
                _controller.__reg('_tapped_blocks', tapped_blocks, true);
            }
            
            
            var byPageSegment = new RegExp('@@_sumeru_@@_page_([\\d]+)'),
            ifPageMatch = pubname.match(byPageSegment);
            if (ifPageMatch) {
                item.callback(collection, {
                    //delta : delta,  FIXME 待端=>云的协议与云=>端的协议统一后，统一提供增量的delta给subscribe
                    page  : ifPageMatch[1]
                });  //额外传递一个页码page 
            } else {
                item.callback(collection, {
                    delta : delta //FIXME 待端=>云的协议与云=>端的协议统一后，统一提供增量的delta给subscribe
                });

            }
            
            //每个Controller的render方法会保证局部渲染一定等待主渲染流程完成才开始。
            _controller && _controller.reactiveRender(tapped_blocks);
        }
        
        //a flag tells if data have been stored remotely
        if(!isPlainStruct)collection._setSynced(true);
    }
    
    /*
     * 因为collection执行hold方法而延迟执行的数据同步队列
     * 结构：
     * [{
     *     collection : 
     *     runner :
     * },{},...]
     */
    var postponeQueue = fw.pubsub._postponeQueue;
    
    
    // ==========  消息处理  ============
    
    /**
     * 接收到全局消息
     */
    var onGlobalMessage = function(data) {
        if (fw.onGlobalMessage) {
            fw.onGlobalMessage(data);
        } else {
            fw.dev("GLOBAL MESSAGE : " + data);
        }
    };
    
    /**
     * 接收到全局错误消息
     */
    var onGlobalError = function(data,target){
	var msg = target == 'data_auth_from_server' ? 'auth faild' : data;
	if(fw.onGlobalError ){
	    fw.onGlobalError(msg);
	}else{
	    fw.log("GLOBAL ERROR : " + msg);
	}
    };
    
    /**
     * 认证消息的数据
     * 当接收到服务端产生的认证失败消息时被触发，用于通知对应的controller认证失败，未获到有效数据
     */
    var onError_data_auth_from_server = function(data){
        if(!data.needAuth){
            var pubName = data.pubname;
            //candidates is array of collections
            var candidates = fw.pubsub._subscribeMgr[pubName].stub;
            
            //each stub
            //[{collection:@, onComplete : @}]
            
            var isSend = false;
            candidates.forEach(function(item, i){
                if(item.env.onerror){
                    item.env.onerror("auth failed");
                    isSend = true || isSend;
                }else{
                    /*
                     * FIXME , 当找到任何controll的onError,都认为错误消息派送成功
                     * 唯一派送失败的可能是，数据中没有pubname，或没有任何controller订阅当前pubname的数据.
                     */
                    isSend = false || isSend;
                }
            });
            // 如果当前消息没有成功的接收者，将转往globalError
            return isSend;
        }
    };

    var onError_data_write_from_server_dberror = function(data){

            var pubName = data.pubname;
            //candidates is array of collections
            var candidates = fw.pubsub._subscribeMgr[pubName].stub;
            
            //each stub
            //[{collection:@, onComplete : @}]
            
            var isSend = false;
            candidates.forEach(function(item, i){
                if(item.env.onerror){
                    item.env.onerror("dberror:"+data.data.stringify());
                    isSend = true || isSend;
                }else{
                    /*
                     * FIXME , 当找到任何controll的onError,都认为错误消息派送成功
                     * 唯一派送失败的可能是，数据中没有pubname，或没有任何controller订阅当前pubname的数据.
                     */
                    isSend = false || isSend;
                }
            });
            // 如果当前消息没有成功的接收者，将转往globalError
            return isSend;
    };

    var onError_data_write_from_server_validation = function(data){
        
        var pubName = data.pubname;
        var pilotId = data['pilotid'];
        if(pubName){
            //candidates is array of collections
            var candidates = fw.pubsub._subscribeMgr[pubName].stub;
            
            //each stub
            //[{collection:@, onComplete : @}]
            
            var isSend = false;
            candidates.forEach(function(item, i){
                if(item.collection.onValidation){
                    var resultObjs = data.data;
                    if(data.modelchain!=''){
                        for(var i=0,ilen=resultObjs.length;i<ilen;i++){
                            resultObjs[i]['key'] = data.modelchain+'.'+resultObjs[i]['key'];
                        }
                    }
                    item.collection.onValidation.call(item.collection,resultObjs.length>0?false:true, 'server', resultObjs);
                    isSend = true || isSend;
                }else{
                    /*
                     * FIXME , 当找到任何controll的onError,都认为错误消息派送成功
                     * 唯一派送失败的可能是，数据中没有pubname，或没有任何controller订阅当前pubname的数据.
                     */
                    isSend = false || isSend;
                }
            });
            // 如果当前消息没有成功的接收者，将转往globalError
            return isSend;
        }else{
            var _pilot = fw.msgpilot.getPilot(pilotId);
            var isSend = false;
            if(_pilot.stub.onValidation){
                var resultObjs = data.data;
                _pilot.stub.onValidation.call(_pilot.stub,resultObjs.length>0?false:true, 'server', resultObjs);
                isSend = true || isSend;
            }else{
                isSend = false || isSend;
            }
            return isSend;
        }
    };
    
    /**
     * 接收到服务端返回的echo信息
     * 1.同步时间
     * 2.添加了从服务器接收公钥
     */
    var onMessage_echo_from_server = function(data){
    	var localTimeStamp = (new Date()).valueOf(); 
    	serverTimeStamp = data.timestamp;
    	
    	if (typeof data.swappk !="undefined"){
    	    fw.myrsa.setPk2(data.swappk);
    	    //fw.log('从server获得新pk2',data.swappk);
        }
    	var getTimeStamp = function(){
    	    var now = (new Date()).valueOf(),
    	    delta = now - localTimeStamp,
    	    serverTimeNow = delta + serverTimeStamp;  
    	    return serverTimeNow;
    	};
    	
    	fw.utils.__reg('getTimeStamp', getTimeStamp);
    	
    	Library.objUtils.extend(sumeru.pubsub._publishModelMap, data.pubmap);
    	
        fw.netMessage.sendLocalMessage({}, 'after_echo_from_server');
    };
    
    /**
     * 接收到从服务端写过来的数据订阅消息
     */
    var onMessage_data_write_from_server = function(data,type){
        /**
         * format : 
         * name : pub name
         * val  : value object
         */
        var pubName = data['pubname'];
        var pilotId = data['pilotid'],
        	uk = data['uk']||"",
            val = data['data'],
            serverVersion = data['version'],
            externalInfo = data['external'] || "";

        if(pubName){
            if (!(pubName in fw.pubsub._subscribeMgr)) {
                return;
            };
            
            if (type == 'data_write_from_server' 
                && fw.pubsub._subscribeMgr[pubName].topPriority == true
                && typeof fw.pubsub._priorityAsyncHandler != 'undefined') {
                //如果是prioritySubscribe的全量写回（即第一次的返回），又存在fw.pubsub._priorityAsyncHandler(是redo)
                fw.pubsub._priorityAsyncHandler.decrease();
            };
            
            if(externalInfo){
                fw.pubsub._subscribeMgr[pubName].externalInfo = externalInfo;
            }
            
            //candidates is array of collections
            var candidates = fw.pubsub._subscribeMgr[pubName].stub;


            var isPlainStruct = sumeru.pubsub._publishModelMap[pubName.replace(/@@_sumeru_@@_page_([\d]+)/, '')]['plainstruct'];
            //each stub
            //[{collection:@, onComplete : @}]
            for(var i=0,len=candidates.length,item;i<len;i++){
        		item = candidates[i];
        		if (uk && uk!=item.id) {
                	continue;
                }
        	    var collection = item.collection;

                if(isPlainStruct){
                    syncCollection(type, pubName, val, item, isPlainStruct, serverVersion);
                }else{
                    if (collection.__smr__.isHolding) {
                        postponeQueue.push({
                            collection : collection,
                            runner : function(){syncCollection(type, pubName, val, item, false, serverVersion);}
                        });
                    } else {
                        syncCollection(type, pubName, val, item, false, serverVersion);
                    }
                }
            };
        }else{
            /*暂无此类调用*/
            var _pilot = sumeru.msgpilot.getPilot(pilotId);
            if(_pilot.type==='model'){

            }else{
                syncCollection(type, pilotId, val, item, false, serverVersion);
            }
        }

    };
    
    /**
     * 服务端发来的错误消息
     */
    var onError = function(data,type){
        
        var pubName = data['pubname'];
        //candidates is array of collections
        var candidates = fw.pubsub._subscribeMgr[pubName].stub;
        
        //each stub
        //[{collection:@, onComplete : @}]
        
        var isSend = false;
        candidates.forEach(function(item, i){
            
            if(item.env.onerror){
                item.env.onerror("auth failed");
                isSend = true || isSend;
            }else{
                /*
                 * FIXME , 当找到任何controll的onError,都认为错误消息派送成功
                 * 唯一派送失败的可能是，数据中没有pubname，或没有任何controller订阅当前pubname的数据.
                 */
                isSend = false || isSend;
            }
        });
        // 如果当前消息没有成功的接收者，将转往globalError
        return isSend;
    };
    
    /**
     * 从本地发来的消息
     */
    var onLocalMessage_data_write_latency = function(data,type){
	   var pubName = data['pubname'];
        //candidates is array of collections
        var candidates = fw.pubsub._subscribeMgr[pubName].stub;        
        //each stub
        //[{collection:@, onComplete : @}]
        candidates.forEach(function(item, i){
            var collection = item.collection;
            
            //因为JS的单线程执行，只要callback中没有setTimeout等异步调用，全局变量tapped_blocks就不会产生类似多进程同时写的冲突。
            var tapped_blocks = [];
            _controller.__reg('_tapped_blocks', tapped_blocks, true);
            item.callback(collection, { delta : [] });
            
            //每个Controller的render方法会保证局部渲染一定等待主渲染流程完成才开始。
            _controller.reactiveRender(tapped_blocks);
        });
    };


    
    var onMessage_config_write_from_server = function(data, type){
    	if(data && typeof data === "object"){   
    	    for(var ob in data){ 			    
    		fw.config.set(ob,data[ob]);
    	    }
    	}
    	fw.config.commit();
    };
    
    
    /**
     * 绑定服务下发消息处理
     */
    fw.netMessage.setReceiver({
    	onMessage : {
            overwrite : true,
    	    target : 'config_write_from_server',
    	    handle : onMessage_config_write_from_server
    	},
    	onLocalMessage : {
    		target : 'config_write_from_server',
    	    handle : onMessage_config_write_from_server
    	}
    });

    
    fw.netMessage.setReceiver({
    	onMessage : {
            overwrite : true,
    	    target : 'echo_from_server',
    	    handle : onMessage_echo_from_server
    	},
    	onLocalMessage:{
            overwrite : true,
    	    target : ['data_write_latency'],
    	    handle : onLocalMessage_data_write_latency
    	}
    });
    
    
    fw.netMessage.setReceiver({
    	onMessage:{
            overwrite : true,
    	    target:['data_write_from_server','data_write_from_server_delta'],
    	    handle : onMessage_data_write_from_server
    	},
    	onLocalMessage:{
            overwrite : true,
    	    target:['data_write_from_server','data_write_from_server_delta'],
    	    handle : onMessage_data_write_from_server
    	},
    	onError:onError,
    	onGlobalError:onGlobalError,
    	onGlobalMessage:onGlobalMessage
    });
    
    fw.netMessage.setReceiver({
        onError:{
            //该标记只有服务端认证失败时才返回
            overwrite : true,
            target:['data_auth_from_server'],           
            handle : onError_data_auth_from_server
        },
    });
    fw.netMessage.setReceiver({
        onError:{
            //该标记只有服务端DB操作失败时才返回
            overwrite : true,
            target:['data_write_from_server_dberror'],           
            handle : onError_data_write_from_server_dberror
        },
    });
    fw.netMessage.setReceiver({
        onError:{
            //该标记只有服务端model验证失败时才返回
            overwrite : true,
            target:['data_write_from_server_validation'],           
            handle : onError_data_write_from_server_validation
        },
    });
};
if(typeof module !='undefined' && module.exports){
    module.exports = runnable;
}else{//这里是前端
    runnable(sumeru);
}