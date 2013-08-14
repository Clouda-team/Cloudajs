runnable = function(fw, findDiff, publishBaseDir){
	
	var http = require('http');
	var o = require(__dirname + '/ObjectId.js');

	try{
		var extpubConfig = require(publishBaseDir + '/externalPublishConfig.js');	
	}catch(e){
		return false;
	}
	

	var external = fw.addSubPackage('external');

	var inputMgr = {}
	var outputMgr = {}
	var fetchTimer = {}


	//用来清理Timer
	function resetAllFetchTimer(){

		for(url in fetchTimer){
			clearInterval(fetchTimer[url]);
		}

	}

	//转外部数据为model相关数据，并添加smr_id
	function processing(struct, datasrc){
		
		var newItem = fw.utils.deepclone(struct);

		//merge
		for(p in newItem){
			newItem[p] = datasrc[p];
		}

		//fullfill smr_id

		newItem.smr_id = o.ObjectId();
		
		
		return newItem;
	}


	function generateOutput(input, modelName){

		var output = [];
		var struct = fw.server_model.getModelTemp(modelName);
		
		input.forEach(function(item, index){

			output[index] = processing(struct, item);

		});

		return output;

	}

	/**
	 * 获取外部数据
	 * param opts : 开发者定义的解析原始数据/URL的方法
	 */
	function getExtData(modelName, pubname, opts, params, callback) {

		var url = opts.geturl(params);

		http.get(url, function(res){
			
			var data = '';

			res.on('data', function(chunk){
				
				data += chunk;

			});
			
			res.on('end', function(){

				var input = opts.resolve ? opts.resolve(data) : JSON.parse(data);
				//input转化为数组
				input = Array.isArray(input) ? input : [ input ];

				if(typeof inputMgr[url] === 'undefined'){ //首次fetch
					
					inputMgr[url] = input;
					var output = generateOutput(input, modelName);
					callback(output);
					outputMgr[url] = output;

				}

			});
			
		});

	}

	//后端interval抓取，如果有input有diff ==> trigger_push
	function syncExtData(modelName, pubname, opts, params, callback){

		var url = opts.geturl(params);

		http.get(url, function(res){
			
			var data = '';

			res.on('data', function(chunk){
				
				data += chunk;

			});
			
			res.on('end', function(){

				var input = opts.resolve ? opts.resolve(data) : JSON.parse(data);
				//input转化为数组
				input = Array.isArray(input) ? input : [ input ];

				var diffData = findDiff(input, inputMgr[url], modelName);

				if(diffData.length){
					var output = generateOutput(input, modelName);
					outputMgr[url] = output;
					inputMgr[url] = input;
					fw.netMessage.sendLocalMessage({modelName: modelName}, 'trigger_push');
				}

			});
			
		});

	}


	/**
	 * package: external
	 * method name: fetch
	 * @param params : subscribe params
	 * @param callback : subscribe callback
	 */
	external.fetch = function(modelName, pubname, params, callback){

		var opts = extpubConfig[pubname];
		var url = opts.geturl(params);
		
		if(outputMgr[url]){
			callback(outputMgr[url]); //如果有数据，直接推回客户端
		}else{
			getExtData(modelName, pubname, opts, params, callback); //没有就去动态抓取
		}

		if(opts.fetchInterval && !fetchTimer[url]){
			fetchTimer[url] = setInterval(function(){
				syncExtData(modelName, pubname, opts, params, callback);
			}, opts.fetchInterval);
		}

	}

	external.update = function(data){
		fw.log('external update', data);
	}

	external.delete = function(data){
		fw.log('external delete', data);
	}

	external.insert = function(data){
		fw.log('external insert', data);
	}

	//定时清理http请求的Timer
	//setInterval(resetAllFetchTimer, 15 * 60 * 1000); //15min
	
}


module.exports = runnable;