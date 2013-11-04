(function(fw){
    
    if(fw.auth){
        return;
    }
    
    var auth = new fw.utils.emitter();
    
    var pkgAuth = fw.addSubPackage('auth');
    
    // fw.utils.cpp(auth,fw.utils.emitter);
    
    var __emit = auth.emit;
    
    emit = function(){
        __emit.apply(auth,arguments);
    };
    
    auth.emit = function(){
        if(auth.emit.caller != auth.addEventListener){
            throw  'reject calls from outside';
        }else{
            __emit.apply(auth,arguments);
        } 
    };
    
	var netMessage = fw.netMessage;
    var cookie = Library.cookie;
    var pubsub = new fw.pubsub._pubsubObject();
    // 客户端cookie超时时间
    var expires = 24*365*20; //20年
    
    /*
     * ============= status circle ================
     * 
     * NOT_LOGIN -> DOING_LOGIN -> LOGINED -> NOT_LOGIN
     * 
     * NOT_LOGIN -> DOING_LOGIN -> NOT_LOGIN
     * 
     */
    
    var NOT_LOGIN = 'not_login',
        DOING_LOGIN = 'doing_login',
        LOGINED = 'logined';
    
    
	var currentStatus = NOT_LOGIN , lastError = null , userInfo = null;
    
	var getStatus = function(){
	    return currentStatus;
	};
	
	var getLastError = function(){
	    return lastError;
	};
	
	var getUserInfo = function(){
	    return userInfo;
	};
	
    var sendAndCallback = function(msg,target,cb){
        
        var cbn = "WAITING_CALLBACK_" + fw.utils.randomStr(8);
        
        if(!cb || 'function' != typeof cb){
            throw COMMON_STATUS_CODE['2006'];
            return;
        }
        
        netMessage.setReceiver({
            onMessage : {
                target : cbn,
                overwrite: true,
                once:true,
                handle : function(data) {
                    //debugger;
                    if(data.code == "0"){
                        cb( null , data.content);
                    }else{
                        // 从common_status_code中取值，在网络中仅传code.
                        cb(COMMON_STATUS_CODE[data.code],data.content);
                    }
                }
            }
        });
        
        netMessage.sendMessage({
            cbn:cbn,
            content:msg
        },target);
        
    };
    
    //新增加的statusChange事件会自动执行一次,
    auth.on('newListener',function(type,listener){
        if(type == 'statusChange'){
            listener.call(this,lastError,currentStatus,userInfo);
        }
    });
    
    var statusChange = function(err,status,_userInfo){
        
        var args = ['statusChange'];
        
        lastError = err;
        
        if(currentStatus == status){
            return;
        }
        
        switch(status){
            case LOGINED :
                userInfo = _userInfo;
                break;
            case DOING_LOGIN :
                if(userInfo){
                    fw.dev('already logoin!');
                    return;
                }
            case NOT_LOGIN :
            default:
                userInfo = null;
        }
        
        currentStatus = status;
        
        for(var i=0;i<arguments.length;i++){
            args.push(arguments[i]);
        }
        
        // console.log('emit : ',args);
        emit.apply({},args);
    };
    
    var login = function(token,pwd,args,type){
        
        var paramLen = arguments.length;
        
        if(paramLen != 4){
            switch(paramLen){
                case 3:
                    type = 'local';         // 默认为本地调用
                    break;
                case 2:
                    type = 'local';
                    args = {};
                    break;
                default:
                    throw COMMON_STATUS_CODE['2003'];
                return;
            }
        }
        
        statusChange(null, DOING_LOGIN);
        
        // 用于回调 wating_login,在这里中断一下
        setTimeout(function(){
            
            if(!token || !pwd){
                // 参数不足无法继续,还原状态为未登陆
                statusChange(COMMON_STATUS_CODE['2003'], NOT_LOGIN);
                return;
            }
            // 发送登陆请求
            sendAndCallback({token:token,pwd:pwd,type:type,args:args} , 'SMR_AUTH_EVENT_LOGIN' , function(err){
                
                if(!err){
                    cookie.addCookie('authMethod', type , expires);
                    __init();
                }else{
                    // 如果有错误产生,则认为登陆失败.还原 DOING_LOGIN 为 NOT_LOGIN 
                    statusChange(err, NOT_LOGIN);
                }
            });
        },0);
    };

    var logout = function(){
       
        authMethod = cookie.getCookie('authMethod');
        
        // 在非登陆状态下,或cookie里没有authMethod,不能完成退出操作,直接退出
        if(currentStatus != LOGINED || !authMethod){
            return;
        }
        
        sendAndCallback( {type:authMethod} , 'SMR_USER_EVENT_LOGOUT' , function(err){
            // 无论是否退出成功,在前端均认为已退出.
            statusChange(err, NOT_LOGIN);
        });
    };

    var register = function(token,pwd,userInfo,type,cb){
        if(!token || !pwd || !type){
            cb(COMMON_STATUS_CODE['2003']);
            return;
        }
        
        sendAndCallback({
            type:type,
            token:token,
            pwd:pwd,
            userInfo:userInfo || {}
        } , 'SMR_USER_EVENT_REGIST' , cb);
    };

    var registerValidate = function(userInfo,type,cb){
        
        if(!cb){
            throw COMMON_STATUS_CODE['2006'];
            return;
        }
        
        if(!userInfo || !type){
            cb(COMMON_STATUS_CODE['2003']);
            return;
        }
        
        sendAndCallback({
            type:type,
            userInfo:userInfo 
        } , 'SMR_USER_EVENT_REGIST_TEST' , cb);
    };

    var modifyPassword = function(token,oldPwd,newPwd,authMethod,callback){
        if(!callback){
            throw COMMON_STATUS_CODE['2006'];
            return;
        }
        
        if(!token || !oldPwd || !newPwd || !authMethod){
            callback(COMMON_STATUS_CODE['2003'],null);
            return;
        }
        
        if(oldPwd == newPwd){
            callback(COMMON_STATUS_CODE['1005'],null);
            return;
        }
        
        sendAndCallback({
            token:token,
            oldPwd:oldPwd,
            newPwd:newPwd,
            type:authMethod
        },'SMR_USER_EVENT_MODIFY_PWD',callback);
        
    };

    var modifyUserInfo = function(token,pwd,newInfo,authMethod,callback){
        if(!callback){
            if('function' == typeof authMethod){
                callback = authMethod;
                authMethod = 'local';
            }else{
                throw COMMON_STATUS_CODE['2006'];
                return;
            }
        }
        
        if(!token || !newInfo || !pwd || typeof newInfo != "object"){
            callback(COMMON_STATUS_CODE['2003'],null);
            return;
        }
        
        sendAndCallback({
            token:token,
            pwd:pwd,
            info:newInfo,
            type:authMethod
        },'SMR_USER_EVENT_MODIFY_INFO',callback);
        
    };
    
    var __init = function(cb){

        var clientId = fw.clientId;
        var authMethod = cookie.getCookie('authMethod');

        pubsub.subscribe('auth-init', clientId, authMethod, function(collection){
            
            // console.log('cb : subscribe "auth-init"  :',collection);
            
            if(collection && collection.length > 0){
                statusChange(null,LOGINED,collection[0]);
            }else{
                statusChange(null,NOT_LOGIN,null);
            }
            
            cb && cb();
        });
        
    };
    
    // 兼容方法. Deprecated, call fw.auth.getUserInfo()
    var isLogin = function(){
        console.warn('Deprecated : sumeru.auth.isLogin will be replaced by sumeru.auth.getStatus()');
        return this.getStatus() == 'logined';
    };
    
    var getToken = function(){
        
        console.warn('Deprecated : sumeru.auth.isLogin will be replaced by sumeru.auth.getUserInfo()');
        
        if(this.isLogin()){
            return  this.getUserInfo().token;
        }
        
        return null;
    };
    
    
    fw.utils.cpp(auth,{
        'login':login,
        'logout':logout,
        'modifyUserInfo':modifyUserInfo,
        'modifyPassword':modifyPassword,
        'registerValidate':registerValidate,
        'register':register,
        'getStatus':getStatus,
        'getLastError':getLastError,
        'getUserInfo':getUserInfo,
        // ------ 
        'isLogin':isLogin,
        'getToken':getToken
    });
    
    /**
     * 获到auth handle , source 在 client端没有实际议意,是为了满足在serverRender中运行才必须提供的.
     * @param source {Object} controller中的env对像.
     */
    pkgAuth.__reg('create',function(env){
        return auth;
    });
    
    // 暴露给框架初始化
    pkgAuth.__reg( 'init',__init);
    
    // debug
    // sumeru.auth.on('statusChange',function(err,status,userinfo){console.log(err,status,userinfo)});
    
	return;
})(sumeru);