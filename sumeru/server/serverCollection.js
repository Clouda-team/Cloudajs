var runnable = function(fw, getDbCollectionHandler , ObjectId){

    //FIXME 引入library库能力
    //var objUtils = require(__dirname  + '/../library/obj.js');

    var serverCollection = function(modelName){
        if (typeof modelName == 'undefined') {
            return null;
        };
        //publish基于的上层modelName
        this.baseModel = modelName;
    }
    
    serverCollection.prototype = {
        ObjectId : ObjectId,
        _getWhereCondition : function(whereMap){
            var _whereMap = {};
                
            if(typeof whereMap == 'undefined'){
                
            } else if(Object.prototype.toString.call(whereMap) == '[object Object]'){ //否则就是包含多个key value的object
                _whereMap = whereMap;
            }
            
            return _whereMap;
        },
        
        resolveRef : function(items, callback){
            //标记本层递归是否存在引用。
            var that = this,
                hasRef = false,
                refCount = 0;
                
            for (var i = 0, l = items.length; i < l; i++){
                for (var j in items[i]){
                    //refence只会存放在数组或object对象里
                    if (Object.prototype.toString.call(items[i][j]) != '[object Array]'
                        &&Object.prototype.toString.call(items[i][j]) != '[object Object]') {
                        continue;
                    };  
                    
                    var candidate = items[i][j],
                        refInfo;
                    
                    if (Object.prototype.toString.call(items[i][j]) == '[object Array]'){
                        for (var k = 0; k < candidate.length; k++) {
                          if (candidate[k].isReference && candidate[k].val) {
                              refInfo = candidate[k].val.split('::');
                              if(refInfo.length == 4 && refInfo[0] == '' && refInfo[1] == 'referenceID'){
                                hasRef = true;
                                refCount++;
                                
                                var refModel = refInfo[2].replace(/Model\./, ''),
                                    refId = refInfo[3];
                                (function(i, j, k, refModel, refId){
                                    var item = items[i][j][k];
                                    getDbCollectionHandler(refModel, function onGetDBCollectionHandler(err, handler){
                                        if (err != null) {
                                            throw err;
                                        }
                                        if (handler == null) {
                                            throw new ReferenceError("'handler' is null");
                                        }
                                        handler.find({smr_id : ObjectId(refId)},{}/*,{limit:1}*/).toArray(function(err, subItems){
                                            if(err){
                                                return callback(err, []);
                                            }
                                            that.resolveRef(subItems, function(err, results){
                                                if (results.length == 0) {
                                                    items[i][j][k] = '';
                                                } else {
                                                    items[i][j][k] = results[0];   
                                                }
                                                if (--refCount == 0) {
                                                    callback(err, items);
                                                };    
                                            });                                        
                                        });
                                    });                                        
                                })(i, j, k, refModel, refId);   
                              }
                          } //end if.isReference
                        };
                    }else{
                        if (candidate.isReference && candidate.val) {
                          refInfo = candidate.val.split('::');
                          if(refInfo.length == 4 
                            && refInfo[0] == '' 
                            && refInfo[1] == 'referenceID'){
                                hasRef = true;
                                refCount++;
                            
                                var refModel = refInfo[2].replace(/Model\./, ''),
                                    refId = refInfo[3];
                                (function(i, j, refModel, refId){
                                    var item = items[i][j];
                                    getDbCollectionHandler(refModel, function onGetDBCollectionHandler(err, handler){
                                        if (err != null) {
                                            throw err;
                                        }
                                        if (handler == null) {
                                            throw new ReferenceError("'handler' is null");
                                        }
                                        handler.find({smr_id : ObjectId(refId)}, {}/*, {limit:1}*/).toArray(function(err, subItems){
                                            if(err){
                                                return callback(err, []);
                                            }
                                            that.resolveRef(subItems, function(err, results){
                                                if (results.length == 0) {
                                                    items[i][j] = '';
                                                } else {
                                                    items[i][j] = results[0];   
                                                }
                                                if (--refCount == 0) {
                                                    callback(err, items);
                                                };    
                                            });                                        
                                        });
                                    });
                                })(i, j, refModel, refId);   
                          }
                        } //end if.isReference  
                    }
                }
            }
            
            if (hasRef === false) {
                callback(null, items);
            };
        },
        
        /**
         * @param options {sort : {'time' : -1}, limit : (pagesize + 1) * 5, skip : pagesize * 5}
         */
        find : function(whereMap, options, callback, modelName){
            if (arguments.length == 2) {
                callback = options;
                options = {};
            };
            var where = this._getWhereCondition.call(this, whereMap),
                that = this;

            getDbCollectionHandler(modelName?modelName:this.baseModel, function onGetDBCollectionHandler(err, handler){
                if (err != null) {
                    faildCallback.call(this, "data_write_from_server_dberror", err);
                    throw err;
                }
                if (handler == null) {
                    faildCallback.call(this, "data_write_from_server_dberror", "'handler' is null");
                    throw new ReferenceError("'handler' is null");
                }
                handler.find(where, {}, options).toArray(function(err, items){
                    if (err) {
                        return callback(err, []);
                    };
                    //fw.dev('before resolve', JSON.stringify(items));
                    that.resolveRef(items, callback);
                });
            });
                
            return true;
        },

        /**
         * External Find, 三方数据查询
         *  
         */

        extfind : function(/** pubname, arg1, arg2, arg3, callback */){

            var args = Array.prototype.slice.call(arguments);
            
            var modelName = this.baseModel;
            var pubname = args.shift();
            var callback = args.pop();

            fw.external.doFetch(modelName, pubname, args, callback);

        },

        count : function(whereMap, callback, modelName){
            var where = this._getWhereCondition.call(this, whereMap),
                that = this;

            getDbCollectionHandler(modelName?modelName:this.baseModel, function onGetDBCollectionHandler(err, handler){
                if (err != null) {
                    faildCallback.call(this, "data_write_from_server_dberror", err);
                    throw err;
                }
                if (handler == null) {
                    faildCallback.call(this, "data_write_from_server_dberror", "'handler' is null");
                    throw new ReferenceError("'handler' is null");
                }
                handler.count(where, function(err, count){
                    if (err) {
                        return callback(err, 0);
                    };
                    callback(null, count);
                });
            });
                
            return true;
        },
        insert: function(structData, successCallback, faildCallback, modelName){
            var modelName = modelName || this.baseModel;

            var doIt = (function(getDbCollectionHandler,modelName,faildCallback,successCallback,structData){
                return function(){
                    getDbCollectionHandler(modelName, function onGetDBCollectionHandler(err, handler){
                        if (err != null) {
                            faildCallback.call(this, "data_write_from_server_dberror", err);
                            throw err;
                        }
                        if (handler == null) {
                            faildCallback.call(this, "data_write_from_server_dberror", "'handler' is null");
                            throw new ReferenceError("'handler' is null");
                        }
                        handler.insert(structData, null, successCallback);
                    });
                };
            })(getDbCollectionHandler,modelName,faildCallback,successCallback,structData);

            this.runWithValidation(structData, modelName, doIt, faildCallback);
            
        },
        update: function(selector, structData, successCallback, faildCallback, modelName){
            //fw.dev("updata::",structData);
            var modelName = modelName || this.baseModel;

            var doIt = (function(getDbCollectionHandler,modelName,faildCallback,successCallback,structData){
                return function(){
                    getDbCollectionHandler(modelName, function onGetDBCollectionHandler(err, handler){
                        if (err != null) {
                            faildCallback.call(this, "data_write_from_server_dberror", err);
                            throw err;
                        }
                        if (handler == null) {
                            faildCallback.call(this, "data_write_from_server_dberror", "'handler' is null");
                            throw new ReferenceError("'handler' is null");
                        }
                        handler.update(selector, {
                                    $set : structData
                                }, null, successCallback);
                    });
                };
            })(getDbCollectionHandler,modelName,faildCallback,successCallback,structData);

            this.runWithValidation(structData, modelName, doIt, faildCallback);
        },
        remove: function(selector, successCallback, faildCallback, modelName){
            
            var modelName = modelName || this.baseModel;
            
            getDbCollectionHandler(modelName, function onGetDBCollectionHandler(err, handler){
                if (err != null) {
                    throw err;
                }
                if (handler == null) {
                    throw new ReferenceError("'handler' is null");
                }
                handler.remove(selector, null, successCallback);
            });
        },
        getDbCollectionHandler: function(){
           return getDbCollectionHandler;
        },
        /**
         * 返回验证失败的key value validation
         */
        runWithValidation : function(dataMap, modelName, successCallback, faildCallback){

            if(!fw.config.get('serverValidation')){successCallback();return;};
            var successObjs = [],//successObjs 现在暂时存下来，不发送到客户端。
                faildObjs = [];


            //validation分同步/异步，DB操作 和 validation结果 需要在同步和异步validation都结束之后才能做。
            var cbHandler = Library.asyncCallbackHandler.create(
                    function(){
                        if(faildObjs.length>0){
                            for(var i=0,ilen=faildObjs.length;i<ilen;i++){
                                faildObjs[i][fw.idField] = dataMap[fw.idField];
                            }
                            fw.log("validation faild");
                            faildCallback.call(this, "data_write_from_server_validation", faildObjs);
                            
                        }else{
                            fw.dev("validation success");
                            faildCallback.call(this, "data_write_from_server_validation", faildObjs);
                            successCallback();
                        }
                    }
                );
            cbHandler.add();//


            var oneField,label,validations,validation,validationMsg,type,value,resultObj;

            var _model = fw.server_model.getModelTemp(modelName);
            var createFaildObj = function(key,value,validationResult){
                var _obj = {};
                _obj["key"] = key;
                _obj["value"] = value;
                _obj["msg"] = validationResult["msg"];
                return _obj;
            };


            for(var p in dataMap){
                oneField = _model[p];
                if(typeof oneField != 'undefined'){
                    label = oneField["label"]||p;
                    validation = oneField["validation"];
                    validationMsg = oneField["validationMsg"];
                    type = oneField["type"];
                    value = dataMap[p];

                    if(validation){
                        if(Library.objUtils.isString(validation)){
                            validations = validation.split("|");
                        }else{
                            validations = [validation];
                        }
                        for(var i=0,len = validations.length;i<len;i++){
                            var _validation = validations[i];
                            //由于length是有参数的所以单独处理
                            var _lengthMatch = (new RegExp("([min,max]*length)\\[([0-9]+)[\\,]*([0-9]*)\\]")).exec(_validation);
                            if(_lengthMatch){
                                if(_lengthMatch.length>=3){
                                    _lengthMatch.shift();
                                    _lengthMatch.unshift(value);
                                    _lengthMatch.unshift(p);
                                    _lengthMatch.unshift(label);


                                    var validationResult = fw.validation._svalidation.apply(this,_lengthMatch);
                                    if(validationResult){//这个分支不可能有asyn
                                        faildObjs.push(createFaildObj(p,value,validationResult));
                                    }
                                }
                            }else{

                                if(fw.validation._isasynvali(_validation)){

                                    cbHandler.add();
                                    getDbCollectionHandler(modelName, (function(label,p,value,_validation,modelObj){
                                        return function onGetDBCollectionHandler(err, handler){
                                            if (err != null) {
                                                cbHandler.decrease();
                                                throw err;
                                            }else if (handler == null) {
                                                cbHandler.decrease();
                                                throw new ReferenceError("'handler' is null");
                                            }else{
                                                fw.validation._svalidation.call(handler,label,p,value,_validation, function(err,validationResult){
                                                  
                                                    if(!err){
                                                        fw.dev("asyn validation end");
                                                        if(validationResult === true){
                                                            //验证通过
                                                            //faildCallback.call(this, "data_write_from_server_validation", validationResult);
                                                        }else{
                                                            var resultObj = {};
                                                            resultObj.value = validationResult;
                                                            resultObj.msg = fw.validation._getvalidationmsg(validationResult,label,_validation);
                                                            faildObjs.push(createFaildObj(p,value,resultObj))
                                                        }
                                                    }else{
                                                        faildCallback.call(this, "data_write_from_server_dberror", validationResult);
                                                    }
                                                    cbHandler.decrease();
                                                },modelObj);
                                            }
                                        }
                                    })(label,p,value,_validation,Library.objUtils.extend({},dataMap)));
                                }else{
                                    var validationResult = fw.validation._svalidation.call(this,label,p,value,_validation);
                                    if(validationResult){
                                        faildObjs.push(createFaildObj(p,value,validationResult));
                                    }
                                }
                            }
                        }
                    }else if(type=="model"){
                        /*server 上暂无级联验证
                        }*/
                    }
                }else{
                    /**
                        var value = dataMap[p];
                        faildObjs.push(createFaildObj(p,value,'没有定义这个字段。'));
                    */
                    delete dataMap[p];

                    fw.dev("validation engine delete the undefined field "+p);
                }
            };
            fw.dev("_+_+______________________+_+_+_+_+_+_+__++");
            fw.dev(JSON.stringify(cbHandler));
            fw.dev("_+_+______________________+_+_+_+_+_+_+__++");
            cbHandler.enableCallback();
            cbHandler.decrease();
        }
    };


    exports.create = serverCollection;
}


if(typeof module !='undefined' && module.exports){
    module.exports = function(fw, getDbCollectionHandler , ObjectId){
        runnable(fw, getDbCollectionHandler , ObjectId);
        return exports;
    }
} 