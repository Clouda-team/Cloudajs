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
};
