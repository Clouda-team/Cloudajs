
var _log = function(){
	console && console.log.apply(this, arguments);
}

var runnable = function(sumeru){
    
    var log_level = sumeru.SUMERU_APP_FW_DEBUG || false;
    
    var log = {
        
        log : function(){
            _log.apply(console, arguments);
        },
        
        dev : function(){
            if(log_level !== false){
                _log.apply(console, arguments);
            }
        }
    };
    
    sumeru.__reg('log', log.log);
    sumeru.__reg('dev', log.dev);
    
    return log;
};

if(typeof module !='undefined' && module.exports){
    module.exports = runnable;
}else{
    runnable(sumeru);
}
