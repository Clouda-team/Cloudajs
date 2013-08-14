var runnable = function(sumeru){
    Library.asyncCallbackHandler = sumeru.Library.create(function(exports){
        /**
         * 用于解决多个异步请求，共用一个callback
         * callback 这个还不知道在哪里运行呢，所以，里面用到的变量一定要放到这个函数的闭包中。
         * timeout 如果有设置timeout，则在enableCallback之后设置定时器，如果时间到了异步调用还没有执行完，就直接调用callback。callback只能被调用一次。
         * useage：
            cbHandel = Library.asyncCallbackHandler.create(callback);
            cbHandel.add();
            cbHandel.decrease();
            cbHandel.enableCallback();//所有的请求都发送完毕后调用
         */
        var _asyncCallbackHandler = function(callback,timeout){
            this.counter = 0;
            this.callbacked = false;
            this.callback = function(){//保证callback只被调用一次
                if(!this.callbacked){
                    callback();
                    this.callbacked = true;
                }
            };
            this._enableCallback = false;//表示所有请求都已经发送，可以callback了
            if(timeout)this.timeout = timeout;
            this.timeoutFunc = null;
        };

        _asyncCallbackHandler.prototype = {
            add:function(){
                this.counter++;
            },
            decrease:function(){
                this.counter--;
                if(this._enableCallback&&this.counter===0){
                    this.callback();
                }
            },
            enableCallback:function(){
                this._enableCallback = true;
                if(this.timeout){
                    this.timeoutFunc = setTimeout((function(obj){
                                                        obj.callback();
                                                    })(this),this.timeout);
                };
                if(this._enableCallback&&this.counter===0){
                    this.callback();
                }
            }
        };

        exports.create = function(callback,timeout){
            return new _asyncCallbackHandler(callback,timeout);
        };
        return exports;
    });
};

if(typeof module !='undefined' && module.exports){
    module.exports = runnable;
}else{
    runnable(sumeru);
}

