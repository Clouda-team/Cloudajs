var runnable = function(sumeru){
    
    var routerMap = [];
    
    var addRouter = function(obj /*, obj1, obj2..*/){
        var rule;
        for (var i = 0, l = arguments.length; i < l; i++){
            rule = arguments[i];
            if (Library.objUtils.isObject(rule) && typeof rule.pattern != 'undefined') {
                if (rule.type=='file') {
                    routerMap.push({
                        path : rule.pattern,
                        type : rule.type,
                        action : rule.action,
                        server_render : false
                    });
                }else if (rule.action){
                    routerMap.push({
                        path : rule.pattern,
                        action : rule.action,
                        server_render : (rule.server_render!==false)
                    });
                }
                
            };
        }
    };
    
    var getAll = function(){
        return routerMap;
    };
    
    var setDefault = function(action){
        if (action) {
            var check_render = true;
            for(var i=0,len=routerMap.length;i<len;i++){
                if (routerMap[i].action == action){
                    check_render = routerMap[i].server_render;
                }
            }
            addRouter({
                pattern : '',
                action : action,
                server_render:check_render
            });  
        };
        return true;
    };
    
    var externalProcessorMap = [];
    sumeru.router.addSubPackage('externalProcessor');
    
    var addExternalProcessor = function(func /*,func1, func2*/){
       var processor;
        for (var i = 0, l = arguments.length; i < l; i++){
            processor = arguments[i];
            if (typeof processor == 'function') {
                externalProcessorMap.push(processor);
            };
        } 
    };
    
    var getAllExternalProcessor = function(){
        return externalProcessorMap;
    };
    
    sumeru.router.__reg('add', addRouter);
    sumeru.router.__reg('getAll', getAll);
    sumeru.router.__reg('setDefault', setDefault);
    
    sumeru.router.externalProcessor.__reg('add', addExternalProcessor);
    sumeru.router.externalProcessor.__reg('getAll', getAllExternalProcessor);
    
    
};
//)(sumeru);
if(typeof module !='undefined' && module.exports){
    module.exports = runnable;
}else{//这里是前端
    runnable(sumeru);
}