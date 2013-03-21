(function(fw){
    var auth = fw.addSubPackage('auth');
    auth.addSubPackage('tpa');
	auth.addSubPackage('baidu');
	
	var _isAuth = false, 
	    _isInit = false,
		detectCallback = [],
		authstatus = {},
		passportTypeList = {},
		sessionTimeout = 24*365*20,//20年
		pubsub = new fw.pubsub._pubsubObject();
	
	authstatus.LOGOUT = '0';//未登录
	authstatus.LOGIN = '1';//已登陆
	authstatus.LOGIN_UNKNOW = '2';//登录用户名或密码错误
	authstatus.LOGIN_TIMEOUT = '3';//登陆过期
	authstatus.LOGIN_PASSWORD_UPDATE = '4';//密码更改
	authstatus.LOGIN_VERIFY_CODE = '5';//需要输入验证码
	
	authstatus.UPSERT_SUCC = '10';//注册或更新成功
	authstatus.UPSERT_FAIL = '11';//注册或更新未知的失败
	authstatus.UPSERT_REPEAT = '12';//TOKEN 重复
	
	passportTypeList.local = 'LOCAL';
	passportTypeList.baidu = 'BAIDU';
	passportTypeList.tpa = 'tpa'; // 3rd party account
	
	var authModel = fw.model.create('Model.smrAuthModel');
	var baiduCodeBaseUrl = "http://passport.baidu.com/cgi-bin/genimage?";
	
	var _init = function( callback ){
	    var self = this;
		var cookie = Library.cookie;
	    var sessionId = cookie.getCookie('sessionId');
		var clientId = cookie.getCookie('clientId');
		var passportType = cookie.getCookie('passportType');
		
		if(!sessionId){
		    authModel.set('status', authstatus.LOGOUT);
		}
		if(clientId){
		    authModel.set('clientId', clientId);
		}
		
		pubsub.subscribe('auth-init', sessionId, clientId, passportType, function(collection){
			var item = collection.get(0);
			if(sessionId && sessionId === item.get('sessionId')){
				authModel.set('status', authstatus.LOGIN);
				authModel.set('token', item.get('token'));
                authModel.set('info', item.get('info'));
                authModel.set('passportType', item.get('passportType'));
				_isAuth = true;
			}
			//authModel.set('clientId', item.get('clientId'));
			//only set once
			if(!clientId){
			    Library.cookie.addCookie('clientId', item.get('clientId'), sessionTimeout);
			}
			
			if(detectCallback && detectCallback.length > 0){
			    detectCallback.forEach(function(item){
				   item();
				});
			}
			_isInit = true;
			callback && callback.call(self, authModel.get('status'));
		});
	};
	
	var _handlerLogin = function(collection, callback){
	    var status = authstatus.LOGOUT;
		//后端一定返回一个model
		if(collection.length > 0){
			var model = collection.get(0);
			status = model.get('status');
			//保存登陆返回的状态
			authModel.set('status', status);
			sumeru.model._extend(authModel, model)
			
			if(status === authstatus.LOGIN){
				//设置前端为登陆状态
				_isAuth = true;
				//永久存储信息到cookie， 用户删除除外。
				Library.cookie.addCookie('sessionId', model.get('sessionId'), sessionTimeout);
				Library.cookie.addCookie('passportType', model.get('passportType'), sessionTimeout);
			}
			
			if(model.get('passportType') === passportTypeList.baidu){
			    authModel.set('verifyCode', baiduCodeBaseUrl + model.get('vCodeStr'));
			}
		}
		callback && callback.call(this, {
			success: (status === authstatus.LOGIN),
			status: status
		});
	};
	
	/**
     *本地帐户登录
     *两种参数给定的方式：
     *1：{token: 'name', password: 'cryption', callback: function,expires: 1000}
     *2: function(token, password, expires, callback)
     */
	var _login = function(){
        if(arguments.length === 0){
            throw 'Please specified local token or password.';
        }
        
        var token, password, expires, callback;
        var clientId = Library.cookie.getCookie('clientId');
        if(arguments.length === 1 && 
          typeof arguments[0] === 'object'){
            var userinfo = arguments[0];
            token = userinfo.token;
            password = userinfo.password;
            callback = userinfo.callback;
            expires = userinfo.expires;
        }else{
            token = arguments[0];
            password = arguments[1];
            if(arguments.length <= 3){
               callback = arguments[2];
            }else{
               expires = arguments[2]
               callback = arguments[3];
            }
        }
        
	    pubsub.prioritySubscribe('auth-login', 
          token, password, clientId, expires, function(collection){
		    _handlerLogin.call(fw.auth, collection, callback);
		});
	};
	
	/**
     *百度账户登录
     *两种接受参数的方式
     *1：{token: 'name', 
     *    password: 'cryption', 
     *    verifyCode: 'code',
     *    callback: function
     *   }
     *2:function(token, password, veryfycode, callback)
     */
	var _loginWithBaidu = function(){
        if(arguments.length === 0){
            throw 'Please specify the token or password with baidu account';
        }
	    var clientId, token, password, verifyCode, expires, callback;
	    clientId = Library.cookie.getCookie('clientId');
		
		if(arguments.length === 1 &&
          typeof arguments[0] === 'object'){
            var userinfo = arguments[0];
		    token = userinfo.token;
            password = userinfo.password;
            callback = userinfo.callback;
            expires = userinfo.expires;
            verifyCode = userinfo.verifyCode;
		}else {
		    token = arguments[0];
			password = arguments[1];
			if(arguments.length === 3){
				callback = arguments[2];
			}else if(arguments.length > 3){
				verifyCode = arguments[2];
				callback = arguments[3];
			}
		}
		
	    pubsub.prioritySubscribe('auth-login-baidu', 
		    clientId, token, password, authModel.get('vCodeStr'), 
            verifyCode, expires, function(collection){
		    _handlerLogin.call(fw.auth, collection, callback);
		});
	};
	
	//使用第三方账户登录
	var _loginWithOther = function(){
	    var token, password, argstr, callback;
	    var clientId = Library.cookie.getCookie('clientId');
	    
	    if(arguments.length < 2){
	        throw 'Please specify the token or password with baidu account';
	    }else {
	        token = arguments[0];
	        password = arguments[1];
	        if(arguments.length === 3){
	            argstr = '';
	            callback = arguments[2];
	        }else if(arguments.length > 3){
	            argstr = arguments[2];
	            callback = arguments[3];
	        }
	    }
	    
	    pubsub.prioritySubscribe('other-login',token, password,argstr, clientId, function(collection){
	        _handlerLogin.call(fw.auth, collection, callback);
	    });
	};
	
	//插入账户到本地数据库
	var _upsert = function(token, password, info, callback){
	    var clientId = Library.cookie.getCookie('clientId');
		
	    pubsub.subscribe('auth-register', token, password, info, clientId, function(collection){
		    //后端一定会返回一个model
			var item = collection.get(0);
			var status  = item.get('status');
			
			callback.call(fw.auth, {success: status === authstatus.UPSERT_SUCC, status : status });
		});
	};
	
	//更新某用户信息
	var _update = function(newInfo, callback){
	    if(_isAuth){
		    var clientId = Library.cookie.getCookie('clientId');
		    var sessionId = Library.cookie.getCookie('sessionId');
			
			pubsub.subscribe('auth-update', sessionId, clientId, newInfo, function(collection){
				//后端一定会返回一个model
				var item = collection.get(0);
				var status  = item.get('status');
				
				callback.call(fw.auth, {success: status === authstatus.UPSERT_SUCC, status : status });
			});
		}
	};
	
	var _register = function(token, password, info, callback){
	    _upsert(token, password, info, callback);
	}
	
	var _logout = function(callback){
	    var sessionId = Library.cookie.getCookie('sessionId');
		var clientId = Library.cookie.getCookie('clientId');
		
		pubsub.subscribe('auth-logout', sessionId, clientId, function(collection){
		    var item = collection.get(0);
			if(item.status === authstatus.LOGOUT){
			    authModel.status = authstatus.LOGOUT;
			    authModel.sessionId = '';
			    Library.cookie.deleteCookie('sessionId');
			}
			callback && callback.call(fw.auth, 
			    {success: (item.status === authstatus.LOGOUT), status: item.status});
		});
	};
	
	var _isLogin = function(callback){
	    var self = this;
	    if(_isInit){
		    callback && callback.call(this, authModel.get('status'));
		}else{
		    callback && detectCallback.push(function(){
			    callback.call(self, authModel.get('status'));
			});
		}
		return (authModel.get('status') === authstatus.LOGIN);
	};
	
	var _getToken = function(){
	    return (_isAuth ? authModel.get('token') : '');
	};
	
	var _getModel = function(){
	    return sumeru.model._extend(sumeru.model.create('Model.smrAuthModel'), authModel);
        //return (_isAuth ? sumeru.model._extend(sumeru.model.create('Model.smrAuthModel'), authModel) : null);
	};
	
	var _getVerifyCode = function(){
	    var status = authModel.get('status');
	    if(status === authstatus.LOGIN_VERIFY_CODE){
		    return authModel.get('verifyCode');
		}
		return null;
	}
	
	fw.auth.__reg('init', _init, 'private');
	
	fw.auth.__reg('login', _login);
	fw.auth.__reg('logout', _logout);
	fw.auth.__reg('register', _register);
	fw.auth.__reg('update', _update);
    fw.auth.__reg('getToken', _getToken);
    fw.auth.__reg('getModel', _getModel);
	fw.auth.__reg('isLogin', _isLogin);
	
	fw.auth.__reg('getVerifyCode', _getVerifyCode);//获取图片验证码
	
	fw.auth.tpa.__reg('login', _loginWithOther);
	//百度api
	fw.auth.baidu.__reg('login', _loginWithBaidu);
})(sumeru);