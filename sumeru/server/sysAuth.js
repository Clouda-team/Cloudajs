/**
 * 认证系统,
 * 
 * 这个系统依赖于用户系统执行,但与用户系统无关,
 * 
 * 仅用于对用户的访问进行受权,具体的对用户的验证工作仍将由用户系统完成.
 * 
 * 用户系统确认用户身份后,由这个系统进行系统的需要的受权使当前的登陆设备能访问需要受权的数据.
 * 
 */

var COMMON_STATUS_CODE = require(__dirname + '/../src/COMMON_STATUS_CODE.js');


var fw = require(__dirname + '/../src/newPkg.js')();

require(__dirname + '/../src/utils.js')(fw);
require(__dirname + '/../src/log.js')(fw);

//var dbOpt = require(__dirname + "/conn.js")(fw);

// 以上为测试用假对像

var sysAuth = fw.sysAuth || fw.addSubPackage('sysAuth');

var crypto = require('crypto');
var netMessage = fw.netMessage || require(__dirname + '/../src/netMessage.js')(fw);
var sysUser = require("./sysUser.js");

// 超时时间
var DEFAULT_EXPIRES = 15 * 24 * 3600 * 1000;        //15天

var authCollection = null;

var dbHandle = fw.getDbHandler();

var getDbCollectionHandler = dbHandle.getDbCollectionHandler;
var ObjectId = dbHandle.ObjectId;

var tryingToClearSession_timer = false;
var tryingToClearSession_timer_interval = 600 * 1000;    // 
var tryingToClearSession_timer_rate = 30 * 1000;        // 限制为每30秒内只能清理一次;

// 尝试去清理过期超时的session或无效的session
var tryingToClearSession = function(){
    
    //  固化collection式写法
    if(!authCollection){
        getDbCollectionHandler('smr_Authentication',function(err,collection){
            authCollection = authCollection || collection;
            tryingToClearSession.apply({},arguments);
        });
        return;
    }
    
    if(tryingToClearSession_timer === false){
        tryingToClearSession_timer = setTimeout(function(){
            
            // 移除超期的.  这里删除后不需要调用 trigger_push，因为需要让当前活动的用户的受权保持到离线;
            authCollection.remove({expires:{$lt:Date.now()}},function(){
                // console.log('clear session expired! ', new Date());
                // netMessage.sendLocalMessage({modelName:'smr_Authentication'},'trigger_push');
            });
            
            tryingToClearSession_timer = false;
        },tryingToClearSession_timer_rate);
    }
};

setInterval(tryingToClearSession, tryingToClearSession_timer_interval);        // 周期性清理

/**
 *  验证一个clientId是否仍然有效.
 *  
 *  @param clientId  当前clientId,
 *  @param authMethod 指定session所使用的用户系统的类型
 *  @param callback 
 *  
 */

var verifySession = function(clientId,authMethod,callback){
    var args = arguments;
    
    //  固化collection式写法
    if(!authCollection){
        getDbCollectionHandler('smr_Authentication',function(err,collection){
            authCollection = authCollection || collection;
            verifySession.apply({},args);
        });
        return;
    }
    
    if(!callback || typeof callback != 'function'){
        throw 'sysAuth::verifySession, missing callback';
        return;
    }
    
    if(!sysUser[authMethod]){
        fw.log('unsupport passport type.', authMethod);
        /*
         * 这个方法,做为publish的实现方法,本身没能力返回错误信息,
         * 所以这里当发现验证类型不被支持时,直接认为验证失败
         */
        callback(COMMON_STATUS_CODE['2000'],null);
        return;
    }
    
    // 首先在DB中验证.
    authCollection.findOne({clientId:clientId},function(err,data){
        
        if(err){
            console.error(err.stack || err);
            callback(COMMON_STATUS_CODE['2004'],null);
            return;
        }
        
        if(data && data.authMethod == authMethod){
            
            var userId = data.userId,
                userInfo = data.info,
                expires = data.expires;
            
            if(!userId || !userInfo){
                callback(COMMON_STATUS_CODE['2003'],null);
                tryingToClearSession();
                return;
            }
            
            // 超时，并检查错误的记录
            if(expires < Date.now()){
                callback(COMMON_STATUS_CODE['2001'],null);
                tryingToClearSession();
                return;
            }
            
            sysUser[authMethod].verify(userId,userInfo,function(err){
                
                if(err){
                    if(err.code){
                        callback(COMMON_STATUS_CODE[err.code],null);
                    }else{
                        callback(COMMON_STATUS_CODE['2004'],null);
                        fw.log(err.stack || err);
                    }
                    return;
                }
                
                // 将session置为在线
                setSessionStatus(clientId,'online',function(err){
                    
                    if(err){
                        if(err.code){
                            callback(COMMON_STATUS_CODE[err.code],null);
                        }else{
                            callback(COMMON_STATUS_CODE['2004'],null);
                            fw.log(err.stack || err);
                        }
                        return;
                    }
                    
                    // 这里只是为了不再查一次db所以直接修改为下发数据的状态为set过的状态直接下发.
                    data.status = 'online';
                    
                    callback(null,data);
                });
                
                // 这里是不是需要每次登陆时延长session超时还需要确定,因为有可能让session保持到一个不合理的时间长度上，如在某台非自有设备登陆后，被其它人长期使用。
                // data.expires = Date.now() + DEFAULT_EXPIRES;
                // authCollection.save(data);
            });
            
        }else{
            callback(COMMON_STATUS_CODE['2001'],null);
        }
    });
};


var sha1 = function(){
    var sha1 = crypto.createHash('sha1');
    var item = null;
    for(var i=0,len = arguments.length;i<len;i++){
        item = arguments[i] || "";
        // 统统转为字符串处理,如果没有toString方法,则认为是空字符串;
        sha1.update(item.toString?item.toString():"");
    }
    
    return  sha1.digest('hex');
};

/**
 * 在db中创建一个session记录
 * 
 * @param token {string}  登陆名
 * @param pwd {string}  口令
 * @param type {string} 登陆类型
 * @param userInfo  {Object} 需要记录在session中的用户数据
 * @param clientId  {clientId} 设备id
 * @param callback  {function} 完成后的回调,回传参数为错误对像;
 */
var buildSession = function(token,pwd,type,userInfo,clientId,callback){
    //debugger;
    //console.log('args ',arguments);
    var args = arguments;
    
    //  固化collection式写法
    if(!authCollection){
        getDbCollectionHandler('smr_Authentication',function(err,collection){
            authCollection = authCollection || collection;
            buildSession.apply({},args);
        });
        return;
    }
    
    var expires = Date.now() + DEFAULT_EXPIRES;
    
    var authSession = {
          smr_id:ObjectId(),
          token:token,
          userId:userInfo.id,
          info:userInfo.info,
          clientId:clientId,
          authMethod:type,
          expires:expires,
          status:'online'   // 被登陆调用,所以默认为online
    };
    
    /*
     * 
     * 首先会删除在相同clientId下的其它所有session，因为在一个clientId同时只应该存在一个session，
     * 如果有多余的，一定是过期的或因client端删除cookie等操作导致失效的.
     */ 
    authCollection.remove({clientId:clientId},function(err){
        
        if(err){
            console.error(err.stack || err);
            callback({code:2004},null);
            return;
        }
        
        //debugger;
        authCollection.save(authSession,function(err,item){
            if(err){
                console.error(err.stack || err);
                callback({code:2004},null);
            }else{
                callback(null,authSession);
                // 通知同一个clientId下的其它窗口登陆状态变化.
                netMessage.sendLocalMessage({
                    modelName:'smr_Authentication',
                    clientId:clientId
                },'trigger_push');
            }
        });
    });
    
};

/**
 * 从db中清除一个session记录.
 * 必须在authMethod与clientid相匹配的情况下才做删除动作,否则只能由超时删除.
 * 
 * @param clientId {string}  设备ID.
 * @param authMethod {string}  session登陆时的用户类型
 * @param callback {function 返回将删除的session对像。
 */
var cleanSession = function(clientId,authMethod,callback){
    
    if(!clientId){
        callback({code:2003},null);
        return;
    }
    
    // 这里的collection由于运行时一定会先初始化做auth-init所以不再检测collection是否存在.
    authCollection && authCollection.findOne({clientId:clientId},function(err,item){
        if(err){
            callback({code:2004},null);
            return;
        }
        
        if(item){
            authCollection.remove(item,function(){
                callback(null,item);
            });
        }else{
            callback({code:2001},null);
        }
    });
};

var setSessionStatus = function(clientId,status,callback){
    
    //  固化collection式写法
    var args = arguments;
    if(!authCollection){
        getDbCollectionHandler('smr_Authentication',function(err,collection){
            authCollection = authCollection || collection;
            setSessionStatus.apply({},args);
        });
        return;
    }
    
    if(!clientId || !status){
        sumeru.log("setSessionStatus :: missing argument,",arguments);
        return;
    }
    
    // 限制只接受两个值 online, offline
    if(status != 'online'){
        status = 'offline';
    }
    
    authCollection.update({clientId:clientId},{$set:{status:status}},function(err){
        
        if(err){
            callback && callback({code:2004});
        }
        
        callback(null);
    });
    
};

var inited = false;

// sysAuth.__reg('verifySession',verifySession,true);
sysAuth.__reg('cleanSession',cleanSession,true);
sysAuth.__reg('initPublish',function(){
    
    if(inited){
        return;
    }
    
    inited = true;
    
    /**
     * 客户端用户系统初始化操作.
     * 这段代码这里本来应该放在sysAuth.js中,但是由于载入顺序的关系,只能先放这.
     */
    sumeru.publish('smr_Authentication', 'auth-init', function(clientId, authMethod, callback) {
        // 验证客户端当前的session是否有效
        if(clientId && authMethod){
            this.find({clientId:clientId,authMethod:authMethod,expires:{$gte:Date.now()}},{clientId:false,authMethod:false,expires:false,status:false,_id:false},function(err,rs){
                if(err){
                    console.error(err.stack || err);
                    callback([]);
                    return;
                }
                
                callback(rs);
            });
        }else{
            callback([]);
        }
    }, {
        beforeInsert : function(serverCollection, structData, userinfo, callback) {
            // 阻止insert操作. insert只能由server内部操作,不能由publish引发
            // callback();
        },
        afterInsert : function(serverCollection, structData) {
        },
        beforeDelete : function(serverCollection, structData, userinfo, callback) {
            //  阻止update操作. update只能由server内部操作,不能由publish引发
            // callback();
        },
        beforeUpdate : function(serverCollection, structData, userinfo, callback) {
            // 阻止update操作. update只能由server内部操作,不能由publish引发
            // callback();
        },
        onPubEnd : function(serverCollection) {
        }
    });
},true);



/**
 * 
 * 接收并处理系统低层事件
 * 
 */
netMessage.setReceiver({
    onLocalMessage:{
        target:'SMR_AUTH_CLIENT_VERIFY',
        handle: function(msg,target){
            
            var clientId = msg.clientId;
            var authMethod = msg.authMethod;
            var cb = msg.cb;
            
            if(typeof cb != 'function'){
                fw.log('SMR_AUTH_CLIENT_VERIFY, missing callback');
                return;
            }
            
            if(!clientId || !authMethod){
                cb(COMMON_STATUS_CODE[2003]);
                return;
            }
            
            verifySession(clientId,authMethod,cb);
            
        }
    },
    onMessage : {
        target : "SMR_AUTH_EVENT_LOGIN",
        handle : function(pack,target,conn) {
            
            var msg = pack.content;
            
            var cbn = pack.cbn;                 // callback时所有的客户端的target.
            
            if(!conn || !conn._sumeru_socket_id || !cbn ){
                fw.log(conn,cbn);
                console.warn('SMR_AUTH_EVENT_LOGIN, missing callback name ');
                return;
            }
            
            var clientId = conn.clientId || false,
                authMethod = msg.type || false,
                token = msg.token || false,
                pwd = msg.pwd || false,
                args = msg.args || false;
            
            // 必要参数丢失
            if(authMethod === false || token === false || pwd === false || clientId === false){
                netMessage.sendMessage({code:2003},cbn,conn._sumeru_socket_id);
                return;
            }
            
            if(!sysUser[authMethod]){
                netMessage.sendMessage({code:2000},cbn,conn._sumeru_socket_id);
                return;
            }
            
            sysUser[authMethod].login(token,pwd,args,function(err,userInfo){

                if(err){
                    console.error("SMR_AUTH_EVENT_LOGIN",err);
                    netMessage.sendMessage({code:err.code || 2004,info:userInfo},cbn,conn._sumeru_socket_id);
                    return;
                }
                
                // 如果登陆成功,则创建session,并将通知客户端
                buildSession(token,pwd,authMethod,userInfo,conn.clientId,function(err,authSession){
                    if(err){
                        netMessage.sendMessage({code:2004},cbn,conn._sumeru_socket_id);
                    }else{
                        netMessage.sendLocalMessage({
                            clientId:clientId,
                            userInfo:authSession
                         },'SMR_AUTH_CLIENT_LOGIN_OK');
                        netMessage.sendMessage({code:0},cbn,conn._sumeru_socket_id);
                        
                    }
                });
            });
        }
    }
});

/**
 * 处理用户登出
 */
netMessage.setReceiver({
    onMessage : {
        target : "SMR_USER_EVENT_LOGOUT",
        handle : function(pack,target,conn) {
            var cbn = pack.cbn; 
            var msg = pack.content;
            var authMethod = msg.type || false,
                clientId = conn.clientId || false;
            
            if(!cbn){
                console.warn('SMR_USER_EVENT_LOGOUT, missing callback name');
                return;
            }
            
            if( !clientId || !authMethod){
                netMessage.sendMessage({code:2003},cbn,conn._sumeru_socket_id);
                return;
            }
            
            if(!sysUser[authMethod]){
                netMessage.sendMessage({code:2000},cbn,conn._sumeru_socket_id);
                return;
            }
            
            cleanSession(clientId,authMethod,function(err,item){
                
                if(err){
                    if(err.code == '2004'){
                        /*
                         *  DB存在错误时，则于无法继续处理，所以返回server端错误，
                         *  这个应该是退出过程中唯一的一种失败的情况，即未成功操作DB，也没通知用户系统的情况.
                         */
                        netMessage.sendMessage({code:2004},cbn,conn._sumeru_socket_id);
                    }else if(err.code == '2001'){
                        // 如果在登出过程中，验证session时找不到对应的session，则直接认为退出成功
                        netMessage.sendMessage({code:0,content:true},cbn,conn._sumeru_socket_id);
                    }
                    
                    return;
                }

                // 通知用户系统有用户主动登出
                sysUser[authMethod].logout(item.token, item.userId, item.userInfo, function(err){
                    if(err){
                        // 如果返回错误，则向前段返回，但如果code未提供，则认为没错误
                        netMessage.sendMessage({code:err.code || 0, content:true},cbn,conn._sumeru_socket_id);
                    }else{
                        
                        netMessage.sendLocalMessage({
                            clientId:clientId,
                         },'SMR_AUTH_CLIENT_LOGOUT_OK');
                        
                        netMessage.sendMessage({code:0,content:true},cbn,conn._sumeru_socket_id);
                    }
                });
                
                netMessage.sendLocalMessage({
                    modelName:'smr_Authentication',
                    clientId:clientId
                },'trigger_push');
            });
        }
    }
});


/**
 * 处理用户注册
 */
netMessage.setReceiver({
    onMessage : {
        target : "SMR_USER_EVENT_REGIST",
        handle : function(pack,target,conn) {
            var cbn = pack.cbn; 
            var msg = pack.content;
            var authMethod = msg.type || false,
                token = msg.token || false,
                pwd = msg.pwd || false,
                userInfo = msg.userInfo || {};
            
            if(!cbn){
                console.warn('SMR_USER_EVENT_REGIST, missing callback name.');
                return;
            }
            
            if(!token || !pwd || !authMethod){
                netMessage.sendMessage({code:2003},cbn,conn._sumeru_socket_id);
                return;
            }
            
            if(!sysUser[authMethod]){
                netMessage.sendMessage({code:2000},cbn,conn._sumeru_socket_id);
                return;
            }
            
            // 通知用户系统进行注册
            sysUser[authMethod].register(token,pwd,userInfo,function(err,userInfo){
                if(err){
                    netMessage.sendMessage({code:err.code,content:userInfo},cbn,conn._sumeru_socket_id);
                    return;
                }
                netMessage.sendMessage({code:0,content:userInfo},cbn,conn._sumeru_socket_id);
            });
        }
    }
});

/**
 * 处理用户测试注册信息
 */
netMessage.setReceiver({
    onMessage : {
        target : "SMR_USER_EVENT_REGIST_TEST",
        handle : function(pack,target,conn) {
            var cbn = pack.cbn; 
            var msg = pack.content;
            var authMethod = msg.type || false,
                userInfo = msg.userInfo || {};
            
            if(!cbn){
                console.warn('SMR_USER_EVENT_REGIST_TEST, missing callback name.');
                return;
            }
            
            if(!authMethod){
                netMessage.sendMessage({code:2003},cbn,conn._sumeru_socket_id);
                return;
            }
            
            if(!sysUser[authMethod]){
                netMessage.sendMessage({code:2000},cbn,conn._sumeru_socket_id);
                return;
            }
            
            // 通知用户系统进行注册
            sysUser[authMethod].registerValidate(userInfo,function(err,isUsefull){
                netMessage.sendMessage({code:err ? err.code : 0 ,content:isUsefull},cbn,conn._sumeru_socket_id);
            });
        }
    }
});
/**
 * 处理用户测试注册信息
 */
netMessage.setReceiver({
    onMessage : {
        target : "SMR_USER_EVENT_MODIFY_PWD",
        handle : function(pack,target,conn) {
            var cbn = pack.cbn; 
            var msg = pack.content;
            var authMethod = msg.type || false,
                token = msg.token,
                oldPwd = msg.oldPwd,
                newPwd = msg.newPwd;
            
            if(!cbn){
                console.warn('SMR_USER_EVENT_MODIFY_PWD, missing callback name.');
                return;
            }
            
            if(!authMethod){
                netMessage.sendMessage({code:2003},cbn,conn._sumeru_socket_id);
                return;
            }
            
            if(!sysUser[authMethod]){
                netMessage.sendMessage({code:2000},cbn,conn._sumeru_socket_id);
                return;
            }
            
            // 通知用户系统进行注册
            sysUser[authMethod].modifyPassword(token,oldPwd,newPwd,function(err){
                netMessage.sendMessage({code:err ? err.code : 0 ,content:''},cbn,conn._sumeru_socket_id);
            });
        }
    }
});
/**
 * 处理用户测试注册信息
 */
netMessage.setReceiver({
    onMessage : {
        target : "SMR_USER_EVENT_MODIFY_INFO",
        handle : function(pack,target,conn) {
            var cbn = pack.cbn; 
            var msg = pack.content;
            var authMethod = msg.type || false,
                token = msg.token,
                pwd = msg.pwd,
                userInfo = msg.info || {};
            
            if(!cbn){
                console.warn('SMR_USER_EVENT_MODIFY_INFO, missing callback name.');
                return;
            }
            
            if(!authMethod){
                netMessage.sendMessage({code:2003},cbn,conn._sumeru_socket_id);
                return;
            }
            
            if(!sysUser[authMethod]){
                netMessage.sendMessage({code:2000},cbn,conn._sumeru_socket_id);
                return;
            }
            
            // 通知用户系统进行注册
            sysUser[authMethod].modifyUserInfo(token,pwd,userInfo,function(err){
                netMessage.sendMessage({code:err ? err.code : 0 ,content:""},cbn,conn._sumeru_socket_id);
            });
        }
    }
});

netMessage.setReceiver({
    onLocalMessage : {
        target : "Client_Disconnection",
        handle : function(info) {
           var clientId = info.clientId;
           
           setSessionStatus(clientId,'offline',function(err){
               if(err){
                   console.error(err.stack || err);
                   return;
               }
               
               fw.dev('client %s offline.',clientId);
               
           });
           
        }
    }
});