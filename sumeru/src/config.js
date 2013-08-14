var runnable = function(fw){
    (function(fw){
	var _sense = fw.sense.extend(function(){});
	
	//产生一个新config对象
	var _createObj = function(){
	    
	    var Config = function(){
		this.configMap = {};
	    },
	    //configMap = {},
	    sp = new _sense(),
	    tempFunc = function(){};
	    
	    tempFunc.prototype = sp;
	    Config.prototype = new tempFunc();//Config 继承sense API
	    
	    Config.prototype.set = function(){
		this.define.apply(this, arguments);
	    };
	    
	    Config.prototype.get = function(key){
		sp.get(key);
		return this.configMap[key]
	    };
	    
	    Config.prototype.define = function(){
		var config;
		
		if(arguments.length == 1){
		    config = arguments[0];
		}else if(arguments.length == 2){
		    config = {};
		    config[arguments[0]] = arguments[1];
		}else{
		    throw new Error('config define error');
		}
		for(var k in config){
		    if(config.hasOwnProperty(k)){
			sp.set(k, config[k]);
			this.configMap[k] = config[k];
		    }
		}
	    };
	    return (new Config());
	};
	
	//定义模块化config
	//@para moduleName 模块名称
	var defineModule = function(moduleName){
	    if(typeof moduleName === 'undefined')return;
	    
	    var configObj = _createObj();
	    
	    var tempFunc = function(){
		configObj.set.apply(configObj, arguments);
	    };
	    
	    tempFunc.defineModule = defineModule;
	    tempFunc.config = function(){
		configObj.set.apply(configObj, arguments);
	    };
	    tempFunc.get = function(){
		return configObj.get.apply(configObj, arguments);
	    };
	    
	    tempFunc.set = function(key, value){
		configObj.set.apply(configObj, arguments);
	    };
	    tempFunc.commit = function(){
		configObj.commit.apply(configObj, arguments);
		if ((typeof module !== 'undefined') && (typeof exports !== 'undefined')){
		    //Server
		    fw.pushUpdateOfConfig(configObj.configMap);
		}else{//Client
		    
		    fw.netMessage.sendMessage(configObj.configMap, 'config_push',
					      function(err){},
					      function(){});
		}
	    };
	    
	    this[moduleName] = tempFunc; 
	    return tempFunc;
	};	
	
	defineModule.call(fw, 'defineConfig');
	fw.config = fw.defineConfig;
    })(fw);
}

//for node
if(typeof module !='undefined' && module.exports){
    module.exports = runnable;
}else{
    runnable(sumeru);
}