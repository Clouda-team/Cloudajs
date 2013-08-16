/**
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
