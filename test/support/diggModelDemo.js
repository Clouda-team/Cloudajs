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
};