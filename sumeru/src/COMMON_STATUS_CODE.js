/**
 * 
 * auth前后端通信时的代码
 * 
 * Code :
 *      0           : 无错误.便于用于在向前端返回数据时,在前端做为无错误的判断条件使用.
 *      
 *      1000 - 1999 : 保留给用户系统.
 *          1000    : 不支持的方法
 *          1001    ：用户名或密码错误
 *          1002    ：需要验证码
 *          1003    : 错误的验证码
 *          1004    : 无效的session
 *          1005    : 新密码与旧密码相同
 *          
 *          其它    : 原样返回至前端的callback中. 由各用户系统自由使用.
 *
 *      2000 - 2999 : 系统自用
 *          2000    : 不支持的目标类型
 *          2001    : sessionId验证失败.
 *          2003    : 参数不足
 *          2004    : 读取数据时发生错误
 *          2005    : 键不唯一
 * 
 */

var COMMON_STATUS_CODE = {
    '1000' : {
        code : '1000',
        msg : 'METHOD UNSUPPORTED'
    },
    '1001' : {
        code : '1001',
        msg : 'INVALID USERNAME OR PWD'
    },
    '1002' : {
        code : '1002',
        msg : 'NEED VERIF CODE'
    },
    '1003' : {
        code : '1003',
        msg : 'INVALID VERIF CODE'
    },
    '1004':{
        code : '1004',
        msg : 'INVAILD SESSION'     //user
    },
    '1005':{
        code:"1005",
        msg:"OLD_PWD === NEW_PWD"
    },
    '2006' : {
        code : '2006',
        msg : 'MISSING CALLBACK'
    },
    '2005' : {
        code : "2005",
        msg : "DUPLICATE KEY"
    },
    '2004' : {
        code : '2004',
        msg : 'SERVER ERROR'
    },
    '2003' : {
        code : '2003',
        msg : 'MISSING PARAMS'
    },
    '2001' : {
        code : '2001',
        msg : 'INVALID SESSION'     //local
    },
    '2000' : {
        code : '2000',
        msg : 'USER_TYPE UNSUPPORTED'
    }
};

if(typeof module != 'undefined'){
    module.exports = COMMON_STATUS_CODE;
}
