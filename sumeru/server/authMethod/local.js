/**
 * 处理本地用户登陆
 */
var fw = null;

var simpleCrypto = require('../simpleCrypto.js');

var dbHandle , getDbCollectionHandle , ObjectId;

var smrLocalUser = null;
var userCollection = null;




var handles = {
    /**
     * @see sysUser.js :: baseHandle#login
     * 
     * @param token
     * @param pwd
     * @param args
     * @param callback
     */
    login : function(token,pwd,args, callback) {
        var args = arguments;
        //  固化collection式写法
        if(!userCollection){
            getDbCollectionHandler('smr_LocaleUser',function(err,collection){
                userCollection = userCollection || collection;
                handles.login.apply({},args);
            });
            return;
        }
        
        if(typeof callback != 'function'){
            console.warn('sysUser_local::register,  missing callback ');
            console.trace();
            return;
        }
        
        if(!token || !pwd){
            callback({code:2003},null);
            return;
        }
        
        // 不论前端是否加密过，在这里也要加密一次. 在正确的情况下即保证两次md5
        pwd = simpleCrypto.md5( pwd + "" );
        
        userCollection.findOne({
            token:token
        },function(err,user){
            
            if(err){
                sumeru.log(err.stack || err);
                callback(err && {code:2004},null);
                return;
            }
            
            var securityCode , info;
            
            // 没找到对应的登陆名
            if(!user || user.pwd !== pwd){
                // 这里可以区分出用户名错误还是密码错误 ，但为了防止猜测用户名，无论那个错了，都返回同一个错误号
                callback({code:1001},null);
                return;
            }
            
            /* 
             * 这里使用一个简单的方式根据安全码计算出一个对session的效验信息，并附加在info对像中返回至认证系统.
             * 主要目的是防止过期的session内容对业务系统产生影响。
             * 
             * securityCode = aes192(aes192(token，pwd),secretKey);
             * 
             * token与pwd计算出的值只能用于保证在正常情况下，密码变更导至server端的session失效.
             */ 
            securityCode = simpleCrypto.encodeAes192(token,pwd);
            
            /* 
             * 所以需要一个不下发到client端的另一个secreKey信息来确保session的内容未被修改
             * secretKey将在用户注册的时候在server端生成，并且可以在每次用户改变重要认证信息的时候改变一次.
             * 保证在必要的时候使之前的session失效
             * 
             * 如果secretKey不存在，则使用一个不记住的key来加密，结果是生成一个一次性的securityCode。
             * 这里的随机key直接使用用时间戳.
             * 
             */
            securityCode = simpleCrypto.encodeAes192(securityCode,user.secretKey || (Date.now() + ""));
            
            
            info = user.info || {};
            info.securityCode = securityCode;
            
            callback(null,{id:user.userId,info:info});
            
            sumeru.log("USER LOGIN :" , token, info);
            
        });
    },
    /**
     * @see sysUser.js :: baseHandle#registerValidate
     * @param testItem
     * @param callback
     */
    registerValidate:function(testItem,callback){
        var args = arguments;
        //  固化collection式写法
        if(!userCollection){
            getDbCollectionHandler('smr_LocaleUser',function(err,collection){
                userCollection = userCollection || collection;
                handles.registerValidate.apply({},args);
            });
            return;
        }
        
        if(testItem &&  testItem.token){
            var token = testItem.token;
            userCollection.count({token:token},function(err,len){
                if(err){
                    sumeru.log(err.stack || err);
                }
                // 不等于0就认为是不能注册...
                callback(err && {code:2004},len === 0);
            });
        }else{
            callback({code:2003},null);
        }
    },
    /**
     * @see 
     *      sysUser.js :: baseHandle#register
     *      
     * @param token
     * @param pwd
     * @param userInfo
     * @param callback
     */
    register : function(token,pwd,userInfo,callback) {
        var args = arguments;
        //  固化collection式写法
        if(!userCollection){
            
            getDbCollectionHandler('smr_LocaleUser',function(err,collection){
                userCollection = userCollection || collection;
                handles.register.apply({},args);
            });
            return;
        }
        
        if(typeof callback != 'function'){
            console.warn('sysUser_local::register,  missing callback ');
            console.trace();
            return;
        }
        
        if(!token || !pwd){
            callback({code:2003},null);
            return;
        }
        
        var user = {
                userId : ObjectId(),
                token : token,
                // 无论传入是否是已加密的，统统再加一次密.保证就是不存明文
                pwd : simpleCrypto.md5( pwd + "" ),
                info : userInfo || {},
                // 密码加时间戳做为secretKey，后续将采用aes192计算一个验证session中记录用户数据有效性的验证字符串.
                secretKey : fw.utils.randomStr(10) + Date.now()
        };
        
        // 重复检查
        userCollection.count({token:token},function(err,len){
            if(err){
                sumeru.log(err.stack || err);
                callback({code:2004},null);
                return;
            }
            
            //不重复才注册.
            if(len != 0){
                callback({code:2005},token);
                return;
            }
            
            userCollection.insert(user,function(err,item){
                //debugger;
                if(err){
                    sumeru.log(err.stack || err);
                    callback({code:2004},null);
                }else{
                    sumeru.log("localUser : register :" , token );
                    callback(null,{userId : item && item[0] && item[0].userId});
                }
            });
            
        });
        
    },
    /**
     *  @see 
     *      sysUser.js :: baseHandle#verify
     *      
     * @param userId
     * @param info
     * @param callback
     */
    verify : function(userId,info,callback) {
        //debugger;
        var args = arguments;
        //  固化collection式写法
        if(!userCollection){
            getDbCollectionHandler('smr_LocaleUser',function(err,collection){
                userCollection = userCollection || collection;
                handles.verify.apply({},args);
            });
            return;
        }
        
        if(!info.securityCode){
            callback({code:1004},null);
            return;
        }
        
        userCollection.findOne({userId:userId},function(err,user){
            if(err){
                sumeru.log(err.stack || err);
                callback({code:2004},null);
                return;
            }
            
            if(!user.secretKey){
                callback({code:1004},null);
                return;
            }
            
            try{
                // 还原一半
                var halfCode_1 = simpleCrypto.decodeAes192(info.securityCode,user.secretKey);
                
                // 取得还原后应有的另一半
                var halfCode_2 =  simpleCrypto.encodeAes192(user.token,user.pwd);
                
                if(halfCode_1 != halfCode_2){
                    throw 'fake session';
                }
                
            }catch(e){
                sumeru.log('LOCAL_USER::verify, fake session.' , e);
                // 验证失败
                callback({code:1004},null);
                return;
            }
            
            // 验证成功
            callback(null);
        });
        
    },
    /**
     *  @see 
     *      sysUser.js :: baseHandle#modifyPassword
     *      
     * @param token
     * @param oldPwd
     * @param newPwd
     * @param callback
     */
    modifyPassword:function(token,oldPwd,newPwd,callback){
        
        var args = arguments;
        
        //  固化collection式写法
        if(!userCollection){
            getDbCollectionHandler('smr_LocaleUser',function(err,collection){
                ObjectId = ObjectId || fw.ObjectId;
                userCollection = userCollection || collection;
                handles.modifyPassword.apply({},args);
            });
            return;
        }
        
        
        if(typeof callback != 'function'){
            console.warn('sysUser_local::modifyPassword,  missing callback ');
            console.trace();
            return;
        }
        
        if(!token || !oldPwd || !newPwd ){
            callback({code:2003},null);
            return;
        }
        
        // 无论前端传入是否加密,都加密一次
        newPwd = simpleCrypto.md5( newPwd + "" );
        oldPwd = simpleCrypto.md5( oldPwd + "" );
        
        userCollection.findOne({token:token},function(err,item){
            if(err){
                sumeru.log(err.stack || err);
                callback({code:2004},null);
                return;
            }
            
            if(!item || item.pwd != oldPwd){
                callback({code:1001},null);
                return;
            }
            
            item.pwd = newPwd;
            
            // 更换安全码
            item.secretKey =  fw.utils.randomStr(10) + Date.now();
            
            userCollection.save(item,function(err){
                if(err){
                    sumeru.log(err.stack || err);
                    callback({code:2004},null);
                    return;
                }
                
                callback(null);
                
            });
            
        });
    },
    /**
     *  @see 
     *      sysUser.js :: baseHandle#modifyUserInfo
     * 
     * @param token
     * @param pwd
     * @param newInfo
     * @param callback
     */
    modifyUserInfo:function(token,pwd,newInfo,callback){
        
        var args = arguments;
        
        //  固化collection式写法
        if(!userCollection){
            getDbCollectionHandler('smr_LocaleUser',function(err,collection){
                ObjectId = ObjectId || fw.ObjectId;
                userCollection = userCollection || collection;
                handles.modifyUserInfo.apply({},args);
            });
            return;
        }
        
        
        if(typeof callback != 'function'){
            console.warn('sysUser_local::modifyUserInfo,  missing callback ');
            console.trace();
            return;
        }
        
        if(!token || !newInfo || !pwd || typeof newInfo != "object"){
            callback({code:2003},null);
            return;
        }
        
        // 无论前端传入是否加密,都加密一次
        pwd = simpleCrypto.md5( pwd + "" );
        
        userCollection.findOne({token:token},function(err,item){
            if(err){
                sumeru.log(err.stack || err);
                callback({code:2004},null);
                return;
            }
            
            if(!item || item.pwd != pwd){
                callback({code:1001},null);
                return;
            }
            
            item.info = newInfo;
            
            // 更换安全码, 换不换呢 ?
            // item.secretKey =  fw.utils.randomStr(10) + Date.now();
            
            userCollection.save(item,function(err){
                if(err){
                    sumeru.log(err.stack || err);
                    callback({code:2004},null);
                    return;
                }
                callback(null);
            });
            
        });
    }
};

module.exports = function(_fw) {
    fw = _fw;
    
    dbHandle = fw.getDbHandler();
    getDbCollectionHandler = dbHandle.getDbCollectionHandler;
    ObjectId = dbHandle.ObjectId;

    return handles;
};