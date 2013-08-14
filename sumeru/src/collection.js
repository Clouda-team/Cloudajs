var runnable = function(fw){

	fw.addSubPackage('collection');

	var collectionTools = {

		/**
		 * 定义指定到[0]的model属性的getter/setter方法，主要在创建collection时使用
		 */
		defineProperty:function(property){
			Object.defineProperty(this, property,{

				get:function(){
					if(this.length>0){
						return this[0][property];
					}
				},
				set:function(v){
					for(var i=0,ilen=this.length;i<ilen;i++){
						this[i][property]=v;
					}
				}
			});
		},
	}

	collectionPrototype = {
		
		_isCollection : true,
		_setSynced : function(status){
			status = typeof status == 'undefined' ? false : status;
			this.__smr__.isSynced = !!status;
		},
		_isSynced : function(status){
			return this.__smr__.isSynced;
		},
		_setNeedSort: function(status){
			status = typeof status == 'undefined' ? true : status;
			this.__smr__.isNeedSort = !!status;
		},
		_takeSnapshot : function(){
			var allModels = this.find();
			allModels.forEach(function(item){
				item._takeSnapshot();
			});
		},
		_getModelName : function(){
			return this.__smr__.modelName;
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
		setVersion : function(version){
			this.__smr__.version = version;
		},
		getVersion : function(){
			return this.__smr__.version;
		},
		/**
		 * 将数据设置为clean状态，不触发保持的状态
		 */
		_clean :function(){
			var allModels = this.find();
			allModels.forEach(function(item){
				item._clean();
			});
		},

		/**
		 * 返回验证失败的key value validation
		 */
		validation : function(){
			if(!fw.config.get('clientValidation'))return true;
			if(arguments.length==0){
				var resultObjs = [],resultObj,model;
				for (var j = 0, jlen = this.length; j < jlen; j++){
					model = this[j];
					var _result = model.validation();
					if(_result!==true){
						resultObjs = resultObjs.concat(_result);
					}
				}

				var isPass = false;
				if(resultObjs.length === 0){
					isPass = true;
				}

				if(this.onValidation){
					this.onValidation.call(this, isPass, 'client', resultObjs);
				}
				return isPass||resultObjs;
			}else{
				//FIXME 考虑以后在这里提供验证某个字段的功能。
			}
		},
		
		add : function(row){
			var newModel;
			var modelName = this._getModelName();
			if (row._isModel) {
				if(row._getModelName() == modelName){
			    	newModel = row;
				}else{
					sumeru.log("collection.add arguments format error.")
				}
			}else{
				newModel = fw.modelPoll.getModel(modelName, row);
			};
			
			this.push(newModel);
			this._setSynced(false);
			this._setNeedSort();
			return true;
		},
		
		update : function(updateMap, where){
			var candidates = this.find.call(this, where);

			if(Library.objUtils.isObject(updateMap)){
				for(var x = 0, y = candidates.length; x < y; x++){
					candidates[x]._setData(updateMap,true);
				}
				this._setSynced(false);
				this._setNeedSort();
			}
		},
		
		//remove只是从collection中去除，并不实际删除。
		//所以不需要改变Synced状态
		remove : function(where){
			if(where._isModel){
				for (var j = 0, k = this.length; j < k; j++){
					if(this[j] == where){
						this.splice(j, 1);
						j--;
						k--;
						this._setNeedSort();
					}
				}
			}else{
				var candidates = this.find.apply(this, arguments);
				
				//FIXME 因为要兼容Find，做了两次遍历
				for (var i = 0, l = candidates.length; i < l; i++){
					for (var j = 0, k = this.length; j < k; j++){
						if(this[j] == candidates[i]){
							this.splice(j, 1);
							j--;
							k--;
							this._setNeedSort();
						}
					}
				}
			}
		},
		
		//从collection中实际删除。
		destroy : function(where){
			var candidates = this.find.apply(this, arguments);
			
			//FIXME 因为要兼容Find，做了两次遍历
			for (var i = 0, l = candidates.length; i < l; i++){
				for (var j = 0, k = this.length; j < k; j++){
					if(this[j] == candidates[i]){
						var item = this.splice(j, 1);
						j--;
						k--;
						item[0].destroy();
						
						this._setSynced(false);
						this._setNeedSort();
						
						
						//从modelPoll中删除此model
						fw.modelPoll.destroyModel(this._getModelName(), item[0]);
						//destroy因为是删除，splice之后collection就不可知了，所以不需要collection自己调save了，destroy直接调用model的
						item[0].save(function(){}, this.pubName, item[0]._getPilotId());
						
					}
				}
			}
		},
		
		setData :	function(data){
			this.length = 0;
			for(var i = 0, l = data.length; i < l; i++){
				this.add(data[i]);
			}
			this._setSynced(false);
			this._setNeedSort();
		},

		/**
		 * 从conditionMap 格式数据 format 为json数据。
		 * 典型的map有：__smr__.wheres
		 */
		_formatQuery : function(queryArr){
			var queryArr = queryArr||[];
			var qObj = {};
			if(Library.objUtils.isArray(queryArr)){
				qObj = {"AND":[]};
				for(var i=0,l = queryArr.length;i<l;i++){
					qObj["AND"].push(queryArr[i]);
				}
			}else if(Library.objUtils.isObject(queryArr)){
				qObj = this._formatUnitQuery(queryArr);
			}
			return qObj;
		},
		/**
		 * 参数可以是一个function，可以是{"a":1,"b >":12,"c IN":[1,2,3,4]}
		 */
		_formatUnitQuery : function(cunit,op){
			if(Library.objUtils.isFunction(cunit)){ //单个function
				return {"FUNC":cunit};
			}else if(Library.objUtils.isObject(cunit)){//包含单/多个key value的Array
				var cunitArr = [];
				for(var p in cunit){
					var cunitObj = {},cunitObjOp;

					//切分operator
					var _re = new RegExp("["+fw.oquery.__load('_queryop').join(",")+"]+$");
					var _p = p.replace(/^\s+|\s+$/g,"");
					var _re_arr = _re.exec(p);
					if(_re_arr&&_re_arr.length>0){
						_p = _p.replace(_re_arr[0]," "+_re_arr[0]);

						//p = p.replace(new RegExp("\\s+"+_re_arr[0],"g")," "+_re_arr[0]);
						_p = _p.replace(/\s+/," ");
					}

					var keys = _p.split(" ");//通过空格把field和operator分开
					if(keys.length==2){
						cunitObjOp = keys[1];
					}else{
						cunitObjOp = "=";
					}
					cunitObj[cunitObjOp] = {};
					cunitObj[cunitObjOp]["key"] = keys[0];
					cunitObj[cunitObjOp]["value"] = cunit[p];
					cunitArr.push(cunitObj);
				}
				if (cunitArr.length>1) {
					var op = op||"AND";
					var _cunitArr = cunitArr;
					cunitArr = {};
					cunitArr[op] = _cunitArr;
				}else{
					cunitArr = cunitArr[0];
				};
				return cunitArr;
			}
		},

		/**
		 * 所有传入的条件，都要通过这个func进行转换
		 */
		_addCondition :function(target,condition,op){
			if(typeof condition == 'undefined'){
				return;
			}else if(condition.length == 2){ //如果传入了两个参数，则为key, val
				var _t = {};
				_t[condition[0]] = condition[1];
				target.push(this._formatUnitQuery(_t,op));
			}else if(Library.objUtils.isObject(condition[0])
					||Library.objUtils.isFunction(condition[0])){ //单个function、单/多个key value的Array
				target.push(this._formatUnitQuery(condition[0],op));
			}
		},
		
		where : function(){
			this._addCondition(this.__smr__.wheres,arguments,"AND");
			return this;
		},
		orWhere : function(){
			this._addCondition(this.__smr__.wheres,arguments,"OR");
			return this;
		},
		_clearWheres :function(){
			this.__smr__.wheres.length = 0;
		},
		find : function(){
			var rs = [];
			this.sortIt();
			if(arguments.length > 0){
				this._addCondition(this.__smr__.wheres,arguments,"AND");
			}
			if(this.__smr__.wheres.length == 0){
				return this;
			}
			
			var item,
				isQualify,
				fieldKey;
				
			for(var i = 0, l = this.length; i < l; i++){
				item = this[i];
				
				if(item._isDeleted() === true){ //如果该model已经被删除
					this.splice(i, 1);
					i--;
					l--;
					continue;
				}

				isQualify = fw.oquery.__load('_query')(item,this._formatQuery(this.__smr__.wheres));

				if(isQualify == true){
					rs.push(item);
				}
			}
			
			this._clearWheres();
			return rs;
		},
		/**
		 * 取列数据
		 */
		pluck : function(fieldKey){
			if(!fieldKey)return [];
			var result = [];
			var rs = this.find();
			for(var i = 0, l = rs.length; i < l; i++){
				if(typeof rs[i][fieldKey] != 'undefined'){
					result.push(rs[i][fieldKey]);
				}
			}
			return result;
		},
		_oSort : function(sortArr){
			//元比较
			var unitComp = function(v1,v2,order){
				var returnValue = 0;
				var isString1 = (typeof v1.localeCompare != "undefined");
				var isString2 = (typeof v2.localeCompare != "undefined");
				switch(order){
					case "ASC":
						returnValue = isString1?v1.localeCompare(v2):v1-v2;
						break;
					case "DESC":
						returnValue = isString2?v2.localeCompare(v1):v2-v1;
						break;
					default:
						if(typeof order == "function"){
							returnValue = order.call(this,v1,v2);
						}
				}
				return returnValue;
			}
			var unitSort = function(a,b,sortArr){
				var returnValue = 0,
					_v1,_v2,_key,_order;
				if(sortArr.length>0){
					if(typeof sortArr[0] == "function"){
						returnValue = unitComp.call(this,a,b,sortArr[0]);
					}else{
						_key = sortArr[0]["key"];
						_order = sortArr[0]["value"];
						var _v1 = a.get(_key);
						var _v2 = b.get(_key);
						returnValue = unitComp.call(this,_v1,_v2,_order);

						if(sortArr.length>1&&returnValue==0){
							sortArr.shift();
							returnValue = unitSort.call(this,a,b,sortArr);
						}
					}
				}
				return returnValue;
			}
			return function(a,b){
				return unitSort(a,b,sortArr);
			}
		},
		_formatSorter : function(){
			var _order = "ASC",//默认升序
				_sorter = [];
			if(arguments.length==0){
				return;
			}else if(arguments.length==1){
				var _s = arguments[0];
				//function排序
				if(Library.objUtils.isFunction(_s)){
					_sorter.push(_s);
				}else if(Library.objUtils.isObject(_s)){
					for(var p in _s){
						if(/^ASC|DESC$/.test(_s[p])
							||Library.objUtils.isFunction(_s)){
							_order = _s[p];
						}
						_sorter.push({"key":p,
								"value":_order});
					}
				}else{
					_sorter.push({"key":_s,
								"value":_order});
				}
			}else{
				if(/^ASC|DESC$/.test(arguments[1])){
					_order = arguments[1];
				}
				_sorter.push({"key":arguments[0],
							"value":_order});
			}
			return _sorter;
		},
		addSorters : function(){
			this.__smr__.sorters = this.__smr__.sorters.concat(this._formatSorter.apply(this, arguments));
			this._setNeedSort();
		},
		clearSorters : function(){
			this.__smr__.sorters.length = 0;
			this._setNeedSort();
		},
		sortIt : function(){
			if(arguments.length>0){
				this.addSorters.apply(this, arguments);
			}
			if(this.__smr__.sorters.length==0
				|| !this.__smr__.isNeedSort){
				return;
			}
			
			this.sort(this._oSort(this.__smr__.sorters));
			
			this._setNeedSort(false);
		},
		
		get : function(index){
			index = index || 0;
			if(index >= this.length || index < 0){
				return undefined;
			}
			this.sortIt();
			var item,fieldKey,returnValue;
			if(!Library.objUtils.isNumber(index)){
				fieldKey = index;
				index = 0;
			}
			item = this[index];
				
			//如果发现被删除的，则循环找下一个。如果最终都找不到，返回undefined
			while(item._isDeleted() === true){ //如果该model已经被删除
				this.splice(index, 1);
				item = this[index];
			}
			if(fieldKey){
				return this[fieldKey];
			}
			return item;
		},
		set : function(key,val){
			this[key] = val;
		},
		
		stringify : function(){
			return JSON.stringify(this);
		},
		
		toJSON : function(){
			var ret = [];
			this.find().forEach(function(item){
				ret.push(item.getData());
			})
			return ret;
		},
		
		getData : function(){
		  return this.toJSON();  
		},
		
		save : function(isSubSave,isSecure){
            if(isSecure){
				this.__smr__.saveType = 'ensure';
            }else{
				this.__smr__.saveType = 'none';
            }
			if(!isSubSave){
				var validationResult = this.validation();
				if(validationResult.length>0){
					return validationResult;
				}
				
				if(!this.pubName){
					this._setStorable();
				}
			}
			
			for(var i = 0, l = this.length; i < l; i++){
				this[i].save(function(data){
					if(data.type === 'insert'){
						var modelObj = this;
						//1. 新增一条数据，更新smr_id
						modelObj.set('smr_id', data.cnt.smr_id);
						//2. 加入modelPoll中
						var modelName = 'Model.' + data.modelName;
						fw.modelPoll.addModel(modelName, modelObj);
					}
					
				}, this.pubName, this._getPilotId(), true);
			}

			//因为分配id的逻辑在model的save里，所以随动反馈在下面做，稍微晚了一点
            //在save的时候，直接通知本地update subscribe
        
            //FIXME 伪造一个消息发送给自己
            if(!isSecure){
            	this.render();
            }
			
			return true;
		},
		ensureSave : function(){
			this.save(false,true);
		},
		rollback : function(){
			for(var i = 0, l = this.length; i < l; i++){
				var item = this[i];
				var _snapshot = item._getSnapshot();
				if(_snapshot['smr_id']){
					item._setData(_snapshot);
				}else{
					this.remove(item);
					l--;
				}

			}
			this._clean();
		},
		//重新渲染数据
		render : function(){
			if(typeof this.pubName != 'undefined'){
	            fw.netMessage.sendLocalMessage({
	                pubname :   this.pubName,
	                data    :   ''
	            }, 'data_write_latency');
	        };
		},
		
		truncate : function(){
		    this.length = 0;
		},
		
		hold : function(){
		    this.__smr__.isHolding = true;
		},
		
		releaseHold : function(){
		    fw.pubsub._releaseHold(this);
		    this.__smr__.isHolding = false;
		},
		isEnsureSave : function(){
			return this.__smr__.saveType === 'ensure';
		},
		/**
		 * @ispass true:'验证通过',false:'验证失败
		 * @runat 'client':客户端验证结果,'server':服务端验证结果
		 */
		onValidation : function(ispass, runat, validationResult){
		}
	};
	var collectionBase = function(){
		var baseArray = [];
		for(p in collectionPrototype){
			baseArray[p] = collectionPrototype[p];
		}
		return baseArray;
	};
	var collection = function(){
		//collectionBase.call(this);
		this.__smr__ = {
			/**
			 * sorters的格式：
			 * ['字段名', 排序Func,...]
			 */
			sorters : [],
			isNeedSort : false,

			/**
			 * wheres(find后清除)的格式：
			 * [{key : value},{key : value,key : value,key : value}, ..., {key : function(){}}]
			 */
			wheres:[],

			/**
			 * 正在修改，或已经修改过。是否被延迟数据同步
			 */
			isHolding:false,
			modelName:'',
			dal:{type : 'live'},
			isSynced:false,
			/**
			 * none:数据在没有验证完成，不确定是否能正确存入的时候就进行渲染
			 * ensure:数据在验证通过后，再进行渲染
			 */
			saveType:'none',
			version: ''
		}
		return this;
	}
	collection.prototype = new collectionBase();
	var __collectionFactory = function(def,dataMap){
		//在这里将config送入工厂，产出Collection
		if(typeof def.modelName == 'undefined'){
			//根本没定义model的话，只能直接return了
			return false;
		};

		var instance = new collection();
	
		//定义getter/setter方法，读0写all。
		var modelTemp = fw.model._getModelTemp(def.modelName);
		var fieldsMap = modelTemp._fieldsMap;
		for(var p in fieldsMap){
			collectionTools.defineProperty.call(instance,fieldsMap[p]['name']);
		}

		instance.__smr__.modelName = def.modelName;
			
		if (def.sorters){
			instance.__smr__.sorters = def.sorters;
		}
		
		var dal = def.layer || instance.__smr__.dal;
		
		instance.__smr__.proxy = fw.__DAL.make(dal);
		
		if(dataMap){
			instance.setData(dataMap);
		}

		return instance;
	};
	


	/**
	 * for developer , storable
	 */
    fw.collection.__reg('create', function(def,dataMap){
    	var coll = __collectionFactory(def,dataMap);
    	coll._setStorable();
		return coll;
	});

    /**
     * for framework, unstorable
     */
    fw.collection.__reg('_create', function(def,dataMap){
		return __collectionFactory(def,dataMap);
	});
}
if(typeof module !='undefined' && module.exports){
	module.exports = runnable;
}else{
    runnable(sumeru);
}