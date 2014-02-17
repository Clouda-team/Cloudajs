var globalConfig = function(fw){
    
    var httpServerPort = 8080;
    var whiteList = ['websocket', 'xdr-streaming', 'xhr-streaming', 'iframe-eventsource', 'iframe-htmlfile', 'xdr-polling', 'xhr-polling', 'iframe-xhr-polling', 'jsonp-polling'];	
    var view_from_cache = false;
    
    // BAE CONFIG    
    if (fw.BAE_VERSION > 0){
        httpServerPort = 0;
        whiteList = ['xhr-streaming'];
        view_from_cache = true;
    }
    //
    
    fw.config.defineModule('cluster');
    if(fw.BAE_VERSION){
        fw.config.cluster({
            enable : false,
            host : 'redis.duapp.com',
            port : 80
        });
    }else{
        fw.config.cluster({
            enable : false,
            host : '127.0.0.1',
            port : 6379
        });
    }
    
   
    fw.config({
    	httpServerPort: httpServerPort,
    	protocols_whitelist : whiteList,
    	view_from_cache:view_from_cache
    });

    fw.config({
        clientValidation: true,
        serverValidation: true
    });


    fw.config({
        pubcache:true,//true:缓存subscript数据
        pubcachenum: 200,//本地缓存subscript数据条数的上限
        pubcachegap: 5,//缓存超出时每次删除的条数。
        pubcacheexcept:['auth-init'],//定义不缓存的部分
        domdiff: true,//是否开启domdiff
        domdiffnum: 20//domdiff阀值，超过这个数量，就直接覆盖innerHTML
    });
    
    if (typeof location != 'undefined') {

    	fw.config({
                selfGroupManagerAddr:'0.0.0.0',
                selfGroupManagerPort:'8089',
    	});
    };
    
    if (typeof exports != 'undefined' && typeof module !='undefined'){
    	var configPath = process.dstDir + '/server/tmp/config';
    	fw.config({
    	    configPath : configPath,
    	});
    	
    }
    
    var viewConfig = fw.config.defineModule('view');
    viewConfig({path : '/'});
};
//for node
if(typeof module !='undefined' && module.exports){
    module.exports = globalConfig;
}else{
    globalConfig(sumeru);
}