
var LOG_LEVEL = 'dev'; //off, normal, dev

var _log = function(){
	console && console.log.apply(this, arguments);
}

var log = {
	dev	: function(){
		if(LOG_LEVEL == 'dev'){
			_log.apply(this, (arguments));
		}
	},
	
	write : function(){
		if(LOG_LEVEL != 'off'){
			_log.apply(this, arguments);
		}
	},
	swrite : function(){
		if(LOG_LEVEL != 'off'){
			_log.apply(this, ["----------------------------"]);
			_log.apply(this, arguments);
			_log.apply(this, ["----------------------------"]);
		}
	}
};

module.exports = log;
