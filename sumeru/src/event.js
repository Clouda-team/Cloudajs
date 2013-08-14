var runnable = function(fw){
	
	fw.event = fw.event || {};
	
	fw.event.domReady = function(callback){
		if (/complete|loaded|interactive/.test(document.readyState)) {
			callback();
		} else {
			document.addEventListener('DOMContentLoaded', function(){
				callback();
			}, false);
		}
	};
	
	fw.event.onload = function(callback){
        if (/complete/.test(document.readyState)) {
            callback();            
        } else {
            window.onload = function(){
                callback();
            }
        }
	};
	
	fw.event.mapEvent = function(selector, map){
	    var ele = document.querySelector(selector);
	    if (!ele) {
	        return;
	    };
	    
	    for (var key in map){
	        if (typeof map[key] != 'function') {
	            continue;
	        };
	        //支持逗号分割同时绑定多个事件到一个callback
	        key = key.split(',');
	        key.forEach(function(eventName){
	            ele.addEventListener(eventName.trim(), map[key]);
	        });
	    }
	    
	}
	
}
if(typeof module !='undefined' && module.exports){
    module.exports = runnable;
}else{//这里是前端
    runnable(sumeru);
}
