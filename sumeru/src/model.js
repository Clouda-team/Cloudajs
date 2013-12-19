Model = typeof Model == 'undefined' ? {} : Model;

var runnable = function(fw){

	cmodel.__reg('models', []);//等echo交换
	
	var modelTools = {
		/**
		 * 定义model属性的getter/setter方法，这些方法在创建modeltemp时就生成了，这些方法仅供开发者调用。
		 */
		defineProperty:function(property){
			Object.defineProperty(this, property,{
				get:function(){
					return this.__smr__.dataMap[property];
				},
				set:function(v){
					if(v!=this.__smr__.dataMap[property]){
						this.__smr__.dataMap[property]=v;
						this._setDirty();
					}
				}
			});
		},
		/**
		 * 将输入的对象的某些方法，包装成不可修改的方法
		 */
		setDefineProperties:function (targetObj,propertyMap,configueable,writable,enumerable){
			var configueable = configueable||false,
				writable = writable||false,
				enumerable = enumerable||false;
			if(typeof Object.defineProperty != 'undefined'){
				for(var p in propertyMap){
					Object.defineProperty(targetObj,p,
						{
							value:propertyMap[p],
							configueable:configueable,
							writable:writable,
							enumerable:enumerable
						}
					);
				}
			}else{
				for(var p in propertyMap){
					targetObj[p] = propertyMap[p];
				}
			}
		}
	};

	/**
	 * 所有model 的 function lib、常量
	 * 以_开头的函数为内部函数
	 * model的状态由用户来调用来改变  save 来改变。。。
	 */
	var modelBaseProto = {
		_isModel:true,
		_idField : 'smr_id',
		_clientIdField : '__clientId',

		//return true：need save
		_isClean	:	function(){
			return !this.__smr__.isDirty && !this.__smr__.isPhantom;
		},
		_isDeleted :	function(){
			return this.__smr__.isDeleted;
		},
		_setDirty : function(status){
			status = typeof status == 'undefined' ? true : status;
			this.__smr__.isDirty = !!status;
		},
		_setDeleted : function(status){
			status = typeof status == 'undefined' ? true : status;
			this.__smr__.isDeleted = !!status;
		},
		_setPhantom : function(status){
			status = typeof status == 'undefined' ? true : status;
			this.__smr__.isPhantom = status;
			this.set(this._idField, 0);
			this.set(this._clientIdField, fw.__random());
		},
		_setModelChain :function(parentModelChain,fieldKey){
			this.__smr__.modelchain = parentModelChain.slice(0);
			this.__smr__.modelchain.push(fieldKey);
		},
		_getModelChain :function(){
			return this.__smr__.modelchain;
		},
		_delete : function(key){
			this.__smr__.dataMap[key] = undefined;
		},
		/**
		 * 将数据设置为clean状态，不触发保持的状态
		 */
		_clean :function(){
			this.__smr__.isDirty = false;
			this.__smr__.isDeleted = false;
			this.__smr__.isPhantom = false;
			var key;
			for (key in this._fieldsMap) {
				var field = this._fieldsMap[key];
				var fieldType = field['type'];
				if(fieldType === 'model'){
					this[key]._clean();
				}
			}
		},
		_getModelName : function(){
			return this._modelName;
		},
		/**
		 * 最简单的set数据，不设置任何状态,也不做任何参数检测
		 */
		_baseSet : function(key,val){
			this.__smr__.dataMap[key] = val;
		},
		/**
		 * 如果val是model或collection，就直接插入。
		 * isDirty subModel的状态由它自己负责
		 * isPhantom 只在set fieldId的时候设置
		 */
		_set : function(key, val, isDirty){

			if (key in this._fieldsMap) {
				var field = this._fieldsMap[key];
				var fieldType = field['type'];
				if(fieldType === 'model'){
					var fieldModelName = field['model'];
					var fieldModelRelation = field['relation'];
					if(fieldModelRelation==='many'){
						if(val._isCollection){
							if(val._getModelName()===fieldModelName){
								this._baseSet(key, val);
							}else{
								fw.log('model.set arguments format error');
							}
						}else{
							if(this[key]._isCollection){
								this[key].truncate();
							}else{
								this._baseSet(key, fw.collection.create({modelName:fieldModelName}));
							}
							var newModel;
							for(var i = 0, l = val.length; i < l; i++){
							    //传进来的可能是model对象，也可能已经是dataMap
							    if(val[i]._isModel){
							        newModel = val[i];
							    }else{
							    	newModel = cmodel.create(fieldModelName,val[i]);
							    }
								this[key].add(newModel);
							}
						}
					}else{
						if(val._isModel){
							if(val._getModelName()===fieldModelName){
								this._baseSet(key, val);
							}else{
								fw.log('model.set arguments format error');
							}
						}else{
							this._baseSet(key, cmodel.create(fieldModelName,val));
						}
					}
				}else{
					if(this[key] === val){
						return this;
					}
					this[key] = val;
					if (key == this._idField && val != 0) {
					    this.__smr__.isPhantom = false;
					};
				}
				this._setDirty(isDirty);
			}
			
			return this;
		},
		_setData:function(dataMap,isDirty){
			var dataMap = dataMap || {};
			for (var i in dataMap){
				this._set(i, dataMap[i],isDirty);//所有子model都是！dirty
			}
			this._setDirty(isDirty);
		},
		/**
		 * arguments:(key,val) 或 dataMap
		 */
		set : function(key, val){
			var argslen = arguments.length;
			var dataMap;
			if(argslen==1){
				dataMap = arguments[0];
				if(Library.objUtils.isObject(dataMap)){
					for(var p in dataMap){
						this._set(p, dataMap[p], true);
					}
				}
			}else if(argslen==2){
				this._set(key, val, true);
			}
		},
		_setPilotId : function(pilotid){
			this.__smr__.pilotid = pilotid;
		},
		_getPilotId : function(){
			return typeof this.__smr__.pilotid == 'undefined' ? false:this.__smr__.pilotid;
		},
		_setStorable : function(){
			fw.msgpilot.setPilot(this);
		},
		toJSON : function(){
			var resuleJSON = {};
			for(key in this.__smr__.dataMap){
				if(this._fieldsMap[key]
					&&this._fieldsMap[key]["type"]=="model"){
					/**
					 * 根据model中的定义来判断实际数据是否是model/collection，
					 * model/collection都有同名方法getJSON
					 */
					resuleJSON[key] = this.__smr__.dataMap[key].toJSON(); 
				}else{
					resuleJSON[key] = this.__smr__.dataMap[key];
				}
			}
			return resuleJSON;
		},

		/**
		 * 将当前状态保存为snapshot
		 */
		_takeSnapshot : function(){
	        this.__smr__.dataMapSnapshot = cmodel._extend({}, this.__smr__.dataMap);
		},
		_getSnapshot : function(){
			return this.__smr__.dataMapSnapshot;
		},
		get : function(key){
			return this.__smr__.dataMap[key];
		},
		getId : function(){
		  return this.__smr__.dataMap[this._idField];  
		},
		getData : function(){
			return this.toJSON();
		},
		destroy : function(){
			this.__smr__.isDeleted = true;
			this._setDirty();
		},
		/**
		 * 返回验证失败的key value validation
		 */
		validation : function(fieldKey){
			if(!fw.config.get('clientValidation'))return true;
			var resultObjs = [],oneField,label,validations,validation,validationMsg,type,value,resultObj;

			var createFaildObj = function(key,value,validationResult){
				var _obj = {};
				_obj["key"] = key;
				_obj["value"] = value;
				_obj["msg"] = validationResult["msg"];
				return _obj;
			};
			//组合子model或collection的faild obj
			var createSubFaildObj = function(key,value,faildObj){
				var _obj = {}
				_obj["key"] = key+"."+faildObj["key"];
				/*_obj["value"] = [faildObj["value"][0]];//这个改动是为了移除中间的引用。_obj["value"] = faildObj["value"];
				_obj["value"].push(value);*/
				_obj["value"] = faildObj["value"][0];
				_obj["msg"] = faildObj["msg"];
				return _obj;
			};
			
			//验证oneField
			var oneFieldValidation = function(oneField){

				var label = oneField["label"]||oneField['name'],
				validation = oneField["validation"],
				validationMsg = oneField["validationMsg"],
				type = oneField["type"],
				value = this[oneField['name']],
				key = oneField['name'];
				if(validation){
					if(Library.objUtils.isString(validation)){
						validations = validation.split("|");
					}else{
						validations = [validation];
					}
					for(var i=0,len = validations.length;i<len;i++){
						//由于length是有参数的所以单独处理
						var _lengthMatch = (new RegExp("([min,max]*length)\\[([0-9]+)[\\,]*([0-9]*)\\]")).exec(validations[i]);
						if(_lengthMatch){
							if(_lengthMatch.length>=3){
								_lengthMatch.shift();
								_lengthMatch.unshift(value);
								_lengthMatch.unshift(key);
								_lengthMatch.unshift(label);
								var validationResult = fw.validation.__load('_cvalidation').apply(this,_lengthMatch);
								if(validationResult){
									resultObjs.push(createFaildObj(key,value,validationResult));
								}
							}
						}else{
							var validationResult = fw.validation.__load('_cvalidation').call(this,label,key,value,validations[i]);
							if(validationResult){
								resultObjs.push(createFaildObj(key,value,validationResult));
							}
						}
					}
				}else if(type=="model"){
					var _result = value.validation();
					for(var k=0,klen=_result.length;k<klen;k++){
						resultObj = createSubFaildObj(key,value,_result[k]);
						resultObjs.push(resultObj);
					}
				}
			};

			if(typeof fieldKey != 'undefined'){
				oneFieldValidation.call(this,this._fieldsMap[fieldKey]);
			}else{
				for(var p in this._fieldsMap){
					oneField = this._fieldsMap[p];
					oneFieldValidation.call(this,oneField);
				}
			}
			var ispass = false;
			if(resultObjs.length === 0){
				ispass = true;
			}
			if(this.onValidation){
				this.onValidation.call(this, ispass, 'client', resultObjs);
			}
			return resultObjs;
		},
		_save : function(callback, pubname, pilotid, isSubSave){
			var pilotid = pilotid||this._getPilotId();
			if(!pubname&&!pilotid){
				this._setStorable();
				pilotid = this._getPilotId();
			}
			//subSave是不需要validation的，因为validation是多层的。
			if(!isSubSave){
				var validationResult = this.validation();
				if(validationResult.length>0){
					return validationResult;
				}
			}
			callback = callback || function(){};

			var self,//model本体
				_self;//用来执行save的model分身。
			if(!isSubSave){//非
				self = this;
				_self = cmodel._extend(createModel(this._getModelName()), self);
				_self.__smr_assist__.__extendPointer = self;
				_self.__smr_assist__.__pkgId = fw.__random();
			}else{
				_self = this;
				self = _self.__smr_assist__.__sourcePointer[0];
			}
			var	hasModel = false,
				toSave = _self.__smr__.dataMap,
				
				//状态位
				hasSaved = false,

				//这里是一个model的对应的save
				doSave = function(callback){
					//判断里面是否有没有序列化的model，如果有则认为现在还没有到能save的时候。
					for (var i in toSave) {

						if (toSave[i]&&toSave[i]._isCollection) {
							for (var x = 0, y = toSave[i].length; x < y; x++) {
								if (toSave[i].get(x) && toSave[i].get(x)._isModel) {
									if(toSave[i].get(x)._isClean()){
										continue;
									}
									
									if (toSave[i].get(x).getData().isReference) {
									    continue;
									};
									//还有 model没被序列化就等一下，还会有其他callback来调的。
									return;
								}
							}
						}else if (toSave[i]&&toSave[i]._isModel) {
							if(!toSave[i]._isClean() && !toSave[i].getData().isReference){
								return;
							}
						}
					}
					
					
					//hasSaved 这个东西的存在是为了阻止save后的从submodel来的callback
					if(hasSaved){
						return;
					}
					hasSaved = true;

					//保存成功的事件钩子，但是没用了
					/*var _callback = function(callback,isSubSave){
						return function(){
							callback.apply(this,arguments);
							if(!isSubSave){
								if (typeof this.onSaved != 'undefined') {
									this.onSaved.call(this);
								};
							}
						};
					}(callback,isSubSave);*/
					var _callback = function(data){
						callback.call(_self, data);
					}

					_self._proxy.save(_self, _callback, pubname, pilotid, _self._getModelChain().join('.'));
				},

				//save subModel
				saveModel = function(_model){
					var _model = _model;

					//对于干净的，无需二次存储，直接转换为reference
					if(_model._isClean()){

							_model.__smr__.dataMap = {
	                            isReference : true,
	                            val :   '::referenceID::' + _model._getModelName() + '::' + _model.getId()
	                        };
						return;
					}
					hasModel = true;
					//save完后要把给原指针的id和dirty改掉
					_model._save((function(_model){
						    return function(data){
								var id = data.cnt.smr_id;
		                        _model.__smr_assist__.__sourcePointer[0].set(_model._idField, id);
		                        _model.__smr_assist__.__sourcePointer[0]._setDirty(false);
		                        
	                            _model.__smr__.dataMap = {
	                                isReference : true,
	                                val :   '::referenceID::' + _model._getModelName() + '::' + id
	                            };
	                            //在sub model的save callback中出发main model的save
		                        doSave(callback);   
		                    }
						})(_model), pubname, pilotid, true);
				};

			for (var i in toSave) {


				if (toSave[i]&&toSave[i]._isCollection) {
					for (var x = 0, y = toSave[i].length; x < y; x++) {
						if (toSave[i].get(x)._isModel) {
							toSave[i].get(x)._setModelChain(_self._getModelChain(),i);
							saveModel(toSave[i].get(x));
						}
					}
					
					if(toSave[i].length === 0){
						//这里不能删除空model数组，否则本地随动反馈会出现undefined。对空数组的删除向下放到dal层处理
						//delete toSave[i];
					}
				}else if(toSave[i]&&toSave[i]._isModel){
					toSave[i]._setModelChain(_self._getModelChain(),i);
					saveModel(toSave[i]);
				}
			}
			if (!hasModel && !this._isClean()) {
				doSave(callback);
			}
			return true;
		},
		save : function(callback, pubname, pilotid){
			this._save(callback, pubname, pilotid, false);
		},
		/**
		 * @ispass true:'验证通过',false:'验证失败
		 * @runat 'client':客户端验证结果,'server':服务端验证结果
		 */
		onValidation : function(ispass, runat, validationResult){
		}
	}
	/**
	 * model 的基类，ta的原型是所有modle的基础方法，成员是每个用户定义model template的私有属性
	 */
	var modelBase = function(){
		this._modelName = "";
		this._dal = {type : 'live'};
		this._proxy = {};
		this._fieldsMap = {};
		this._fieldsMap[this._idField] = {name : this._idField, type	:	'int'};
		this._fieldsMap[this._clientIdField] = {name : this._clientIdField, type	:	'string'};
	};
	/**
	 * 目的是不让用户自定义方法覆盖model自身的方法
	 */
	modelTools.setDefineProperties(modelBase.prototype,modelBaseProto,false,false,true);
	/**
	 * 在构造函数中定义每个model实例都单独持有的属性
	 */
	var model = function(){
		this.__smr__ = {
			dataMap : {},
			dataMapSnapshot : {},
			//validationResult : {},
			isDirty : false,//是否被修改过但未上传
			isPhantom : true,//是否本地新创建
			isDeleted : false,//是否已被标记为删除
			modelchain : []//如果这个实例是个子model，这里面存的是其上层的model list 自顶向下顺序。
		};
		this.__smr_assist__ = {
			__sourcePointer:null,
			__extendPointer:null,
		}
	};

	
	/**
	 * 想法是：全局model的解析工作只做一次。
	 * 一个model的属性可以分为几部分
	 *		1、fw本身提供的方法，都放在modelFunc中，_funcname 为内部方法，funcname为外部方法；
	 *		2、全局内部属性__isModel
	 **************************以上在fw初始化时就生成了 这就是modelBase  不可修改，可枚举，不可删除**********************

	 *		3、每类model的属性\function
	 			1）fieldMap: name\type\relation\model\validation\defaultValue
	 				validation在这个位置
	 			2）function: 
	 **************************以上在第一次创建时通过getModelTemp生成，并放在cmodel.models中，以后每次用时直接取 不可修改，不可枚举，不可删除**********************

	 *		4、每个model独立的属性：
	 			dataMap,这个dataMap会直接挂在model obj上
	 **************************这里是产出设计model的时候用的 **********************

	 */

	/**
	 * 将用户定义的model，转换为真实使用的model原型存放在cmodel.models中。每个model只做一次转换。
	 */
	var getModelTemp = function(modelName){
		
		if(typeof cmodel.models[modelName] == 'undefined' ){

			//执行定义func，获得导出的config和方法等
			var exports = {},
				modelDef = cmodel._getModelDef(modelName);
			modelDef.call(this, exports);
			
			modelDef = exports;

			var newModelTemp = new modelBase();
			newModelTemp._modelName = modelName;
			
			if(typeof modelDef.config != 'undefined'){
				var fields = modelDef.config.fields || [],
					oneField, defaultValue;
				
				
				for(var i = 0, l = fields.length; i < l; i++){
					
					oneField = fields[i];
					
					if(oneField['type'] == 'array'){
						if(oneField['defaultValue']){
							defaultValue = oneField['defaultValue'];
							oneField['defaultValue'] = Library.objUtils.isArray(defaultValue)?defaultValue:[];
						}else{
							oneField['defaultValue'] = [];
						}
				    } else if(oneField['type'] == 'object'){
						if(oneField['defaultValue']){
							defaultValue = oneField['defaultValue'];
							oneField['defaultValue'] = Library.objUtils.isObject(defaultValue)?defaultValue:{};
						}else{
							oneField['defaultValue'] = {};
						}
				    }

					newModelTemp._fieldsMap[oneField['name']] = oneField;
					//FIXME 这里还要把validation的函数生成出来。还不确定是不是要这样干。
					
				}
				
				var dal = modelDef.config.layer || newModelTemp._dal;
				newModelTemp._proxy = fw.__DAL.make(dal);
			}
			
			/**
			 * 复制用户自定义方法到modeltemp上，由于modelbase使用了不可修改和覆盖的方式。所以这里既是覆盖了也是无效的。
			 */
			for(var key in modelDef){
				if(!modelDef.hasOwnProperty(key)){
					continue;
				}
				if(key == 'config'){
					continue;
				}
			
				newModelTemp[key] = modelDef[key];
			}

			
			cmodel.models[modelName] = newModelTemp;
			
		}
		return cmodel.models[modelName];
	}


	/**
	 * 组装model
	 */
	var createModel = function(modelName,dataMap){
		//获取model模板
		var modelTemp = getModelTemp(modelName);

		//创建model对象，继承model模板
		var newModel = new model();
		newModel.__proto__ = modelTemp;

		var _fieldsMap = modelTemp._fieldsMap, oneField;

		for(var p in _fieldsMap){
			oneField = _fieldsMap[p];
				//定义getter/setter方法，后面的赋值都是通过getter/setter进行赋值的。
				modelTools.defineProperty.call(newModel,oneField['name']);

				if(oneField['type'] === 'model' && typeof oneField['model'] !== 'undefined'){
					if( typeof oneField['relation'] !== 'undefined' && oneField['relation']=='many'){
						//不默认创建任何Model对象
						//在这里创建一个子collection
						var subCollection = fw.collection.create({modelName  : oneField['model']});
						newModel[oneField['name']] = subCollection;
					}else{
						var subModel = cmodel.create(oneField['model']);
						newModel[oneField['name']] = subModel;
					}
					
					
				} else {
				    if (oneField['type'] == 'datetime' && oneField['defaultValue'] == 'now()') {
				        //解析now()
				        newModel[oneField['name']] = fw.utils.getTimeStamp();
				    } else if(oneField['type'] == 'array'){
				    	newModel[oneField['name']] = fw.utils.deepClone(oneField['defaultValue']) || [];
				    } else if(oneField['type'] == 'object'){
						newModel[oneField['name']] = fw.utils.deepClone(oneField['defaultValue']) || {};
				    } else {
	                    newModel[oneField['name']] = oneField['defaultValue'] || undefined; //其实后一个undefined不用写，只是为了更易读   
				    }
				}

		}
    	newModel._setPhantom();

		if(dataMap){
			newModel._setData(dataMap,false);
		}
		return newModel;
	};
	
    /**
     * 深度拷贝Model，Collection对象
     * param target,source-1,source-2...source-n
     */
    var extendModel =  function(){
        var objUtils = Library.objUtils;
        
        var options, name, src, copy, copyIsArray, copyIsCollection, copyIsModel, clone,
            target = arguments[0] || {},
            i = 1,
            length = arguments.length;
    
        // Handle case when target is a string or something (possible in deep copy)
        if ( typeof target !== "object" && !objUtils.isFunction(target) ) {
            target = {};
        }
        
        // if only one argument is passed, do nothing
        if ( length === i ) {
            return target;
        }
    
        for ( ; i < length; i++ ) {
            // Only deal with non-null/undefined values
            if ( (options = arguments[ i ]) != null ) {
                // Extend the base object
                for ( name in options ) {
                	//不拷贝原型链中的属性
                    if (!options.hasOwnProperty(name)) {
                        continue;
                    };
                    //不拷贝指针
                    if(name == '__smr_assist__'){
                        continue;
                    }
                    src = target[ name ];
                    copy = options[ name ];
    
                    // Prevent never-ending loop
                    if ( target === copy ) {
                        continue;
                    }
                    // Recurse if we're merging model objects, collection objects or arrays
                    if ( copy && ( objUtils.isPlainObject(copy) 
                                || (copyIsCollection = copy._isCollection)
                                || (copyIsModel = copy._isModel)
                                || (copyIsArray = objUtils.isArray(copy)) ) ) {

                        if ( copyIsArray ) {
                            copyIsArray = false;
                            clone = src && objUtils.isArray(src) ? src : [];
                        } else if(copyIsCollection){
                          copyIsCollection = false;  
                          
                          clone = src && src._isCollection ? src : fw.collection.create({modelName : copy._getModelName()});
                          
                        } else if(copyIsModel) {
                          copyIsModel = false;
                          clone = src && src._isModel ? src : cmodel.create(copy._getModelName());            
                          //留存一个指向原对象的指针
                          clone.__smr_assist__.__sourcePointer = copy.__smr_assist__.__sourcePointer || [];
                          clone.__smr_assist__.__sourcePointer.push(copy);
                          
                        } else {
                          clone = src && objUtils.isPlainObject(src) ? src : {};
                        }
    
                        // Never move original objects, clone them
                        target[ name ] = extendModel(clone, copy);
    
                    // Don't bring in undefined values
                    } else if ( copy !== undefined ) {
                        target[ name ] = copy;
                    }
                }
            }
        }

        // Return the modified object
        return target;
    }
	
    cmodel.__reg('create', createModel);
    cmodel.__reg('_extend', extendModel);
    cmodel.__reg('_getModelTemp', getModelTemp);
    
	
};

//客户端与服务器端的命名空间不同
var cmodel;
if(typeof module != 'undefined' && module.exports){//server运行
	module.exports = function(_fw){
		fw = _fw;
		cmodel = fw.addSubPackage('model');
		cmodel.__reg('_getModelDef', function(modelName){
			if (modelName.search("Model.") != -1 ) {//兼容客户端的modelName写法,客户端用Model.xxx,服务端用xxx
				modelName = modelName.substr(6);
			}
			return Model[modelName];
		});
		//兼容dal的错误
		if (typeof fw.__DAL == 'undefined'){
			fw.__DAL = {};
			fw.__DAL.make = function(){};
			fw.__DAL.make.save = function(){};
		}
		runnable(fw);
	}
	
}else{//client运行
	cmodel = sumeru.addSubPackage('model');
	//cmodel.__reg('models', []);//等echo交换
	cmodel.__reg('_getModelDef', function(modelName){
		return eval(modelName);
	});
	runnable(sumeru);
}
//for node
/*if(typeof exports != 'undefined'){
	exports.createModel = fw.__modelFactory;
}*/