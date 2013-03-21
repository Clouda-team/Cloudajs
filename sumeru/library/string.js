Library.string = sumeru.Library.create(function(exports){	
	exports.trim = function(str){
		return str.replace(/^\s|\s$/g, '');
	};
	
	
	exports.escapeRegex = function(str){
	    return (str+'').replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
	}
	
	return exports;
});