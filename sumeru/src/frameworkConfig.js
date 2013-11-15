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
    fw.config.cluster({
        enable : true,
        cluster_mgr : '127.0.0.1',
        cluster_mgr_port : 6379
    });
   
    fw.config({
    	httpServerPort: httpServerPort,
    	protocols_whitelist : whiteList,
    	view_from_cache:view_from_cache
    });

    fw.config({
        clientValidation: true,
        serverValidation: true
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