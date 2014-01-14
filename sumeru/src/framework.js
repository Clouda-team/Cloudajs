(function(fw){
	
	var inited = false;
	
	var cookie = Library.cookie;
	var socket = null;
	var reachability = fw.reachability;
	var config = fw.config;
	var netMessage = fw.netMessage;
	var myrsa = fw.myrsa;
	var writeBuffer_ = fw.writeBuffer_;
	
	
	var clientId = null,
	    authMethod = cookie.getCookie('authMethod');
	
    if(!(clientId = cookie.getCookie('clientId'))){
        var t = Date.now().toString(32);
        clientId = t + "_" + sumeru.utils.randomStr(12);
        cookie.addCookie('clientId',clientId , 24*365*20);
    }
    
    if(!cookie.getCookie('OPEN_STICKY_SESSION')){
        cookie.addCookie('OPEN_STICKY_SESSION',1);
    }
    
    
    fw.__reg('clientId',clientId);
    
    netMessage.addOutFilter(function(msg){
        msg.clientId = clientId;
        msg.authMethod = authMethod;
        return msg;
    },0);
    
	var __socketInit = function(counter,callback){
	    
	    var socketId = fw.__random();
	    
	    // 如果开启rsa,将在每次建立连接的时候同步加密信息,所以将config状态放在每次初始化连接的时候.
    	var rsa_enable = config.get("rsa_enable");
    	
    	// 除非当前是断线状态,否则绝不建立连接
	    if(reachability.getStatus() != reachability.STATUS_OFFLINE){
	        fw.dev('Another connection still open, stop connect');
	        return;
	    }

        if( ( counter = counter || 0 ) > 500){ //70次是(1+70) * 70 / 2 = 41分钟重连时间
            throw "Fail to connect to network";
        }
	    
		var clientSocketServer;
		
		if (config.get('httpServerPort') && config.get('httpServerPort') != "80" && location.hostname.indexOf('.duapp.com')==-1){
			clientSocketServer = location.hostname + ':' + config.get('httpServerPort') + '/socket/';
		}else{
			clientSocketServer = location.hostname + '/socket/';
		}
		//for bae long connection
		clientSocketServer = clientSocketServer.replace('.duapp.com', '.sx.duapp.com');
		//创建一个Socket通道
		fw.dev("OPEN : " +  clientSocketServer);
		reachability.setStatus_(reachability.STATUS_CONNECTING);
		
		socket = new SockJS("http://" + clientSocketServer, undefined, {
		    protocols_whitelist : config.get('protocols_whitelist')
		});
		
		socket.onmessage = function(e){
		    //FIXME RSA client
		    netMessage.onData( rsa_enable ? myrsa.decrypt(e.data) :  e.data);
		};
		
		socket.onopen = function(){
		    reachability.setStatus_(reachability.STATUS_CONNECTOPEN);
		    
			//发送链接标示符
			var identifier = {};
			var SUMERU_APP_UUID = 'sumeru_app_uuid';
			
			if (!rsa_enable) {//默认
			    identifier = {
                    socketId : socketId,
                    uuid    :   SUMERU_APP_UUID
                };
			}else{
			    
                if ( counter === 0 ) { //第一次初始化直接从config的js中下载，同时生成客户端的密钥对
                    myrsa.setPk2( config.get("rsa_pk") );//先设置server的pk，马上本地会重新生成
                    myrsa.generate();
                } else {//断线重连的时候，server端的公钥私钥可能已经发生变化，要重新拉取。
                    identifier.swappk = myrsa.getPk();//有此标识，通讯信息不会加密
                    myrsa.setPk2('');//删除原有pk2，重新获取pk2
                }
                
                identifier.socketId = socketId;
                identifier.uuid = SUMERU_APP_UUID;
                identifier.pk   = myrsa.getPk();
           }
			
			fw.dev("ON OPEN : " + socket.readyState + " : " + JSON.stringify(identifier));
			
			netMessage.sendMessage(identifier, 'echo');
		};
		
		socket.onclose = function(reason){
		    var reconnectTimer = null;
		    
		    fw.log("Socket has been closed : " , reason.reason);
		    reachability.setStatus_(reachability.STATUS_OFFLINE);
		    
		    // 正常关闭时不重连
	        if(reason.code == 1000){
	            return;
	        }
	        
            reconnectTimer = setTimeout(function(){
                // 只有在在线的情况下发生断线,才进行重连,否则交收online事件触发重连..
                // 断开之后在重建之前,检查在线状态,如果不在线,则不重连,并将重连交给online事件.
                if(navigator.onLine === true){
                    __socketInit(++counter);  
                }else{
                    clearTimeout(reconnectTimer);
                }
            }, 1000);
		};
		
		//FIXME RSA,this is client
		var sendMessage = function(data,onerror,onsuccess){
		    
		    if(socket.readyState === 0){
                setTimeout(function(){
                    sendMessage(data,onerror,onsuccess);
                }, 50);
                return;
            }
            
            var data2;
            if ( !rsa_enable || data.match(/"target":"echo"/) !== null ) {
                data2 = data;
            }else{
                data2 = myrsa.encrypt(data);
            }
            
            try {
		        socket.send(data2);
            } catch (e) {
                // TODO: handle exception
                fw.log("error : "+socket.readyState + " " + data);
                onerror && onerror(e);
            }
            
            onsuccess && onsuccess();
		};
		
	    netMessage.setReceiver({
	        onLocalMessage:{
	            target : ['after_echo_from_server'],
	            overwrite : true,
	            handle : function(){
	                fw.auth.init(function(){
	                    inited = true;
	                    callback && callback();
	                    
	                    writeBuffer_.resume();
	                                                    
	                    if(counter > 0){
	                        counter = 0;
	                        fw.pubsub.__load('_redoAllSubscribe')();
	                    }
	                });                            
	            }
	        }
	    });
		
	    writeBuffer_.setOutput(sendMessage);
		netMessage.setOutput(writeBuffer_.write);
        
		return;
	};
	
	fw.init = function(callback){

		/**
		 * 假设网络始终处于连接状态：
		     一个app只需要连接一次，断线重连时的socket重连以及消息重发由reachability来处理。
		     transition.init也只需要做一次。
		 */
		if(!inited){
			if(fw.config.get('pubcache')){
				__socketInit(0);
			}else{
				__socketInit(0, function(){
	            	callback && callback();
				});
			}
			//for offline
			var publishModelMap = fw.cache.get('publishModelMap');
			if(publishModelMap){
    			Library.objUtils.extend(sumeru.pubsub._publishModelMap, JSON.parse(publishModelMap));
			}
			fw.transition._init();
		}

		if(fw.config.get('pubcache')){
			//目前的callback都是分发路由
            callback && callback();
		}
	};
	
	fw.reconnect = function(){
        __socketInit(1);
    };
    
    fw.closeConnect = function(){
        socket && socket.close();
    };
	
})(sumeru);