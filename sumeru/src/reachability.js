/**
 * reachability package
 * 
 * provide detecting of network status
 * 
 * todo: should have provide wifi / 3G / Edge detection with native support
 * @author tongyao@baidu.com
 */
var runnable = function(sumeru){
    
    var STATUS_OFFLINE = 0x00;
    var STATUS_CONNECTING = 0x10;
    var STATUS_CONNECTED = 0x100;
    
    var TYPE_WIFI = 0x01;
    var TYPE_3G = 0x11;
    var TYPE_EDGE = 0x111;
    var TYPE_GPRS = 0x1111;
    
    var status_ = STATUS_OFFLINE; //默认离线
    var type_ = 0x00; //默认没有网络类型，暂未实现type的识别
    
    if(sumeru.reachability){
        return;
    }
    
    var api = sumeru.addSubPackage('reachability');
    
    var setStatus = function(status){
        status_ = status;
        return status_;
    };
    
    var getStatus = function(){
        return status_;  
    };
    
    api.STATUS_OFFLINE = STATUS_OFFLINE;
    api.STATUS_CONNECTING = STATUS_CONNECTING;
    api.STATUS_CONNECTED = STATUS_CONNECTED;
    
    api.__reg('setStatus_', setStatus, 'private');
    api.__reg('getStatus', getStatus, 'private');
};

if(typeof module !='undefined' && module.exports){
    module.exports = runnable;
}else{
    runnable(sumeru);
}

