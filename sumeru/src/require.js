if (typeof require == 'undefined') {
	var require;
	
	(function(fw){
	
		var __addScriptToDom = function(node){
			//For some cache cases in IE 6-8, the script executes before the end
			//of the appendChild execution, so to tie an anonymous define
			//call to the module name (which is stored on the node), hold on
			//to a reference to this node, but clear after the DOM insertion.
			var currentlyAddingScript = node;
			
			var head = document.getElementsByTagName("head")[0], baseElement = document.getElementsByTagName("base")[0];
			
			if (baseElement) {
				head = baseElement.parentNode;
				head.insertBefore(node, baseElement);
			}
			else {
				head.appendChild(node);
			}
			currentlyAddingScript = null;
		};
		
		var __removeScriptTag = function(node){
			for (var attr in node) {
				if (node.hasOwnProperty(attr)) {
					delete node[attr];
				}
			}
			if (node && node.parentNode) {
				node.parentNode.removeChild(node);
			}
			node = null;
		};
		
		var __makeCallback = function(node, name, callback){
			return function(){
				callback && callback();
				node.onload = node.onreadystatechange = null;
				__removeScriptTag(node);
			}
		};
		
		
		require = function(name, callback){
			if (typeof fw.depMap[name] != 'undefined') {
				callback && callback();
				return fw.depMap[name];
			}
			var node = document.createElement('script');
			
			node.type = 'text/javascript';
			node.charset = 'utf-8';
			//Use async so Gecko does not block on executing the script if something
			//like a long-polling comet tag is being run first. Gecko likes
			//to evaluate scripts in DOM order, even for dynamic scripts.
			//It will fetch them async, but only evaluate the contents in DOM
			//order, so a long-polling script tag can delay execution of scripts
			//after it. But telling Gecko we expect async gets us the behavior
			//we want -- execute it whenever it is finished downloading. Only
			//Helps Firefox 3.6+
			//Allow some URLs to not be fetched async. Mostly helps the order!
			//plugin
			node.async = true;
			
			node.addEventListener("load", __makeCallback(node, name, callback), false);
			
			//FIXME 缺少对Name的标准化
			node.src = name + '.js';
			
			__addScriptToDom(node);
		};
		
		//一些快捷方式
		//require.controller = {};
		//require.model = {};
		//require.library = {};
		
		//FIXME 不应提供Controller的require
		/*require.controller.load = function(name){
		 return require('controller/' + name);
		 };*/
		//FIXME 这个InstanceMap在这里声明很奇怪
		//fw.__instanceMap = fw.__instanceMap || {};
		
		/*require.model.load = function(name){
			//能调用到这里的，肯定已经require完了
			var name = 'Model.' + name;
			return fw.__modelFactory(name, require(name).call({}));
		};*/
		/*require.library.load = function(name){
			//能调用到这里的，肯定已经require完了
			var name = 'library/' + name;
			if (typeof fw.__instanceMap[name] == 'undefined') {
				fw.__instanceMap[name] = require(name).call({});
			}
			
			return fw.__instanceMap[name];
		};*/
		
	})(sumeru);
	
	
}
