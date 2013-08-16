/**
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
