
var runnable = function(sumeru){
    Library.objUtils = sumeru.Library.create(function(exports){
    		
    	var isPlainObject = exports.isPlainObject = function( obj ) {
    		// Must be an Object.
    		// Because of IE, we also have to check the presence of the constructor property.
    		// Make sure that DOM nodes and window objects don't pass through, as well
    		if ( !obj || type(obj) !== "object" || obj.nodeType || obj === obj.window ) {
    			return false;
    		}
    
    		try {
    			// Not own constructor property must be Object
    			if ( obj.constructor &&
    				!Object.prototype.hasOwnProperty.call(obj, "constructor") &&
    				!Object.prototype.hasOwnProperty.call(obj.constructor.prototype, "isPrototypeOf") ) {
    				return false;
    			}
    		} catch ( e ) {
    			// IE8,9 Will throw exceptions on certain host objects #9897
    			return false;
    		}
    
    		// Own properties are enumerated firstly, so to speed up,
    		// if last one is own, then all properties are own.
    
    		var key;
    		for ( key in obj ) {}
    
    		return key === undefined || Object.prototype.hasOwnProperty.call( obj, key );
    	};
    	
    	var class2type = {};
    	
    	"Boolean Number String Function Array Date RegExp Object".split(' ').forEach(function(item){
    		class2type["[object " + item + "]"] = item.toLowerCase();
    	});
    	
    	var type = function(obj){
    			return obj == null ?
    				'null' :
    				class2type[ Object.prototype.toString.call(obj) ] || "object";
    		},
    		
    		isObject = exports.isObject = function(obj){
    			return type(obj) === 'object';
    		},
    		isEmpty = exports.isEmpty = function(obj){
    			var empty = true, fld;
				for (fld in obj) {
				  empty = false;
				  break;
				}
				return empty;
    		},
    		isArray = exports.isArray = function(obj){
    			return type(obj) === 'array';
    		},
    		isFunction = exports.isFunction = function(obj){
    			return type(obj) === 'function';
    		},
    		isString = exports.isString = function(obj){
    			return type(obj) === 'string';
    		},
    		isBoolean = exports.isBoolean = function(obj){
    			return type(obj) === 'bollean';
    		},
    		isNumber = exports.isNumber = function(obj){
    			return type(obj) === 'number';
    		},
    		isDate = exports.isDate = function(obj){
    			return type(obj) === 'date';
    		},
    		isRegExp = exports.isRegExp = function(obj){
    			return type(obj) === 'regexp';
    		},
    		
    		extend = exports.extend =  function(){
    			var options, name, src, copy, copyIsArray, clone,
    				target = arguments[0] || {},
    				i = 1,
    				length = arguments.length,
    				deep = false;
    		
    			// Handle a deep copy situation
    			if ( typeof target === "boolean" ) {
    				deep = target;
    				target = arguments[1] || {};
    				// skip the boolean and the target
    				i = 2;
    			}
    		
    			// Handle case when target is a string or something (possible in deep copy)
    			if ( typeof target !== "object" && !isFunction(target) ) {
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
    						src = target[ name ];
    						copy = options[ name ];
    		
    						// Prevent never-ending loop
    						if ( target === copy ) {
    							continue;
    						}
    		
    						// Recurse if we're merging plain objects or arrays
    						if ( deep && copy && ( isPlainObject(copy) || (copyIsArray = isArray(copy)) ) ) {
    							if ( copyIsArray ) {
    								copyIsArray = false;
    								clone = src && isArray(src) ? src : [];
    		
    							} else {
    								clone = src && isPlainObject(src) ? src : {};
    							}
    		
    							// Never move original objects, clone them
    							target[ name ] = extend( deep, clone, copy );
    		
    						// Don't bring in undefined values
    						} else if ( copy !== undefined ) {
    							target[ name ] = copy;
    						}
    					}
    				}
    			}
    		
    			// Return the modified object
    			return target;
    		};
    	return exports;
    });
};

if(typeof module !='undefined' && module.exports){
    module.exports = runnable;
}else{
    runnable(sumeru);
}

