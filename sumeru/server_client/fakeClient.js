/**
 * 　用于在server render时在server端模似一个client的socket.
 */

var inherits = require('util').inherits,
    _extend = require('util')._extend,
    EventEmitter = require('events').EventEmitter;

var RenderSocketMgr = new EventEmitter();     // 向外暴露的接口对像

/**
 *  实际模似socket的对像.
 */
var RenderSocket = function(args){
    if(args){
        _extend(this,args);
    }
    this.__wait_echo_callback = false;
    // call super. 
    EventEmitter.call(this);
};

inherits(RenderSocket,EventEmitter);

_extend(RenderSocket.prototype,{
    /**
     *  模似server向client的下行数据写入.
     *  因为需要在运行时，模拟sockJS的conn对像，所以保留命名为write,
     *  在接收到数据时，触发dataOnClient. 表示接收到下行数据;
     */
    write:function(data){
        /*
         * 拦截 echo_from_server，
         * 
         * 因为在server未响应这个标记的时候，server端的连接未必是通过验证的．
         * 
         * 如果不在这里做做一个异步中断一下，则很有可能在紧接着的后续server端操作可能得到未经验证的结果．
         * 
         */
        if(this.__wait_echo_callback){
            try{
                var msg = sumeru.netMessage.decodeMessage(data);
                if(msg && msg.target == 'echo_from_server'){
                    this.__wait_echo_callback && this.__wait_echo_callback(JSON.parse(msg.content));
                    return;
                }
            }finally{
                /*
                 * 
                 * 每次echo只能进来一次，一般应该没有第二次进来的可能. 
                 * 
                 * 并且不应该在server端响应echo_from_server之前有其它数据到来.
                 * 
                 */ 
                this.__wait_echo_callback = false;
            }
        }
        
        process.nextTick((function(){
            this.emit("dataOnClient",data);
        }).bind(this));
    },
    /**
     * 模似client向server的上行数据.
     * 在接收到数据时，触发data事件. 表示接收到下行数据;
     */
    writeToServer:function(data){
        process.nextTick((function(){
            this.emit("data",data);
        }).bind(this));
    },
    /**
     * 关闭socket，除触发事件外，还将移除所有listener与write方法.
     */
    close:function(){
        process.nextTick((function(){
            this.emit("close",this);
            this.removeAllListeners();
            this.write = this.writetoServer = function(){
                throw 'this connection was closed';
            };
        }).bind(this));
    },
    /**
     * 
     * 向server发送echo信息，注册连接
     * 
     * @param conn
     * @param socketId
     * @param clientId
     * @param callback
     */
    echo:function(socketId,clientId,authMethod,callback){
        
        var msg = sumeru.netMessage.encodeMessage({
            socketId : socketId,
            uuid    :   'sumeru_app_uuid'
        },200,'echo');
        
        msg.clientId = clientId;
        msg.authMethod = authMethod;
        this.__wait_echo_callback = callback || function(){};
        
        this.writeToServer(JSON.stringify(msg));
    }
});

_extend(RenderSocketMgr,{
    /**
     *  创建连接对像,并触发connection事件．然后模拟echo事件.
     */
    createSocket:function(args){
        var socket = new RenderSocket(args);
        
        /*
         * 这里不使用nextTick触发connection事件,
         * 
         * 是为了防止还未挂载conn的onData事件就有数据定入.
         * 
         * 所以这里直接使用一个同步返回.
         */
        RenderSocketMgr.emit('connection',socket);
        
        return socket;
    },
});

module.exports = RenderSocketMgr;