var define;

(function(fw){
	var _private = fw._private || {};
	
	fw.depMap = fw.depMap || {};
	
	fw.codeMap = fw.codeMap || {};
	
	
	define = function(name, module){
		fw.codeMap[name] = module;
		fw.depMap[name] = function(context){
			var exports = {};
			return module.call(context, exports, context);
		};
	};
	
	
	
})(sumeru);
