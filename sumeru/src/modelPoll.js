/**
 * modelPoll package
 * 
 * provide local model poll
 * 
 * @author huangxin03@baidu.com
 */
 
var runnable = function(fw){
	
	fw.addSubPackage('modelPoll');
	var cmodel = fw.model;
    
	var ENABLE = true; //modelPoll开关
	var _pollMap = {};  //存modelPolls的实例

	function Poll(modelName) {
		this.modelName = modelName;
		this.dataMap = {}; //存modelPoll中model实例
	}

	Poll.prototype = {

		add : function(model){
			this.dataMap[model.smr_id] = model;
		},

		destroy : function(model){
			if(this.dataMap[model.smr_id]){
				delete this.dataMap[model.smr_id];
			} else {
				fw.log('Model', model, 'had been already destroyed earlier.');
			}
		},

		get : function(smr_id){
			return this.dataMap[smr_id];
		}
	}


	/**
	 * 获得modelPoll, 没有相应的modelPoll就new一个
	 */
	function getPoll(modelName){
		if(!_pollMap[modelName]){
			_pollMap[modelName] = new Poll(modelName);
		}
		return _pollMap[modelName];
	}

	function getModel(modelName, row){

		if(!ENABLE){ return cmodel.create(modelName, row);}

		var poll = getPoll(modelName);
		var newModel;

		if(poll.get(row.smr_id)){
			//池中已有的数据直接返回
			newModel = poll.get(row.smr_id);
			//更新model
			newModel._setData(row);
		}else{
			//池中没有的数据, 新建model
			newModel = cmodel.create(modelName, row);
			//入池
			if(row.smr_id){poll.add(newModel);}
		}
		return newModel;
	}

	function destroyModel(modelName, model){
		if(!ENABLE){ return; }
		if(modelName && model){
			var poll = getPoll(modelName);
			poll.destroy(model);
		}else{
			console.error('Please specify correct arugments.');
		}
		
	}

	function addModel(modelName, model){
		if(!ENABLE){ return; }
		var poll = getPoll(modelName);
		poll.add(model);
	}

	fw.modelPoll.__reg('data', _pollMap); //DELETE
	fw.modelPoll.__reg('getModel', getModel);
	fw.modelPoll.__reg('addModel', addModel);
	fw.modelPoll.__reg('destroyModel', destroyModel);
	
}
if(typeof module !='undefined' && module.exports){
    module.exports = function(fw){
    	runnable(fw);
    }
}else{//这里是前端
	runnable(sumeru);
}