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
};