(function(fw){
    fw.addSubPackage('historyCache');
    
    // var maxCache = 10;//
    var _cache = [];//用数组
    
    //hitUrl 用于查找是否在历史记录里面，如果是，则返回，并且删除
    //data形如【0：url，1：render方式】
    var hitUrl = function(data, isForce) {
        if ( isForce ) {
            setUrl(data);
            return false;
        }
        
        var getit = false;
        for (var i = _cache.length - 1; i >= 0; i--) {
            if (_cache[i] && _cache[i][0] === data[0]) {
                getit = true;
                break;
            }
        }
        if (!getit) {
            setUrl(data);
            return false;
        } else if ( i === (_cache.length - 1) ) {//说明是url没变，自己刷新自己
            return false;
        } else {//清空缓存吧
            for (var j = _cache.length - 1; j > i; j--) {
                _cache.pop();//弹出，不占空间
            }
            //我还要给它进行转换，又入场到出场,这里不让他传递引用，防止污染我的内部cache变量
            var ret = JSON.stringify(_cache[i]);
            return JSON.parse(ret);
        }
    };
    var getCache = function() {
        return _cache;
    }
    var setUrl = function(data) {//这里都是自己人的调用，没做数据校验
        if ( data && data[0] && data[1] ) {//js太恶心，都是引用，所以这里我要分别赋值
            _cache.push( data );
        }
    };

        
    fw.historyCache.__reg('hitUrl', hitUrl);
    fw.historyCache.__reg('getCache', getCache);

    
})(sumeru);