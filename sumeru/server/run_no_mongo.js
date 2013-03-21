var fw = fw || {};
fw = require('../sumeru/pkg.js')(fw);
//var Model = require('../sumeru/model.js')(fw);
//var Collection = require('../sumeru/collection.js')(fw);
//var DAL = require('../sumeru/dal.js');


/**
 * mock for mongodb collection
 */
var randomGen;
(function(){
	var _private = fw._private || {};
	
	var __randomMap = {};
	randomGen = function(len) {
        len = len || 10;
        
        var chars = "qwertyuiopasdfghjklzxcvbnm1234567890",
            charsLen = chars.length,
            len2 = len,
            rand = "";
            
        while (len2--) {
            rand += chars.charAt(Math.floor(Math.random() * charsLen));
        }
        
        if (__randomMap[rand]) {
            return random(len);
        }
        
        __randomMap[rand] = 1;
        return rand;
    };
	
})();

var MockCollection = function(){
	this.modelsContainer = [];
};

MockCollection.prototype = {
	find : function(whereMap){
		var rs = [],
			_whereMap = {};
		
		if(typeof whereMap == 'undefined'){
			
		} else if(arguments.length == 2){ //如果传入了两个参数，则为key, val
			_whereMap[arguments[0]] = arguments[1];
		} else if(Object.prototype.toString.call(whereMap) == '[object Object]'){ //否则就是包含多个key value的object
			_whereMap = whereMap;
		}
		
		var val,
			item,
			valStr,
			isQualify;
		
		
			
		for(var i = 0, l = this.modelsContainer.length; i < l; i++){
			item = this.modelsContainer[i];
			
			
			isQualify = true;
			
			for (var field in _whereMap){
	
				val = new RegExp(_whereMap[field]);
			
				valStr = item[field] + '';
				if(!valStr.match(val)){
					isQualify = false;
					break;
				}
			}
			
			if(isQualify == true){
				rs.push(item);
			}
		}
		
		return rs;
	},
	
	save : function(toSave){
		var data = JSON.parse(JSON.stringify(toSave));
		
		data._id = randomGen(10);
		
		this.modelsContainer.push(data);
	},
	
	remove : function(where){
		var rs = this.find.apply(this, arguments);
		
		for (var i = 0, l = rs.length; i < l; i++){
			for (var j = 0, k = this.modelsContainer.length; j < k; j++){
				if(rs[i] == this.modelsContainer[j]){
					this.modelsContainer.splice(j, 1);
					j--;
					k--;
					continue;
				}
			}
		}
	},
	
	update : function(where, data){
		var rs = this.find(where),
			toSave = JSON.parse(JSON.stringify(data));
		console.log(rs, toSave);
		for (var i = 0, l = rs.length; i < l; i++){
			for(var key in toSave['$set']){
				if(key == '_id') continue;
				rs[i][key] = toSave['$set'][key];
			}
		}
	}
	
};




//var mongodb = require('mongodb');
//var ObjectId = mongodb.ObjectID;
//var server = new mongodb.Server("127.0.0.1", 27017, {});
//var db = new mongodb.Db('test', server, {});
var messageSend;

var SocketMgr = {};



/**
 * SubscribeMgr = {
 * 	 @modelname	:	[
 * 		{
 * 			socketId	:	xxx,
 * 			pubname		:	xxx,
 * 			args		:	[arg1, arg2...]
 * 		}
 * 		...
 *	 ]
 * }
 */
var SubscribeMgr = {};

var PublishContainer = {};

/*db.open(function(err, db){
	runStub(db);
});*/


var runStub = function(db){

	//startup a server
	var PORT = 2012;
	
	var http = require("http"), 
		path = require('path'),
		fs = require('fs'),
		sockjs = require("sockjs");
	
	//start file server
	var fileServer = http.createServer(function(req, res){
		var localBase = '..',
			filePath = req.url;
		
		
		if(filePath == './'){
			filePath = localBase + '/index.html';
		} else {
			filePath = localBase + filePath;
		}
		//把问号后面去掉
		if(filePath.indexOf('?') != -1){
			filePath = filePath.split('?')[0];
		}
		console.log('file server accessing ' + filePath);
		
		var extensionName = path.extname(filePath),
			contentType = 'text/html';
			extMap = {
				'.js' : 'text/javascript',
				'.css' : 'text/css',
				'json' : 'text/json'
			};
		
		if(extMap[extensionName]){
			contentType = extMap[extensionName];
		}
		
		path.exists(filePath, function(exists){
			if(exists){
				fs.readFile(filePath, function(error, content){
					if(error){
						res.writeHead(500);
						res.end();
					} else {
						res.writeHead(200, {'Content-Type' : contentType});
						res.end(content, 'utf-8');
					}
				});
			} else {
				res.writeHead(404);
				res.end();
			}
		});
		
		
	});
	
	var FILE_PORT = 80;
	fileServer.listen(FILE_PORT, function(){
		console.log('File Server Listening on ' + FILE_PORT);
	});
	
	
	//start websocket server
	var globalServer = http.createServer(function(req, res){
	}).listen(PORT, function(){
		console.log('Server Listening on ' + PORT);
	});
	
	
	//start websocket server
	var sock = sockjs.createServer();
	sock.installHandlers(globalServer, {
		prefix: '/socket'
	});
	sock.on("connection", function(conn){
		
		
		conn.on("data", function(msg){
			//FIXME 做跨域连接检测和授权检查
			serverMessageDispatcher(conn, msg);
		});
		
		conn.on("close", function(){
			delete SocketMgr[conn._sumeru_socket_id];
			//FIXME 遍历SubscribeMgr 删掉对应的sub
		});
	});
	
	/**
	 * 使用socket发送数据
	 * @param {Object} socketId
	 * @param {Object} type
	 * @param {Object} data
	 */
	messageSend = function(socketId, type, data){
		var socket = SocketMgr[socketId];
		if (!socket) {
			return true;
		};
		
		
		var strdata = JSON.stringify({
			type: type,
			content: data
		});
		socket.write(strdata);
		
	};
	
	var collection = new MockCollection();
	
	fw.publish = function(modelName, pubName, pubFunc){
		
		//create a collection on server
		//var collection = new mongodb.Collection(db, modelName);
		
		
		pubFunc = pubFunc || function(callback){
				/*return collection.find({}).toArray(function(err, items){
					callback(items);
				});*/
				var rs = collection.find({});
			    return callback(rs);
				
			};
		
		PublishContainer[pubName] = {
			modelName	:	modelName,
			collection	:	collection,
			handle		:	function(args, callback){
				
				var _args = args;
				
				_args.push(callback);
				
				//如果subscribe时传递的参数和pubFunc本身接受的参数数量不一致，则忽略多余的参数，但要保证callback作为最后一位正确传递。
				if(_args.length != pubFunc.length){
					_args.splice(Math.max(0, pubFunc.length - 1));	
					_args.push(callback);
				}
				
				pubFunc.apply(collection, _args);
			}
		};
		
		
	};
};


/**
 * 接收到消息后的分发处理
 * have access to db
 * @param {Object} socket
 * @param {Object} data
 */
var serverMessageDispatcher = function(socket, strrdata){
	try {
		data = JSON.parse(strrdata);
	} 
	catch (e) {
		//直接丢弃
		console.error('error@msgDispatcher ' + data);
		return;
	}
	
	if (!data.type) {
		return;
	}
	
	var socketId = socket._sumeru_socket_id || 0;
	
	console.log("retrieving " + strrdata);
			
	
	if (data.type == 'echo') { //注册请求
		var socketId = data.content.socketId;
		SocketMgr[socketId] = socket;
		socket._sumeru_socket_id = socketId;
		
		//暂时现先在这里run起来server.js
		require('../controller/real-time/server/server.js')(fw);
		
		return;
	}
	
	/**
	 * type	:	subscript
	 * content : {
	 * 		name	:	pubname,
	 * 		args	:	[arg1, arg2, arg3]
	 * }
	 *
	 */
	if (data.type == 'subscribe') { //订阅请求
		var pubname = data.content.name;
		
		if (!PublishContainer[pubname]) {
			return;
		}
		
		var args = data.content.args || [], 
			modelName = PublishContainer[pubname].modelName;
		
		
		//FIXME 需要过滤modelName的值，使其符合object的key的要求
		if (!SubscribeMgr[modelName]) {
			SubscribeMgr[modelName] = [];
		}
		//这里传过来的args应该是从第二位开始的具体参数（第一位是pub的名字本身）
		SubscribeMgr[modelName].push({
			socketId: socketId,
			pubname: pubname,
			args: args
		});
		
		//fetch the publish record on server
		var pubRecord = PublishContainer[pubname];
		
		var collection = pubRecord.collection,
			pubFunc = pubRecord.handle,
			
			onComplete = function(dataArray){
				
				//start to write_data to client
				messageSend(socketId, 'data_write_from_server', {
					pubname: pubname,
					data: dataArray
				});
			};

		//run publish function with args and callback
		pubFunc.call(collection, args, onComplete);
		
		return;
	}
	
	/**
	 * type	：	data_write
	 * content	:	{
	 * 		rs	:	[],
	 * 		where	:	[],
	 * 		pubname	:	pubname
	 * }
	 */
	if (data.type == 'data_write_from_client') { //写数据
		var pubname = data.content.pubname;
		
		if (!PublishContainer[pubname]) {
			console.log('error finding a pub record', pubname);
			return;
		}
		
		var pubRecord = PublishContainer[pubname];
		
		var struct = data.content.data,
			structData = struct.cnt;
		
		if(struct.type == 'insert'){
			var cid = delete structData.__clientId;
			delete structData.__clientId;	
			delete structData._id;
			pubRecord.collection.save(structData);
		} else if (struct.type == 'delete'){
			pubRecord.collection.remove({
				_id	: structData._id
			});
		} else if (struct.type == 'update'){
			var _id = structData._id;
			delete structData._id;
			
			pubRecord.collection.update({
				_id	: _id
			}, {
				$set : structData
			});
		}
				
		//写入数据
		//FIXME 判断数组，逐行写入
		/*if(!data.content.data._id){
			delete data.content.data._id;
		}*/
		try {
			
		} 
		catch (e) {
		
		}
		
		//find all subscriber
		//FIXME 这里需要考虑model嵌套的问题
		var subscribers = SubscribeMgr[pubRecord.modelName];
		
		subscribers.forEach(function(item){
			//do not skip current subscriber
			//write back to make sure the consistence.
			var pubname = item.pubname, 
				pubRecord = PublishContainer[pubname],
				collection = pubRecord.collection,
				pubFunc = pubRecord.handle;
			
			pubFunc.call(collection, item.args, function(dataArray){
				//推送回去
				messageSend(item.socketId, 'data_write_from_server', {
					pubname: pubname,
					data: dataArray,
					flag	:	'live_data'
				});	
			});
			
			
			
			
		});
		
		return;
	}
};


runStub();
/*
var readModel = function(){
	//读取所有的model定义，实例化，给所有model增加publish方法
	
};*/
/*
var model = function(){};
//考虑一下一个server对应所有app的情况怎么处理呢
//参数形式name, handle
//-- 对arguments有操作的方法不写形参，否则node中会覆盖原有arguments的值,chrome也一样
model.prototype.publish = function(){
	var name = arguments[0],
		handle = arguments[arguments.length - 1],
		self = this,
		defaultHandle = function(){return self.getData()};
	
	if(handle == name){ //即没写handle
		handle = defaultHandle;
	}
	
	PublishContainer[name] = {
		modelName	:	self.name,
		handle		:	function(args){
			handle.apply(self, args);
		}
	};
};*/
