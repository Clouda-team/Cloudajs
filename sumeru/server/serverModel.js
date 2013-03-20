var runnable = function(fw){

	/**
	 * 1、将model文件build到一个文件，require进来
	 * 2、再读取一遍里面的fields,如果是model就吧modelname里面的前缀给去掉，存放在modelTempContainter里面备用；
	 * 3、
	 */

	/**
	 * build model
	 */
	var fs = require('fs');
	var path = require('path');
	var log = require(__dirname  + '/../src/log.js');
/*	var buildFile = require(__dirname  + '/lib/buildFile.js');

	var buildModel = function(){
	    var base_path = __dirname + '/../model',
	        target_path = __dirname + '/tmp'; 
	    
	    //如果不存在，则创建临时目录
	    if(!path.existsSync(target_path)){
	        fs.mkdirSync(target_path);
	    }
	    
	    var fileCnt = 'var Model = {}; ';
	    
	    fileCnt += buildFile.readfile(base_path);
	    
	    fileCnt += 'module.exports = Model;';
	    
	    fs.writeFileSync(target_path + '/model.js', fileCnt, 'utf8');
	};

	log.write('start build');
	buildModel();
	log.write('build finish');
*/

	//提取出model 中对field的定义，也就是config那部分
	fw.model = {};
	fw.model.modelTempContainter = {};
	fw.model.modelRelation = {};
	var buildModelTemp = function(){
		//var modelPath = path.join(process.dstDir, 'server/tmp/model.js');
		//console.log('modelPath :' + modelPath);
        
        var appPath  = __dirname + '/../../app' + 
            ((typeof process.BAE == 'undefined' && process.argv[2]) ? '/' +process.argv[2] : '');
        var allTheDirFiles = [];
        var modelBaseDir = appPath + '/model';
        var Model = Model || {};
        var findAllTheDirFiles = function(theDir) {                                 
            var theDirFiles = fs.readdirSync(theDir);
            for (var i = 0, len = theDirFiles.length; i < len; i++) {
                var thePath = theDir + '/' + theDirFiles[i];
                theDirFiles[i].indexOf('.') === -1 ? 
                  findAllTheDirFiles(thePath) : allTheDirFiles.push(thePath);
            }
        };
        
        if(fs.existsSync(modelBaseDir)){
           findAllTheDirFiles(modelBaseDir);
           allTheDirFiles.forEach(function(file) {
                if (path.extname(file) == '.js'
                    && path.basename(file, '.js') != 'package') {
                    var content = fs.readFileSync(file, 'utf-8');
                    eval(content);
                };
            });
        }else{
            log.dev(modelBaseDir + ' 目录不存在！！！');
        }
        
		var modelDef = Model;
		for (var model in modelDef){
	        var exports = {},
	            fieldsMap = {};
	           
	        modelDef[model](exports);
	        //只记录fields中的每个子model到当前父层model的对应关系，多层嵌套的关系留在查询关系的时候层层反应出来。
	        if(exports['config'] && exports['config']['fields']){
	            var fields = exports.config.fields;
	            
	            for (var i = 0, l = fields.length; i < l; i++){
					var oneField = fields[i];
					if(oneField['type']=='model'&& typeof oneField['model'] != 'undefined'){
						oneField.model = oneField.model.replace(/Model\./, ''); 
						
                        fw.model.modelRelation[oneField.model] = fw.model.modelRelation[oneField.model] || [];
                        if (fw.model.modelRelation[oneField.model].indexOf(model) == -1) {
                            fw.model.modelRelation[oneField.model].push(model);
                        };
					}

					fieldsMap[oneField['name']] = oneField;
	            }

	            fieldsMap[fw.idField] = {name : fw.idField, type : 'int'};
				//fieldsMap[fw.clientIdField] = {name : fw.clientIdField, type	:	'string'};
	        }
	        fw.model.modelTempContainter[model] = fieldsMap;
	        fw.model.modelTempContainter[model].needAuth = exports['config'].needAuth;
	    }
	}
	buildModelTemp();
	fw.model.getModelRelation = function(modelName){
		if(typeof fw.model.modelRelation[modelName] == 'undefined'){
			fw.model.modelRelation[modelName] = [];
		}
		return fw.model.modelRelation[modelName];
	}
	fw.model.getModelTemp = function(modelName){
		if(typeof fw.model.modelTempContainter[modelName] == 'undefined'){
			console.log('error: undefined modelName.', modelName);
			return false;
		}

		//console.log(fw.model.modelTempContainter[modelName]);
		return fw.model.modelTempContainter[modelName];
	}
}

module.exports = runnable;
