var channelNameRev = 'sumeru_cluster_notify_',
    channelNameSend = 'sumeru_cluster_send_',
    instance;

var redis = require('redis');
    
var init = function(fw){
    
    var redis_client_subscribe = redis.createClient(),
        redis_client_publish;
    
    redis_client_subscribe.on("error",function(){
        fw.config.cluster.set('enable', false);    
    });
    
    redis_client_subscribe.on("message", function(channel, message){
        if (channel == channelNameRev) {
            try{
                message = JSON.parse(message);
            } catch(ex){}
            fw.netMessage.sendLocalMessage(message, channelNameRev);
        };    
    });
    
    fw.netMessage.setReceiver({
        onLocalMessage:{
            overwrite : true,
            target : [channelNameSend],
            handle : function(data){
                if (!redis_client_publish) {
                    redis_client_publish = redis.createClient();
                    instance = redis_client_publish;
                };          
                redis_client_publish.publish(channelNameRev, JSON.stringify(data));
            }
        }
    });
    
    redis_client_subscribe.on("ready", function(){
        redis_client_subscribe.subscribe(channelNameRev);        
    });
};

var getInstance = function(){
    if (instance) {return instance};
    
    instance = redis.createClient();
    
    return instance;
}

module.exports = {
    init : init,
    channelNameRev : channelNameRev,
    channelNameSend : channelNameSend,
    getInstance :   getInstance
};
