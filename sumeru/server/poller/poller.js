module.exports = function(fw, getDbCollectionHandler){
    fw['getDbCollectionHandler'] = getDbCollectionHandler;
    var httpfetch = require('./httpFetch.js');
    var pollerArray = [];
    fw.poller = {};
    //var getDbCollectionHandler  = fw.getDbCollectionHandler;

    fw.poller.create = function (id,userfw) {
	if (typeof pollerArray[id] == 'undefined'){
	   
	    var obj = new httpfetch(userfw,getDbCollectionHandler); 
	    pollerArray[id] = obj;

	}else if (pollerArray[id].status == 'running'){
	   //为避免多次触发，暂时不允许多次create
	    //var obj = new httpfetch(userfw, getDbCollectionHandler); 
	    
	    //pollerArray[id].Stop();
	    //pollerArray[id] = obj;
	}
    }

    fw.poller.start = function(id){
	if (typeof pollerArray[id] != 'undefined'){
		if (pollerArray[id].status != 'running'){
		    pollerArray[id].Start();
		}
	}
    }

    fw.poller.stop = function(id){
	if (typeof pollerArray[id] != 'undefined'){
	    pollerArray[id].Stop();
	    delete pollerArray[id];
	}
    }

    //以后添加destory
    
}
