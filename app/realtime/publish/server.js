//modelDemo.publish('real-time');
var crypto = require('crypto');

module.exports = function(fw){
    //fw.publish('modelDemo', 'real-time');
    
	fw.securePublish('realtimeDemo', 'real-time', function(int, gender, userinfo, callback){
	    var collection = this;
	    collection.find({'int' : {"$gte" : int}}, {sort : {'time' : -1}}, function(err, items){
            callback(items);
        });
	}, {
	    
	    beforeInsert : function(serverCollection, structData, userinfo, callback){
            callback();
	    },
	    
        afterInsert : function(serverCollection, structData){
        },
        
        beforeDelete : function(serverCollection, structData, userinfo,  callback){
            callback();
        },
        beforeUpdate : function(serverCollection, structData, userinfo, callback){
            callback();
        },
        onPubEnd : function(serverCollection){
        }
	});
	
	fw.publishPlain('subModelDemo', 'pub-subModel', function(callback){
	    var collection = this;
	    /*collection.count(function(err, count){
	        callback(count)
	    })*/
	   collection.count({},function(err, count){
            callback(count);
       });
	});
	
    
    fw.publish('subModelDemo', 'pub-subModelName', function(callback){
        var collection = this;
        collection.find({},function(err, items){
             callback(items);
         });
     });
     
	fw.publish('testDemo', 'pub-test', function(callback){
	    var collection = this;
	    collection.find({},function(err, items){
	         callback(items);
	     });
	 });
	 
	fw.publishByPage('realtimeDemo', 'real-time-by-page', function(options, int, callback){
        var collection = this;
        
        var condition = {
                'int' : {"$gte" : int}
            },
            uniqueField = options.uniqueField;
        
            
        if (options.bounds) {
            
            var bounds = options.bounds;
            if (bounds.left == bounds.right) {
                condition[uniqueField] = bounds.left;
            } else if (bounds.left == -1) { //按倒序情况
                condition[uniqueField] = {"$gte" : bounds.right};
            } else {
                condition[uniqueField] = {"$gte" : bounds.right, '$lte' : bounds.left};
            }
            
            collection.find(condition, {sort : {'time' : -1}}, function(err, items){
                callback(items);
            });
        } else {
            collection.find(condition, {sort : {'time' : -1}, limit : options.pagesize, skip : (options.page - 1) * options.pagesize}, function(err, items){
                callback(items);
            });    
        }
	});
	   
	/**
	 * 
	fw.publish('modelDemo', 'real-time', function(age, gender, callback){
		db.collection.find({}).toArray(err, item){
			callback(item);
		}
	});
	 */
}