/**
 * 集群通信
 * 
 * 负责将server在DB中注册，用于server间的消息通知。
 * 在数据库中，存储以下结构的数据
 * 
 * Server : {
 *      s_id:''
 *      serverPort : [                   
 *          {
 *              addr:'192.168.0.110',       // server 的ip地址
 *              port:8080                   // 接受通知的socket端口
 *          },
 *          {
 *              addr:'172.21.236.110',
 *              port:8088
 *          },
 *      ],
 *      online : "",                        // 上线时间, 时间戳 Date.now()
 * }
 * 
 * 服务每次启动时，向db中注册自己的网络接口信息，在db中注册结点时，
 * 会先删除自己上一次的注册信息，并在db中查询使用自己ip位置的其它冗余记录，一并将其删除，然后再插入当前的新信息。
 * 并向netMessage中创建S2SMessage的输出方法,使netMessage支持S2S的消息发送，
 * 其它位置需要向集群中的其它结点发送消息时，使用netMessage.sendS2SMessage(msg,onerror,onsuccess)。
 * 在向其它结点发送信息时，将从db中查询当前注册的所有结点，并逐一向每个server发送消息.
 * 
 */
var net = require('net');
var os = require('os');
var fs = require('fs');

var collectionName = 'SMR_SERVER_GROUP';
var Unique_Key = process.env.IP_ADDRESS && process.env.APP_PORT ? process.env.IP_ADDRESS + ":" + process.env.APP_PORT : undefined;
var defaultCharset = 'utf8';
var listenPort = 8089;

var runnable = function(fw, getDbCollectionHandler,ObjectId) {
    
    fw.netMessage || require(__dirname  + '/../sumeru/netMessage.js')(fw);
    
    var netMessage = fw.netMessage;
    /**
     * 如果unique_key没有值，表明当前不是bae环境，evn中没有任何可依赖的值，进行从文件取职的操作
     */
    var lastUK = null;
    var tmpDir = __dirname + '/tmp';
    var fGroupInfo = tmpDir + '/groupInfo._info';
    var HOST_NAME = os.hostname();
    var fscontent = '';
    if(Unique_Key == undefined){
        if(!fs.existsSync(tmpDir)){
            fs.mkdirSync(tmpDir);
        }
        
        if(fs.existsSync(fGroupInfo)){
            fscontent = fs.readFileSync(fGroupInfo,defaultCharset);
            // 确认是已本机的hostName开头，保证当前server未在server间copy迁移过，防止误删
            if(fscontent.indexOf(HOST_NAME)===0){
                lastUK = fscontent.split("1")[1];
            }
        }
        
        Unique_Key = ObjectId();
        fs.writeFileSync(fGroupInfo, HOST_NAME + ":" + Unique_Key, defaultCharset);
    }else{
        lastUK = Unique_Key;
    }
    
    // 记录当前所在的server，派发消息时，用于跳过自身.
    var __current = Unique_Key;
    var registered = false;
    
    

    
    //================================================
    
    var server = net.createServer();
    
    server.on('connection',function(conn){
        // 默认编码utf8,以文本方式传输内容
        conn.setEncoding(defaultCharset);
        
        conn.on('data',function(data){
            fw.dev('retrieving S2S : ' + data);
            netMessage.onData(data,conn);
        });
        
        // 1秒超时
        conn.setTimeout(1000,function(){
            fw.dev('s2s connection timeout. Disconnected');
            conn.end();
        });
    });

    server.on('error',function(){
        fw.log('S2S Err:' + arguments);
    });

    server.on('close',function(){
        fw.log('S2S Disconnected:' + arguments);
    });

    server.listen(listenPort,function(){
        fw.log('S2S listen on port 8089');
    });
    
    process.on('exit',function(){
        unregister(__current);
        fw.log('server shutdown..');
    });
    
    //================================================
    
    var __connMsgTo = function(port,msg,onerror,onsuccess){
        var client = net.createConnection({host:port.addr,port:port.port});
        var writed = false;
        client.setEncoding(defaultCharset);
        
        client.setTimeout(1000,function(){
            fw.log('connection timeout.' , port);
            // 如果到超时为止,消息未发送,则认为发送失败.
            if(!writed){
                onerror && onerror();
            }
            client.destroy();
        });
        
        client.on('error',function(){
            fw.log(arguments);
            onerror && onerror();
        });

        client.on('connect',function(){
            client.write(msg);
            client.destroy();
            onsuccess && onsuccess();
            writed = true;              // 标记消息发送成功
        });

        client.on('data',function(msg){
            fw.dev(msg);
        });
    };
    
    var connectionTo = function(connInfo, msg, onerr, onsuccess){
        var err = null, success = null;
        var sps = connInfo.serverPort;
        var i = 0;
        
        err = function(){
            var sp = sps[++i];
            if(sp){
                __connMsgTo(sp, msg, err, success);
            }else{
                fw.log('group manager all failed. ' + JSON.stringify(sps));
                onerr && onerr();
                /*
                 * FIXME
                 * 
                 * 此处似乎应该有一个完善的重试的机制和网络验证机制用于区分自身网络故障或目标网络故障，
                 * ====
                 * 否则如果是目标结果网络闪断一次消息无法发出，会出现结点仍在运行但直到该结点重启否则再也不会接受到通知的情况出现。
                 * ====
                 * 最坏情况，如果当前结点网络断开，但对DB的连接仍可用的情况，可能会出现清空整个集群信息的情况而破坏整个集群的通信，导至重启整个集群。
                 * 
                 * 所以此处暂时先不清理集群信息.
                 */
                // unregister(connInfo.s_id);
            }
        };
        
        success = function(){
            onsuccess && onsuccess();
        };
        
        if(sps[i]){
            __connMsgTo(sps[i],msg,err,success);
        }
    };
    
    /**
     * 注册一个server结点.
     * 
     * serNam 
     *      为当前server的名称.　在数据库中，应是唯一的。
     * 
     * serverPorts　
     *      为当前server监听server间消息的网络接口
     *      
     *      当传入数组中只有一个addr值为0.0.0.0，认为是server不明确知道自身的ip地址，
     *      只监听当前server中所有ip地址的port地址，即 listen{0.0.0.0:8080}， 
     *      方法自动从当前系统中读取所有非本地的ip地址进行记录。
     *      
     *      当传入数据长度大于1时，认为server明确知道自身的IP地址，此时限制每一项中的addr值不能为0.0.0.0
     *      
     *      任意情况下，port值必须为大于0的整数
     * 
     * register([{addr:'192.168.0.110',port:8080},{addr:172.16.236.110:80}]);
     * 
     * @param serverPorts [{servePorts}] 当前Server运行的端口
     * 
     */
    var register = function(sps){
        
        if(registered || !Array.isArray(sps)){
            fw.log('register failed : invalid arguments or repeating record');
            return;
        }
        
        var len = sps.length, sp = null;
        var save = {
                Unique_Key : Unique_Key,
                serverPort:[],
                online:Date.now(),
                status:{}
            };
        
        if(len === 0){
            throw 'ERR: sps.length == 0';
        }
        
        if(len === 1){
            sp = sps[0];
            
            if(sp.port <= 0){
                throw 'ERR: port <= 0';
            }
            
            if(sp.addr === '0.0.0.0'){
                // 读取本机网卡信息
                var nifs = os.networkInterfaces();
                for(var key in nifs){
                    nifs[key].forEach(function(item){
                        // 只记录非internal的IPV4地址.
                        if(!item.internal && item.family === "IPv4"){
                            save.serverPort.push({
                                addr:item.address,
                                port:sp.port
                            });
                        }
                    });
                }
            }
        }else{
            sps.forEach(function(item){
                if(item.port <= 0){
                    throw 'ERR: port <= 0';
                }
                
                if(item.addr === '0.0.0.0'){
                    throw 'addr can not be [0.0.0.0]';
                }
                
                save.serverPort.push({
                    addr : item.addr,
                    port : item.port
                });
                
            });
        }
        
        /*
         * 在db中去重，去重后，插入新的记录.
         * 
         * 去重规则:
         * 1.删去指向同一个server的其它记录.
         *   db中所记录的所有记录的serverPort中，如果存在任意ip与port相同，即认为指相同一server.
         * 2.删除当前server上次的记录,无论是否相同
         *   查询tmp目录下的groupInfo._info,删除其中记录的id,
         *   为防止在不同server间复制文件所以删除时先验证是否groupInfo中的hostName是当前server名称,如果不是,则不删除该项.
         *   
         */ 
        getDbCollectionHandler(collectionName,function(err,collection){
            var removeItems = [];
            save.serverPort.forEach(function(item){
                removeItems.push({serverPort:{addr:item.addr,port:item.port}});
            });
            
            // 如果存在lastUK,证明上次启动时在DB中存在记录,需要删除
            if(lastUK){
                removeItems.push({Unique_Key:lastUK});
            }

            collection.remove({"$or":removeItems},function(){
                // 去重后，将新值插入数据库
                collection.save(save,function(){
                    fw.log("\n==========\nServer Port : ");
                    fw.log(save);
                    fw.log("Server Port END\n==========\n");
                });
            });
            
        });
    };
    
    /**
     * 将目标server离线，从数据库删除记录。
     */
    var unregister = function(id){
        getDbCollectionHandler(collectionName,function(err,collection){
            collection.remove({Unique_Key:id},function(err,collection){
                fw.dev('unregister : ' + id);
            });
        });
    };
    
    /**
     * 外发消息至其它server结点的实际发送方法，
     * 
     * FIXME
     * 现在只实现了轮训式广播，未实现组播和单播，即target参数无用.
     */
    netMessage.setOutputToServer(function(msg/* , target */, onerror, onsuccess){
        fw.dev("server to server : " + msg);
        getDbCollectionHandler(collectionName,function(err,collection){
            collection.find({},{}).toArray(function(err,results){
                if(err){
                    throw err;
                }
                results.forEach(function(item){
                    // 跳过自己
                    if(item.Unique_Key.toString() !== __current.toString()){
                        connectionTo(item, msg,onerror,onsuccess);
                    }
                });
            });
        });
    });
    
    
    return {
        register : register,
        unregister : unregister,
        getServerId : function(){
            return __current;
        }
    };
};

module.exports = runnable;