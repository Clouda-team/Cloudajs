var fw = fw || {};
(function(fw){
	//Data Accses Layer
	fw.__DAL = {};
	
	var objUtils = Library.objUtils;
	
	var findDiff = function(modelObj){
	    
		/**
		 * 接受传入Model Object，取出：要存储的对象和其上一次保存后的快照。二者比较形成diff
		 */
		var dataMap = modelObj.getData(),
			snapshot = modelObj._getSnapshot(),
			type = '',
			msgCnt = {};
		//这里的findDiff是向云保存的，所以把snapshot中的所有子model都转化为reference形式。再进行diff
        for (var key in snapshot){
            if (snapshot[key]._isCollection) {
                for(var i=0,l=snapshot[key].length; i<l; i++){
                    if (snapshot[key].get(i)._isModel) {

                        snapshot[key].get(i).dataMap = {
                                    isReference : true,
                                    val :   '::referenceID::' + snapshot[key].get(i)._getModelName() + '::' + snapshot[key].get(i).getId()
                                };  
                    }
                };
            }else if(snapshot[key]._isModel) {

                snapshot[key].dataMap = {
                            isReference : true,
                            val :   '::referenceID::' + snapshot[key]._getModelName() + '::' + snapshot[key].getId()
                        };  
            }
        }
		
		if(!dataMap[modelObj._idField]){
			type = 'insert';
	        //msgCnt = Library.objUtils.extend(true, {}, dataMap);
	        msgCnt = fw.model._extend({}, dataMap);
	        
            //msgCnt = dataMap;
            //分配一个objectid
            msgCnt[modelObj._idField] = fw.__load('__ObjectId')();
            if(modelObj.__smr_assist__.__extendPointer){
                modelObj.__smr_assist__.__extendPointer.set(modelObj._idField, msgCnt[modelObj._idField]);
            }
		} else if(modelObj._isDeleted()){
			type = 'delete';
			msgCnt[modelObj._idField] = dataMap[modelObj._idField];
		} else {
			type = 'update';
			for(var i in dataMap){
				if(!snapshot[i]  //无快照
				    || (!dataMap[i]._isCollection && snapshot[i] != dataMap[i]) //非关联model型快照不相等 
				    || ((dataMap[i]._isCollection||dataMap[i]._isModel) && JSON.stringify(dataMap[i]) != JSON.stringify(snapshot[i])) //此对象为关联model，且不相等
				  ){
					//不允许传输对ID和clientId的修改
					if(i === modelObj._idField || i === modelObj._clientIdField){
						continue;
					}
					
					msgCnt[i] = dataMap[i];
				}
				
				
                //取不到snapshot时可能是第一次sync还没回来，这时候直接取dataMap的 fix bug http://jira.baidu.com:8080/browse/SS-15
				msgCnt[modelObj._idField] = snapshot[modelObj._idField] || dataMap[modelObj._idField];
			}
		}
		
		//删除所有空数组
		for (var key in msgCnt){
		    if (objUtils.isObject(msgCnt[key])&&msgCnt[key]._isCollection && msgCnt[key].length === 0) {
		        delete msgCnt[key];
		    };
		}
		modelObj._setDirty(false);
        if(modelObj.__smr_assist__.__extendPointer){
            modelObj.__smr_assist__.__extendPointer._setDirty(false);
        }
		
		
		//var rs = [];
		//rs = dataMap;
		return {
			type	: 	type,
			modelName : modelObj._getModelName().replace(/Model\./, ''),
			cnt		: 	msgCnt
		};
	};
	
	fw.__DAL.make = function(dalDef){
		var type = dalDef.type.toLowerCase();
		
		if(__proxy[type]){
			var instance = new __proxy[type]();
			instance.config = dalDef;
			var _instanceSave = instance.save;
			//在save前通过diff操作，形成符合传输协议的数据包
			instance.save = function(modelObj, callback, pubname, pilotid, modelchain){
				var diff = findDiff(modelObj);
				//FIXME 做一个性能测试吧，看看同样一个socket，每个model走一次和打一个batch包，性能差多少
				_instanceSave(diff, callback, pubname, pilotid, modelchain);
			};
			
			return instance;
		}
	};
	
	//各类Proxy的定义
	var __proxy = {};
	
	__proxy.live = function(){
		this.proxyid = fw.__random();
	};
	
	__proxy.live.prototype = {
		save : function(data, callback, pubname, pilotid, modelchain){
			if (typeof pubname != 'undefined' || typeof pilotid != 'undefined') {
				//send the data
				if(pubname)pilotid = '';
			    fw.netMessage.sendMessage({
			    	pubname : pubname,
                    pilotid : pilotid,
                    modelchain : modelchain,
                    data    : data
                },'data_write_from_client',function(err){
                    fw.log('Err : data_write_from_client ' + err);
                },function(){
                    
                });
                callback(data);
			}else{
			    callback(data);
			}
		}
	};
	
	__proxy.network = function(){
		this.proxyid = fw.__random();
	};
	
	__proxy.network.prototype = {
		save :function(data, callback){
			var url = this.config.url;
			fw.dev('network layer saving : ' , url + ' ' , data);
			var id = data.id;
			callback(id);
		},
		
		get : function(param){
			
		},
		
		load : function(param, callback){
			var json = [];
			callback(json);
		}
	};
	
	
	__proxy.localstorage = function(){
		this.proxyid = fw.__random();
	}
	__proxy.localstorage.prototype = {
		save : function(data){
			fw.dev('localstorage layer saving : ' + data);
		},
		
		get : function(param){
			
		}
	};
	
	
	__proxy.memory = function(){
		this.proxyid = fw.__random();
		this.data =  {};
		__proxy.memory.manager[this.proxyid] = this;
	}
	
	__proxy.memory.manager = {};
	__proxy.memory.manager.resolveRef = function(refString, callback){
		var regex = /::referenceID::(.*)::(.*)/,
			match = refString.match(regex);
			callback(__proxy.memory.manager[match[2]].get());
	};
	
	__proxy.memory.prototype = {
		save : function(data, callback){
			this.data = data;
			fw.dev('memory layer save done' , data);
			callback(this.proxyid);
			return true;
		},
		
		get : function(){
			return this.data;
		},
				
		load : function(param, callback){
			
			var json = {};
			
			callback(json);
		}
	};
	
})(sumeru);
