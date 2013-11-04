module.exports = function(fw,getDbCollectionHandler,ObjectId){
    return {
        /**
         * 用于检测是否是正确的登陆状态,并通知远端，用户持续活动中.　部份情况下，在远端不需要保持会话时，该方法可以不实现或伪实现.
         * 
         * @param userInfo {Object} 
         *      登陆后，形成的authModel对像，包含当前登陆的一些用户信息.
         * @param cb {function}
         *      检测完成后执行的回调函数,cb(err,userInfo);err为null表示检测成功
         *      
         *      err : 'LOGIN_TIMEOUT'   超时
         *      err : 'LOGOUT'          退出
         *      err : 'UNKNOW'          未知
         *      
         * @returns
         */
        checkAndKeepAlive:function(userInfo,timeGap,cb){
            console.log('3rd PA checkAndKeepAlive : '+ JSON.stringify(userInfo) + " : " + timeGap);
            cb(null,userInfo);
        },
        /**
         * 用于验证登陆
         * @param clientId {String}
         *  当前客户端唯一ID.除非清空cookie 否则不变化.做为短期用户追踪依据
         * @param account　{stirng}
         *  帐号名称
         * @param pwd {string}
         *  密码
         * @param argstr {string}
         * 　其它参数，jsonstr或其它格式，由前端传入，原样传入至此
         * @param cb
         *  登陆成功或失败后的回调方法.
         *  cb(err,     // 如查登陆不成功，则返回消息，否则置为null
         *     {}       // userInfo
         *  );
         * @returns
         */
        login:function(clientId,account,pwd,argstr,cb){
            console.log('3rd PA login  : '+ JSON.stringify({account:account,pwd:pwd,argstr:argstr}));
            cb(null,{
                imid:'',
                firstuse:false,
                userName:account,
                v_url:'',
                ack_code:""
            });
        },
        /**
         * 用于登出通知
         * @param userInfo {Object}
         *      在登陆时传出的userInfo对像
         * @param cb
         *      回调函数.仅做通知，无论远端是否成功，在本地都已做登出处理.
         * @returns
         */
        logout:function(userInfo,cb){
            console.log('3rd PA logout  : '+ JSON.stringify(userInfo));
            cb();
        }
        
    };
}; 