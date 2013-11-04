/**
 * ClientTracer.js
 * 
 * 配合认证系统进行用户的认证管理.
 *  
 * 在整个server抽像出一个client端的对像表示, 并负责追踪一个独立的client端及这个端到当前server的所有socket连接.
 * 
 * 向外在netMessag上提供以下事件消息传出
 * 
 *      SMR_AUTH_CLIENT_VERIFY : 检测到一个 client 需要验证
 *      
 *      client_connection      : 检测到一个 client 连接到当前server
 *      client_disconnection   : 检测到一个 client 断开了最后一个与当前server连接的socket
 *      socket_connection      : 检测到一个 socket 连到接server
 *      socket_disconnection   : 检测到一个 socket 断开与当前server的连接
 *      
 * 接收以下事件消息,用于完成用户追踪
 * 
 *      SMR_AUTH_CLIENT_LOGIN_OK        : client 登陆完成
 *      SMR_AUTH_CLIENT_LOGOUT_OK       : client 登出完成
 * 
 */
var fw = require(__dirname + '/../src/newPkg.js')();

require(__dirname + '/../src/log.js')(fw); 
require(__dirname + '/../src/utils.js')(fw); 
require(__dirname + '/../src/netMessage.js')(fw);

var log = fw.log;
var netMessage = fw.netMessage; 


/*
 * 维护一个client与其所打开的所有socket的映射关系.
 * 结构为
 * {
 *  clientId_1:[socketId_1,socketId_2,socketId_3,...],
 *  clientId_2:[socketId_1,socketId_2,socketId_3,...],
 *  ......
 * } 
 */
var clientMgr = {};
var socket_count = 0;


var clientTracer = fw.clientTracer || fw.addSubPackage("clientTracer");

// 为serverRender中的controller模似client端auth的对像方法.
var auth = fw.auth || fw.addSubPackage("auth");

var nope = function(){};    // 懒人方法...啥也不干..

var inherits = require('util').inherits,
    _extend = require('util')._extend,
    EventEmitter = require('events').EventEmitter;



/**
 * 清理状态非正常的client对像.
 * 
 * 不正常的状态包括:
 * 
 *      1 已创建对像超过5分钟,但status 仍然为"0", 
 *        此种情况一般收包含clientId的正常http请求产生,但是没有后续连接活动.
 * 
 */
// 触发间隔配置
var clearClientDiedRound =  1000 * 60 * 5;

var clearClientDied = function(){
    
    
    var client = null;
    var t = 1000 * 60 * 5; 
    var now = Date.now() - t;
    for(var key in clientMgr){
        client = clientMgr[key];
        try{
            if(client.status === 0 && client.createTime < now){
                fw.dev('clearClientDied. %s',client.getClientId());
                client.__destroy();
            }
        }catch(e){
            console.error(e);
            console.trace();
        }
    }
    
    setTimeout(clearClientDied , clearClientDiedRound);
};

setTimeout(clearClientDied , clearClientDiedRound);

/**
 * 
 * Class :: client
 * 
 * 表示一个正在活动中的用户设备
 * 
 */
var Client = function(clientId){
    
    if(!clientId){
        throw 'Need clientId';
    }
    
    // call super. 
    EventEmitter.call(this);
    
    this.getClientId = function(){
        return clientId;
    };
    
    // 目标设备上所有连到当前server的socketId
    this.sockets = [];
    
    this.remoteAddress = false;    // 未设置时为false;
    this.userInfo = false;         // 登陆信息
    this.createTime = Date.now();   // client对像的创建时间,即客户端访问开始的时间戳
    /*
     * 0 等待client端连接 
     * 1 正常
     * 2 所有客户端断开等待重连中
     */
    this.status = 0;    
    
    this.__dataMap = {};
    
    this.isDestroy = false;
    this.__destroyTimer = null;
    
    // 广播通知
    netMessage.sendLocalMessage({clientId : clientId},'Client_Connection');
};

inherits(Client,EventEmitter);

_extend(Client.prototype,{
    // -------- 以下为预留给redis实现的持久化session的getter和setter方法.
    get:function(key){
        if(key){
            return this.__dataMap[key];
        }else{
            return ;
        }
    },
    set:function(key,value){
        if(key){
            this.__dataMap[key] = value;
        }
        return value;
    },
    // ----------------   以下为模似客户端的hack方法 -------------
    getUserInfo:function(){
        return this.userInfo || null;
    },
    getStatus:function(){
        if(this.userInfo){
            return 'logined';
        }else{
            return 'not_login';
        }
    },
    getToken:function(){
        return this.userInfo ? this.userInfo.token : null;
    },
    isLogin:function(){
        return !!this.userInfo;
    },
    // --------------- 以下为server端方法  -----------------
    /**
     * 
     * 判断一个socketId是否被当前设备使用
     * 
     * @param socketId
     * 
     * @returns {Boolean}
     * 
     */
    __haveSocket:function(socketId){
        if(socketId){
            return this.sockets.indexOf(socketId) != -1;
        }
        return false;
    },
    __safeIP:function(remoteAddress){
        if(!remoteAddress){
            return false;
        }
        
        if(this.remoteAddress === false){
            this.remoteAddress = remoteAddress;
            return true;
        }else{
            return remoteAddress == this.remoteAddress;
        }
    },
    __socketConnection:function(socketId){
        
        this.status = 1;
        
        if(socketId && !this.__haveSocket(socketId)){
            
            // 清理为destroy事件设置的计时器.
            this.__destroyTimer = clearTimeout(this.__destroyTimer);
            
            this.sockets.push(socketId);
            netMessage.sendLocalMessage({clientId : this.getClientId(), socketId: socketId},'Client_SocketConnection');
        }
    },
    __socketDisconnection:function(socketId){
        var index;
        if(socketId && (index = this.sockets.indexOf(socketId)) != -1){
            this.sockets.splice(index,1);
            netMessage.sendLocalMessage({clientId : this.getClientId(), socketId: socketId},'Client_SocketDisconnection');
        }
        
        if(this.sockets.length == 0){
            this.status = 2;
            // 所有socket断开后2秒中触发client的destroy,为防止用户仅是希望刷新页面.
            this.__destroyTimer = setTimeout(this.__destroy.bind(this),2000);
        }
    },
    __verify:function(authMethod){
        var me = this;
        /* 
         * 如果没修改过,则不理.直接返回.
         * 
         * 因为client对像的有效期是连接时间内.
         * 
         */
        if(me.getAuthMethod && me.getAuthMethod() == authMethod){
            return;
        }
        
        fw.dev('============================================= verify  ================');
        
        // 使用get方法,使每次passport被修改时,必须经过验证, 防止随意被改;
        me.getAuthMethod = function(){
            return authMethod;
        };
        
        // 未提供验证类型，直接认为验证失败.
        if(!authMethod){
            me.userInfo = null;
            me.emit('verify');
            return;
        }
        
        netMessage.sendLocalMessage({
            clientId : me.getClientId(),
            authMethod : authMethod,
            cb :  function(err,rs){
                if(err){
                    fw.log( me.getClientId() , err );
                    if(err.code != 2001 && err.code != 1004){   // 正常的验证失败,不打trace
                        console.trace();
                    }
                }
                
                if(rs){
                    me.userInfo = rs;
                }else{
                    me.userInfo = null;
                }
                
                me.emit('verify');
            }
        } , 'SMR_AUTH_CLIENT_VERIFY');
        
    },
    __sendGlobalMsg:function(msg,tag){
        if(!msg){
            return;
        }
        
        this.sockets.forEach(function(socketId){
            netMessage.sendGlobalMessage(msg,tag,socketId);
        });
        
    },
    __destroy:function(){
        this.isDestroy = true;
        delete clientMgr[this.getClientId()];
        
        netMessage.sendLocalMessage({clientId : this.getClientId()},'Client_Disconnection');
        
        this.emit('destroy');
        
        this.removeAllListeners();
        
    }
});

//==============
//用户追踪方法
//==============

/**
* 
* 尝试从每次连接的clientId中查出新的clientId, 并创建一个client对像.
* 
* 如果找到的是旧的clientId则直接返回旧的client对像
* 
*/
var findClient = function(clientId,authMethod){
    
    if(!clientId){
        return null;
    }
    
    var rv = clientMgr[clientId] = clientMgr[clientId] || new Client(clientId);
    
    // 如果存在authMethod,自动调用验证方法.不存在的情况表示未登陆过
    if(authMethod){
        process.nextTick(function(){
            rv.__verify(authMethod);
        });
    }
    
    return rv;
};

clientTracer.__reg('findClient',findClient);

/**
 * 
 * 在serverRender时获取相应的auth对像
 *  
 * @param source {Object} controller中的env对像.
 * 
 */
auth.__reg('create',function(source){
    
    var clientId = source.clientId;
    
    if(clientId){
        
        var real = findClient(clientId);
        
        // 这里必须是一个假对像,因为有一些重名的方法在客户端与server端是不同的实现.比如emmit对像上的方法.
        var rv  = {
                getUserInfo:real.getUserInfo.bind(real),
                getStatus:real.getStatus.bind(real),
                getToken:real.getToken.bind(real),
                isLogin:real.isLogin.bind(real),
                'on':function(type,listener){
                    if(type == 'statusChange' && 'function' == typeof listener){
                        listener.call(this,null,this.getStatus(),this.getUserInfo());
                    }
                },
                'once':function(){
                  this.on.apply(this,arguments);  
                },
                'addEventListener':function(){
                    this.on.apply(this,arguments);  
                },
                'removeListener':nope,
                'removeAllListeners':nope,
                'login':nope,
                'logout':nope,
                'modifyUserInfo':nope,
                'modifyPassword':nope,
                'registerValidate':nope,
                'register':nope
        };
        
        return rv;
    }else{
        return {
            'on':function(type,listener){
                if(type == 'statusChange' && 'function' == typeof listener){
                    listener.call(this,null,'not_login',null);
                }
            },
            'once':function(){
                this.on.apply(this,arguments);  
            },
            'addEventListener':function(){
                this.on.apply(this,arguments);  
            },
            'login':nope,
            'logout':nope,
            'modifyUserInfo':nope,
            'modifyPassword':nope,
            'registerValidate':nope,
            'register':nope,
            getUserInfo:function(){
                return null;
            },
            getStatus:function(){
                return 'not_login';
            },
            getToken:function(){
                return null;
            },
            isLogin:function(){
                return false;
            }
        };
    }
});

clientTracer.__reg('onSocketConnection',function(clientId,socketId,conn){
  //debugger;
  if(!socketId || !clientId || !conn){
      return;
  }
  socket_count ++;
  var client = findClient(clientId);
  
  // 检查来源ip是否与client创建时一至,防止cookie,session的伪造
  if(client.__safeIP(conn.remoteAddress)){
      client.__socketConnection(socketId);
  }else{
      console.warn('unsafe ip address : ' , conn.remoteAddress);
      conn.end('access denied');
  }
});

clientTracer.__reg('onSocketDisconnection',function(clientId,socketId){
  
  if(!socketId){
      return;
  }
  socket_count --;
  var client;
  if(clientId){
      
      client = findClient(clientId);
      
      client.__socketDisconnection(socketId);
      
      fw.dev("socket disconnection, client " + clientId + ", socket disconnection :" + socketId , "Active Socket reg :" + socket_count , "Active Client : " + Object.keys(clientMgr).length);
      return;
  }else{
      /*
       * 如果未提供clientId，则应是由pushUpdateOfModel时，未找到socketId对应的socket引发.
       * 此时的清理，是清理非正常断开的socket.正在常的情况下，不应走这个else.
       */
      
      fw.dev("trying to clear the socketId:", socketId , ", that does not have a corresponding clientId");
      
      // 如果没有 clientId，则需要遍历所有的client并找到对应的socket并断开
      for(var clientId in clientMgr){
          client = clientMgr[clientId];
          if(client.__haveSocket(socketId)){
              client.__socketDisconnection(socketId);
          };
      }
  }
});

clientTracer.__reg("socketCount",function(clientId){
  return clientMgr[clientId] ? clientMgr[clientId].length : 0;
});


/**
* 根据一组clientId发送GlobalMessage.
*/

clientTracer.__reg("SendGlobalMessageByClientId",function(msg,tag,clientId){
  if(!msg || !tag || !clientId){
      return;
  }
  client = clientMgr[clientId];
  client.__sendGlobalMsg(msg,tag);
  
});


// 接收并处理低层事件消息

netMessage.setReceiver({
    onLocalMessage:{
        target:'SMR_AUTH_CLIENT_LOGIN_OK',
        handle: function(msg,target){
            
            var clientId = msg.clientId;
            var userInfo = msg.userInfo;
            
            if(!clientId || !userInfo){
                fw.log('SMR_AUTH_CLIENT_LOGIN_OK, missing params');
                return;
            }
            
            var client = findClient(clientId);
            client.userInfo = userInfo;
            client.emit('verify');
        }
    }
});

netMessage.setReceiver({
    onLocalMessage:{
        target:'SMR_AUTH_CLIENT_LOGOUT_OK',
        handle: function(msg,target){
            
            var clientId = msg.clientId;
            
            if(!clientId){
                fw.log('SMR_AUTH_CLIENT_LOGOUT_OK, missing params');
                return;
            }
            
            var client = findClient(clientId);
            client.userInfo = null;
            client.emit('verify');
        }
    }
});
