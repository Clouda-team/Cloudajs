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

//设置server的bae变量
fw.__reg('BAE_VERSION', (function(){
    var version = 0;
    if (process.env && process.env.SERVER_SOFTWARE === 'bae/3.0') {
        version = 3;
    }else if (typeof process.BAE !== 'undefined'){
        version = 2;
    }else{
    }
    return version;
})());
fw.log("node start,running checking bae version:"+fw.BAE_VERSION);
/**
 * 以下引入js均需使用newPkg.js的功能，在node中，整个运行过程中，只在这里载入一次，
 * 其它组件文件只需载入newPkg.js即可，否则将引发一个重复载入的错误。
 */

require(__dirname + "/../server_client/server_router.js")(fw);

require(__dirname + '/../src/sumeru.js')(fw);

GLOBAL.App = {},GLOBAL.Model = {};
GLOBAL.SUMERU_DEFAULT_CONTROLLER;

//build model
require(__dirname + '/serverModel.js')(fw);

/**
 *  库的引用
 */
var path = require('path');
var fs = require('fs');
require(__dirname + '/../src/log.js')(fw);
var findDiff = require(__dirname + '/findDiff.js')(fw);
var snapshotMgr = require(__dirname + '/snapshotMgr.js');
//===================
var runFileServer = true;
var viewPath;

// 启用文件server

//===================
var STATUS_LOGIN = "1";

var config = fw.config;

var netMessage = fw.netMessage;

var runServerRender = (config.get('runServerRender')===false)?false:true;//默认开启server渲染
fw.router.setServerRender(runServerRender);

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
var nope = function(){};

//startup a server


var PORT;
if (fw.BAE_VERSION === 2) {
    PORT = process.env.APP_PORT;
}else if (fw.BAE_VERSION === 3){
    PORT = 18080;
}else{
    PORT = config.get('httpServerPort');
}

var idField = fw.idField;

var DbCollectionHandler = require(__dirname + "/DbCollectionHandler.js")(fw);
var getDbCollectionHandler = DbCollectionHandler.getDbCollectionHandler;
var createDB = DbCollectionHandler.createDB;
var ObjectId = DbCollectionHandler.ObjectId;
var serverCollection = DbCollectionHandler.serverCollection;
var appendUserInfoNCallback = require(__dirname + '/lib/appendUserInfoNCallback.js');

require('./sysAuth.js');
require("./clientTracer.js");

var clientTracer = fw.clientTracer;

// trigger的触发频率. 单位毫秒， 在单位时间内的所有trigger将合并为一次，用于控制DB压力
var trigger_rate = 1;
var _server_socket_id = '99999';

/**
 * 默认接收者，防止引发无handle的异常
 */
var default_receiver = function(msg,targe) {
    fw.dev("default receiver: this message not have a clear receiver [  %s ] target: %s" , JSON.stringify(msg) , targe);
};

var log_receiver = function(msg,target){
    fw.dev("client log : [ " + target + " ] " + JSON.stringify(msg) );
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



//==============

fw.publish = function(modelName, pubName, pubFunc, options) {
    
    var defaultOptions = {
        onPubEnd : function() {

        },
        beforeInsert : function(collection, data, userinfo, callback){
            
            callback();
        },
        onInsert : function(collection, data, userinfo) {
            
        },
        afterInsert : function(collection, data, userinfo) {
            
        },
        beforeUpdate : function(collection, data, userinfo, callback) {
            
            callback();
        },
        onUpdate : function(collection, data, userinfo) {
            
        },
        afterUpdate : function(collection, data, userinfo) {
            
        },
        beforeDelete : function(collection, data, userinfo, callback) {
            
            callback();
        },
        onDelete : function(collection, data, userinfo) {
            
        },
        afterDelete : function(collection, data, userinfo) {
            
        },
        beforePost : function(collection, data, userinfo, callback){
            
            callback();
        },
        onPost : function(collection, data, userinfo){
            
        },
        afterPost : function(collection, data, userinfo){
            
        }
    };
    options = Library.objUtils.extend(defaultOptions, options);

    var collection = new serverCollection.create(modelName);//FIXME 注意这里

    if (pubFunc) {
        /*pubFunc = (function(collection){
         return function(callback){
         fw.dev('here in pub', arguments);
         //pubFunc(collection, callback);
         }
         })(collection);*/

    } else {
        pubFunc = function(callback) {
            return collection.find({}, function(err, items) {
                //fw.dev('after resolve', JSON.stringify(items));
                callback(items);
            });
        };
    }

    PublishContainer[pubName] = {
        modelName : modelName,
        collection : collection,
        handle : function(args, callback, clientInfo) {

            var _args = args;
            var _pubArgsLen = pubFunc.length - 1;
            //去掉callback参数后的长度

            _args = appendUserInfoNCallback.buildParam(_args, _pubArgsLen, clientInfo, callback);

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
		clientTracker : {},
        extPublish : (pubFunc.toString().indexOf('.extfind') >= 0) ? true : false   //判断是否为external publish
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

fw.sysAuth.initPublish();

//暂时现先在这里run起来server.js
// require(__dirname  + '/authServer.js')(fw, getDbCollectionHandler,ObjectId);

//Init poller
require(__dirname + '/poller/poller.js')(fw,getDbCollectionHandler);


//require all publish and model
var appPath  =  process.appDir;
var publishBaseDir = appPath + '/publish';
var allTheDirFiles = []; 

if (fw.BAE_VERSION != 2){//
    viewPath = appPath + '/bin';
}else{//TODO 为了老用户平滑迁移，本次不动build目录，等平滑迁移后，再指引做足再迁移2.0 (原BAE的app.conf转发规则/bin指向__bae__/bin)
	viewPath = __dirname + '/../../__bae__/bin';
}

var findAllTheDirFiles = function(theDir) { //遍历theDir目录下的所有文件， 并存于allTheDirFiles数组。
    var theDirFiles = fs.readdirSync(theDir);
    for (var i = 0, len = theDirFiles.length; i < len; i++) {
        var thePath = theDir + '/' + theDirFiles[i];
        theDirFiles[i].indexOf('.') === -1 ? findAllTheDirFiles(thePath) : allTheDirFiles.push(thePath);
    }
};


var externalConfig;

if (fs.existsSync(publishBaseDir)) {
    findAllTheDirFiles(publishBaseDir);
    allTheDirFiles.forEach(function(file) {
        if (path.extname(file) == '.js') {

            var publishModuleObject = require(file);
            if((typeof publishModuleObject).toLowerCase() === "function"){
                var publishModule = require(file)(fw);
                if(publishModule && publishModule.config && publishModule.type === 'external'){
                    externalConfig = publishModule.config;
                }
            }else if((typeof publishModuleObject).toLowerCase() === "object"){//兼容老的external.js
                var publishModule = require(file);
                if(publishModule && !publishModule.config && publishModule.geturl){
                    externalConfig = publishModule;
                }
            }
            
        };
    });

} else {
    fw.dev(publishBaseDir + ' DO NOT EXIST');
}

var http = require("http");
var https = require("https");
var sockjs = require("sockjs");
var serverObjectId = require("./ObjectId");
var url = require('url');
require(__dirname + '/../src/external.js')(fw, findDiff, publishBaseDir, externalConfig, http, https, serverObjectId, url);


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
                               fw.log('send config_write_from_server fail ' + err);
                           },function(){
                               fw.dev('send config_write_from_server ok...');
                           }
                          );
            })(item);
            });
        };
    };
    
    require(__dirname  + '/../library/rsa/sumeru-rsa.js')(fw, getDbCollectionHandler,ObjectId);

    //var groupManager = require(__dirname + "/groupManager.js")(fw,getDbCollectionHandler,ObjectId);
    
    
    // 是否载入并启动文件server
    var fsServer;
    if (runFileServer) {
        if (runServerRender){
        	require(__dirname + "/../src/session.js")(fw);
        	require(__dirname + "/../src/event.js")(fw);
	        require(__dirname + "/../src/pubsub.js")(fw,PublishContainer);
	        require(__dirname + "/../src/sense.js")(fw);
            require(__dirname + "/../src/pilot.js")(fw);
            require(__dirname + "/../src/cache.js")(fw);
	        
	        require(__dirname + '/../src/model.js')(fw);
			require(__dirname + '/../src/modelPoll.js')(fw);
			require(__dirname + '/../src/query.js')(fw);
			require(__dirname + "/../src/collection.js")(fw);//require model.js modelPoll.js
	        
	        require(__dirname + "/../src/controller.js")(fw);
	        require(__dirname + "/../src/messageDispatcher.js")(fw);
	        require(__dirname + "/../server_client/server_render.js")(fw,viewPath);
	        var readClientFile =  require(__dirname + "/../server/readClientFile.js");
	        //执行controller目录
	        readClientFile.evalByPackageJS(appPath+"/controller",{process:process, sumeru:sumeru,App:App,Model:Model,Handlebars:sumeru.render.getHandlebars(),Library:Library,console:console});
	        //最后，执行用户自定义的server渲染包含的文件
            readClientFile.evalByPackageJS(appPath+"/server_config",{process:process, sumeru:sumeru,App:App,Model:Model,Handlebars:sumeru.render.getHandlebars(),Library:Library,console:console},'server_library.js');
          
        }
     	
     	//fileServer已经与socketServer合并，不会额外开端口号
        fsServer = require(__dirname + "/fileServer.js");
    }
    
    //start websocket-http server
    var globalServer = http.createServer(function(req, res) {
    	if (typeof fsServer =='function'){
    		return fsServer(req,res);
    	}
    	
    }).listen(PORT, function() {
        fw.log('Server Listening on ' + PORT);
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
            fw.log('no connection object.');
            return;
        }
        
        conn.on("data", function(msg){
            //FIXME 做跨域连接检测和授权检查
            //后面的pk判断是用于如果server的pk变化，中断后重新交换公钥的时候不加密,所以此处遇到'{}'不解密。
            if (fw.config.get("rsa_enable") && msg.substring(0,1) !== "{") {
                msg = fw.myrsa.decrypt(msg);
            }
            
            //fw.log("retrieving " + msg);
            
            netMessage.onData(msg,conn);
        });

        conn.on("close", function(){
            clientTracer.onSocketDisconnection(conn.clientId,conn._sumeru_socket_id);
            clearSocketMgrBySocketId(conn._sumeru_socket_id);
        });
    });
    

    /**
     * 此处是为测试离线加的
     * 测试离线时，需要格外的暴露globalServer、PORT。
     * start --jin
     
    if(process.argv[2]&&process.argv[2]=='test'){
        process.globalServer = globalServer;
        process.sock = sock;
        process.PORT = PORT;
    }
    end --jin*/
    
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
    	//before throw a error ,send a netmessage instead
        //check whether it is from server-client which DONT have socketid
        //if typeof socketId === function
        //then it is from server_client
        //兼容server端执行客户端的fw.netMessage.sendMessage.
        if (typeof socketId === 'function'){
        	
        	if (!SocketMgr[_server_socket_id]){//注册默认执行函数
        		SocketMgr[_server_socket_id] = {_sumeru_socket_id:_server_socket_id,clientId:"_ServerRender",write:function(data){
	        		var tmp = JSON.parse(data);
	        		data = JSON.parse(tmp.content);
	        		netMessage.sendLocalMessage( data,tmp.target,onerror,onsuccess);
	        	}};
        	}
        	//get clientId from data
            var tmp = JSON.parse(data),
            data2 = JSON.parse(tmp.content),
            mysocket = SocketMgr[_server_socket_id];
            if (data2.clientId) {
                mysocket.clientId = data2.clientId;
            }
        	//直接调用
        	netMessage.onData(data,mysocket);
        	return true;
        }
        
        
        var socket = SocketMgr[socketId];
        
        if (!socket) {
            
            onerror && onerror("no socket");
            return true;
        };
        var data2;
        if (fw.config.get("rsa_enable") && data.match(/\"swappk\"/) === null && socketId!=_server_socket_id) {
            //在socket中管理交换得来的pk
            data2 = fw.myrsa.encrypt(data,socket.mypk);
        }else{
            data2 = data;
        }
        
        socket.write(data2);
        onsuccess && onsuccess();
    });

    /**
     * 接收消息的过滤器, 用于将消息中附带的sessionId与clientId附加回链接对像上.
     * 此操作，用于验证模块.
     */
    var whiteList_notAuth = ['SMR_USER_EVENT_LOGOUT',
                             'SMR_USER_EVENT_REGIST',
                             'SMR_USER_EVENT_REGIST_TEST'
                             ]; // ['echo', 'auth-init'];
    
    //debugger;
    netMessage.addInFilter(function(msg,conn,cb){
        
        /*
         * 排除S2S消息和本地消息。
         * 并且target在白名单中的,不需要验证,直接放过.
         */
        if(msg.number != 600 && msg.number != 0 && conn != undefined && whiteList_notAuth.indexOf(msg.target) == -1){

            //debugger;
            // 如果没有clientId,没办法继续处理.
            if(!msg.clientId && !conn.clientId){
                // FIXME 这里的错误消息返回,应该可以直接以前端netMessage能响应的方式返回.
                conn.end('missing clientId');
                return;
            }
            
            
            /*
             * 
             * 处理conn上记录的clientId与msg携带的不一致的情况,
             * 
             * 当这种情况发生时,只能有三种情况,
             * 
             *  1 当前连接是新建立的conn.clientId还是undefined
             *  
             *  2 client在运行时清了cookie. 这种情况需要在client端代码上进行处理,使修改最早延后到下一次建立连接时升效.
             *  
             *  3 恶意修改. 这种情况,拒绝使用新的clientId, 仍然使用conn对像上记录的clientId保证运行时的一致性.
             * 
             */
            if(conn.clientId === undefined){
                /*
                 * 如果conn上的clientId为undefined,那则证明当前连接是一条新连接. 在这里进行必要的初始化
                 * 
                 * 记录当前的clientId到conn上,用来保证以后在客户端的修改,均不能影响当前连接上的clientId
                 *  
                 */
                conn.clientId = msg.clientId;
                
            }else if(conn.clientId != msg.clientId){
                
                // 拒绝使用新的clientId,这里的策略也将使conn.clientId的使用权更为优先.
                msg.clientId = conn.clientId;
            }
            
            // 找出对应的client对像,这里当发现没有已创建的client对像时,会自动创建.
            var client = clientTracer.findClient(conn.clientId);
            
            var next = function(){
                /*
                 * ** 为向前兼容,所以把userInfo关系到conn对像上,
                 * 
                 * 不再支持这种写法后,需要将这里删除.
                 *  
                 * 同时需注意在注销,断开联系时,需要清理这个引用
                 * 
                 */
                cb(msg, conn);
            };
            
            /*
             * 
             * 如果userInfo为false,则证明当前的client对像未经验证.
             * 
             *      如果存在userInfo,则当前连接是已经过认证的.但认证是否通过不一定.即有可能为null,
             * 
             * 如果authMethod值为undefined,则没办法认证. authMethod将以msg上的优先,如果没有,则使用conn上的.
             * 
             */
            //debugger;
            if(client.userInfo === false && typeof (msg.authMethod) == 'string'){
                // 未验证则等待验证通过再继续.
                client.once('verify',next);         // 这里一定是once.防止返复的执行过滤器的callback
                /*
                 * 验证clientId
                 * 
                 * !! 这里在已经通过验证的情况下,会忽略随后再来的验证和登陆请求,直到退出为止.
                 * 
                 */
                client.__verify(msg.authMethod);
            }else{
                // 验证通过或无法验证则直接继续.
                next();
            }
            
        }else{
            return cb(msg,conn);   //下一个过滤
        }
    },100);
    
    /**
     * 注册一个socket连接
     */
    netMessage.setReceiver({
        onMessage:{
            target:'echo',
            overwrite : true,
            handle:function(content,target,conn){
                var socketId = content.socketId;
                
                if(!socketId){
                    fw.log("No SocketId, Can't register connection");
                    conn.end("ERROR: NO SOCKET_ID");
                    return;
                }
                
                if(SocketMgr[socketId]){
                    fw.log("same socketId, Can't register connection");
                    conn.end("ERROR: SAME SOCKET_ID");
                    return;
                }
                
                
                SocketMgr[socketId] = conn;
                conn._sumeru_socket_id = socketId;
                if (content.pk){
                    // fw.myrsa.setPk2(content.pk);//server端有了客户端的公钥
                    //server的加密不用存pk2，而是存在socket中
                    SocketMgr[socketId].mypk = content.pk;
                }
                    
                fw.dev('register socket, id:' + socketId);
                var client = clientTracer.findClient(conn.clientId);
                
                client.on('verify',function(){
                    conn.userInfo = this.userInfo;
                });
                
                clientTracer.onSocketConnection(conn.clientId,socketId,conn);
                
                //抽取pubname => modelName的对应关系
                var publishModelMap = {};
                for (var pubname in PublishContainer){
                    publishModelMap[pubname] = {
                                                'modelname' : PublishContainer[pubname]['modelName'],
                                                'plainstruct' : PublishContainer[pubname]['plainStruct']
                                                };
                    if(PublishContainer[pubname]['needAuth']){
                        publishModelMap[pubname]['needAuth'] = true;
                    }
                }
                var msgObj = {
                    timestamp: (new Date()).valueOf(),
                    pubmap : publishModelMap
                };
                if (fw.config.get("rsa_enable")){
                    msgObj.swappk = fw.myrsa.getPk();//server传递给客户端自己的公钥，这句不加密
                };
                setTimeout(function(){
                    netMessage.sendMessage(msgObj,'echo_from_server', socketId, function(err){
                        fw.log('send echo_from_server faile' + err);
                    }, function(){
                        fw.dev('send echo_from_server ok');
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
        //fw.dev('triigeer unsbuscribe', content);
        if (typeof PublishContainer[content.pubname] == 'undefined') {
            return;
        };
        var modelName = PublishContainer[content.pubName].modelName;
        destroysubscribe(modelName);
        
        scanPublishEnd();
    };
    
    netMessage.setReceiver({
        onMessage:{
            overwrite : true,
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
        console.log('run trigger...');
        // 如果没有trigger内容，则停止周期执行
        if(trigger_push_cache.length == 0){
            clearTimerout(trigger_push_timer);
            return;
        }else{
            var modelName = "";
            while(modelName = trigger_push_cache.shift()){
                fw.pushUpdateOfModel(modelName);
                //fw.dev('trigger_push, modelName:' + modelName);
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
        	var clientId = content.clientId || false;
        	
        	if(clientId !== false){
        	    /*
        	     * 如果存在clientId,表示只向一个client端推送,
        	     * 在这种情况下不进入延迟去重的队列,而是直接执行一次.
        	     */
        	    fw.pushUpdateOfModel(modelName,clientId);
        	}else{
        	    if(trigger_push_cache.indexOf(modelName) == -1){
        	        trigger_push_cache.push(modelName);
        	    }
        	    
        	    if(!trigger_push_timer){
        	        console.log('wait trigger...');
        	        // 稀释trigger的频率.每秒一次
        	        trigger_push_timer = setTimeout(run_trigger,trigger_rate);
        	    }
        	}
        
        }
        
        //fw.pushUpdateOfModel(modelName);
    };
    
    
    netMessage.setReceiver({
        onLocalMessage:{
            overwrite:true,
            target:'trigger_push',
            handle:trigger_push
        },
        onMessage:{
            overwrite:true,
            target:'trigger_push',
            handle:trigger_push
        }
    });
    
    if (config.cluster.get('enable') === true) {
        var cluster_mgr = require(__dirname + '/cluster.js');
        
        netMessage.setReceiver({
            onLocalMessage:{
                overwrite:true,
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
        		    fw.dev('add config : ' + ob);
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
            overwrite:true,
    	    target: 'config_push',
    	    handle: config_push
    	}
    });

    
     /**
     * 处理数据上传请求
     */
    netMessage.setReceiver({
        onMessage:{
            overwrite:true,
            target:'data_write_from_client',
            handle:function(content,type,conn){
                
                fw.dev('data_write_from_client:', content);
                
                var pubname = content.pubname;
                var pubRecord = typeof PublishContainer[pubname] == 'undefined'? false: PublishContainer[pubname];
                var extPublish = pubRecord === false ? false : pubRecord.extPublish;

                var modelchain = content.modelchain;
                var pilotid = content.pilotid;
                var socketId = conn._sumeru_socket_id;
                var client = clientTracer.findClient(conn.clientId);

                var struct = JSON.parse(JSON.stringify(content.data)),
                    structData = struct.cnt;
                var modelname = struct.modelName;
                var modeltemp = fw.server_model.getModelTemp(modelname);

                //susu if(modeltemp.needAuth){
                if(pubRecord && pubRecord.needAuth){
                    if(!client.userInfo){
                        netMessage.sendError({
                            pubname: pubname,
                            pilotid: pilotid,
                            data: []
                        }, 'data_auth_from_server',socketId,
                        function(){fw.dev('send data_auth_from_server failed');},
                        function(){fw.dev('send fail to auth');}
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
                        function(){fw.log('send ' + errorType + ' fail');},
                        function(){fw.dev('send ' + errorType + ' ok');}
                    );
                };
                
                var collection = new serverCollection.create(modelname);


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
                            pubRecord.options.onInsert(pubRecord.collection, structData, client);
                            pubRecord.options.afterInsert(pubRecord.collection, structData, client);
                        }
                        
                        fw.netMessage.sendLocalMessage({modelName:struct.modelName}, 'trigger_push');    
                    },errorHandle,struct.modelName);    
                };

                var doDelete = function(modifiedData){
                        
                    if (typeof modifiedData != 'undefined') {
                        structData = modifiedData;
                    };
                    
                    var removeItem = {};
                    removeItem[idField] = ObjectId(structData[idField]);
                    collection.remove(removeItem,function(){
                        
                        //运行绑定的事件
                        pubRecord.options.afterDelete(pubRecord.collection, structData, client);
                        pubRecord.options.onDelete(pubRecord.collection, structData, client);
                        fw.netMessage.sendLocalMessage({modelName:struct.modelName}, 'trigger_push');
                    },errorHandle,struct.modelName);    
                };

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
                        pubRecord.options.onUpdate(pubRecord.collection, structData, client);
                        pubRecord.options.afterUpdate(pubRecord.collection, structData, client);
                        fw.netMessage.sendLocalMessage({modelName:struct.modelName}, 'trigger_push');
                    },errorHandle,struct.modelName);
                };

                var doExtPost = function(){
                    var args; //including callback in pulish
                    var subscribers = SubscribeMgr[modelname].filter(function(item, index){
                        return socketId === item.socketId;
                    });

                    subscribers.forEach(function(item){
                        if(pubname === item.pubname){args = item.args;}
                    });

                    fw.external.doPost(modelname, pubname, struct.type, structData, args, function(){
                        pubRecord.options.onPost(pubRecord.collection, structData, client);
                        pubRecord.options.afterPost(pubRecord.collection, structData, client);
                    });
                };


                //operation handlers
                var insertHandler = function(){

                    if(pubRecord){
                        //如果开发者在beforeInsert中没有调用callback，则意味终止对db的操作和afterInsert的触发，也不会有diff操作产生
                        //添加userinfo后调用beforeInsert
                        appendUserInfoNCallback.callFunc(pubRecord.options.beforeInsert, 
                                                        [pubRecord.collection, structData],
                                                        client,
                                                        doInsert);
                    }else{
                        doInsert();
                    }

                };

                var deleteHandler = function(){

                    if(pubRecord){
                        //如果开发者在beforeDelete中没有调用callback，则意味终止对db的操作和beforeDelete的触发，也不会有diff操作产生
                        //添加userinfo后调用doDelete
                        appendUserInfoNCallback.callFunc(pubRecord.options.beforeDelete, 
                                                        [pubRecord.collection, structData],
                                                        client,
                                                        doDelete);
                    }else{
                        doDelete();
                    }
                };

                var updateHandler = function(){
                    if(pubRecord){
                        //如果开发者在beforeUpdate中没有调用callback，则意味终止对db的操作和afterInsert的触发，也不会有diff操作产生
                        appendUserInfoNCallback.callFunc(pubRecord.options.beforeUpdate, 
                                                        [pubRecord.collection, structData],
                                                        client,
                                                        doUpdate);
                    }else{
                        doUpdate();
                    }
                };

                var extPostHandler = function(){
                    if(pubRecord){
                        appendUserInfoNCallback.callFunc(pubRecord.options.beforePost, 
                                                    [pubRecord.collection, structData],
                                                    client,
                                                    doExtPost);
                    }else{
                        doExtPost();
                    }
                    
                };

                var operations = {
                    'insertOper' : insertHandler,
                    'deleteOper' : deleteHandler,
                    'updateOper' : updateHandler,
                    'extPostOper' : extPostHandler
                };

                var operType = struct.type;
                if(extPublish){
                    //operType = 'ext' + operType.charAt(0).toUpperCase() + operType.slice(1);
                    operType = 'extPostOper';
                }else{
                    operType = operType + 'Oper'; //避免关键字
                }

                var operationHandler = operations[operType];
                
                if(!operationHandler){
                    fw.log('no handler found for opertaion', struct.type );
                }else{
                    operationHandler();
                }
            }
        }
    });
        
    /**
     * 处理订阅
     */
    var subscribe_function = function(content,target,conn){
                
        var pubname = content.name;
        var socketId = conn._sumeru_socket_id;
        var uk = content.uk || "";
        var client = clientTracer.findClient(conn.clientId);
        
        fw.dev('subscribe receiver.....', pubname , uk);
        
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
            //fw.dev('\n\n ===========\n\n same subscribe : ' + args.join(' , '));
            // 否则认为订阅重复.
            return true;
        });
        //server渲染，不订阅//也订阅 socketId != _server_socket_id
        if(!hasDuplicated && socketId != _server_socket_id){
            //订阅无重复，执行订阅
            
            //在args有变的情况下，先去除老的记录。
            var cleanArr = SubscribeMgr[modelName].filter(function(item){
                if(item.pubname == pubname && item.socketId == socketId){
                    fw.dev('CLEAR [pubname :' + pubname + ", socketId : " + socketId + " ] ");
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

                var deltaFlag = false;

                pubRecord.clients[socketId] = pubRecord.clients[socketId] || {snapshot : []};

                pubRecord.clients[socketId].snapshot = dataArray;
                
                var snapshot = pubRecord.clients[socketId].snapshot;

                //通过 clientVersion 判断是first subscribe还是redo subscribe
                //如果有clientVersion && server端有记录，则增量传输
                if(clientVersion && snapshotMgr.get(pubname, clientVersion)){
                    var diffData = findDiff(dataArray, snapshotMgr[pubname].get(pubname, clientVersion), PublishContainer[pubname]["modelName"]);
                    if(!diffData.length){
                        return false; //没有diff, 不用下发
                    }
                    deltaFlag = true; //有diff，增量下发
                }

                var dataVersion = snapshotMgr.add(pubname ,dataArray);

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
                    uk:uk,
                    data : dataArray,
                    flag : deltaFlag ? 'live_data' : 'full_ship',
                    version : dataVersion
                };

                if(pubRecord.extPublish){
                    var config = externalConfig && externalConfig[pubname];
                    if(config){
                        params.external = {
                            uniqueColumn : config.uniqueColumn || config.keyColume || "",
                        };
                    }
                }

                var cmd = deltaFlag ? 'data_write_from_server_delta' : 'data_write_from_server';

                netMessage.sendMessage(params, cmd, socketId, function(err){
                        fw.log('send data_write_from_server fail ' + err , socketId);
                    }, function(){
                        //fw.dev('send data_write_from_server ok ' , deltaFlag ? diffData : dataArray);
                    }
                );
                
            };
        
        //run publish function with args and callback
        if(pubRecord.needAuth){
            
            //server渲染无登陆一说,直接下发空数据.
            if(!!client.userInfo){
                // 验证信息有效, 查询数据.
                pubFunc.call(collection, args, onComplete, client);
            }else if(socketId == _server_socket_id){
                
                netMessage.sendMessage({
                    pubname: pubname,
                    modelName : modelName,
                    uk:'',
                    data :[],
                    flag : 'full_ship',
                    version : 0
                }, 'data_write_from_server', socketId);
                
            }else{
                // 验证无效向client返回Error
                netMessage.sendError({
                    pubname: pubname,
                    data: []
                },'data_auth_from_server',
                socketId,
                function(){fw.log('send data_auth_from_server failed');},
                function(){fw.log('do auth failed');}
                );
            }
            
        }else{
            pubFunc.call(collection, args, onComplete, client);
        }
    };
    
    netMessage.setReceiver({
        onMessage:{
            overwrite:true,
            target:'subscribe',
            handle:subscribe_function
        },
        onLocalMessage:{//for server render
            overwrite:true,
        	target:'subscribe',
        	handle:subscribe_function
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

    fw.pushUpdateOfModel = function(modelName,clientId){
        
        console.log('runing trigger...');
        //find all subscriber
        var subscribers = SubscribeMgr[modelName] ? SubscribeMgr[modelName] : [];
        
        var walkLog = {}; //防止循环引用
        var walkModelRelation = function(_modelName){
            var _modelRelation = fw.server_model.getModelRelation(_modelName);
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
        //fw.dev('---------walk modelrelation result', subscribers, '----', fw.server_model.modelRelation, '++++', modelName);
        
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
                if(!SocketMgr[item.socketId] ){
                    fw.log('SocketMgr: lost connection, the socket id is " ' + item.socketId + '"');
                    clientTracer.onSocketDisconnection(null, item.socketId);
                    clearSocketMgrBySocketId(item.socketId);
                    return;
                }
                
                var itemClientId = SocketMgr[item.socketId].clientId;
                
                if(clientId && itemClientId != clientId){
                    // 如果调用trigger时,提供了clientId则表示只向这个clientId下的socket进行推送;
                    return;
                }
                
                var client = clientTracer.findClient(itemClientId);
                
                //FIXME 这里现在其实有性能问题，对每个subscriber都会重新运行一次pubFunc。但由于异步的问题，现在没有实现缓存其结果。
                pubFunc.call(pubRecord.collection, item.args, function(dataArray){
                    
                    if (typeof pubRecord.clients[item.socketId] == 'undefined') {
                        //没有socketId的记录意味着没有subscribe过这个publish
                        return;
                    };
                    
                    var snapshot =  pubRecord.clients[item.socketId].snapshot;

                    if(JSON.stringify(dataArray) === JSON.stringify(snapshot)){
                        //如果这条增量没有导致实质的数据改变，就不推送了
                        stop = true;
                    };
                    
                    if (!stop) {
                        
                        var diffData = findDiff(dataArray, snapshot, PublishContainer[item.pubname]["modelName"]);

                        var dataVersion = snapshotMgr.add(item.pubname, dataArray);

                        netMessage.sendMessage({
                                pubname : item.pubname,
                                data : !PublishContainer[item.pubname].plainStruct ? diffData :dataArray, //这里其实就是struct，不过传输的是没有删除过clientid，和id的版本
                                flag : 'live_data',
                                version : dataVersion
                            },
                            'data_write_from_server_delta',
                            item.socketId,
                            function(err){
                                fw.log('send data_write_from_server_delta fail ' + err  , item.pubname , item.socketId);
                            },function(){
                                fw.dev('send data_write_from_server_delta ok...' , item.pubname , item.socketId);
                            }
                        );

                        pubRecord.clients[item.socketId].snapshot = dataArray;
                        
                    };
                }, client);
            })(item, pubRecord);

        });
    };
   
};

createDB(function(err, db){
    runStub(db);
});