var runnable = function(fw){
    
    var utils = fw.addSubPackage('utils'); 
	
    //========== inner function =================//
    var arrSplice = Array.prototype.splice;
    var arrConcat = Array.prototype.concat;
    
    var callArrSpl = function(arr/*,...args*/){
        return arrSplice.apply(arr,arrSplice.call(arguments,1));
    };
    
    var oKeys = Object.keys;
    
    var callArrConcat = function(arr){
        return arrConcat.apply(callArrSpl(arr,0),callArrSpl(arguments,1));
    };
    
    function _cpp(source){
        oKeys(source).forEach(function(key){
            this[key] = source[key];
        },this);
    };
    
    //====== below publish  =======//
    
    /**
     * copy对像的属性及方法到指定的目标上.
     * @param target {Object} 目标对像
     * @param ...args {...Object} 源对像
     */
    var cpp = utils.__reg('cpp',function(target/*,...args*/){
        var objs = callArrSpl(arguments,1);
        objs.forEach(_cpp,target);
        return target;
    });
    
    
    var extendFrom = utils.__reg('extendFrom',function(_base,_exts){
        var rv = null , fun=function(){};
        if(Object.create){
            rv = Object.create(_base);
        }else{
            fun.prototype = _base;
            rv = new fun();
        }
        return cpp(rv,_exts);
    });

    /**
     * 创建一个对像的代理对像，用于隐藏原始对像上的部份方法与全部属性
     */
    var getProxy = utils.__reg('getProxy',function(obj,nameList){
        var proxy = {};
        
        nameList.forEach(function(key){
            var me = this;
            proxy[key] = function(){
                if(me[key] instanceof Function){
                    return me[key].apply(me,arguments);
                }else{
                    throw  key + ' is not a function';
                }
            };
        },obj);
        
        return proxy;
    });
    
    /**
     * 销毁一个对像上的引用
     */
    var cleanObj = utils.__reg('cleanObj',function(obj,each){
        var keys = Object.keys(obj);
        keys.forEach(function(key){
            try{
                if(key != 'isDestroy'){
                    
                    each && each(this[key]);
                    
                    if(typeof(this[key]) == 'array' ){
                        this[key].length = 0;
                    }
                    delete this[key];
                }
            }catch (e) {}
        },obj);
    });
    
    /**
     * 对传入字符进行完整符合RFC3986的URI编码.
     * @param str {string}将进行编码的字符串
     * @returns {string}
     */
    var encodeURIComponentFull = utils.__reg('encodeURIComponentFull',function(str){
        var result = encodeURIComponent(str);
        
        // 处理encodeURIComponent不编码的特殊字符
        result = result.replace(/!/g , '%21');      // .  %2E
        result = result.replace(/\*/g , '%2A');      // .  %2E
        result = result.replace(/'/g , '%27');      // .  %2E
        result = result.replace(/\(/g , '%28');      // .  %2E
        result = result.replace(/\)/g , '%29');      // .  %2E
        result = result.replace(/\./g , '%2E');      // .  %2E
        result = result.replace(/\-/g , '%2D');      // .  %2E
        result = result.replace(/\_/g , '%5F');      // .  %2E
        result = result.replace(/\~/g , '%7E');      // .  %2E
        
        return result;
    });
    
    /**
     * 将URI参数还原为map结构
     * @param str {String} 可解码的uri参数
     * @returns {Object} 解码后的map对像
     */
    var uriParamToMap = utils.__reg('uriParamToMap',function (str){
        var rv = {};
        
        // 如果str为空串,null,undefined,则直接返回空字符串
        if(!str){
            return rv;
        }
        
        var params = str.split('&');
        
        params.forEach(function(item){
            var parts = item.split('=');
            // 仅处理正常的key,value, 非正常则忽略
            if(parts[0]){
                this[parts[0]] = decodeURIComponent(parts[1]);
            }
        },rv);
        
        return rv;
    });
    
    var joinArrayAndEncodeURI = function(arr,separator){
        var rv = [];
        arr.forEach(function(item){
            rv.push(encodeURIComponentFull(item));
        });
        return rv.join(separator);
    };
    
    var mapToUriParam = utils.__reg('mapToUriParam',function(map){
        var rv = [],keys = null;
        
        // 非对像类型，不进行处理
        if(typeof(map) != 'object' || Array.isArray(map)){
            return '';
        }
        
        keys = Object.keys(map);
        keys.forEach(function(key){
            var value = map[key];
            switch(typeof(value)){
                case "string":
                case "number":
                case "boolean":
                    rv.push(key + "=" + encodeURIComponentFull(value)); 
                case "object":
                    if(Array.isArray(value)){
                        rv.push(key + "=" + joinArrayAndEncodeURI(value));
                    }
                default:
                    return;
            }
        });
        
        return rv.join("&");
    });
    
    var randomInt = utils.__reg('randomInt',function (min,max){
        return Math.floor(Math.random() * (max - min + 1) + min);
    });
    
    var randomStr_str = '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIGKLMNOPQRSTUVWXYZ';
    var randomStr_len = randomStr_str.length - 1;
    utils.__reg('randomStr',function randomStr(max){
        var rv = '';
        for(var i=0;i<max;i++){
            rv += randomStr_str[randomInt(0,randomStr_len)];
        }
        return rv;
    });
    
    /**
     * 解析JSON，相比JSON.parse能忽略一些错误，如JSON.parse不能解析单引号等。但有被注入的风险。
     * 所以在方法中屏蔽了对window,document,sumeru,XMLHttpRequest等对像的直接引用。
     */
    var parseJSON = utils.__reg('parseJSON',function(str){
        //使用Function的方式parse JSON字符串,并隐藏 window,document,sumeru,XMLHttpRequest等对像,防止注入
        return (new Function('window','document','sumeru','XMLHttpRequest','return ' + str + ';')).call({},undefined,undefined,undefined,undefined);
    });
    
    
    var isSimpleType = utils.__reg('isSimpleType',function(value){
        switch(typeof(value)){
            case "string":
            case "number":
            case "boolean":
                return true;
        }
        return false;
    });
    
    var setStyles = utils.__reg('setStyles',function setStyles(element,propertys){
        var sty = element.style , val = "";
        var reg = /^(left|top|bottom|right|width|height)$/i;
        for(var key in propertys){
            val = propertys[key];
            
            if(typeof(propertys[key]) == 'number' && reg.test(key)){
                val += "px";
            }
            
            sty[key] = val;
        }
        return element;
    });
    
    /**
     * 实现方法链，即一个方法的传出是后一个方法的传入,
     * 
     * function的建议写法为
     * 
     *  function(param1,param2,....,onerror,){
     *      .... // 处理过程
     *          onerror();  // 处理失败通知
     *          return;
     *      .... // 处理过程
     *          onsuccess(param1,param2,....,onerror);      //处理成功通知执行下一个
     *  }
     * 
     *  其中
     *    param1... 在调用run的时候传入,将自动做为function的参数在调用时被传入
     *    onerror   在调用run时做为最后一个参数传入.如果不传则不会接收到异常中止的通知。因为错误控制不属于chain处理中的必要内容，所以不自动传入。
     *    onsuccess 为自动传入，调用时请将除onsuccess以外的参数，处理后原顺序传入。
     *  
     * 此实现支持异步处理，即方法最后一个参数补充传入一个callback用于执行下一个方法。
     * 同步实现请自己去写循环....
     * 
     * @param chainItems {Array}    链上的组成方法，每个元素为一个function.
     * @param finalCallback {function} 当执行完成整条方法链时，最终被调用的通知方法。
     * @returns {function} 一个可执行的方法，用于启动方法链，该方法只能执行一次, 执行后，该方法的参数将做为每一个chainItem的参数被传入。
     */
    
    fw.utils.__reg('chain',function(chainItems,finalCallback){
        // 确保接收到的是一整组可执行的并且参数数量一至的方法
        if(!Array.isArray(chainItems)){
            return false;
        }
        var arrlen = chainItems[0].length;
        if(!chainItems.every(function(item){
            return item instanceof Function && item.length === arrlen;
        })){
            return false;
        }
        
        var i = 0;
        var runNext = null;
        
        runNext = function(){
            var item = chainItems[i++];
            if(item !== undefined){
                var args = callArrConcat(arguments,runNext);
                item.apply(this,args);  // 如果上层方法使用call和apply执行，则有this，否则没有
            }else{
                finalCallback.apply(this,callArrSpl(arguments,0));
            }
        };
        
        return runNext;
    });
    
    //========默认的getTimeStamp方法，获取本地时间。当连接服务器后，此方法将会被覆盖为获得云端时间的方法 =======//
    fw.utils.__reg('getTimeStamp', function(){
        return (new Date()).valueOf();
    });
    
    //========= 以下为旧的未整理过的代码，wangsu  ==========//
    
	var __randomMap = {};
	fw.__random = function(len) {
        len = len || 10;
        
        var chars = "qwertyuiopasdfghjklzxcvbnm1234567890",
            charsLen = chars.length,
            len2 = len,
            rand = "";
            
        while (len2--) {
            rand += chars.charAt(Math.floor(Math.random() * charsLen));
        }
        
        if (__randomMap[rand]) {
            return random(len);
        }
        
        __randomMap[rand] = 1;
        return rand;
    };
	
};

if(typeof module !='undefined' && module.exports){
	module.exports = runnable;
}else{
    runnable(sumeru);
}


