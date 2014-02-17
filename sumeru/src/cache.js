var runnable = function(fw){
    _CACHEKEY = '_sumeru_pubsub_caches';
    /**
     * 这是一个对localStorage的包装，用于处理以下两个问题
     * 1、超出存储限制，自动删除优先级别低的数据。数据优先级的计算方式：开发者配置/app的前20个订阅数据，
     * 2、数据编码存储机制
     * 
     */
    var cache = fw.addSubPackage('cache');

    //当存储时如果遇到name为 QuotaExceededError，catch到回收部分cache
    var _clearCache = function(f){
        var gaplen = f?fw.config.get('pubcachegap'):0;//没有参数时，表示不超出，pubcache就不删除
        var keylist = localStorage.getItem(_CACHEKEY);
        if(typeof keylist == 'String'){
            keylist = keylist.split(',');
        }else{
            keylist = [];
        }

        var len = keylist.length - 20 - fw.config.get('pubcachenum');
        len = Math.max(gaplen,len);

        var delList = keylist.splice(20,len);

        Array.prototype.forEach.call(delList,function(item){
            localStorage.removeItem(item);
        });

        localStorage.setItem(_CACHEKEY,keylist.join(','));
    };
    var set = function(key,value){
        if(fw.IS_SUMERU_SERVER){
            return;
        }
        if(fw.config.get('pubcache') !== true)return;
        var keylist = localStorage.getItem(_CACHEKEY);
        //keylist。优先保存前20个数据，如有修改就替换之，这20条数据永不删除。
        if(typeof keylist == 'string'){
            keylist = keylist.split(',');
        }else{
            keylist = [];
        }
        var index = keylist.indexOf(key);
        if(index>=0){
            //不在前20的key刷新位置
            if(index>=20){
                keylist.splice(index,1);
                keylist.push(key);
            }
        }else{
            keylist.push(key);
        }

        var save = function(){
            _clearCache();
            try{
                localStorage.setItem(_CACHEKEY,keylist.join(','));
                localStorage.setItem(key,value);
            }catch(e){
                if(e.name.toLowerCase() == 'quotaexceedederror'){
                    _clearCache(true);
                    save();
                }
            }
        }
        save();
    };
    var setPubData = function(pubname,args,value){
        if(fw.IS_SUMERU_SERVER){
            return;
        }

        if(pubname&&fw.config.get('pubcacheexcept').indexOf(pubname)<0)//过滤掉不需要缓存的publish
        if(!fw.pubsub._publishModelMap[pubname.replace(/@@_sumeru_@@_page_([\d]+)/, '')]['needAuth']){
            var key = pubname+((args instanceof Array)?'_'+args.join('_'):'');
            set(key,value);
        }
    };
    var getPubData = function(pubname,args){
        if(fw.IS_SUMERU_SERVER){
            return;
        }
        var key = pubname+((args instanceof Array)?'_'+args.join('_'):'');
        return get(key);
    };
    var get = function(key){
        if(fw.IS_SUMERU_SERVER){
            return;
        }
        return localStorage.getItem(key);
    };
    cache.__reg('get', get);
    cache.__reg('set', set);
    cache.__reg('setPubData', setPubData);
    cache.__reg('getPubData', getPubData);
};
if(typeof module !='undefined' && module.exports){
    module.exports = runnable;
}else{//这里是前端
    runnable(sumeru);
}