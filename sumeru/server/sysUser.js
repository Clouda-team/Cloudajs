/**
 * 
 * 用户系统
 * 
 * 从auth中分离出的用户系统.该系统不负责框架的访问受权
 * 向外提供用户相关操作的API.主要用于完成不同用户类型的身份认证及数据管理.
 * 
 * 用户系统根据使用数据来源不同进行分隔,目前主要为分三类:
 * 
 *      1: 本地用户 - 在框架本身提供的用户系统,数据存放于本地db中.
 *      
 *      2: Baidu Passport - 百度帐号体系, 注册及数据的修改,需要在百度用户中心进行修改和注册.
 *      
 *      3: tpa(third part account) - 框架提供接口但不提供实现, 用于与第三方用户系统对接,具体实现需要由开发者进行实现.
 *      
 */

var fw = require(__dirname + '/../src/newPkg.js')();

var inherits = require('util').inherits,
    _extend = require('util')._extend,
    EventEmitter = require('events').EventEmitter;

var arrPop= Array.prototype.pop;

// 文件名前缀
var prefix = __dirname + '/authMethod/';

// 帐户类型
var authMethodList = [ "local" , 'baidu' , 'tpa'];

var AccountHandler = {supportType:[]};

var unsupport = {code:1000};

var doUnsupport = function(){
    var callback = arrPop.call(arguments);
    if(callback instanceof Function){
        callback(unsupport);
    }else{
        throw 'unsupport method.';
    }
};
/**
 * 默认处理接口
 */
var baseHandle ={
        /**
         * 登陆方法
         * 
         * @param token {string}  
         *      登陆名
         * @param pwd {string}
         *      密码,最好是加密后的值,防止原始密码被明文传播
         * @param args {Object}   
         *      附加信信息,格式自似,用于传递登陆时使用的其它信息,
         *      如验证码,长效登陆参数等等
         * @param callback {function}
         *      验证完成后通知,调用方式如下:
         *      
         *      callback(err,{
         *          id:"userId_x",
         *          info:{Object},
         *      });
         *      
         *      第一个参数为错误信息对像或编码.
         *      
         *      第二个参数为登陆成功时返回的用户相关信息.
         *      必须包含一个名为id的字符串与一个名为info的对像.
         *      
         *      注:在verify方法中,将回传这两个参数做为附加的验证依据.
         *         所以在实现这个方法时info,需要考虑到这一点,
         *         如生成一个可验证的userId,或在info对像中附加可验证的安全码等
         *      
         *      
         */
        login   : doUnsupport,
        /**
         * 登出方法,当方法被调用时,
         * 无论如何框架都会做登出处理,这个方法只是一个用于通知的方法.
         * 作用仅限于通知对应的用户系统有一个用户执行了退出操作.
         * 
         * @param token {string}
         *      登陆名
         * @param userId {string}
         *      用户登陆成功后返回的id.
         * @param info {Object} 
         *      用户登陆成功后返回的info对像
         * @param callback{function}
         *      完成登出后的回调,调用方式如下:
         *          callback(err);
         * 
         *      err为错误对像,如果无错误,返回null即可.
         *  
         */
        logout  : function(token,userId,info,cb){
            sumeru.log('user logout , ',token);
            cb();
        },
        /**
         * 注册方法
         * 
         * @param token {string}
         *      登陆名  
         * @param pwd {string}
         *      登陆密码, 最好是加密后的值,防止原始密码被明文传播
         * @param info {Object}
         *      附加信息
         * @param callback{function}
         *      注册完成后的回调,调用方式如下:
         *      
         *      callback(err,{Object});
         *      
         *      其中第一个参数为错误对像或编码. 用于通知注册过程中产生的错误信息.
         *      第二个参数为用户注册成功后的数据对像,将不做任何处理原样返回至前端,
         *      (意思是传不传对框架没啥用,只是方便开发便于扩展,但是不管传什么请注意安全)
         *      
         */
        register : doUnsupport,
        /**
         * 
         * 验证一个注册信息是否可用
         * 尽量请在前端验证密码复杂性或用户名合法性等让这里只做简单的操作
         * 
         * @param testItem {Object}
         *      可以包含任意注册所需的内容，最简单的情况可能是一个用户名，一个邮件地址等
         * 
         * @param callback {function}
         *      回调，只需返回一个boolean值，true为可用，false为不可用.
         *      不需返回任何错误，遇到错误请直接认为是不可用，
         * 
         */
        registerValidate : function(testItem,callback){
            cb(null,false);
        },
        /**
         * 验证一个session是否仍然有效.
         *  
         * 用户离线后重连时，打开新窗口时会调用这个方法
         * 
         * @param userId {string}
         *      登陆时回传的id,
         * @param userInfo {Object}
         *      登陆时回传的info对像,
         * @param callback {function}
         *      验证完成后执行的回调方法.调用方式如下:
         *      
         *          callback(err);
         *          
         *      err为错误对像或编码,如果session仍然有效,返回null即可.
         */
        verify   : doUnsupport,
        /**
         * 
         * 修改登陆密码
         * 
         * @param token {string}
         * @param oldPwd {string}
         * @param newPwd {string}
         * @param callback {function}
         * 
         */
        modifyPassword:doUnsupport,
        /**
         * 
         * 修改用户信息
         * 
         * @param token {string}
         * @param pwd {string}
         * @param newInfo {string}
         * @param callback {function}
         *  
         */
        modifyUserInfo:doUnsupport,
        /**
         * 
         * 在想这个有没有用..应该是没有..先写着吧.
         */
        getUserInfo   : doUnsupport,
    };


authMethodList.forEach(function(item){
    var requName = prefix + item + ".js";
    try{
        // 载入 handle, 如果找不到由直接认为不支持这个类型的用户.
        AccountHandler[item] =_extend(baseHandle,require(requName)(fw));
        AccountHandler.supportType.push(item);
    }catch(e){
        if(e.code == 'MODULE_NOT_FOUND'){
            console.warn("Cannot find the authMethod handler of [" + item + "] from "+ requName);
            //console.error(e);
        }else{
            throw e;
        }
    }
});

module.exports = AccountHandler;
