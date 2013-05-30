require(__dirname + '/../build/build.js');
var fw = require(__dirname + '/../src/newPkg.js')();
/**
 * 在做其它引用之前，标记当前运行状态为 server.
 * 确保在此下引入的所有文件中，均可使用 fw.IS_SUMERU_SERVER做为当前运行环境的判断
 */
fw.__reg('IS_SUMERU_SERVER', true);
// fw.__reg('SUMERU_APP_FW_DEBUG', false);   // 单独关掉server端的debug开关

fw.__reg('idField', 'smr_id');
fw.__reg('clientIdField', '__clientId');

/**
 * 以下引入js均需使用newPkg.js的功能，在node中，整个运行过程中，只在这里载入一次，
 * 其它组件文件只需载入newPkg.js即可，否则将引发一个重复载入的错误。
 */
 
require(__dirname + '/../src/sumeru.js')(fw);

//build model
require(__dirname + '/serverModel.js')(fw);

/**
 *  库的引用
 */
var path = require('path');
var fs = require('fs');
var log = require(__dirname + '/../src/log.js');
var findDiff = require(__dirname + '/findDiff.js')(fw);
var SnapshotMgrFactory = require(__dirname + '/snapshotMgr.js')(fw);


//===================
var runFileServer = true;
if (typeof process.BAE != 'undefined'){
    runFileServer = false;
}
// 启用文件server

//===================
var STATUS_LOGIN = "1";

var config = fw.config;
var netMessage = fw.netMessage;

var clientTracer = fw.addSubPackage("clientTracer");
var SocketMgr = {};
var SubscribeMgr = {};
var PublishContainer = {};

/*
 * 维护一个client与其所打开的所有socket的映射关系.
 * 结构为
 * {
 *  clientId_1:[socketId_1,socketId_2,socketId_3,...],
 *  clientId_2:[socketId_1,socketId_2,socketId_3,...],
 *  ......
 * } 
 */
var clientToSocket = {};
var socket_count = 0;
var socket_count_reg = 0;
var nope = function(){};

//startup a server
var PORT = config.get('socketPort');

var idField = fw.idField;

var DbCollectionHandler = require(__dirname + "/DbCollectionHandler.js")(fw);
var getDbCollectionHandler = DbCollectionHandler.getDbCollectionHandler;
var createDB = DbCollectionHandler.createDB;
var ObjectId = DbCollectionHandler.ObjectId;
var serverCollection = DbCollectionHandler.serverCollection;
var appendUserInfoNCallback = require(__dirname + '/lib/appendUserInfoNCallback.js');

// trigger的触发频率. 单位毫秒， 在单位时间内的所有trigger将合并为一次，用于控制DB压力
var trigger_rate = 1000;

//==============
// 用户追踪方法
//==============

/**
 * 尝试从每次连接的clientid中查出新的clientId
 */
clientTracer.__reg('findClient',function(clientId){
    if(clientToSocket[clientId] || !clientId){
        return;
    }
    clientToSocket[clientId] = [];
});

clientTracer.__reg('onClientConnection',function(clientId){
    if(!clientId){
        return;
    }
    console.log("client connection: " + clientId);
    netMessage.sendLocalMessage({clientId : clientId},'Client_Connection');
});

clientTracer.__reg('onClientDisconnection',function(clientId){
    if(!clientId){
        return;
    }
    console.log("client disconnection: " + clientId);
    netMessage.sendLocalMessage({clientId : clientId},'Client_Disconnection');
});

clientTracer.__reg('onSocketConnection',function(clientId,socketId){
    //debugger;
    if(!socketId || !clientId){
        return;
    }
    
    socket_count_reg ++;
    var socketArr = clientToSocket[clientId];
    
    /*
     * 记录socket与client关系，一个client可以同时有多个socket,
     * 当socket ＝ 1时，即该用户的第一个socket连接时，触发onClientConnection
     */
    if(Array.isArray(socketArr) &&  socketArr.indexOf(socketId) == -1){
        socketArr.push(socketId);
    }else{
        socketArr = clientToSocket[clientId] = [socketId];
    }
    
    if(socketArr.length == 1){
        clientTracer.onClientConnection(clientId);
    }
    // console.log("client " + clientId + ", socket connection :" + socketId);
    netMessage.sendLocalMessage({clientId : clientId, socketId: socketId},'Client_SocketConnection');
    
});

clientTracer.__reg('onSocketDisconnection',function(clientId,socketId){
    
    if(!socketId){
        return;
    }
    socket_count_reg --;
    var socketArr = null, p = null;
    if(clientId){
        /*
         * 大部份情况， 都应同时提供clientId与socketId.
         */
        
        socketArr = clientToSocket[clientId];
        /*
         * 记录socket与client关系，一个client可以同时有多个socket,
         * 当socket ＝ 0 时，即该用户的最后一个socket断开时，触发onClientDisconnection
         */
        if(Array.isArray(socketArr)){
            p = socketArr.indexOf(socketId);
            socketArr.splice(p,1);
        }
        
        if(!socketArr || socketArr.length == 0){
            clientTracer.onClientDisconnection(clientId);
            // 删除clientid记录.
            delete clientToSocket[clientId];
        }
        console.log("socket disconnection, client " + clientId + ", socket disconnection :" + socketId , "Active Socket reg :" + socket_count_reg , "Active Client : " + Object.keys(clientToSocket).length);
        netMessage.sendLocalMessage({clientId : clientId, socketId: socketId},'Client_SocketDisconnection');
    }else{
        /*
         * 如果未提供clientId，则应是由pushUpdateOfModel时，未找到socketId对应的socket引发.
         * 此时的清理，是清理非正常断开的socket.正在常的情况下，不应走这个else.
         */
        // 如果没有clientid，则需要遍历所有的client并找到对应的socket并断开
        console.log("trying to clear the socketId:", socketId , ", that does not have a corresponding clientId");
        for(var key in clientToSocket){
            socketArr = clientToSocket[key];
            if(Array.isArray(socketArr)){
                p = socketArr.indexOf(socketId);
                if(p != -1){
                    // 找到clientId下的的socket连接,并触发断开事件;
                    clientTracer.onSocketDisconnection(key,socketId);
                    return;
                }
            }
        }
    }
    
});

clientTracer.__reg("socketCount",function(clientId){
    return clientToSocket[clientId].length;
});

/**
 * 根据一组clientId发送GlobalMessage.
 */
clientTracer.__reg("SendGlobalMessageByClientId",function(msg,tag,clientId){
    var id = null, sockets = null;
    if(!msg || !tag || !clientId){
        return;
    }
    
    for(var ckey in clientId){
        id = clientId[ckey];
        sockets = clientToSocket[id];
        for(var skey in sockets){
            netMessage.sendGlobalMessage(msg,tag,sockets[skey]);
        }
    }
});


//==============

fw.publish = function(modelName, pubName, pubFunc, options) {
    
    var defaultOptions = {
        onPubEnd : function() {
        },
        
        beforeInsert : function(collection, data, userinfo, callback){
            callback();
        },
        afterInsert : function(collection, data, userinfo) {},
        beforeUpdate : function(collection, data, userinfo, callback) {
            callback();
        },
        afterUpdate : function(collection, data, userinfo) {},
        beforeDelete : function(collection, data, userinfo, callback) {
            callback();
        },
        afterDelete : function(collection, data, userinfo) {},
        
        onInsert : function(collection, data, userinfo) {
        },
        onUpdate : function(collection, data, userinfo) {
        },
        onDelete : function(collection, data, userinfo) {
        }
    };
    options = Library.objUtils.extend(defaultOptions, options);

    var collection = new serverCollection.create(modelName);

    if (pubFunc) {
        /*pubFunc = (function(collection){
         return function(callback){
         console.log('here in pub', arguments);
         //pubFunc(collection, callback);
         }
         })(collection);*/

    } else {
        pubFunc = function(callback) {
            return collection.find({}, function(err, items) {
                //console.log('after resolve', JSON.stringify(items));
                callback(items);
            });
        };
    }

    PublishContainer[pubName] = {
        modelName : modelName,
        collection : collection,
        handle : function(args, callback, userinfo) {

            var _args = args;
            var _pubArgsLen = pubFunc.length - 1;
            //去掉callback参数后的长度

            _args = appendUserInfoNCallback.buildParam(_args, _pubArgsLen, userinfo, callback);

            //如果subscribe时传递的参数和pubFunc本身接受的参数数量不一致，则忽略多余的参数，但要保证callback作为最后一位正确传递。
            //加了userinfo 参数后，无法忽略参数，有可能userinfo在pubFunc中未定义，无法保证callback。
            /* if(_args.length != pubFunc.length){
             _args.splice(Math.max(0, Math.min(pubFunc.length, _args.length) - 1));
             _args.push(callback);
             } */
            pubFunc.apply(collection, _args);
        },
        options : options,
        clients : {},
		clientTracker : {}
    };

};

fw.securePublish = function(modelName, pubName, pubFunc, options) {
    fw.publish.apply(this, arguments);
    var pub = PublishContainer[pubName];
    pub.needAuth = true;
};

fw.publishByPage = function(modelName, pubName, pubFunc, options) {
    fw.publish.apply(this, arguments);
    var pub = PublishContainer[pubName];
    pub.isByPage = true;
};

fw.securePublishByPage = function(modelName, pubName, pubFunc, options) {
    fw.publish.apply(this, arguments);
    var pub = PublishContainer[pubName];
    pub.needAuth = true;
    pub.isByPage = true;
};
fw.publishPlain = function(modelName, pubName, pubFunc, options) {
    fw.publish.apply(this, arguments);
    var pub = PublishContainer[pubName];
    pub.plainStruct = true;//publish 的输出是简单对象，不是一个model。
};
fw.securePublishPlain = function(modelName, pubName, pubFunc, options) {
    fw.publish.apply(this, arguments);
    var pub = PublishContainer[pubName];
    pub.plainStruct = true;
    pub.needAuth = true;
};

//暂时现先在这里run起来server.js
require(__dirname  + '/authServer.js')(fw, getDbCollectionHandler,ObjectId);

//Init poller
require(__dirname + '/poller/poller.js')(fw,getDbCollectionHandler);


//require all publish and model
var appPath  = __dirname + '/../../app' + 
    ((typeof process.BAE == 'undefined' && process.argv[2]) ? '/' +process.argv[2] : '');
var publishBaseDir = appPath + '/publish';
var allTheDirFiles = []; 

var findAllTheDirFiles = function(theDir) { //遍历theDir目录下的所有文件， 并存于allTheDirFiles数组。
    var theDirFiles = fs.readdirSync(theDir);
    for (var i = 0, len = theDirFiles.length; i < len; i++) {
        var thePath = theDir + '/' + theDirFiles[i];
        theDirFiles[i].indexOf('.') === -1 ? findAllTheDirFiles(thePath) : allTheDirFiles.push(thePath);
    }
};

if (fs.existsSync(publishBaseDir)) {
    findAllTheDirFiles(publishBaseDir);
    allTheDirFiles.forEach(function(file) {
        if (path.extname(file) == '.js') {
            require(file)(fw);
        };
    });
} else {
    log.dev(publishBaseDir + ' didnot exist');
}

var runStub = function(db) {
    
    //向所有client发送config更新信息
    fw.pushUpdateOfConfig = function(configMap){
        var subscribersAll = SubscribeMgr ? SubscribeMgr : [];
        
        for (var i in subscribersAll){
            var subscribers = subscribersAll[i];
            subscribers.forEach(function(item, index){
            (function(item){
                netMessage.sendMessage(configMap,
                           'config_write_from_server',
                           item.socketId,
                           function(err){
                               console.log('send config_write_from_server fail ' + err);
                           },function(){
                               console.log('send config_write_from_server ok...');
                           }
                          );
            })(item);
            });
        };
    }
    
    require(__dirname  + '/../library/rsa/sumeru-rsa.js')(fw, getDbCollectionHandler,ObjectId);

    //var groupManager = require(__dirname + "/groupManager.js")(fw,getDbCollectionHandler,ObjectId);
    
    var http = require("http");
    var sockjs = require("sockjs");
    // 是否载入并启动文件server
    if (runFileServer) {
        var fsServer = require(__dirname + "/FileServer.js");
        fsServer && fsServer();
    }
    
    //start websocket-http server
    var globalServer = http.createServer(function(req, res) {
    }).listen(PORT, function() {
        log.write('Server Listening on ' + PORT);
    });
    
    // register the server to group
    //groupManager.register([{addr:config.get('selfGroupManagerAddr') || '0.0.0.0',port:config.get('selfGroupManagerPort') || (parseInt(PORT) + 3000)}]);

 // =====================  NET MESSAGE DISPATCHER , WANG SU ================== // 
    //start websocket server
    
    var sock = sockjs.listen(globalServer, {
        prefix : '/socket'
    });

    sock.on("connection", function(conn) {
        
        if(!conn){
            console.log('no connection object.');
            return;
        }
        socket_count ++;
        conn.on("data", function(msg){
            //FIXME 做跨域连接检测和授权检查
            //后面的pk判断是用于如果server的pk变化，中断后重新交换公钥的时候不加密,所以此处遇到'{}'不解密。
            if (fw.config.get("rsa_enable") && msg.substring(0,1) !== "{") {
                msg = fw.myrsa.decrypt(msg);
            }
            
            log.write("retrieving " + msg);
            
            netMessage.onData(msg,conn);
        });

        conn.on("close", function(){
            socket_count --;
            console.log( "Active Socket:" + socket_count);
 //           netMessage.sendLocalMessage({clientId : conn.clientId},'Client_Disconnection');
            clientTracer.onSocketDisconnection(conn.clientId,conn._sumeru_socket_id);
            clearSocketMgrBySocketId(conn._sumeru_socket_id);
//            delete SocketMgr[conn._sumeru_socket_id];
//            for (var model in SubscribeMgr){
//                var clients = SubscribeMgr[model];
//                for (var i = 0, l  = clients.length; i < l; i++){
//                    if (clients[i].socketId == conn._sumeru_socket_id) {
//                        //删除这一项
//                        clients.splice(i, 1);
//                        i--;
//                        l--;
//                    };
//                }
//                if (clients.length == 0) {
//                    delete SubscribeMgr[model];
//                };
//            }
//            scanPublishEnd();
        });
    });
    
    
    var clearSocketMgrBySocketId = function(_sumeru_socket_id){
        delete SocketMgr[_sumeru_socket_id];
        for (var model in SubscribeMgr){
            var clients = SubscribeMgr[model];
            for (var i = 0, l  = clients.length; i < l; i++){
                if (clients[i].socketId == _sumeru_socket_id) {
                    //删除这一项
                    clients.splice(i, 1);
                    i--;
                    l--;
                };
            }
            if (clients.length == 0) {
                delete SubscribeMgr[model];
            };
        }
        scanPublishEnd();
    };
    
    /**
     * 绑定实际使用socket发送数据的方法
     * @param {Object} data
     * @param {Object} socketId
     */
    netMessage.setOutput(function(data,socketId,onerror,onsuccess){
        var socket = SocketMgr[socketId];
        
        if (!socket) {
            onerror && onerror("no socket");
            return true;
        };
        var data2;
        if (fw.config.get("rsa_enable") && data.match(/\"swappk\"/) === null) {
            //在socket中管理交换得来的pk
            data2 = fw.myrsa.encrypt(data,socket.mypk);
        }else{
            data2 = data;
        }
        
        socket.write(data2);
        onsuccess && onsuccess();
        log.swrite('sending:', data.substr(0, 400));
    });
    
    /**
     * 默认接收者，防止引发无handle的异常
     */
    var default_receiver = function(msg) {
        console.log("default receiver: this message not have a clear receiver [" + JSON.stringify(msg) + "]");
    };
    
    var log_receiver = function(msg,target){
        console.log("client log : [ " + target + " ] " + JSON.stringify(msg) );
    };
    
    netMessage.setReceiver({
        onS2SMessage:default_receiver,
        onLocalMessage:default_receiver,
        onError:default_receiver,
        onMessage:default_receiver,
        onGlobalError:default_receiver,
        onGlobalMessage:default_receiver,
        onLogMessage:log_receiver
    });
    
    /**
     * 接收消息的过滤器, 用于将消息中附带的sessionId与clientId附加回链接对像上.
     * 此操作，用于验证模块.
     */
    var whiteList_notAuth = ['echo', 'auth-init'];
    
    /*因为sessionId是存在Cookie中的，因此构建一个有状态记录和队列的存储对象，当一个sessionId在等待进行验证时，其他该队列上的需要验证的消息都排队等待
    /验证完成后，将顺序执行队列中的等待方法*/
    /**
     * sessionAuthQueue格式 = {
     *  sessionid : {status : idle / validating / done, 
     *    queue : [callback, callback]
     * },.....
     * }
     */
    var sessionAuthQueue = {};
    
    netMessage.addInFilter(function(msg,conn,cb){
        /*
         * 排除S2S消息和本地消息。
         */
        
        if(msg.number != 600 && msg.number != 0 && conn != undefined ){
            
            /*
             * FIXME 
             * 此处对conn所附加的信息，相当于一个保持于connection活动期间的短session，可用于记录一些简单的信息，
             * 更合理的方式是将这组信息分离出单独实现一个用于server端的session对像，
             * 但由于现在记录和使用的信息量不大，所以暂不实现session.
             */
            var needAuth = false;
            
            /*
             * 如果三个传是相同的，只可能是undefined或null，统一认为首次传入登际标记并进行验证 
             */
            if(conn.sessionId === conn.clientId && conn.clientId === conn.passportType){
                //如果msg里有，而conn上没有sessionId，说明需要校验登陆了，否则是可能根本没登陆过
                if (msg.sessionId) {
                    needAuth = true;    
                };
            }else{
                /*
                 * 如果三个值中，任意一个值与上次不同，则重新认证
                 */
                needAuth = needAuth || conn.sessionId != msg.sessionId;
                needAuth = needAuth || conn.clientId != msg.clientId;
                needAuth = needAuth || conn.passportType != msg.passportType;
            }
            
            // 判断是否需要验证后，立即从msg上取得clientId，防止在echo请求时，connection上没有clientId对像
            conn.clientId = msg.clientId || null;
            clientTracer.findClient(msg.clientId);
            if (msg.sessionId && sessionAuthQueue[msg.sessionId] && sessionAuthQueue[msg.sessionId].status == 'validating') {
                
                var callback__ = (function(cb, msg, conn){
                        return function(){
                            cb(msg, conn);   
                        }
                    })(cb, msg, conn);
                
                sessionAuthQueue[msg.sessionId].queue.push(callback__);
                return;
            };
            
            /*
             * 
             * 将登陆信息记录在conn上，当链接断开的时候将自动销毁。
             * 在客户端传入验证信息未变化的情况下，不重复查询数据库。以此同时减少数据库的查询.
             * 
             * =======================================
             * 
             * FIXME 
             * 此处由于缺少server事件的通知机制，所以在存在异步IO操作时，无法保证用户请求的操作时续。
             * 所以暂时需要跳过用户首次连接时注册socket的echo操作.使node跳过DB的IO操作，用来保证用户注册连接的时续。
             *  
             * =======================================
             * 
             * FIXME
             * 此处为了减少数据库查询，记录了用户在线的信息，并且认为如果用户连接对像conn未断开用户就不存在会话超时，
             * 但是由于缺少一个用户离线通知的机制用于通知认证服务当前持有该sessionId的用户的online或offline状态，
             * 所以认证server的离线超时记算可能会换效，可预见的后果为，用户长时间在线活动后，刷新页面却得到一个认证超时而需要重新登陆。
             * 
             * 处理解决该问题的建议方式为，在conn连接时，通知认证服务用户状态为online，当conn断开时，通知认证服务用户状态为offline，
             * 当用户再次使用sessionId重新登陆时，使用上次离线时间与本次上线时间的间隔计算超时。同时减少db查询次数并可以计算用户超时。
             */
            if(needAuth && whiteList_notAuth.indexOf(msg.target) == -1){
                if (msg.sessionId) {
                    sessionAuthQueue[msg.sessionId] = sessionAuthQueue[msg.sessionId] || {
                        status : 'idle',
                        queue : []
                    }
                    sessionAuthQueue[msg.sessionId].status = 'validating';
                };
                conn.sessionId = msg.sessionId || null;
                conn.passportType = msg.passportType || null;
                conn.userinfo = null;
                conn.loginStatus = null;
                fw.checkLogin(conn.clientId, conn.sessionId, conn.passportType, function(status, userinfo){
                    conn.loginStatus = status;
                    conn.userinfo = userinfo;
                    
                    if(userinfo){
                        userinfo.clientId = conn.clientId;      //确保始终携带正确的clientId
                    }
                    
                    cb(msg,conn);   //下一个过滤
                    if (msg.sessionId && sessionAuthQueue[msg.sessionId]) {
                        var queue = sessionAuthQueue[msg.sessionId].queue;
                        
                        while(queue && queue.length){
                            queue.shift()();
                        }
                        
//                        for(var i = 0, l = queue.length; i < l; i++){
//                            queue[i]();
//                        }
                        
                        sessionAuthQueue[msg.sessionId] = null;
                        delete sessionAuthQueue[msg.sessionId];
                        //sessionAuthQueue[msg.sessionId].status = 'done';
                    }
                });
                return;
            } else if (msg.content
                        && 
                        (msg.content.match(/"name":"auth-login"/)
                         || msg.content.match(/"name":"auth-login-baidu"/)
                         || msg.content.match(/"name":"other-login"/)
                        )){
                //如果是登陆请求，则清空其sessionId，等待下次请求（登陆后的第一次请求），去更新是否已登录的状态
                conn.sessionId = null;                    
            };
        }

        return cb(msg,conn);   //下一个过滤
    },100);
    
    /**
     * 注册一个socket连接
     */
    netMessage.setReceiver({
        onMessage:{
            target:'echo',
            handle:function(content,target,conn){
                var socketId = content.socketId;
                
                if(!socketId){
                    console.log("No SocketId, Can't register connection");
                    conn.write("ERROR: NO SOCKET_ID");
                    return;
                }
                
                if(SocketMgr[socketId]){
                    console.log("same socketId, Can't register connection");
                    conn.write("ERROR: SAME SOCKET_ID");
                    return;
                }
                
                
                SocketMgr[socketId] = conn;
                conn._sumeru_socket_id = socketId;
                if (content.pk){
                    // fw.myrsa.setPk2(content.pk);//server端有了客户端的公钥
                    //server的加密不用存pk2，而是存在socket中
                    SocketMgr[socketId].mypk = content.pk;
                }
                    
                console.log('register socket, id:' + socketId);
                
                clientTracer.onSocketConnection(conn.clientId,socketId);
                
                //抽取pubname => modelName的对应关系
                var publishModelMap = {};
                for (var pubname in PublishContainer){
                    publishModelMap[pubname] = {
                                                'modelname' : PublishContainer[pubname]['modelName'],
                                                'plainstruct' : PublishContainer[pubname]['plainStruct']
                                                };
                }
                var msgObj = {
                    timestamp: (new Date()).valueOf(),
                    pubmap : publishModelMap
                };
                if (fw.config.get("rsa_enable")){
                    msgObj.swappk = fw.myrsa.getPk();//server传递给客户端自己的公钥，这句不加密
                }
                setTimeout(function(){
                    netMessage.sendMessage(msgObj,'echo_from_server', socketId, function(err){
                        console.log('send echo_from_server faile' + err);
                    }, function(){
                        console.log('send echo_from_server ok');
                    });
                },0);
            }
        }
    });
    
    var destroysubscribe = function(modelName){

        if(!(modelName in SubscribeMgr)){
            return;
        }
        
        //移除SubscribeMgr中的记录，并通过scanPublishEnd来判断是否需要删除整条Publish记录
        var clients = SubscribeMgr[modelName];
        for (var i = 0, l  = clients.length; i < l; i++){
            if (clients[i].socketId == conn._sumeru_socket_id) {
                //删除这一项
                clients.splice(i, 1);
                i--;
                l--;
            };
        }
        
        if (clients.length == 0) {
            delete SubscribeMgr[modelName];
        };
    };

    var unsubscribe = function(content, target, conn){
        console.log('triigeer unsbuscribe', content);
        if (typeof PublishContainer[content.pubname] == 'undefined') {
            return;
        };
        var modelName = PublishContainer[content.pubName].modelName;
        destroysubscribe(modelName);
        
        scanPublishEnd();
    };
    
    netMessage.setReceiver({
        onMessage:{
            target:'unsubscribe',
            handle:unsubscribe
        }
    });
    
    var trigger_push_cache = [];
    var trigger_push_timer = null;
    
    /**
     * 外部用网络来触发对某个model进行更新push检查和后续的push
     */
    var run_trigger = function(){
        // 如果没有trigger内容，则停止周期执行
        if(trigger_push_cache.length == 0){
            clearTimerout(trigger_push_timer);
            return;
        }else{
            var modelName = "";
            while(modelName = trigger_push_cache.shift()){
                fw.pushUpdateOfModel(modelName);
                console.log('trigger_push, modelName:' + modelName);
            }
        }
        trigger_push_timer = clearTimeout(trigger_push_timer);
    };
    
    var trigger_push = function(content,target,conn){
        //如果打开了Cluster，且当前消息不是来自Cluster的触发，就发送cluster更新通知
        if (fw.config.cluster.get('enable') === true
            && fw.cluster && target != fw.cluster.channelNameRev) {
            
            fw.netMessage.sendLocalMessage(content, fw.cluster.channelNameSend);    
        } else { 
        
        	var modelName = content.modelName;
        
        	if(trigger_push_cache.indexOf(modelName) == -1){
            	trigger_push_cache.push(modelName);
        	}
        
        	if(!trigger_push_timer){
            	// 稀释trigger的频率.每秒一次
            	trigger_push_timer = setTimeout(run_trigger,trigger_rate);
        	}
        }
        
        //fw.pushUpdateOfModel(modelName);
    };
    
    
    netMessage.setReceiver({
        onLocalMessage:{
            target:'trigger_push',
            handle:trigger_push
        },
        onMessage:{
            target:'trigger_push',
            handle:trigger_push
        },
        onS2SMessage:{
            target:'trigger_push',
            handle:trigger_push
        }
    });
    if (config.cluster.get('enable') === true) {
        var cluster_mgr = require(__dirname + '/cluster.js');
        
        netMessage.setReceiver({
            onLocalMessage:{
                target:cluster_mgr.channelNameRev,
                handle:trigger_push
            }
        });
        
        cluster_mgr.init(fw);
        
        fw.cluster = cluster_mgr;
    }


    /*
     *处理client config更新
     */
    var updateConfig=function(obj){
    	var configdiff = 0;
    	if(obj && typeof obj === "object"){   
    	    for(var ob in obj){ 
    		if (typeof fw.config.get(ob) == 'undefined'){
    		    console.log('add config : ' + ob);
    		    configdiff = 1;
    		}
    		fw.config.set(ob,obj[ob]);
    	    }
    	}
    };


    var config_push = function(content, target, conn){
	   var configMap = content;
	   updateConfig(configMap);	
    };

    netMessage.setReceiver({
    	onMessage:{
    	    target: 'config_push',
    	    handle: config_push
    	}
    });

    
     /**
     * 处理数据上传请求
     */
    netMessage.setReceiver({
        onMessage:{
            target:'data_write_from_client',
            handle:function(content,type,conn){
                
                console.log('data_write_from_client receiver.....');
                
                var pubname = content.pubname;
                var pubRecord = typeof PublishContainer[pubname] == 'undefined'? false: PublishContainer[pubname];

                var modelchain = content.modelchain;
                var pilotid = content.pilotid;
                var socketId = conn._sumeru_socket_id;
                var clientId = conn.clientId;

                var struct = JSON.parse(JSON.stringify(content.data)),
                    structData = struct.cnt;
                var modelname = struct.modelName;
                var modeltemp = fw.model.getModelTemp(modelname);

                if(modeltemp.needAuth){
                    if(conn.loginStatus !== STATUS_LOGIN){
                        netMessage.sendError({
                            pubname: pubname,
                            pilotid: pilotid,
                            data: []
                        }, 'data_auth_from_server',socketId,
                        function(){console.log('send data_auth_from_server failed');},
                        function(){console.log('send fail to auth');}
                        );
                        return;
                    }
                }

                var errorHandle = function(errorType,errorData){
                    netMessage.sendError({
                            pubname: pubname,
                            pilotid: pilotid,
                            modelchain : modelchain,
                            data: errorData
                        },errorType,
                        socketId,
                        function(){console.log('send ' + errorType + ' faile');},
                        function(){console.log('send ' + errorType + ' ok');}
                    );
                }
                
                var collection = new serverCollection.create(modelname);

                if(struct.type == 'insert'){
                    var doInsert = function(modifiedData){
                        
                        if (typeof modifiedData != 'undefined') {
                            structData = modifiedData;
                        };
                        
                        var id = structData[idField];
                            
                        delete structData.__clientId;   
                        
                        structData[idField] = ObjectId(structData[idField]);
						
						/*FIXME 
                            坑1：所有该model的子model都会通过beforeInsert，beforeUpdate事件
                            坑2: 传入事件中的collection实际都是最外层的一个
                            坑3: 在事件处理函数中，没有modelName可供判断，只能通过判断某特殊字段来判断model类型，如果错误的写入一个字段，会因为验证失败导致该次插入失败
                        * */
                        collection.insert(structData,function(){
                            //写回insert id
                            content.data.cnt[idField] = id;
                            
                            if(pubRecord){
                                //运行绑定的事件 onInsert接口为以前遗留，在此兼容
                                pubRecord.options.onInsert(pubRecord.collection, structData, conn.userinfo);
                                pubRecord.options.afterInsert(pubRecord.collection, structData, conn.userinfo);
                            }
                            
                            //fw.netMessage.sendS2SMessage({modelName:struct.modelName},"trigger_push",nope,nope);
                            //fw.pushUpdateOfModel(struct.modelName);
                            fw.netMessage.sendLocalMessage({modelName:struct.modelName}, 'trigger_push');    
                        },errorHandle,struct.modelName);    
                    };
                    
                    if(pubRecord){
                        //如果开发者在beforeInsert中没有调用callback，则意味终止对db的操作和afterInsert的触发，也不会有diff操作产生
                        //添加userinfo后调用beforeInsert
                        appendUserInfoNCallback.callFunc(pubRecord.options.beforeInsert, 
                                                        [pubRecord.collection, structData],
                                                        conn.userinfo,
                                                        doInsert);
                    }else{
                        doInsert();
                    }
                    
                }else if (struct.type == 'delete'){

                    var doDelete = function(modifiedData){
                        
                        if (typeof modifiedData != 'undefined') {
                            structData = modifiedData;
                        };
                        
                        var removeItem = {};
                        removeItem[idField] = ObjectId(structData[idField]);
                        collection.remove(removeItem,function(){
                            
                            //运行绑定的事件
                            pubRecord.options.afterDelete(pubRecord.collection, structData);
                            pubRecord.options.onDelete(pubRecord.collection, structData);
                            //fw.netMessage.sendS2SMessage({modelName:struct.modelName},"trigger_push",nope,nope);
                            //fw.pushUpdateOfModel(struct.modelName);
                            fw.netMessage.sendLocalMessage({modelName:struct.modelName}, 'trigger_push');
                        },errorHandle,struct.modelName);    
                    };
                    
                    //如果开发者在beforeDelete中没有调用callback，则意味终止对db的操作和beforeDelete的触发，也不会有diff操作产生
                    //添加userinfo后调用doDelete
                    appendUserInfoNCallback.callFunc(pubRecord.options.beforeDelete, 
                                                    [pubRecord.collection, structData],
                                                    conn.userinfo,
                                                    doDelete);
                } else if (struct.type == 'update'){

                    var doUpdate = function(modifiedData){
                        
                        if (typeof modifiedData != 'undefined') {
                            structData = modifiedData;
                        };
                        
                        var id = structData[idField];
                        delete structData[idField];
                        var updateItem = {};
                        updateItem[idField] = ObjectId(id);
                        collection.update(updateItem,structData,function(){
                            
                            //运行绑定的事件
                            pubRecord.options.onUpdate(pubRecord.collection, structData);
                            pubRecord.options.afterUpdate(pubRecord.collection, structData);
                            //fw.netMessage.sendS2SMessage({modelName:struct.modelName},"trigger_push",nope,nope);
                            //fw.pushUpdateOfModel(struct.modelName);
                            fw.netMessage.sendLocalMessage({modelName:struct.modelName}, 'trigger_push');
                        },errorHandle,struct.modelName);
                    }
                    
                    //如果开发者在beforeUpdate中没有调用callback，则意味终止对db的操作和afterInsert的触发，也不会有diff操作产生
                    appendUserInfoNCallback.callFunc(pubRecord.options.beforeUpdate, 
                                                    [pubRecord.collection, structData],
                                                    conn.userinfo,
                                                    doUpdate);
                }
            }
        }
    });
        
    /**
     * 处理订阅
     */
    netMessage.setReceiver({
        onMessage:{
            target:'subscribe',
            handle:function(content,target,conn){
                
                console.log('subscribe receiver.....', pubname , socketId);
                
                var pubname = content.name;
                var socketId = conn._sumeru_socket_id;
                var clientId = conn.clientId;
                var clientVersion = content.version;

                var byPageSegment = new RegExp('@@_sumeru_@@_page_[\\d]+');
                //如果是对分页的订阅，拷贝出一个带有页码订pubname
                if (pubname.match(byPageSegment)&&!PublishContainer[pubname]) {
                    var base_pubname = pubname.replace(byPageSegment, '');

                    PublishContainer[pubname] = Library.objUtils.extend(true, {}, PublishContainer[base_pubname]);
                    PublishContainer[pubname].clients = {};
                };
                
                if (!PublishContainer[pubname]) {
                    return;
                }
                
                var pubRecord = PublishContainer[pubname]; 

                
                var args = content.args || [], 
                    modelName = pubRecord.modelName;
                //FIXME 需要过滤modelName的值，使其符合object的key的要求
                if (!SubscribeMgr[modelName]) {
                    SubscribeMgr[modelName] = [];
                }
                

                // 去重,防止两次相同订阅
                var hasDuplicated = SubscribeMgr[modelName].some(function(item){
                    // 如果socketid不一样,则订阅不重复
                    if(socketId != item.socketId){
                        return false;
                    }
                    
                    // 如果订阅名称不一样,则订阅不重复
                    if(pubname != item.pubname){
                        return false;
                    }
                    
                    if(args.length + 1 != item.args.length){
                        return false;
                    }
                    
                    // 如果参数数量值有任何一项不一样,则订阅不重复
                    if(!args.every(function(obj,index){
                        return this[index] == obj;
                    },item.args)){
                        return false;
                    }
                    console.log('\n\n ===========\n\n same subscribe : ' + args.join(' , '));
                    // 否则认为订阅重复.
                    return true;
                });
                if(!hasDuplicated){
                    //订阅无重复，执行订阅
                    
                    //在args有变的情况下，先去除老的记录。
                    var cleanArr = SubscribeMgr[modelName].filter(function(item){
                        if(item.pubname == pubname && item.socketId == socketId){
                            console.log('CLEAR [pubname :' + pubname + ", socketId : " + socketId + " ] ");
                            return false;
                        }else{
                            return true;
                        }
                    });
                    
                    SubscribeMgr[modelName].length = 0;
                    
                    SubscribeMgr[modelName] = cleanArr;
                    
                    //这里传过来的args应该是从第二位开始的具体参数（第一位是pub的名字本身）
                    SubscribeMgr[modelName].push({
                        socketId: socketId,
                        pubname: pubname,
                        args: args
                    });
                    
                    scanPublishEnd();
                    
                } // else 对于完全重复的，直接忽略本次subscribe

                
                
                //fetch the publish record on server
                var collection = pubRecord.collection,
                    pubFunc = pubRecord.handle,
                    
                    onComplete = function(dataArray){
                        
                        pubRecord.clients[socketId] = pubRecord.clients[socketId] || {snapshot : []};
						//clientTrack 用来追踪client, 缓存client历史snapshot
                        pubRecord.clientTracker[clientId] = pubRecord.clientTracker[clientId] || { snapshotMgr : SnapshotMgrFactory.createSnapshotMgr(pubname) };
						
                        //首次subscribe时清空clientTracker.snapshotMgr
                        if(!clientVersion){
                            pubRecord.clientTracker[clientId].snapshotMgr.reset();
                        }

                        //通过 clientVersion 判断是first subscribe还是redo subscribe
                        //如果有clientVersion && server端有记录，则增量传输
                        var snapshot = pubRecord.clientTracker[clientId].snapshotMgr.get(clientVersion);
                        var deltaFlag = clientVersion && snapshot;

                        if(deltaFlag){
                            var diffData = findDiff(dataArray, pubRecord.clientTracker[clientId].snapshotMgr.get(clientVersion), PublishContainer[pubname]["modelName"]);
                            if(!diffData.length){
                                //console.log(pubname, 'has NO DELTA, STOP!');
                                return false;
                            }
                        }

                        var dataVersion = pubRecord.clientTracker[clientId].snapshotMgr.add(dataArray);

                        //如果是分页请求，且为该页第一次请求，保存其左右边界
                        if (pubRecord.isByPage && 
                            typeof pubRecord.leftBound == 'undefined' &&
                            typeof pubRecord.rightBound == 'undefined' && 
                            dataArray.length) {
                                
                            //如果是byPage，则传递到server的第一个参数一定是pageOptions，读取其中的page和uniqueField
                            var _pageOptions = args[0],
                                uniqueField = _pageOptions['uniqueField'];
                            
                            var leftBound, rightBound;
                            
                            //要求数据集应该是基于uniqueField排序的
                            leftBound = dataArray[0][uniqueField];
                            rightBound = dataArray[dataArray.length - 1][uniqueField];
                            
                            if (_pageOptions.page == 1) {
                                //如果是第一页则左边界为无约束
                                leftBound = -1;
                            };
                            
                            _pageOptions.bounds = {left : leftBound, right : rightBound};
                        };
                        
                        //start to write_data to client

                        var params = {
                            pubname: pubname,
                            modelName : modelName,
                            data : deltaFlag ? diffData : dataArray,
                            flag : deltaFlag ? 'live_data' : 'full_ship',
                            version : dataVersion
                        }

                        var cmd = deltaFlag ? 'data_write_from_server_delta' : 'data_write_from_server';

                        netMessage.sendMessage(params, cmd, socketId, function(err){
                                console.log('send data_write_from_server fail ' + err , socketId);
                            }, function(){
                                console.log('send data_write_from_server ok' , socketId);
                            }
                        );
                        
                    };
                
                //run publish function with args and callback
                if(pubRecord.needAuth){
                    console.log('connection', conn.loginStatus);
                    if(conn.loginStatus === STATUS_LOGIN){
                        pubFunc.call(collection, args, onComplete, conn.userinfo);
                    }else{
                        netMessage.sendError({
                            pubname: pubname,
                            data: []
                        },'data_auth_from_server',
                        socketId,
                        function(){console.log('send data_auth_from_server failed');},
                        function(){console.log('do auth failed');}
                        );
                    }
                }else{
                    //log.swrite(PublishContainer);
                    //log.swrite(pubname);
                    //log.swrite(pubRecord);
                    pubFunc.call(collection, args, onComplete, conn.userinfo);
                }
            }
        }
    });
    


    /**
     * 检查每个publish是否已经没有subscriber，如果是则执行options里的onPubEnd。
     */
    var scanPublishEnd = function(){
        var found = {};
        for (var pubname in PublishContainer){
            found[pubname] = {};
            for (var socketId in PublishContainer[pubname].clients){
                found[pubname][socketId] = 'hasPub';
            }
        }
        
        
        for (var modelName in SubscribeMgr){
            var subArray = SubscribeMgr[modelName];
            subArray.forEach(function(item){
                found[item.pubname][item.socketId] = 'hasSubcribe'; 
            });
        }
        
        
        for (var pubname in found){
            
            var pubRecord = PublishContainer[pubname];
            
            for (var client in found[pubname]){
                if (found[pubname][client] == 'hasSubcribe') {
                    continue;
                };
                
                pubRecord.options.onPubEnd.call(pubRecord.collection, pubRecord.collection);
                delete pubRecord.clients[client];
            }
        }
        
    };


    

    fw.pushUpdateOfModel = function(modelName){
        
        //find all subscriber
        var subscribers = SubscribeMgr[modelName] ? SubscribeMgr[modelName] : [];
        
        var walkLog = {}; //防止循环引用
        var walkModelRelation = function(_modelName){
            var _modelRelation = fw.model.getModelRelation(_modelName);
            if (_modelRelation && !walkLog[_modelName]) {
                walkLog[_modelName] = true;
                var tmpSubRecord;
                for (var i = 0, l = _modelRelation.length; i < l; i++){
                    tmpSubRecord = SubscribeMgr[_modelRelation[i]];
                    if (tmpSubRecord) {
                        //这里的subscriber是逃逸变量
                        subscribers = subscribers.concat(tmpSubRecord);    
                    };
                    walkModelRelation(_modelRelation[i]);
                }
            }
        };
        
        walkModelRelation(modelName);
        //log.dev('---------walk modelrelation result', subscribers, '----', fw.model.modelRelation, '++++', modelName);
        
        /*
         * FIXME 如果此时新增的数据,在查询的时候被排除在订阅数据的查询条件外,则会导至新插入的数据不会被重新下发至客户端.
         * 此时在客户端新增的数据不会形成有效的快照,这种情况下,客户端的新增数据将变成一条无效数据,对该条数据的操作都将失效.
         */ 
        subscribers.forEach(function(item, index){
            //do not skip current subscriber
            //write back to make sure the consistence.
            var pubRecord = PublishContainer[item.pubname],
                pubFunc = pubRecord.handle;

            (function(item, pubRecord){
                var stop = false;
                /**
                 * 不知为何，socketId在某种情况下，无法指向一个存在的socket连接对像，在此种情况下，由于数据无法返回客户端，继续做下发并无意义。所以直接退出。
                 * FIXME 更好的方式是找出丢失连接的原因，并清理掉不存在连接的subscriber.
                 */
                if(!SocketMgr[item.socketId]){
                    console.log('SocketMgr: lost connection, the socket id is " ' + item.socketId + '"');
                    clientTracer.onSocketDisconnection(null,item.socketId);
                    clearSocketMgrBySocketId(item.socketId);
                    return;
                }
                
                var userinfo = SocketMgr[item.socketId].userinfo;
				var clientId = SocketMgr[item.socketId].clientId;
				
                //FIXME 这里现在其实有性能问题，对每个subscriber都会重新运行一次pubFunc。但由于异步的问题，现在没有实现缓存其结果。
                pubFunc.call(pubRecord.collection, item.args, function(dataArray){
                    
                    if (typeof pubRecord.clients[item.socketId] == 'undefined') {
                        //没有socketId的记录意味着没有subscribe过这个publish
                        return;
                    };
                    
                    if(JSON.stringify(dataArray) === JSON.stringify(pubRecord.clientTracker[clientId].snapshotMgr.getLatest())){
                        //如果这条增量没有导致实质的数据改变，就不推送了
                        stop = true;
                    };
                    
                    if (!stop) {
                        
                        var diffData = findDiff(dataArray, pubRecord.clientTracker[clientId].snapshotMgr.getLatest(), PublishContainer[item.pubname]["modelName"]);

                        var dataVersion = pubRecord.clientTracker[clientId].snapshotMgr.add(dataArray);
						
                        netMessage.sendMessage({
                                pubname : item.pubname,
                                data : !PublishContainer[item.pubname].plainStruct ? diffData :dataArray, //这里其实就是struct，不过传输的是没有删除过clientid，和id的版本
                                //flag : 'full_ship'
                                flag : 'live_data',
								version : dataVersion
                            },
                            'data_write_from_server_delta',
                            item.socketId,
                            function(err){
                                console.log('send data_write_from_server_delta fail ' + err  , item.pubname , item.socketId);
                            },function(){
								console.log('send data_write_from_server_delta ok...' , item.pubname , item.socketId);
                            }
                        );
                        
                    };
                }, userinfo);
            })(item, pubRecord);

        });
    };

   
};



createDB(function(err, db){
    runStub(db);
});