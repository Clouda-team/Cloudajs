var runnable = function(sumeru){
    
    var routerMap = [];
    
    var addRouter = function(obj /*, obj1, obj2..*/){
        var rule;
        for (var i = 0, l = arguments.length; i < l; i++){
            rule = arguments[i];
            if (Library.objUtils.isObject(rule) && typeof rule.pattern != 'undefined') {
                if (rule.type=='file') {
                    if (rule.max_size_allowed){//先对定义进行预处理，.
                        var match = rule.max_size_allowed.toString().toLowerCase().match(/(\d+)([mk]?)/);//match 123m 12k,10240 etc...
                        if (match){
                            if (match[2] == 'm'){
                                rule.max_size_allowed = match[1] * 1024 * 1024;
                            }else if (match[2] == 'k') {
                                rule.max_size_allowed = match[1] * 1024;
                            }else{
                                rule.max_size_allowed = match[1];
                            }
                        }
                    }
                    routerMap.push({
                        path : rule.pattern,
                        type : 'file',
                        upload_dir:rule.upload_dir,
                        max_size_allowed:rule.max_size_allowed,
                        file_ext_allowed:rule.file_ext_allowed,
                        rename : rule.rename,
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
    
    sumeru.router.__reg('getRouterByPath', function(path){
        
        for(var i = routerMap.length - 1; i >= 0; i--){
            // 因为已经path与params预先分离，所以此处要求路径整行完全匹配，即 ^ 到$
            var pattern = new RegExp('^' + routerMap[i]['path'] + "$","i");//ignore case
            if((routerMap[i]['path'] == '' && path == '') || (routerMap[i]['path'] !== '' && pattern.test(path) === true)){
                return routerMap[i];
            }
        }
        return false;
    });
    
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