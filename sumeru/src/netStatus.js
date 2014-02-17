/**
 * netStatus 
 * 包装原生的 window.navigator.onLine 及window的online、offline事件。
 * @author jinjinyun@baidu.com
 */
var runnable = function(sumeru){
    if(sumeru.netStatus){
        return;
    }
    var api = sumeru.addSubPackage('netStatus');

    var NET_OFFLINE = 0x00;//network offline
    var NET_ONLINE = 0x100;//netnork online
    var status_ = window.navigator.onLine?NET_ONLINE:NET_OFFLINE; //默认取浏览器的在线状态，如果在壳里运行，需要配置壳的连接状态。

    var TYPE_WIFI = 0x01;
    var TYPE_3G = 0x11;
    var TYPE_EDGE = 0x111;
    var TYPE_GPRS = 0x1111;
    var type_ = 0x00; //默认没有网络类型，暂未实现type的识别

    var getNetworkInfo = function(){
    	return status_==NET_ONLINE?{
    		'type':type_,
    		'status':status_
    	}:false;
    };
    var setStatus_ = function(status){
        status_ = status;
        return status_;
    };
    var getStatus_ = function(){
        return status_;
    };

    var onlineHandle = function(){
        //trigger socket reconnect...
        sumeru.reconnect && sumeru.reconnect();//重连
    }
    var offlineHandle = function(){
        sumeru.netStatus.setStatus_(STATUS_OFFLINE);
        sumeru.reachability.setStatus_(STATUS_OFFLINE);
        sumeru.closeConnect && sumeru.closeConnect();//断开连接
    }
    //监听在线状态变化
    window.addEventListener("offline", offlineHandle, false);
    window.addEventListener("online", onlineHandle, false);

    api.__reg('info', getNetworkInfo, 'private');
    api.__reg('setStatus_', setStatus_, 'private');
    api.__reg('getStatus_', getStatus_, 'private');

}
if(typeof module !='undefined' && module.exports){
	// 本函数只运行在client
    //module.exports = runnable;
}else{
    runnable(sumeru);
    
}
