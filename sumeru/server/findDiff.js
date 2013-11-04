var runnable =function(fw){
    var idField = fw.idField;
    var isArray = function(obj) {
        if (Array.isArray) {
            return Array.isArray(obj);
        } else if (Object.prototype.toString.call(obj) == '[object Array]') {
            return true;
        };
        return false;
    };
    var fdTools = {};

    fdTools.insert = function(cnt){return fdTools.createStruct("insert",cnt)};//cnt: {key1:value1,....}
    fdTools.update = function(cnt,id){return fdTools.createStruct("update",cnt,id)};//cnt: {key1:value1,....}/value || 这里包括了collection和array的update
    fdTools.delete = function(cnt){return fdTools.createStruct("delete",cnt)};//cnt: id
    fdTools.append = function(cnt){return fdTools.createStruct("append",cnt)};//cnt: [item1,item2]
    fdTools.splice = function(cnt){return fdTools.createStruct("splice",cnt)};//cnt: [start,end]
    fdTools.createStruct = function(type,cnt,id){
        var struct = {
            "type":type,
            "cnt":cnt
        };
        if(typeof id != 'undefined'){
            struct.id = id;
        }
        return struct;
    };
    fdTools.compareObj = function(A,B){
        return JSON.stringify(A)==JSON.stringify(B);
    };
    
    
    //FIXME 这里还是应该跟端上的Collection统一考虑
    var findDiff = function(data, snapshot, modelName){


        var collectionDiff = function(cur,snap,modelName){
            var diffResult = [], 
                deleteDelta = [],
                hasDelete = false,
                curIdMap = {} ,snapIdMap = {} ,curLen,snapLen,
                _diff = [];

            if(typeof cur != 'undefined' && isArray(cur)){
                curLen = cur.length;
            }else{
                cur = [];
                curLen = 0;
            };
            if(typeof snap != 'undefined' && isArray(snap)){
                snapLen = snap.length;
            }else{
                snap = [];
                snapLen = 0;
            };

            if(typeof snap != 'undefined' && isArray(snap)){
                for(var i=0;i<snapLen;i++){
                    snapIdMap[snap[i][idField]] = {
                        rownum : i,
                        existed : false
                    }
                }
            };

            for(var i=0;i<curLen;i++){
                if(typeof snapIdMap[cur[i][idField]] != 'undefined'){
                    _diff = modelDiff(cur[i],
                                        snap[snapIdMap[cur[i][idField]]['rownum']],
                                        modelName);
                    if(_diff.length>0){
                        diffResult.push(fdTools.update(_diff,cur[i][idField]));
                    }
                    snapIdMap[cur[i][idField]]['existed'] = true;
                }else{//insert
                    diffResult.push(fdTools.insert(cur[i]));
                }
            }

            for(var p in snapIdMap){
                if(snapIdMap[p]['existed'] == false){//delete
                    deleteDelta.push(p);
                    hasDelete = true;
                }
            }

            if(hasDelete){
                diffResult.push(fdTools.delete(deleteDelta));
            }
            return diffResult;
        };
        var modelDiff = function(cur,snap,modelName){
            var diffResult = [], 
                insertDelta = {}, updateDelta = {}, deleteDelta = [],
                hasInsert = false, hasUpdate = false, hasDelete = false,
                _diff = [];

            var modelTemp = fw.server_model.getModelTemp(modelName);

            for(var p in modelTemp){
                var field = modelTemp[p];

                if (p == '_id') {
                    continue;
                };

                if(typeof field != 'undefined'){

                    if(typeof cur[p] == 'undefined'){
                        if(typeof snap[p] != 'undefined'){
                            deleteDelta.push(p);
                            hasDelete = true;
                        }else{
                            continue;
                        }
                    } 
                    if(typeof snap[p] == 'undefined'){
                        if(typeof cur[p] != 'undefined'){
                            insertDelta[p] = cur[p];
                            hasInsert = true;
                        }else{
                            continue;
                        }
                    } 
                    

                    if(field['type']=='model'){//model比较
                        if(field['relation']=='many'){
                            _diff = collectionDiff(cur[p], snap[p],field['model']);
                        }else{
                            _diff = modelDiff(cur[p], snap[p],field['model']);
                        }
                        if(_diff.length>0){
                            updateDelta[p] = _diff;
                            hasUpdate = true;
                        }
                    }else if(field['type']=='object'){
                        _diff = objDiff(cur[p], snap[p]);
                        if(_diff.length>0){
                            updateDelta[p] = _diff;
                            hasUpdate = true;
                        }
                    }/* array 的问题在于客户端的提交延迟补差，不能准确判断append
                    else if(field['type']=='array'){
                        _diff = arrayDiff(cur[p], snap[p]);
                        if(_diff.length>0){
                            updateDelta[p] = _diff;
                            hasUpdate = true;
                        }
                    }*/else{//简单对象比较
                        if(!fdTools.compareObj(cur[p], snap[p])){
                            updateDelta[p] = cur[p];
                            hasUpdate = true;
                        }
                    }
                }
            }
            if(hasInsert){
                diffResult.push(fdTools.insert(insertDelta));
            }
            if(hasUpdate){
                diffResult.push(fdTools.update(updateDelta));
            }
            if(hasDelete){
                diffResult.push(fdTools.insert(deleteDelta));
            }
            return diffResult;
        }
        //亲，obj也有增删改哦,删除的只给出key
        var objDiff = function(cur ,snap){
            var diffResult = [], 
                insertDelta = {}, updateDelta = {}, deleteDelta = [],
                hasInsert = false, hasUpdate = false, hasDelete = false;
            for(var p in snap){//以快照为基准
                if(typeof cur[p] != 'undefined'){
                    if(!fdTools.compareObj(snap[p], cur[p])){
                        updateDelta[p] = cur[p];
                        hasUpdate = true;
                    }
                }else{
                    deleteDelta.push(p);
                    hasDelete = true;
                }
            }
            for(var p in cur){
                if(typeof snap[p] == 'undefined'){
                    insertDelta[p] = cur[p];
                    hasInsert = true;
                }
            }
            if(hasInsert){
                diffResult.push(fdTools.insert(insertDelta));
            }
            if(hasUpdate){
                diffResult.push(fdTools.update(updateDelta));
            }
            if(hasDelete){
                diffResult.push(fdTools.insert(deleteDelta));
            }
            return diffResult;
        }

        var arrayDiff = function(cur,snap){/*,compareObj*/
            var diffResult = [], 
                insertDelta = {}, updateDelta = {}, deleteDelta = [],
                hasInsert = false, hasUpdate = false, hasDelete = false,
                curLen,snapLen;
            if(typeof cur != 'undefined' && isArray(cur)){
                curLen = cur.length;
            }else{
                cur = [];
                curLen = 0;
            };

            if(typeof snap != 'undefined' && isArray(snap)){
                snapLen = snap.length;
            }else{
                snap = [];
                snapLen = 0;
            };

            if(curLen > 0){//有新数据
                
                if(snapLen > 0){//有快照

                    var compareLen = Math.min(curLen,snapLen);

                    //比较重叠部分
                    for(var i=0;i<compareLen;i++){//遍历快照

                        if(!fdTools.compareObj(cur[i], snap[i])){
                            diffResult.push(fdTools.update(cur[i],i));
                        }

                    }

                    //需插入
                    if(curLen>compareLen){
                        diffResult.push(fdTools.append(cur.splice(compareLen)));
                    }

                    //需splice
                    if(snapLen>compareLen){
                        diffResult.push(fdTools.splice(compareLen));
                    }

                }else{//无快照，直接append

                    diffResult.push(fdTools.append(cur));

                }
            }else{//无新数据，直接splice

                diffResult.push(fdTools.splice([0]));

            }
            return diffResult
        }

        /**
         * 要存储的对象和其上一次保存后的快照比较形成diff
         */
        if(modelName){
            return collectionDiff(data, snapshot, modelName);
        }else{
            return objDiff(data, snapshot, modelName);
        }
    };
    return findDiff;
}
    
if(typeof module !='undefined' && module.exports){
    module.exports = runnable;
}