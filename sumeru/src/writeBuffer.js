/**
 * writeBuffer package
 * 
 * @author tongyao@baidu.com
 */
var runnable = function(sumeru){
    
    if(sumeru.writeBuffer_){
        return;
    }
    
    var api = sumeru.addSubPackage('writeBuffer_');
    
    var reachability = sumeru.reachability,
        output_,
        buffer = [];
    
    var setOutput = function(output){
        output_ = output;    
    }
    
    var write = function(msgObj, onerror, onsuccess){
        buffer.push({
            msg : msgObj,
            onError : onerror,
            onSuccess : onsuccess
        });
        sendOut();
    };
    
    
    var sendOut = function(){
        if (buffer.length == 0) {
            return true;        
        };

        var current;
        if(reachability.getStatus() == reachability.STATUS_CONNECTOPEN){
            for(var i=buffer.length-1;i>=0;i--){
                current = buffer[i];
                if(JSON.parse(current.msg).target == 'echo'){
                    output_(current.msg, current.onError, current.onSuccess);
                    buffer.splice(i,1);
                    break;
                }
            }
            
        }

        while(reachability.getStatus() == reachability.STATUS_CONNECTED 
                && (current = buffer.shift())){
            output_(current.msg, current.onError, current.onSuccess);
        }
    }
    
    api.__reg('write', write, 'private');
    api.__reg('setOutput', setOutput, 'private');
    api.__reg('resume', sendOut, 'private');
};

if(typeof module !='undefined' && module.exports){
    module.exports = runnable;
}else{
    runnable(sumeru);
}

