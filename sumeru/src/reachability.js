/**
 * reachability package
 * 
 * provide detecting of network status
 * 
 * todo: should have provide wifi / 3G / Edge detection with native support
 * @author tongyao@baidu.com
 */
var runnable = function(sumeru){
    if(sumeru.reachability){
        return;
    }
    var api = sumeru.addSubPackage('reachability');
    
    var STATUS_OFFLINE = 0x00;
    var STATUS_CONNECTING = 0x10;//network online,正在尝试连接socket
    var STATUS_CONNECTOPEN = 0x11;//scoket 已连接，服务器正在等待客户端echo 握手
    var STATUS_CONNECTED = 0x100;//cs已连接
    
    var status_ = STATUS_OFFLINE; //默认离线
    

    var setStatus = function(status){
        if(status_!=status){
            if(status_==STATUS_CONNECTED&&status==STATUS_OFFLINE){
                sumeru.eventStack._trigger('offline');
            }
            if(status==STATUS_CONNECTED){
                sumeru.eventStack._trigger('online');
            }
            status_ = status;
        }
        return status_;
    };
    
    var getStatus = function(){
        return status_;  
    };
    
    api.STATUS_OFFLINE = STATUS_OFFLINE;
    api.STATUS_CONNECTING = STATUS_CONNECTING;
    api.STATUS_CONNECTOPEN = STATUS_CONNECTOPEN;
    api.STATUS_CONNECTED = STATUS_CONNECTED;

    //FIXME 完善在线功能，添加trigger online、offline方法。
    //因为断线有两种可能，一种是与server中断（可能server故障），第二种是失去网络连接
    
    
    api.__reg('setStatus_', setStatus, 'private');
    api.__reg('getStatus', getStatus, 'private');
};

if(typeof module !='undefined' && module.exports){
    module.exports = runnable;
}else{
    runnable(sumeru);
    
}

