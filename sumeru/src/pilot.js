/*
 * message pilot, 自动生成pilot
 */
var runnable = function(sumeru){

    var pilot = {};
    var counter = 0;
    var createPilotId = function(){
        return "pilot"+counter++;
    };

    var setPilot = function(obj,type){
        
        // 解决server端collection占用内存不释放的问题.
        if(fw.IS_SUMERU_SERVER){
            return;
        }
        
        var type = type || 'model';
        if(!obj._getPilotId()){
            var pilotid = createPilotId();
            pilot[pilotid] = {
                type:type,
                stub:obj
            };
            obj._setPilotId(pilotid);
        }
    }

    var getPilot = function(pilotid){
        return pilot[pilotid];
    }


    if(sumeru.msgpilot){
        return;
    }
    
    var api = sumeru.addSubPackage('msgpilot');
    api.__reg('setPilot', setPilot, 'private');
    api.__reg('getPilot', getPilot, 'private');

};

if(typeof module !='undefined' && module.exports){
    module.exports = runnable;
}else{
    runnable(sumeru);
}