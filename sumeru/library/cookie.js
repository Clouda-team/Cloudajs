;
if(typeof module != 'undefined' && module.exports){//server运行
    var runnable = function(sumeru){
    	Library.cookie = sumeru.Library.create(function(exports){	
    	    var EMPTY = '';
    		var cookieStack = {};
    		var addCookie = exports.addCookie = function(name, value, expireHours){
    			cookieStack[name] = value;
    		};
    		
    		var getCookie = exports.getCookie = function(name){
    			return cookieStack[name] || EMPTY;
    		};
    		
    		var deleteCookie = exports.deleteCookie = function(name){
    		    delete cookieStack[name];
    		};
    		var parseCookie = exports.parseCookie = function(strcookie,name){
    		    if (typeof strcookie !== 'string') return '';
    		    var arrcookie = strcookie.split("; ");
                for(var i = 0; i < arrcookie.length; i++){
                    var arr = arrcookie[i].split("=");
                    if(arr[0] == name) return arr[1];
                }
                return '';
    		};
    		return exports;
    	});
	};
	module.exports = runnable;
}else{//client
	
	Library.cookie = sumeru.Library.create(function(exports){	
	    var EMPTY = '';
		
		/**
		 *@para expireHours， cookie过期的时间， 为小时。
		 */
		var addCookie = exports.addCookie = function(name, value, expireHours){
			var cookieString = name + "=" + escape(value);
			//判断是否设置过期时间
			if(expireHours > 0){
				var date = new Date();
				date.setTime(date.getTime() + expireHours * 3600 * 1000);
				cookieString = cookieString + "; path=/; expires=" + date.toGMTString();
			}else{
			    cookieString = cookieString + "; path=/";
			}
			document.cookie = cookieString;
		};
		
		var getCookie = exports.getCookie = function(name){
			var strcookie = document.cookie;
			var arrcookie = strcookie.split("; ");
			for(var i = 0; i < arrcookie.length; i++){
				var arr = arrcookie[i].split("=");
				if(arr[0] == name) return arr[1];
			}
			return EMPTY;
		};
		
		var deleteCookie = exports.deleteCookie = function(name){
		    addCookie(name, EMPTY);
		};
		
		return exports;
	});
}
