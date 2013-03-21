Model = Model || {};
Model.smrAuthModel = function(exports){    
	exports.config = {
		fields: [
			{name: 'token',  type: 'string'},
			{name: 'password',   type: 'string'},
			{name: 'sessionId', type: 'string'},
			{name: 'info', type: 'object'},
			{name: 'status', type: 'string', defaultValue: '0'},
			{name: 'clientId', type: 'string'},
			{name: 'secretKey', type: 'string'},
			{name: 'passportType', type: 'string', defaultValue: 'local'},
			{name: 'vCodeStr', type: 'string'},
			{name: 'verifyCode', type: 'string'},//verifyCode image url.
		]
	};
};

Model.smrLoginModel = function(exports){    
	exports.config = {
		fields: [
			{name: 'clientId',  type: 'string'},
			{name: 'token',   type: 'string'},
			{name: 'sessionId', type: 'string'},
			{name: 'time', type: 'string'},
			{name: 'userId', type: 'string'},
			{name: 'lastRequestTime', type: 'string'},
			{name: 'isLogin', type: 'string', defaultValue: '1'},
			{name: 'info', type: 'object'},
            {name: 'expires', type: 'int'}
		]
	};
};