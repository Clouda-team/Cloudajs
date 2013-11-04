/*
     SRouter.js设计思路
     按照童总的计划，server的路由和渲染要和client通用，
     但现在client与socket，disaptch，render等杂糅在一起，短时间难以分出
     所以第一版server独立路由和渲染
     第二版进行与前端路由进行拆分，提取共性的操作 FIXME
     2013-05-07
*/

/*
 与fileserver.js结合，把访问debug.html从取框模板到取具体模板进行合并
*/
var runnable =function(fw){
	var sRouter = fw.addSubPackage('router');
    
	require(__dirname +"/../src/uri.js")(fw);
	require(__dirname +"/../src/routeMgr.js")(fw);
	var fs = require('fs');
	var path = require('path');
	require(__dirname  + '/../src/log.js')(fw);
	
    var activeController = null;
    var _runServerRender = false;
    
    var isControllerChange = true, isParamsChange  = true, isSessionChange = true;
    var lastController = null ,lastParams = null,lastSession = null;
    var isIgnore = false , isforce = false;
    
    
    sRouter.__reg('setServerRender', function(runServer) {
    	_runServerRender = runServer;
    });
    var routing_map = {};
   
    var check_routeing = function(path){//for server router using.
    	if (!_runServerRender)
    		return null;
    	if (!routing_map[path]){
    		routing_map[path] = fw.uri.getInstance(path);
		}
		if ( routing_map[path].controller == null){//上传文件流程
		    return null;
		}else{
		    return routing_map[path];
		}
		
    };
    var __routeing = function(path,clientId,dom,callback){
        var uriParts = fw.uri.getInstance(path);//routing_map[path];
        uriParts.clientId = clientId;
        //处理session change 
        isSessionChange = true;//lastSession != uriParts.session;
        lastSession = uriParts.session;
        //处理controller change 
        isControllerChange = uriParts.controller != lastController;
        lastController = uriParts.controller;
        
        return sDispatch(uriParts.controller, uriParts,path,dom,callback);
        
    };
    var findController = function(path){
        var pattern , find;
        var routeMap =fw.router.getAll();
        for(var i = routeMap.length - 1; i >= 0; i--){
            
            // 因为已经path与params预先分离，所以此处要求路径整行完全匹配，即 ^ 到$
            pattern = new RegExp('^' + routeMap[i]['path'] + "$");  
            if((routeMap[i]['path'] == '' && path == '') || (routeMap[i]['path'] !== '' && pattern.test(path) === true)){
                if(find = eval(routeMap[i]['action'])){
                    return find; 
                }else{
                    // 如果找到匹配的path，但是结果是undefined或null等，说明controller载入不成功或配置内容错误.
                    throw "find a controller [" + path +"], but undefined.";
                }
            }
        }
    };
    //如果没有server渲染的参数，直接返回false，进入fileserver流程
    var sDispatch = function(contr,uriParts,path,dom,callback){
        if (contr===null) {
            return false;
        }
        var identifier = contr + "!" ;
        
        var constructor = findController(contr);
        if (typeof constructor != 'function' ){
        	throw "no contructor found with " + contr;
        }
        //组装样式
        //<body><div wrapper><!--fileserver render-->
        //<script></script></div><section></section></body><!---dispatch render-->
        //<wrap><section> <!--controller render-->
        var __onFinish = function(readydom){
            var readyhtml;
            //加入读取的未渲染的html
            //readyhtml = '';//'<script id="'+domid+'" type="text/x-sumeru-template" >'+ '' + '</script>';
            
            //加入读取的已渲染的html
            if (typeof readydom == 'undefined'){
            	readyhtml = dom;
            }else if (typeof dom !="string" || dom.search("</body>")==-1){
            	readyhtml = readydom;
            }else{
            	readyhtml = dom.replace("</body>",readydom+"</body>");
            }
            callback(readyhtml);
        };
        fw.controller.getServerInstance(identifier, uriParts,path,constructor,__onFinish);
        
        return true;
    };
    
    sRouter.__reg('start_routeing', __routeing, 'private');
    sRouter.__reg('check_routeing', check_routeing, 'private');
    
    sRouter.__reg('joinSessionToHash',function (serializeDat){
        //uriParts.params 与 uriParts.session 进行整合
        //did nothing
     },true);

    
    
};

if(typeof module !='undefined' && module.exports){
    module.exports = runnable;
}else{//这里是前端
    // runnable(sumeru);
}