(function(sumeru){
    
    var routerMap = [];
    
    var addRouter = function(obj /*, obj1, obj2..*/){
        var rule;
        for (var i = 0, l = arguments.length; i < l; i++){
            rule = arguments[i];
            if (Library.objUtils.isObject(rule) && typeof rule.pattern != 'undefined' && rule.action) {
                routerMap.push({
                    path : rule.pattern,
                    action : rule.action
                })
            };
        }
    }
    
    var getAll = function(){
        return routerMap;
    }
    
    var setDefault = function(action){
        if (action) {
            addRouter({
                pattern : '',
                action : action    
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
    }
    
    var getAllExternalProcessor = function(){
        return externalProcessorMap;
    }
    
    sumeru.router.__reg('add', addRouter);
    sumeru.router.__reg('getAll', getAll);
    sumeru.router.__reg('setDefault', setDefault);
    
    sumeru.router.externalProcessor.__reg('add', addExternalProcessor);
    sumeru.router.externalProcessor.__reg('getAll', getAllExternalProcessor);
    
    
})(sumeru);
