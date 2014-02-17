/**
 * eventStack
 * @author jinjinyun@baidu.com
 * usage:
 	var targetObj = window;
 	var onlineHandle = function(){console.log('window online')};
 	var offlineHandle = function(){console.log('window offline')};
 	
 	sumeru.eventStack._on(targetObj,'online',onlineHandle);
 	sumeru.eventStack._trigger(targetObj,'online');
 	sumeru.eventStack._off(targetObj,'online',onlineHandle);
 	sumeru.eventStack._trigger(targetObj,'online');

 	当targetObj 省略时 targetObj == sumeru

 	sumeru.eventStack._on('online',onlineHandle);
 	sumeru.eventStack._on('offline',offlineHandle);
 */


var runnable = function(sumeru){
    if(sumeru.eventStack){
        return;
    }
    //func将附加到target上，stackname是其在target上的属性名。
    var STACKNAME ='_smr_eventFuncStack';

    var api = sumeru.addSubPackage('eventStack');

    //on是去重的。
    var _on = function(target,eventName,func){
    	if(arguments.length==2){
    		var func = arguments[1];
    		var eventName = arguments[0];
    		var target = sumeru;
    	}
    	target[STACKNAME] = target[STACKNAME]||{};
    	target[STACKNAME][eventName] = target[STACKNAME][eventName]||[];
    	var hasIt = false;
    	Array.prototype.forEach.call(target[STACKNAME][eventName],function(item){
    		if(item===func){
    			hasIt = true;
    		}
    	})
    	if(!hasIt)target[STACKNAME][eventName].push(func);
    };
    var _off = function(target,eventName,func){
    	if(arguments.length==2){
    		var func = arguments[1];
    		var eventName = arguments[0];
    		var target = sumeru;
    	}
    	var funcs,p,len,i;
    	if(target[STACKNAME]&&target[STACKNAME][eventName]){
    		funcs = target[STACKNAME][eventName];
    		len = funcs.length;
    		for(i=0;i<len;i++){
    			if(funcs[i]===func){
    				funcs.splice(i,1);
    				return;//_on是去重的，所以匹配的只可能有一个。
    			}
    		}
    	}
    };
    var _trigger = function(target,eventName){
    	if(arguments.length==1){
    		var eventName = arguments[0];
    		var target = sumeru;
    	}
    	if(target[STACKNAME]&&target[STACKNAME][eventName]){
    		Array.prototype.forEach.call(target[STACKNAME][eventName],function(item){
	    		item.call(this);
	    	})
    	}
    };
    api.__reg('_on', _on, 'private');
    api.__reg('_off', _off, 'private');
    api.__reg('_trigger', _trigger, 'private');
}
if(typeof module !='undefined' && module.exports){
	// 本函数只运行在client
    //module.exports = runnable;
}else{
    runnable(sumeru);
    
}
