//用于给publishFunc，beforeInsert等各种回调追加userinfo和callback参数
var appendParam = function(args, callbackParamLength, clientInfo, callback){
        
    //除去回调方法中的callback参数后的长度不等于args的长度，有两种情况：
    //第1种：用户给的参数过长
    //第2种：用户给的参数过短，或者pubFunc添加userinfo参数
    if (callbackParamLength != args.length) {
        if (callbackParamLength > args.length) {
            args.push(clientInfo);
        } else {
            args.splice(callbackParamLength);
        }
    }

    args.push(callback);

    return args;        
};

var callAfterAppend = function(func, args, userinfo, callback){
    var __args = appendParam(args, func.length - 1, userinfo, callback);
    
    func.apply(this, __args);
};


module.exports = {
    buildParam : appendParam,
    callFunc : callAfterAppend
};