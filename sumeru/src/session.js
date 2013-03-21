(function(fw){
    var session = fw.addSubPackage('session');
    /**
     * {
     *      "identifier":"hashSerializeStr"
     * }
     */
    var serialize_pool = {};

    var instance_pool = {};
    
    var parseJSON = fw.utils.parseJSON;
    
    var cloneObj = function(obj){
        return JSON.parse(JSON.stringify(resumeObj));
    };
    
    /**
     * 判断一个值是否是简单的基本类型,即 boolean,number,string
     * @param value{any} 将判断值
     * @returns {boolean} true是简单基本类型, false不是简单基本类型
     */
    var isSBDT = fw.utils.isSimpleType;
    
    var sense_get, sense_set, sense_commit;
    
    var _Session = fw.sense.extend(function(identifier){
        this.__identifier = identifier;
        this.__hashKey = [];    // 可以被hash的key
        this.__snapshot = {};   // 以hash为key的快照map
        
        this.__getId = function(){
            // 使用闭包值，防止this.__identifier被修改
            return identifier;
        };
    });
    
    // 原sense方法的引用
    sense_get = _Session.prototype.get;
    sense_set = _Session.prototype.set;
    sense_commit = _Session.prototype.commit;
    
    // 代理方法
    _Session.prototype.get = (function(_superFun){
        return function(){
            return _superFun.apply(this,arguments);  
        };
    })(sense_get);
    
    _Session.prototype.set = (function(_superFun){
        return function(key,value,isSerialize){
            var checkType = isSerialize;
            if(isSerialize){
                this.__hashKey.push(key);
            }
            
            if((checkType || this.__hashKey.indexOf(key) != -1 ) && !isSBDT(value)){
                // 不是string , number ,boolean , 抛出异常
                throw "data type error";
            }
            
            return _superFun.call(this,key,value);  
        };
    })(sense_set);
    
    _Session.prototype.setIfNull = (function(_superFun){
        return function(key,value,isSerialize){
            
            // 当存在当前key时，直接返回
            if(this.container.hasOwnProperty(key)){
                return;
            }
            
            if(isSerialize && this.__hashKey.indexOf(key) == -1){
                this.__hashKey.push(key);
            }
            
            if((isSerialize || this.__hashKey.indexOf(key) != -1 ) && !isSBDT(value)){
                // 不是string , number ,boolean , 抛出异常
                throw "data type error";
            }
            
            return _superFun.call(this,key,value);  
        };
    })(sense_set);
    
    _Session.prototype.commit = (function(_superFun){
        return function(){
            var obj = {};
            
            var rv = _superFun.apply(this,arguments);  
            
            this.__hashKey.forEach(function(key){
                obj[key] = this.container[key];
            },this);
            
            serialize_pool[this.__identifier] = JSON.stringify(obj);
            
            if(serialize_pool[this.__identifier] == "{}"){
                delete serialize_pool[this.__identifier];
            }else{
                this.__snapshot[serialize_pool[this.__identifier]] = JSON.stringify(this.container);
            }
            
            session.serialize();
            
            return rv;
        };
    })(sense_commit);
    
    // 还原 snapshot 
    _Session.prototype.__unserialize = function(){
        /*
         * 执行以下步骤
         * 1, 查找 serialize_pool 找出可以做为快照key的序列化字符串
         * 2, 将序死化字符串还原为对像,放入container,完成url中hash部份的还原, 如果没有,container仍为{},不进入下一步.
         * 3, 根据identifier,搜索snapshot, 如果存在内容,再根据序列化字符串搜索对应的历史记录并还原. 如果没有,则还原到此为止
         */
        var rv = false;
        var identifier = this.__identifier;
        var serializeStr = serialize_pool[identifier];
        var snapshot,serialize;
        
        /*
         * 当前实现为在创建session快照时,序列化所有存在session中的内容,
         * 所以如果可以根据serializeStr还原快照到创建serialize的状态,则需要再单独还原serializeStr的内容
         */ 
        if(this.__snapshot[serializeStr] && (snapshot = parseJSON(this.__snapshot[serializeStr]))){
                //此处直接替换container,一般认为,不序列化到URL中的内容更多,类型可能更复杂
                this.container = snapshot;
                rv = true;
        }else if(serializeStr !== "" && serializeStr != null){
            // 还原被序列化的值
            for(var key in serialize = parseJSON(serializeStr)){
                // 直接将值还原到container中, 不触动set方法
                this.container[key] = serialize[key];
                
                if(this.__hashKey.indexOf(key) == -1){
                    this.__hashKey.push(key);
                }
            }
            rv = true;
        }
        return rv;
    };
    
    // ============================= 
    
    /**
     * session工厂，
     */
    session.__reg('create',function(identifier){
        var sessionObj = null;
        
        if(sessionObj = instance_pool[identifier]){
            return sessionObj;
        }
        
        sessionObj = instance_pool[identifier] = new _Session(identifier);
        sessionObj.__unserialize();
        return sessionObj;
    });
    
    /**
     * 清空对session绑定的所有引用，并将当前session从session的实例池中删除
     */
    session.__reg('destroy',function(identifier){
        var item = typeof(identifier) == 'string' ? instance_pool[identifier] :identifier;
        identifier = item.__identifier;
        
        fw.utils.cleanObj(item);
        
        instance_pool[identifier] = undefined;
        serialize_pool[identifier] = undefined;
        
        delete instance_pool[identifier];
        delete serialize_pool[identifier];
    });
    
    /**
     * 将serialize_pool中的内容,序列化到url中
     */
    session.__reg('serialize',function(){
        // TO JSON STRING
        var serializeDat = JSON.stringify(serialize_pool);
        fw.router.joinSessionToHash(serializeDat);
        
        if(SUMERU_APP_FW_DEBUG){
            console.log('call serialize, serializeDat : ',serializeDat);
        }

    },true);
    
    /**
     * 合并需要反序列化的session对像
     */
    session.__reg('setResume',function(serializeDat){
        serialize_pool = (serializeDat && parseJSON("{"+serializeDat+"}")) || {};
        
        for(var key in instance_pool){
            if(instance_pool[key].__unserialize()){
                instance_pool[key].commit();
            };
        }
        
        if(SUMERU_APP_FW_DEBUG){
            console.log('serialize_pool',serialize_pool);
        }
    },true);
    
})(sumeru);