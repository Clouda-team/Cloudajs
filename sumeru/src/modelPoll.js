/**
 * modelPoll package
 * 
 * provide local model poll
 * 
 * @author huangxin03@baidu.com
 */
 
(function(fw){
	
	fw.addSubPackage('modelPoll');
	
	var ENABLE = false;
	var pollMap = {};
	
	function Poll(key){
		this.modelName = key;
		this.dataMap = {};
	}
	
	Poll.prototype.add = function(model){
		this.dataMap[model.smr_id] = model;
	};
	
	Poll.prototype.destroy = function(model){
		if(typeof model == 'undefined'){
			this.dataMap = {}
		} else {
			delete this.dataMap[model.smr_id];
		}
		console.log(this.dataMap);
	};
	
	Poll.prototype.update = function(model, delta){
		
	};
	
	Poll.prototype.duplicated = function(model){
		if(this.dataMap[model.smr_id]){
			return true;
		}
		return false;
	};
	
	Poll.prototype.getData = function(id){
		return this.dataMap[id];
	}
	
	/**
	 * 在做subscribe的时候, 创建所有的ModelPoll(除特殊model)
	 */
	function createPoll(modelName){
		//新建本地Model池
		if(!pollMap[modelName]){
			pollMap[modelName] = new Poll(modelName);
		}
	}
	
	fw.modelPoll.__reg('createPoll', createPoll, true);
	fw.modelPoll.__reg('pollMap', pollMap, true);
	fw.modelPoll.__reg('ENABLE', ENABLE, true);
	
})(sumeru);