/**
 * 对传入及传出的网络消息进行包装及派发
 * 
 * 消息从发送端到接收端的顺序为
 * [原始消息] -> [messageWrapper打包方法] -> [发送至目的端(websocket???)] -> [messageWrapper拆包] -> [根据number调用派发回调]
 * 
 * 消息格式为
 * 
 * msgStr = {
 *     number:xxx,
 *     type:"json|simple",
 *     target:'',
 *     content:{
 *         
 *     }
 * }
 * 
 * default number : handleName  
 *            "0" : "onLocalMessage",         // 随便什么鬼地方去接收，但不从网络进行派发,当前由于client端存在这种使用情况.所以在此预留
 *          "100" : "onError",                // 两侧通用为处理错误消息
 *          "200" : "onMessage",              // 两侧能用为处理数据消息
 *          "300" : "onGlobalError",          // to client only, 两端都存在，但只有client端目前存在使用场景
 *          "400" : "onGlobalMessage",        // to client only, 两端都存在，但只有client端目前存在使用场景
 *          "500" : "onLogMessage",           // one-way , client to server, 记录日志,开发时向server发送log. 线上可以不接收
 *          "600" : "onS2SMessage"
 * 
 * 以上为默认处理，如需扩展，使用setACL(number , handleName) 进行添加,
 * 未在列表中记录的codenumber将被默认丢弃,记录但未找到处理handle的，将触发一个错误.
 * 
 * 如果handleName指明的处理方法明确返回false将被认为消息未被派送成功. 
 *      如果当前运行环境在client端，将会尝试将消息发往onGlobalxxxx进行处理，如果再无法处理，则丢弃消息
 * 
 * type :
 *       json    类型将被当做json字符串被解析并传入
 *       simple  认为只是一个简单的值，首次被解析的类型即被传出，
 *               由于端与端之间的传输格式均为json，所以首次被解析出的值，可以是任何数据类型,但被限制为number,boolean,string等.
 *
 * target : 
 *       用于缩短派发路径的分类标识,收到消息时，对消息中携带的标签进行比对，并派发送至匹配的接收者.
 * 
 * content : 根据type变化，可能是不同内容，当type为json时，为字符串值，simple为简单值
 * 
 */

var runnable = function(fw){
    
    /**
     * 如果存在当前包空间，则直接跳出，防止重复创建对像
     */
    if(fw.netMessage){
        //fw.dev('netMessage already existed.');
        return;
    }
    
    var msgWrapper = fw.addSubPackage('netMessage');
    
    var Default_Message_ACL = {
              "0" : "onLocalMessage",
            "100" : "onError",
            "200" : "onMessage",
            "300" : "onGlobalError",            // to client only
            "400" : "onGlobalMessage",          // to client only
            "500" : "onLogMessage"              // one-way , client to server
            //"600" : "onS2SMessage"            // server only, auto add on , when isServer === true
    };
    var arrSplice = Array.prototype.splice;
    var isServer = fw.IS_SUMERU_SERVER;
    var currentACL = Object.create(Default_Message_ACL);
    var receiver = null;
    var output = null;
    var inited_OutHandle = false;
    
    var outputToServer = null;
    
	var inFilter = [] , inFilterRun = [];
    var outFilter = [] , outFilterRun = [];
    
    var filterToArray = function(filterArr){
      var rv = [];
      filterArr.forEach(function(item){
          rv.push(item.filter);
      });
      return rv;
    };
    
    /**
     * 从消息串还原为messageData并进行验证
     */
    var decodeMessage = function(msgStr){
        var message =null
            // 解密并还原json对像
            message = fw.utils.parseJSON(msgStr);
        // 如有结构丢失，则返回false
        if(message.number === undefined || message.type === undefined || message.content === undefined){
            return false;
        }
        return message;
    };
    msgWrapper.__reg('decodeMessage',decodeMessage);
    /**
     * 创建一个消息对像
     * number 消息类型的编码
     * data 消息内容
     */
    var encodeMessage = function(data,number,target){
        
        var message = {number:(number + ""), type:null, target: (target + ""), content:null};
        
        // 自动识别type
        if(fw.utils.isSimpleType(data)){
            message.type = 'simple';
            message.content = data;
        }else{
            message.type = 'json';
            message.content = (number !== '0' ? JSON.stringify(data) : data);
        }
        return message;
    };
    msgWrapper.__reg('encodeMessage',encodeMessage);
    /**
     * 输出消息
     */
    var send = function(msg){
        var __out = null;
        
        if(msg.number === "0" ){                         // 本地派发
            return dispatch(msg);
        }
        
        if(isServer === true && msg.number === "600"){  // server to server
            __out = outputToServer;
        }else{
            __out = output;
        }
        
        // 如果不是本地派发，并且没有派送方法直接抛出异常
        if(__out === null){
            throw 'no output';
        }
        
        // 序列化msg对像为json字符串并进行加密
        Array.prototype.splice.call(arguments,0,1, JSON.stringify(msg));
        
        //始终携带发送消息时的参数
        return __out.apply({},arguments);
    };
    
    /**
     * 创建外发方法的代理方法
     *  
     *  访法返回的代理方法，用于向外发送消息。携带参数为
     *      data     :   外发的数据对像。
     *      target   :   对方的接收目标。
     *      ....     :   可选的用于实际send方法(setOutput时设置的方法)的控制参数。
     *      onerror  :   当发送失败时的通知方法，该方法可由实际的send方法或过滤器触发。
     *      onSuccess:   当发送成功时的通知方法，该方法由实际send方法触发。
     *  @param number 代理消息的类型
     *  @returns {function} 创建的可执行方法
     */
    var createHandle = function(number){
        return function(data,target/*,.....,onError,onSuccess*/){
            var msg = encodeMessage(data,number,target);
            
            //取出传出方法的调用参数
            var params = arrSplice.call(arguments,0);
            
            // 过滤器停止过滤时，执行的错误通知方法
            var _onerror = params[params.length -2];
            
            if(outFilterRun.length !== 0){
                // 过滤chain
                var run = fw.utils.chain(outFilterRun,function(msg){
                    //替换消息对像,并删除target参数，然后传入send方法
                    params.splice(0,2,msg);
                    //始终携带发送消息时的参数,从用户调用sendXXXX方法至output应该是透明的，所有参数必须原样携带过去,仅对消息内容进行封装
                    send.apply({},params);
                });
                // 过滤器只需要传入msg对像及一个派发失败的方法，过滤器所接收的onsuccess方法，为chain自动传入。
                run(msg, _onerror instanceof Function ? _onerror : function(){});
            }else{
                //替换消息对像,并删除target参数，然后传入send方法
                params.splice(0,2,msg);
                //始终携带发送消息时的参数,从用户调用sendXXXX方法至output应该是透明的，所有参数必须原样携带过去,仅对消息内容进行封装
                send.apply({},params);
            }
            
//            var item;
//            for(var index in outFilter){
//                try{
//                    item = outFilter[index];
//                    msg = item.filter(msg);
//                }catch(e){
//                    // 明确抛出die，则停止消息传输及派发
//                    if(e == 'die'){ 
//                        return false;
//                    }
//                }
//            }
            
//            //替换消息对像,并删除target参数，然后传入send方法
//            Array.prototype.splice.call(arguments,0,2,msg);
//            
//            //始终携带发送消息时的参数,从用户调用sendXXXX方法至output应该是透明的，所有参数必须原样携带过去,仅对消息内容进行封装
//            return send.apply({},arguments);
        };
    };
    
    /**
     * 创建消息派发方法
     */
    var makeOutHandle = function(){
        var handleName;
        for(var number in currentACL){
            handleName = currentACL[number];
            handleName = 'send' + handleName.substr(2);
            msgWrapper.__reg(handleName,createHandle(number));
        }
        inited_OutHandle = true;
    };
    
    var shortFilter = function(a,b){
        return a.order < b.order;
    };
    
    
    /**
     * 传入过滤器，
     * 
     * 与传出过滤器不同的是，由于传入消息的发起者不在同一端上，所以不需要onerror对像通知调用者，对于失败的消息，不执行onsuccess即可停止派发过程.
     * 
     * @param fun {function(msg,onsuccess){}}  
     *          方法增加至消息接收时执行的过滤器链上，过滤器接收二个参数 
     *              msg        为传出消息
     *              onsuccess  当前过滤器处理成功，可以执行下一个过滤器时，执行该方法;
     * @order {number} 指定过滤器执行的优先级别，数字越大越优先执行默认将放在最后
     */
    msgWrapper.__reg("addInFilter",function(fun,order){
        
        // FIXME 为兼容之前同步过滤的写法，这里在对只接受一个参数的过滤器，做一层代理方法。自动调用回调,
        // 如果最终统一使用异步写法，此处的处理可以省略。
        var filter = fun.length == 2 ? function(msg,conn,onsuccess){
            var rv = null;
            try{
                rv = fun(msg,conn);
            }catch(e){
                fw.log(e);
                return ;
            }
            onsuccess(rv,conn);
        } :  fun;
        
        inFilter.push({'filter':filter,'order':order === undefined ? Number.MIN_VALUE : order});
        inFilter.sort(shortFilter);
        inFilterRun = filterToArray(inFilter);
    },false);
    
    
    /**
     * 传出过滤器，
     * 
     * @param fun {function(msg,onerror,onsuccess){}}  
     *          方法增加至消息发送时执行的过滤器链上，过滤器接收三个参数 
     *              msg 为传出消息
     *              onerror    过滤器处理失败时通知方法，实际执行对像为调用sendXXXXX时的onerror方法.
     *              onsuccess  当前过滤器处理成功，可以执行下一个过滤器时，执行该方法;
     * @order {number} 指定过滤器执行的优先级别，数字越大越优先执行默认将放在最后
     *  
     */
    msgWrapper.__reg("addOutFilter",function(fun,order){
        
        // FIXME 为兼容之前同步过滤的写法，这里在对只接受一个参数的过滤器，做一层代理方法。自动调用回调;
        // 如果最终统一使用异步写法，此处的处理可以省略。
        var filter = fun.length == 1 ? function(msg,onerror,onsuccess){
            var rv = null;
            try{
                rv = fun(msg);
            }catch(e){
                onerror(e);
            }
            onsuccess(rv,onerror);
        } : fun;
        
        outFilter.push({'filter':filter,'order':order === undefined ? Number.MIN_VALUE : order});
        outFilter.sort(shortFilter);
        outFilterRun = filterToArray(outFilter);
    },false);
    
    /**
     * 接收数据并派发
     * @param msgStr 数据内容
     * @param conn 连接对像, 运行于server端时会使用这个参数携带连接实例
     */
    // var onData = 
    msgWrapper.__reg("onData",function(msgStr,conn){
        var message = null;
        try{
            message = decodeMessage(msgStr);
        }catch(e){
            // 不能解析的字符串,认为是server直接传回的非格式化内容.向外抛出;
            throw "Server : " + msgStr;
        }

        if(isServer && fw.SUMERU_APP_FW_DEBUG === false){
            try {
                dispatch(message, conn);
            } catch (e) {
                // TODO: handle exception
                console.error(e);
            }
        }else{
            dispatch(message, conn);
        }
    },false);
    
    // var setACL = 
    msgWrapper.__reg("addACL",function(number,handleName){
        var __name = handleName;
        
        if(handleName.indexOf("on") !== 0){
            __name = "on" + handleName.substr(0,1).toUpperCase() + handleName.substr(1);
        }
        
        // 防止默认ACL被覆盖
        if(Default_Message_ACL[number] === undefined){
            currentACL[number] = __name;
            makeOutHandle();
        }
    },false);
    
  
    /**
     * 设置发送消息出口
     */
    //var setOutput = 
    msgWrapper.__reg("setOutput",function(__output){
        if(__output instanceof Function){
            output = __output;
        }else{
            throw "__output is not a function.";
        }
    },false);
    
    /**
     * 如果运行在server端，补充600的消息号，并添加 setOutputToServer的方法用于设置服务端互送消息的方法
     */
    if(isServer){
        Default_Message_ACL["600"] = "onS2SMessage";             // server only
        msgWrapper.__reg('setOutputToServer',function(__output){
            if(__output instanceof Function){
                outputToServer = __output;
            }else{
                throw "__output is not a function.";
            }
        });
    }
    
    /**
     * 设置接收消息的出口
     */
    //var setReceiver = 
    msgWrapper.__reg('setReceiver',function(__receiver){
        receiver = receiver || {};
        
        /*
         * 此处只接受在于currentACL中存在的number所对应的handle,其它项，统统忽略
         */
        // merge and overwrite
        var handleName , target , handle , receiverItem , insert, overwrite = false;
        for ( var number in currentACL) {
            handleName = currentACL[number];
            insert = __receiver[handleName];
            
            if(insert === undefined){
                continue;
            }else if(insert  instanceof Function){
                // 默认 
                target = '';
                handle = insert;
            }else{
                // 如果不指定target，默认为 ''
                target = insert.target || '';
                
                // FIXME !!!! 此处有小坑
                // 如果不明确指定overwrite为true，则默认应为不覆盖之前的值，但是为了兼容之前的写法，又应当默认为true．
                overwrite = !!insert.overwrite; //insert.overwrite === undefined ? true : !!insert.overwrite;
                
                if(! (handle = insert.handle) instanceof Function){
                    continue;
                }
                
                handle.once = !!insert.once;
            }

            /*
             * 一个handleName，对应一组标签 ，一个标签对应一个处理函数，
             * 如果存在标签为'' 的，则认为是默认的处理函数，将自动接收目标为当前handleName,但找不到匹配target的所有消息.
             */
            receiverItem = receiver[handleName] = receiver[handleName] || {};
            
            /*
             * FIXME: 此处不处理handle重复的情况,只是按顺序推入数组
             */
            //debugger;
            if(Array.isArray(target)){
                target.forEach(function(item){
                    
                    if(overwrite === true || !this[item]){
                        // 指明需要复盖之前的handle时,直接替换
                        this[item] = [handle];
                    }else if(Array.isArray(this[item]) === true){
                        this[item].push(handle);
                    }
                },receiverItem);
            }else{
                if(overwrite === true || !receiverItem[target]){
                    // 指明需要复盖之前的handle时,直接替换
                    receiverItem[target] = [handle];
                }else if(Array.isArray(receiverItem[target]) === true){
                    receiverItem[target].push(handle);
                }
            }
        }
        
        Object.keys(currentACL).forEach(function(item){
            if(this[currentACL[item]] instanceof Function){
                receiver[currentACL[item]] = this[currentACL[item]];
            }
        },__receiver);
        
        // 只在没有handle的时候执行,如果已创建则不在创建.
        // 这个判断不放在make out handle的时候是因为addAcl的时候要无条件执行makeOutHandle
        if(inited_OutHandle == false){
            makeOutHandle();
        }
    },false);
    
    /**
     * 派发消息
     * @param data {obj} 派发的消息
     * @returns {boolean} true派发成功 , false派发失败
     */
    var dispatch = function(data,conn){
        var handleName = null , handle = null;
        var rs = false , content = null;
        
        if(receiver === null){
            throw 'no receiver';                                        // 当为null时，说明一次setReceiver都没有执行过，当前状态没有任何派发能力
        }
        
        if(data.number === undefined){
            return false;                                               // 结构丢失，直接抛弃; 
        }
        
        if((handleName = currentACL[data.number]) === undefined){
            fw.log("unidentifiable message number");               // 无有效派发方法，直接返回false表示失败;
            return false;                                               // 未指定派发方法名称，直接返回false表示失败
        }else if(receiver[handleName] === undefined){
            fw.log("no receiver found");                          // 无有效派发方法，直接返回false表示失败;
            return false;
        }
        
        handle = receiver[handleName][data.target || ""];
        
        // 如果未找到指定标签的派发获到默认派发
        if(handle === undefined && data.target !== ""){
            
            handle = receiver[handleName][""];
            
            // 如果没有连默认派发，只能认为派发失败
            if(handle === undefined){
                return false;
            }
        }
        
        var oncomplete = function(){
            if(data.type == 'json' && data.number !== "0"){
                content = fw.utils.parseJSON(data.content);
            }else{
                content = data.content;
            }
            
            var onceArr = [];   // 执行一次即需要被清除的
            
            handle.forEach(function(fun,index){
                /*
                 * 派发数据,
                 * 防止一个处理错误的时候相同数据被反复派发,这里目前判断失败的方法是全部处理都反回false的情况才认为是失败.
                 */
                if(fun instanceof Function){
                    rs = rs || fun(content,data.target,conn);
                }
                
                if(fun.once){
                    onceArr.push(index);
                }
            });
            //debugger;
            if(onceArr.length > 0){
                // 如果两个长度相同,则直接清理当前的所有标签,否则需要清理数组
                if(onceArr.length == handle.length){
                    handle.length = 0;      // 清空数组;
                    delete receiver[handleName][data.target || ""];
                }else{
                    var index = undefined;
                    while((index = onceArr.pop()) !== undefined){
                        handle.splice(index,1);
                    }
                }
            }
            
            
            if(rs === false && data.number == "100"){
                data.number = "300";  
                return dispatch(data,conn);              // 当100派发失败，尝试300派发. 如果再次失败，则丢弃;
            }
            
            if(rs === false && data.number == "200"){
                data.number = "400";  
                return dispatch(data,conn);              // 当200派发失败，尝试400派发. 如果再次失败，则丢弃;
            }
        };
        
        if(inFilterRun.length !== 0){
            var run = fw.utils.chain(inFilterRun,oncomplete);
            run(data,conn);
        }else{
            oncomplete();
        }
        
//        // 过滤chain
//        var item;
//        for(var index in inFilter){
//            try{
//                item = inFilter[index];
//                data = item.filter(data,conn);
//            }catch(e){
//                // 明确抛出die，则停止消息传输及派发
//                if(e == 'die'){ 
//                    return false;
//                }
//            }
//        }
//        
//        
//        return rs;
    };
    
//    if(typeof module !='undefined' && module.exports){
//        module.exports = function(){
//        };
//    }
    
    fw.dev("runing [NetMessage] in " + ( fw.IS_SUMERU_SERVER ? "server" : "client"));
    return msgWrapper;
};


if(typeof module !='undefined' && module.exports){
    module.exports = runnable;
}else{
    runnable(sumeru);
}
