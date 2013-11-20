/**
 * @file router.js
 * @author wangsu01
 * 
 * 操作url中的hash部份，在url的变化时，将程序导入不同的controller.
 * 
 * URL操作结构
 * 　
 *   　　URI#controller路径及名称?调用参数&SESSION结构 
 * 
 * 各部份具体样式及说明
 * 
 *   Index.html                                           // 正常资源URL
 *   #                                                    // hash部分分隔符
 *   /ControllerPath/ControllerName                       // controller目录结构及名称
 *   ?                                                    // 参数部份分隔符
 *   a=b&c=d&                                             // 用户参数，使用正常URL风格
 *   _smr_ignore=true&                                    // 忽略本次url变化
 *   _smr_ses_dat{                                        // SESSION 部份使用JSON风格，由‘SES_DAT{’定义开始边界，‘}’定义结束边界，中间部份统一使用ＵＲＩ编码一次，防止中文等特殊字符出错。
 *      ‘controllerPath1/controllerName1’ : {             // 每个session对像，KEY与[controller目结构及名称]部份相同，用于标记归属。
 *          key1:value1,
 *          key2:value2,
 *          …
 *          keyN:valueN
 *      },
 *      ‘controllerPath2/controllerName2’:{
 *          key1:value1,
 *          key2:value2,
 *          …
 *   　　　 keyN:valueN
 *       }
 *   }
 */
var SUMERU_ROUTER = SUMERU_ROUTER === undefined ? true : SUMERU_ROUTER;
(function(fw){
    var router = fw.addSubPackage('router');
    
    var uriParts;//存储此router的uri
    
    // var isInternalJoin = false;
    var isControllerChange = true, isParamsChange  = true, isSessionChange = true;
    var lastController = null ,lastParams = null,lastSession = null,lastOneSession=null;
    var isIgnore = false , isforce = false;
    
    var objToUrl = function(session){
    	var sessionObj = (typeof session == 'object') ?session:JSON.parse(session);
    	var hash = [];
        for (var name in sessionObj) {
        	hash.push(name + "=" + sessionObj[name]);
        }
        return hash.join("&");
        
    }
    /**
     * 将session部份,拼入hash
     * 修改by孙东，此函数作为session改造的一部分，在压入url的session只能压入本controller的内容
     * 可能会有子controller的问题，，FIXME TODO
     */
    router.__reg('joinSessionToHash',function (serializeDat){
        //uriParts.params 与 uriParts.session 进行整合
    	isSessionChange = lastOneSession != serializeDat;
    	lastOneSession = serializeDat;
        
        if (isSessionChange) {
        	var hash = serializeDat?("?"+objToUrl(serializeDat)):"";
        	if (hash){
        		hash = uriParts.path + uriParts.controller + hash;
        	}
        	History.replaceState(serializeDat, document.title, hash);
        }
        
    },true);
    
    router.__reg('redirect',function(urlHash,_isforce,type){
        
        var iParts = fw.uri.getInstance(urlHash);//更新path，更新controller
        //session 要体现在url中
        fw.dev("redirect....",iParts.controller,urlHash);
        // var other = fw.session.getSessionByController(iParts.controller);
        // var hash = "";
        isforce = !!_isforce;
//         
        // if ( typeof iParts.params === 'object' && !Library.objUtils.isEmpty(iParts.params) ) {
        	// var objstring="?";
        	// if (other){
        		// if (typeof other == 'string'){
        			// other = JSON.parse(other);
        		// }
    			// for( var t in other){
        			// if (!iParts.params[t]) {//从session中提取url中没有的参数
    					// objstring = objstring + t +"="+other[t]+"&";
//         				
        			// }else if (iParts.params[t] != other[t]){
        				// isforce = true;
        			// }
//         			
        		// }
        	// }
        	// hash = objstring + objToUrl(iParts.params);
        // }
        if (typeof type =='string' && type=='replace'){
        	History.replaceState(lastSession, document.title, uriParts.path + urlHash);
        }else{
        	History.pushState(lastSession, document.title, uriParts.path + urlHash);
        }
		
    });
    
    
    /**
     * 监测url中hash的变化
     * 
     * 当前规则如下:
     *  controller部份变化 : 进入其它controller
     *  session变化 : 将变化推入session工厂
     *  params变化 : 进入一个新的当前controller
     * 
     */
    function __router(locationurl){
        
        uriParts = fw.uri.getInstance(locationurl);
        
        //处理session change 
        isSessionChange = lastSession != uriParts.session;
        lastSession = uriParts.session;
        //处理controller change 
        isControllerChange = uriParts.controller != lastController;
        lastController = uriParts.controller;

        // 如果session序列化发生变化,或者controller变化，则将从url恢复到session中，但不需要触发commit
        if(isSessionChange || isControllerChange){
            fw.session.preResume(lastSession,lastController);
        }
        
        if(isIgnore == false && (isControllerChange || isParamsChange)){
            // 进入目标controller.
            fw.init((function(contr, params){
                    return function(){
                        fw.controller.dispatch(contr, params,isforce);
                        isforce = false;
                    };
            })(lastController, uriParts.contr_argu));//objToUrl(uriParts.params)
        }
        
        // 还原标记为false
        isIgnore  = isControllerChange = isSessionChange = lastOneSession = isParamsChange = false;
    }
    
     fw.event.domReady(function() {
     	if (typeof location ==='object'	){//前端渲染
     		
	         if(SUMERU_ROUTER){
	         	
	             History.Adapter.bind(window,'statechange',function(){ // Note: We are using statechange instead of onhashchange
					// Log the State
					var State = History.getState(); // Note: We are using History.getState() instead of event.state
					History.log('statechange:', State.data, State.title, State.cleanUrl);
					__router(State.cleanUrl.substr(location.origin.length));
				});
	            __router((location.href.replace(/&?_suid=\d*/g,"")).substr(location.origin.length));
	            
	         }
     	}
         
        
    });
   
})(sumeru);
