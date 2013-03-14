var Model = {}; Model.pics = function(exports){
    exports.config = {
        fields: [
            {name: 'username',  type: 'string', defaultValue:""},
            {name: 'userid',  type: 'string', defaultValue:""},
        	{name: 'fs_id',  type: 'int'},
            {name: 'ctime',   type: 'int', defaultValue:0},
            {name: 'path',   type: 'string'},
            {name: 'filename',   type: 'string'},
            {name: 'thumbnail',   type: 'string'},
            {name: 'src',   type: 'string'},
            {name: 'size',   type: 'int'},
            {name: 'width',   type: 'int'},
            {name: 'height',   type: 'int'},
            {name: 'r',   type: 'int'},
            {name: '_r',   type: 'int'},
            {name: '_type',   type: 'int'},
        ]
    };
};

Model.picsTimeline = function(exports){
    exports.config = {
        fields: [
            {name: 'username',  type: 'string', defaultValue:""},
            {name: 'userid',  type: 'string', defaultValue:""},
            {name: 'timename',  type: 'string'},//时间分类名
            {name: 'size',   type: 'int', defaultValue:0},//图片数
            {name: 'newsize',   type: 'int', defaultValue:0},//新图片
            {name: 'stime',   type: 'int', defaultValue:0},
            {name: 'etime',   type: 'int', defaultValue:0}
        ]
    };
};/**
 * sumeru F / W
 * Copyright
 * License
 */


Model.commentModelDemo = function(exports){    
    exports.config = {
        fields: [
            {name: 'content',  type: 'string', validation:'required'},
            {name: 'time',   type: 'string'},
            {name: 'diggs', type: 'model',relation:'many', model : 'Model.diggModelDemo'},
        ]
    };
    
};
/**
 * sumeru F / W
 * Copyright
 * License
 */


Model.diggModelDemo = function(exports){    
    exports.config = {
        fields: [
            {name: 'digg',  type: 'int'},
            {name: 'diggusers', type: 'model',relation:'many', model : 'Model.userModelDemo'}
        ]
    };
};/**
 * sumeru F / W
 * Copyright
 * License
 */


Model.comment = function(exports){    
    exports.config = {
        fields: [
            {name: 'content',  type: 'string'},
            {name: 'time',   type: 'datetime', defaultValue : 'now()'},
            {name: 'author', type: 'model', relation:'one',  model : 'Model.authModel'},
        ]
    };
    
};
/**
 * sumeru F / W
 * Copyright
 * License
 */


Model.message = function(exports){    
	exports.config = {
        fields: [
            {name: 'content',  type: 'text'},
            {name: 'comments', type: 'model', relation:'many', model : 'Model.comment', hasMany : true},
            {name: 'author', type: 'model', relation:'one',  model : 'Model.authModel'},
            {name: 'time', type: 'datetime', defaultValue: 'now()'}
        ]
    };
	
	var _privateMethod = function(){return 1};
	
	//FIXME 自动生成
	exports.getComments = function(){
		return '';
	};
	
};
/**
 * sumeru F / W
 * Copyright
 * License
 */


Model.user = function(exports){    
    exports.config = {
        fields: [
            {name: 'name',  type: 'string'},
            {name: 'userid',   type: 'int'}
        ]
    };
    
};
/**
 * sumeru F / W
 * Copyright
 * License
 */


Model.modelDemo = function(exports){    
	exports.config = {
        fields: [
            {name: 'name',  type: 'string', validation:'length[1,20]'},
            {name: 'age',   type: 'int', validation:'length[1,3]'},
            {name: 'phone', type: 'string', validation:'mobilephone'},
            {name: 'comments', type: 'model', relation: 'many', model : 'Model.commentModelDemo'},
            {name: 'users', type: 'model', relation: 'many', model : 'Model.userModelDemo'},
            {name: 'modeltest', type: 'model', relation: 'one', model : 'Model.userModelDemo'},
            {name: 'alive', type: 'boolean', defaultValue: true},
            {name: 'club', type: 'array', defaultValue: '["Fight Club","health club"]'},
            {name: 'object', type: 'object', defaultValue: '{a:1,b:2}'},
            {name: 'time', type: 'datetime', defaultValue: 'now()'}
        ]/*,
        layer: {
            type: 'memory',
            url : 'data/users'
        }*/
    };
	
	var _privateMethod = function(){return 1};
	
	exports.calc = function(){
		return 'name:' + this.get('name') + ' - age : ' + this.get('age') + ' - id : ' + this.get('id');
	};
	
};
/**
 * Sumeru F / W
 * Copyright
 * License
 */
Model.realtimeDemo = function(exports){    
	exports.config = {
        fields: [
            {name: 'model', type: 'model', relation: 'one', model : 'Model.subModelDemo'},
            {name: 'collection', type: 'model', relation: 'many', model : 'Model.subModelDemo'},
            {name: 'array', type: 'array', defaultValue: '["array item1","array item2"]'},
            {name: 'object', type: 'object', defaultValue: '{a:1,b:2}'},
            {name: 'datetime', type: 'datetime', defaultValue: 'now()'},
            {name: 'boolean', type: 'boolean', defaultValue: true},
            {name: 'string', type: 'string', validation:'length[1,20]'},
            {name: 'int', type: 'int', validation:'length[1,20]'},
            {name: 'name', type: 'string', validation:'length[1,20]|unique'}
        ]/*,
        layer: {
            type: 'memory',
            url : 'data/users'
        }*/
    };
	
	var _privateMethod = function(){return 1};
	
	exports.show = function(){
		return 'string:' + this.get('string');
	};
	
};

Model.subModelDemo = function(exports){    
    exports.config = {
        fields: [
            {name: 's_model', type: 'model', relation: 'one', model : 'Model.subsubModelDemo'},
            {name: 's_collection', type: 'model', relation: 'many', model : 'Model.subsubModelDemo'},
            {name: 's_name', type: 'string', validation:'length[1,100]'}
        ]
    };
    exports.toString = function(){
        return 's_name:' + this.s_name;
    };
};
Model.subsubModelDemo = function(exports){    
    exports.config = {
        fields: [
            {name: 'ss_name', type: 'string', validation:'length[1,100]'}
        ]
    };
    exports.toString = function(){
        return 'ss_name:' + this.ss_name;
    };
};Model.testDemo = function(exports){    
    exports.config = {
        fields: [
            {name: 'name',  type: 'string'},
            {name: 'age',   type: 'int'},
        ]
    };
};/**
 * sumeru F / W
 * Copyright
 * License
 */


Model.userModelDemo = function(exports){    
    exports.config = {
        fields: [
            {name: 'name',  type: 'string', validation: 'length[1,20]'},
            {name: 'userid',   type: 'string'},
            {name: 'referrer', type: 'model', relation: 'one', model : 'Model.referrerModelDemo'}
        ]
    };
    
};

Model.referrerModelDemo = function(exports){    
    exports.config = {
        fields: [
            {name: 'name',  type: 'string'},
            {name: 'userid',   type: 'string'}
        ]
    };
    
};
Model = Model || {};
Model.__smrAuthModel = function(exports){    
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

Model.__smrLoginModel = function(exports){    
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
};module.exports = Model;