Library = typeof Library == 'undefined' ? {} : Library;

var runnable = function(fw){
	fw.addSubPackage('Library');
	
	var createLibrary = function(method){
		var exports = {};
		
		method.call(this, exports);
		
		return exports;
	}
	
	var loadLibrary = function(name){
		//name format: string: Library.objUtils
		var library = eval(name);
		
		if(typeof library == 'undefined'){
			throw "Error finding the library " + name;
		}
	}
	
	fw.Library.__reg('create', createLibrary);
	fw.Library.__reg('load', loadLibrary);
	
};

if(typeof module !='undefined' && module.exports){
    module.exports = runnable;
}else{
    runnable(sumeru);
}

