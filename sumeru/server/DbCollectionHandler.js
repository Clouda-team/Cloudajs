var runnable = function(fw){
    //===================
    var config = fw.config;
    
    var PSS = 'pss';
    // 使用PSS
    var MONGO = 'mongodb';
    var BSS = 'bss'
    // mongodb,         
    // FIXME 可以从config对像获取.
    var useingDbDriver = MONGO;
    //
    var getDbCollectionHandler ;
    var createDB;
    var ObjectId;
    var DbCollection = {};
    var pss_newDB;
    var bss_newDB;
    /**
     * DB Driver选择
     */
    
    switch(useingDbDriver) {
    case BSS:
	var Storage = require(__dirname +'/lib/bss/com/Storage.js').Storage;
	var sumeruDB = require(__dirname + '/lib/bss/api/SumeruDB.js').sumeruDB;
	var config = require(__dirname + '/lib/bss/pss/PssConfig.js').config;
	
	sumeruDB.registerStorage('PSS', new Storage(config));
        ObjectId = require(__dirname  + '/ObjectId.js').ObjectId;
        
	getDbCollectionHandler = function(modelName, callback){
            if(!('function' === typeof callback)) 
            {
                throw new TypeError('callback must be function type!');
            }
            var collection = DbCollection[modelName];
            if(typeof  collection == 'undefined'){
		 var options = {
		     cluster : 'framework',
		     type: "app",
		     shard_key_type: "numeric",
		     shard_key: "id",
		     shard_range: {
			 "0": [0, 20000000],
			 //"1": [1000000, 2000000]
		     }
		 }
		bss_newDB.createCollection(modelName, options, function on_collection(err, newCollection){
		     if (err != null) {
                        callback(err);
                    } else{
                        DbCollection[modelName] = newCollection;
                        callback(err, newCollection);
                    };
		});
	    }else {
                process.nextTick(function myTick(){callback(null, collection);});
            }
				    
	};
    	

        createDB = function(callback){
	    sumeruDB.createDB('PSS',null, {}, function on_create_db(err,newDB){
		if (err == null && newDB != null){
                    bss_newDB = newDB;
                    callback(newDB);
		}
	    });
        }
    
	break;


    case PSS:
        var DB          = require(__dirname  + '/../../../kernel/db/src/api/DB.js').DB;
        var Collection  = require(__dirname  + '/../../../kernel/db/src/api/Collection.js').Collection;
        var Cursor      = require(__dirname  + '/../../../kernel/db/src/api/Cursor.js').Cursor;
        var Storage     = require(__dirname  + '/../../../kernel/db/src/com/Storage.js').Storage;
        var pssConfig   = require(__dirname  + '/../../../kernel/db/src/pss/PssConfig.js').config;
        var sumeruDB    = require(__dirname  + '/../../../kernel/db/src/api/sumeruDB.js').sumeruDB;
        
        sumeruDB.registerStorage('PSS', new Storage(pssConfig));
        ObjectId = require(__dirname  + '/ObjectId.js').ObjectId;
        
        getDbCollectionHandler = function(modelName, callback){
            if(!('function' === typeof callback)) 
            {
                throw new TypeError('callback must be function type!');
            }
            var collection = DbCollection[modelName];
            if(typeof  collection == 'undefined'){
                //collection = DbCollection[modelName] = new mongodb.Collection(db, modelName); 
                pss_newDB.createCollection(modelName, {'strict':false}, function onCreateCollection(err, newCollection){
                    if (err != null) {
                        callback(err);
                    } else{
                        DbCollection[modelName] = newCollection;
                        callback(err, newCollection);
                    };
                });
            } else {
                process.nextTick(function myTick(){callback(null, collection);});
            }
        };
        
        createDB = function(callback){
            var options = {'strict':false};
            sumeruDB.createDB('PSS', null, options, function on_createDB_result(err, newDB){
                //util.log('sumeruDB createDB result:');
                //util.log(err);
                if (err == null && newDB != null){
                    pss_newDB = newDB;
                    callback(newDB);
                }
            });
        };
        break;
    case MONGO:
    default:
        var mongodb = require('mongodb');
        
        //compatible with old versions.
        var databaseConfig = config.database || config;
        
        var serverOptions = {
            'auto_reconnect': true,
            'poolSize': databaseConfig.get('poolSize')         //MAX IS 2000
          };
        
        var host = databaseConfig.get('mongoServer') || '127.0.0.1',
            port = databaseConfig.get('mongoPort') || 27017,
            username = databaseConfig.get('user') || '',
            password = databaseConfig.get('password') || '';
        
        if(fw.BAE_VERSION === 2){
            host = process.env.BAE_ENV_ADDR_MONGO_IP;
            port = +process.env.BAE_ENV_ADDR_MONGO_PORT;
            username = process.env.BAE_ENV_AK;
            password = process.env.BAE_ENV_SK;
        }else if (fw.BAE_VERSION === 3){
            host = 'mongo.duapp.com';
            port = 8908;
        }
        
        var server = new mongodb.Server(host, port, serverOptions);
        var db = new mongodb.Db(databaseConfig.get('dbname') || 'test', server, {w : 1});
        
        db.on('error',function(){
            console.log("ERROR : DbCollectionHandle.js : 148 : ",arguments);
        });
        
        ObjectId = mongodb.ObjectID;
        
        getDbCollectionHandler = function(modelName, callback) {
            callback = callback || function(){};
            //try {
            var collection = DbCollection[modelName];
            if ( typeof collection == 'undefined') {
                collection = DbCollection[modelName] = new mongodb.Collection(db, modelName);
            }
            callback(null, collection);
            //} catch(err) {
            //    callback(err, collection);
            //}

            return collection;
        };
        
        
        createDB = function(callback){
            db.open(function(err, db){
        		if (err){
        		    fw.log('DB OPEN ERROR', err);
        		    return;
        		}
        		
        		if (username !== '' || password !== ''){
        		    db.authenticate(username,password,function(err,result){
                        if (!err){
            			    callback(db);
            			}else {
            			    fw.log('DB auth failed', 'database :', databaseConfig.get('dbname'), 'username :', username, 'password :', password, err);
            			}
        		    })
        		}else{
        		     callback(db);
        		}
            });
        };
    }
    
    serverCollection = require(__dirname  + '/serverCollection.js')(fw, getDbCollectionHandler,ObjectId);
    
    var handle = {
        getDbCollectionHandler : getDbCollectionHandler,
        createDB : createDB,
        ObjectId : ObjectId,
        serverCollection : serverCollection
    };
    
    fw.getDbHandler = function(){
        return {
            getDbCollectionHandler : handle.getDbCollectionHandler,
            ObjectId : handle.ObjectId
        };
    };
    
    return handle;
};

module.exports = runnable;
