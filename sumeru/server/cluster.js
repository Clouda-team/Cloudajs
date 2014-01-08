var cluster_params = {
    host : sumeru.config.cluster.get("host"),
    port : sumeru.config.cluster.get("port"),
    user: sumeru.config.cluster.get("user"),
    password:sumeru.config.cluster.get("password"),
    dbname:sumeru.config.cluster.get("dbname")
};
var channelNameRev = cluster_params.user+'-sumeru_cluster_notify_',
    channelNameSend = cluster_params.user+'-sumeru_cluster_send_',
    instance;

var options = {"no_ready_check":true};
var redis = require('redis');
 
var redis_init = function(){
    var client = redis.createClient(cluster_params.port,cluster_params.host,options);
    client.auth(cluster_params.user+ '-' + cluster_params.password + '-' + cluster_params.dbname);
    sumeru.log('redis_init',cluster_params.port,cluster_params.host,options,cluster_params.user+ '-' + cluster_params.password + '-' + cluster_params.dbname);
    return client;
};
var init = function(fw){
    
    var redis_client_subscribe = redis_init(),
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
                    redis_client_publish = redis_init();
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
    instance = redis_init();
    
    return instance;
}

module.exports = {
    init : init,
    channelNameRev : channelNameRev,
    channelNameSend : channelNameSend,
    getInstance :   getInstance
};
