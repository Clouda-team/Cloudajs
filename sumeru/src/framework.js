(function(fw){
	
	var inited = false;
	
	var __socketInit = function(counter,callback){
	    var cookie = Library.cookie;
	    
	    if(!cookie.getCookie('clientId')){
	        cookie.addCookie('clientId',sumeru.utils.randomStr(12) , 24*365*20);
	    }
	    if(!cookie.getCookie('OPEN_STICKY_SESSION')){
            cookie.addCookie('OPEN_STICKY_SESSION',1);
        }
		counter = counter || 0;
		
		var socketId = fw.__random();
		
		
		
		//创建一个Socket通道
		console.log("OPEN : " +  fw.config.get('clientSocketServer'));
		sumeru.reachability.setStatus_(sumeru.reachability.STATUS_CONNECTING);
		var socket = new SockJS("http://" + fw.config.get('clientSocketServer'), undefined, {
		    protocols_whitelist : fw.config.get('protocols_whitelist')
		});
		
		socket.onmessage = function(e){
		    //FIXME RSA client
		    // 接收消息
		    var data2 ;
		    
		    if ( !fw.config.get("rsa_enable")  ) {
		        data2 = e.data;
            }else{
		        data2 = fw.myrsa.decrypt(e.data);
		    }
		    
		    fw.netMessage.onData(data2);
		    
		    return;
		};
		
		socket.onopen = function(){
			//发送链接标示符
			var SUMERU_APP_UUID = 'sumeru_app_uuid';
            sumeru.reachability.setStatus_(sumeru.reachability.STATUS_CONNECTED);
			var identifier = {};
			if ( !fw.config.get("rsa_enable") ) {//默认
			    identifier = {
                    socketId : socketId,
                    uuid    :   SUMERU_APP_UUID//SUMERU_APP_UUID
                }
			}else{
			    
                if ( counter === 0 ) {//第一次初始化直接从config的js中下载，同时生成客户端的密钥对
                    //console.log("client get config-pk and set pk2------"+ fw.config.get("rsa_pk"));
                    fw.myrsa.setPk2( fw.config.get("rsa_pk") );//先设置server的pk，马上本地会重新生成
                    fw.myrsa.generate();
                
                } else {//断线重连的时候，server端的公钥私钥可能已经发生变化，要重新拉取。
                    identifier.swappk = fw.myrsa.getPk();//有此标识，通讯信息不会加密
                    fw.myrsa.setPk2('');//删除原有pk2，重新获取pk2
                }
                
                identifier.socketId = socketId;
                identifier.uuid = SUMERU_APP_UUID;
                identifier.pk   = fw.myrsa.getPk();
           }
			
			console.log("ON OPEN : " + socket.readyState + " : " + JSON.stringify(identifier));
			
			
			fw.netMessage.setReceiver({
                onLocalMessage:{
                    target : ['after_echo_from_server'],
                    handle : function(){
                        fw.auth.init(function(){
                            inited = true;
                            callback && callback();
                            
                            sumeru.writeBuffer_.resume();
                                                            
                            if(counter > 0){
                                counter = 0;
                                fw.pubsub.__load('_redoAllSubscribe')();
                            }
                        });                            
                    }
                }
            });
            
			fw.netMessage.sendMessage(identifier, 'echo', function(e){
			    console.log('send echo error...');
			},function(){
			    console.log('send echo success...');
			});
			// socket.send(JSON.stringify(identifier));
		};
		
		socket.onclose = function(){
		    
		    sumeru.reachability.setStatus_(sumeru.reachability.STATUS_OFFLINE);
		    
			if(counter > 500){ //70次是(1+70) * 70 / 2 = 41分钟重连时间
				throw "Fail to connect to network";
			}
			
			setTimeout(function(){
                __socketInit(++counter);  
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
            if ( !fw.config.get("rsa_enable") || data.match(/"target":"echo"/) !== null ) {
                data2 = data;
            }else{
                data2 = fw.myrsa.encrypt(data);
            }
            try {
		        socket.send(data2);
            } catch (e) {
                // TODO: handle exception
                console.log("ERR : "+socket.readyState + " " + data);
                onerror && onerror(e);
            }
            onsuccess && onsuccess();
		};
		
		fw.netMessage.addOutFilter(function(msg){
		    msg.sessionId = cookie.getCookie('sessionId');
		    msg.clientId = cookie.getCookie('clientId');
			msg.passportType = cookie.getCookie('passportType');
		    return msg;
		},0);
		
	    sumeru.writeBuffer_.setOutput(sendMessage);
		sumeru.netMessage.setOutput(sumeru.writeBuffer_.write);
        
		return;
	};
	
	
	fw.init = function(callback){
		if(!inited){
			__socketInit(0, callback);
		}else{
		    callback && callback();
		}
		//fw.Controller.__load('_load').apply(this, arguments);
	};
	
	fw.reconnect = function(){
	    sumeru.reachability.setStatus_(sumeru.reachability.STATUS_CONNECTING);
	    __socketInit(1);
	}
	
	return fw;
})(sumeru);