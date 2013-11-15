//权限中心后台
var crypto = require('crypto');
var passportBaidu = require('./driver/passport.js');

module.exports = function(fw, getDbCollectionHandler, ObjectId){
    /**
     * 
     * 第三方认证的适配器，现在固定为tpaAdap.js，目前由于对每个认证需要做一个publish，所以目前只支持一个第三方登陆.
     * tpaAdap，默认情况下，是一个无效的内容但格式有效的适配器对像．
     * 第三方适配器的开发中，应遵循引结构，其中：
     *    check方法，用于检测是否是正确的登陆状态,
     *    login方法，用于验证登陆,
     *    logout方法，用于登出,
     */
    var tpaAdap = {},
        EnableOtherLogin = null;
    try{
        /*
         * 载入固定的适配器文件
         */
        tpaAdap = require('./tpaAdap.js')(fw,getDbCollectionHandler,ObjectId);
        EnableOtherLogin = true;
    }catch(e){
        /**
         * 如果取不到接口或没有成功载入适配器文件，则停用第三方登陆
         */
        fw.log("ERR : authServer : Can not load tpaAdap.js, " + e);
        EnableOtherLogin = false;
    }
    
    var authstatus = {};
	var passportTypeList = {};
    var DEFAULT_EXPIRES = 15 * 24 * 3600 * 1000;//15天
	
	authstatus.LOGOUT = '0';//未登录
	authstatus.LOGIN = '1';//已登陆k
	authstatus.LOGIN_UNKNOW = '2';//登录用户名或密码错误
	authstatus.LOGIN_TIMEOUT = '3';//登陆过期
	authstatus.LOGIN_PASSWORD_UPDATE = '4';//密码更改
	authstatus.LOGIN_VERIFY_CODE = '5';//需要输入验证码
	
	authstatus.UPSERT_SUCC = '10';//注册或更新成功
	authstatus.UPSERT_FAIL = '11';//注册或更新未知的失败
	authstatus.UPSERT_REPEAT = '12';//TOKEN 重复
	
	passportTypeList.local = 'LOCAL';
	passportTypeList.baidu = 'BAIDU';
	/**
	 * FIXME
	 * 将开发者定义的第三方passportType发送到client端需要大量实现，
	 * 并且现在的authServer的实现需要为每一个第三方认证做一个publish,
	 * 所以修改server端认证实现，将之前的passportType由开发者定义简化为固定常量'tpa'.
	 * 在需要同时支持多个第三方帐号登陆时，需要重新考虑此部份的实现.
	 */
	passportTypeList.tpa = 'tpa';
    
    var _cleanLogin = function(){
        getDbCollectionHandler('smrLoginModel',function(err, collection){
            if(!err){
                collection.find({}, function(ferr, data){
                    if(!ferr){
                        data.toArray(function(terr, result){
                            if(!terr){
                                result.forEach(function(record){
                                    var existedTime = Date.now() - record.lastRequestTime;
                                    var expires = record.expires + 7 * 24 *3600 * 1000;
                                    
                                    if(existedTime > expires){
                                        collection.remove({clientId:record.clientId, sessionId:record.sessionId}, function(err, numberOfRemovedDocs) {
                                            if(err){
                                                fw.log('Clean Login Record error');
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    };
    
    fw.cleanLoginRecords = _cleanLogin;
	
	var _checkLogin = function(clientId, sessionId, passportType, callback){
	    getDbCollectionHandler('smrLoginModel',function(err,loginDbCollection){
	        loginDbCollection.findOne({sessionId: sessionId , clientId:clientId}, function(err, items){
    			if(items){
    				var userId = items.userId;
    				
    				/**
                     * FIXME BUG 
                     * 目前的实现，只在登陆的时候才会更新lastRequestTime.　
                     * 如果前端页面不刷新则会产生帐号每24小时或4小时(视登陆类型不同而不同)超时,
                     * 从而无法保持长时间活动的Bug.
                     */
                    var timeGap = Date.now() - items.lastRequestTime;
                    
                    if(passportType === passportTypeList.local){
                        getDbCollectionHandler('smrAuthModel',function(err1,handler){
                            handler.find({smr_id: userId}).toArray(function(err, subItems){
                                if(subItems && subItems.length > 0){
                                    //re-product new sessionId. 
                                    var newSessionId = subItems[0].token + subItems[0].secretKey + subItems[0].password + items.time;
                                    
                                    var sha1 = crypto.createHash('sha1');
                                    sha1.update(newSessionId);
                                    newSessionId = sha1.digest('hex');
                                    
                                    //sessionId 超过一天视为过期
                                    if(timeGap > items.expires){
                                        callback(authstatus.LOGIN_TIMEOUT, subItems[0]);
                                        //sessionid不一致的情况只有password更改的情况下才会出现。
                                        //目前只有本地账户才支持这一种情况。
                                    }else if(newSessionId !== sessionId){
                                        callback(authstatus.LOGIN_PASSWORD_UPDATE, subItems[0]);
                                        //isLogin标志为未登录状态, 退出会设置isLogin为0
                                    }else if(items.isLogin !== authstatus.LOGIN){
                                        callback(authstatus.LOGOUT);
                                    }else{
                                        callback(authstatus.LOGIN, subItems[0]);
                                    }
                                }else{
                                    callback(authstatus.LOGOUT);
                                }
                            });
                        });
                    }else if(passportType === passportTypeList.baidu){
                        //sessionId 超过一天视为过期
                        var userinfo = {
                            token: items.token,
                            info: items.info
                        };
                        if(timeGap > items.expires){
                            callback(authstatus.LOGIN_TIMEOUT, userinfo);
                        }else if(items.isLogin !== authstatus.LOGIN){
                            callback(authstatus.LOGOUT, userinfo);
                        }else{
                            callback(authstatus.LOGIN, userinfo);
                        }
                    }else if(passportType === passportTypeList.tpa){
                        var userinfo = {
                            token: items.token,
                            info: items.info
                        };
                        
                        /**
                         * 此处使用第三方的check,登陆状态的缓存及验证控制均交由第三方控制.
                         */
                        tpaAdap.checkAndKeepAlive(items,timeGap,function(err,userInfo){
                            if(err == null){
                                callback(authstatus.LOGIN, userinfo);
                            }else if(err === "LOGIN_TIMEOUT"){
                                callback(authstatus.LOGIN_TIMEOUT, userinfo);
                            }else{
                                callback(authstatus.LOGOUT, userinfo);
                            }
                        });
                    }else{
                        callback(authstatus.LOGOUT);
                    }
    			}else{
    				callback(authstatus.LOGOUT);
    			}
    		});
	    });
	};
	
	fw.checkLogin = function(clientId, sessionId, passportType, callback){
	    passportType = passportType || passportTypeList.local;
	    _checkLogin(clientId, sessionId, passportType, function(status, info){
		    callback(status, info);
		});
	};
	
	fw.publish('smrLoginModel', 'auth-init', function(sessionId, clientId, passportType, callback){
        /**
         * FIXME
         * 此处引发的数据下发，会导致前端aut.getModel()得到不完整的数据.
         * 在数据不完整的状态下，无法取到正确的passportType和info等信息.
         * 此问题可能导至刷新页面等情况后，server端与client端共同得到错误数据和响应.
         */
		if(sessionId && clientId){
		    _checkLogin(clientId, sessionId, passportType, function(status, userInfo){
			    if(status === authstatus.LOGIN){
				    callback([{ 
                       status: status, 
                       clientId: clientId, 
                       sessionId: sessionId, 
                       token: userInfo.token,
                       info: userInfo.info,
                       passportType: passportType
                    }]);
				}else{
				    callback([{ status: status, clientId: clientId }]);
				}
			});
		}else{
		    callback([{ clientId:  clientId}]);
		}
	});
	
	//登出，并将登陆记录中的标志位isLogin标志为 '0'
	fw.publish('smrAuthModel', 'auth-logout', function(sessionId, clientId, callback){
	    if(sessionId){
		    var collection = this;
	        getDbCollectionHandler('smrLoginModel',function(err,handler){
	            /**
	             * FIXME
	             * 此处的实现，在每次登陆时都会创建一条新的记录，在退出后则变成一条垃圾数据．
	             * 将会导至数据库中smrLoginModel表数据暴涨. 
	             */
	            handler.findOne({sessionId:sessionId},function(err,item){
	                /**
	                 * FIXME
	                 * 由于不知道之前的实现为什么使用update而不是直接删除，
	                 * 在未清楚实现的情况下，只需增加了查询smrLoginModel用于通知第三方认证退出的实现,
	                 * 未尝试修复smrLoginModel数据暴涨的bug.保留update实现,在理清实现后，应采用删除.
	                 * -- wangsu
	                 */
	                handler.update({sessionId : sessionId}, 
	                        {$set : {isLogin : authstatus.LOGOUT}},
	                        function(err, result){
	                            var logoutMsg = [{status: err ? authstatus.LOGIN : authstatus.LOGOUT}];
	                            /**
                                 * FIXME
                                 * 在登陆过程中，未对smrLoginModel保存passportType类型，此处无法辨识当前的登陆时类型是什么，
                                 * 所以此处在启用第三方帐户的情况下，都将尝试通知第三方帐户登出. 
                                 * 所以在tpaAdap.js中logout的实现，需要增加是否为自身登户的辨识能力,
                                 * 相对于修改authServer中的实现，此方法更容易实现，在login时userInfo增加标识信息即可.
                                 * -- wangsu
	                             */
	                            if(EnableOtherLogin && item && item.info){
	                                /*
	                                 * 通知第三方帐户退出.
	                                 * item.info为第三方在login时传回的userInfo.
	                                 */
	                                tpaAdap.logout(item.info,function(){
	                                    callback && callback(logoutMsg);
	                                });
	                            }else{
	                                callback && callback(logoutMsg);
	                            }
	               });
	            });
	        });
		}
	});
	
	//登录，生成sessionId， 并保存于登录记录中。
	fw.publish('smrAuthModel', 'auth-login', 
      function(token, password, clientId, expires, callback){
	    var collection = this;
		
		var sha1 = crypto.createHash('sha1');
		sha1.update(password);
		password = sha1.digest('hex');
		collection.find({token: token, password: password}, function(err, items){
		    if(items && items.length > 0){
			    var user = items[0];
			    var time = Date.now();
				var sessionId = token + user.secretKey + password + time;
                
                _cleanLogin();
				getDbCollectionHandler('smrLoginModel',function(err,handler){
				    
    				sha1 = crypto.createHash('sha1');
    				sha1.update(sessionId);
    				sessionId = sha1.digest('hex');
    				
    				handler.insert({
    				    clientId: clientId,
    					token: token,
    					sessionId: sessionId,
    					time: time,
    					userId: user.smr_id,
    					lastRequestTime: time,
    					isLogin: authstatus.LOGIN,
                        expires: expires ? expires : DEFAULT_EXPIRES
    				}, function(err, item){
    				    if(!err){
    						callback([{
    						    smr_id: user.smr_id,
    							status: authstatus.LOGIN, 
    							sessionId: sessionId, 
    							token: token, 
    							info: user.info,
    							clientId: clientId,
    							passportType: passportTypeList.local
    						}]);
    					}else{
    					    callback([{status: authstatus.LOGIN_UNKNOW}]);
    					}
    				});
				});
			}else{
			    callback([{status: authstatus.LOGIN_UNKNOW}]);
			}
		})
	});
	
	//登录，生成sessionId， 并保存于登录记录中。
	fw.publish('smrAuthModel', 'auth-login-baidu', 
      function(clientId, token, password, vCodeStr, verifyCode, expires, callback){
	    var collection = this;
		_cleanLogin();
		passportBaidu.passportLogin(token, password, 
		    {vcodestr: vCodeStr, verifycode: verifyCode}, function(baiduErr, userInfo){
		    if(!baiduErr){
			    var time = Date.now();
			    getDbCollectionHandler('smrLoginModel',function(err, handler){
                    var sessionId = token + fw.__random(12) + password + time;
                    var info = {
                                    auth: userInfo.auth,
                                    ptoken: userInfo.ptoken,
                                    stoken: userInfo.stoken,
                                    weakpass: userInfo.weakpass,
                                    bduss: userInfo.bduss,
                                    baiduid: userInfo.baiduid
                                };
                    var sha1 = crypto.createHash('sha1');	
                    sha1.update(sessionId);
                    sessionId = sha1.digest('hex');

                        handler.insert({
                            clientId: clientId,
                            token: token,
                            sessionId: sessionId,
                            time: time,
                            userId: userInfo._uid,
                            lastRequestTime: time,
                            info: info,
                            isLogin: authstatus.LOGIN,
                            expires: expires ? expires : DEFAULT_EXPIRES
                        }, function(err, item){
                            if(!err){
                                callback([{
                                    smr_id: userInfo.uid,
                                    status: authstatus.LOGIN, 
                                    sessionId: sessionId, 
                                    token: token, 
                                    info: info,
                                    clientId: clientId,
                                    passportType: passportTypeList.baidu
                                }]);
                            }else{
                                callback([{status: authstatus.LOGIN_UNKNOW}]);
                            }
                        });
                    });
			}else{
			    if(baiduErr.errno === 257){
				    callback([{
					   status: authstatus.LOGIN_VERIFY_CODE, 
					   vCodeStr: baiduErr.vcodestr,
					   passportType: passportTypeList.baidu
					}]);
				}else{
				    callback([{status: baiduErr.errno}]);
				}
			}
		});
	});
	
	/**
	 * 
	 */
	if(EnableOtherLogin && tpaAdap){
	    
    	fw.publish('smrAuthModel', 'other-login', function(token, password, argstr, clientId, callback){
    	    var sha1 = crypto.createHash('sha1');  
    	    var time = Date.now() + "";
    	    var sessionId = null;
    	    
            sha1.update(token || "");             // 登陆名
            sha1.update(fw.__random(12));         // 随机串
            sha1.update(password || "");          // 密码
            sha1.update(time);                    // 登陆时间
            
            sessionId = sha1.digest('hex');
            
            tpaAdap.login(clientId,token,password,argstr,function(err,userInfo){
    	        
    	        if(err){
    	            if(err === 5){
    	                callback([{
    	                    status: authstatus.LOGIN_VERIFY_CODE,
    	                    vCodeStr:userInfo.v_url,
    	                    passportType: passportTypeList.tpa,
    	                    info : userInfo
    	                    }]);
    	            }else{
    	                callback([{status: err}]);
    	            }
    	            return;
    	        }
    	        
    	        getDbCollectionHandler('smrLoginModel',function(err, handler){
    	            var loginModel = {
    	                    smr_id : ObjectId(), //create db id.
                            clientId : clientId,
                            token : token,
                            sessionId : sessionId,
                            time : time,
                            userId : '',
                            lastRequestTime : time,
                            info : userInfo,
                            isLogin : authstatus.LOGIN
                        };
    	            
    	            handler.insert(loginModel, function(err, item){
                        if(!err){
                            callback([{
                                smr_id: item[0] && item[0].smr_id,
                                status: authstatus.LOGIN,
                                sessionId: sessionId,
                                token: token,
                                info: userInfo,
                                clientId: clientId,
                                passportType: passportTypeList.tpa
                            }]);
                            
                        }else if(err == 275 ){
                            callback([{
                                smr_id: '',
                                status: authstatus.LOGIN_VERIFY_CODE,
                                sessionId: '',
                                token: token,
                                info: userInfo,
                                clientId: clientId,
                                passportType: passportTypeList.tpa
                            }]);
                        }else{
                            callback([{status: authstatus.LOGIN_UNKNOW}]);
                        }
                    });
    	        });
    	        
    	    });
    	});
	}
	
	//注册新用户
	fw.publish('smrAuthModel', 'auth-register', function(token, password, info, clientId, callback){
	    var collection = this,
		    sha1 = crypto.createHash('sha1');
			
		sha1.update(password);
		password = sha1.digest('hex');
		
		collection.find({token: token}, function(err, items){
			if(items && items.length <= 0){
				var user = {
					smr_id: ObjectId(),
					token: token,
					password: password,
					secretKey: fw.__random(8),
					info: info
				}
				collection.insert(user, function(err, collection){
					delete user.password;
					user.status = (err == null) ? 
						authstatus.UPSERT_SUCC : authstatus.UPSERT_FAIL;
					callback([user]);
				});
			}else{
				callback([{token: token, status: authstatus.UPSERT_REPEAT}]);
			}
		});
	});
	
	//更新用户信息
	fw.publish('smrAuthModel', 'auth-update', function(sessionId, clientId, newinfo, callback){
	    var collection = this,
		    sha1 = crypto.createHash('sha1');
			
			
		_checkLogin(clientId, sessionId, function(status, userinfo){
		    if(status === authstatus.LOGIN){
			    if('password' in newinfo){
				    sha1.update(newinfo.password);
					newinfo.password = sha1.digest('hex');
				}
				collection.update({smr_id: userinfo.smr_id}, 
					{$set: newinfo}, function(err){
						callback([{status: !err ? authstatus.UPSERT_SUCC : authstatus.UPSERT_FAIL}]);
					});
			}
		});
	});
}