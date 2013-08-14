module.exports=function(fw,getDbCollectionHandler){
    var https;
    var query = require('querystring');
//    var conf = require('./conf.js');
    var events = require('events');
    var pollerArray = [];
    //var finishColEvent = new events.EventEmitter;
    var config = require(__dirname + '/config.json');
    var httpconf = config.HTTP;
    //console.log(httpconf);
    var intervalLock = 0;
    var intervalTimes = -1;//-1 is endless loop
    fw.dbOpData = [];
    /*******************************************DB*************************************/

    
    var getDBData = function (newdata, model, diffFunc){
	var oldData = [];
	
	if (typeof model != 'object')
	{
	    console.log('Model must be object');
	    return;
	}
	
	//db.open(function(){
	for (var i=0; i< model.length; i++){
            var collections = getDbCollectionHandler(model[i].name);
	    var count = 0;
            //closure to save 'i'
            collections.find(model[i].situation).toArray((function(j){
		return function (error, bars){
		    if (error)
			console.log(error);
		    else{
			oldData[j] = {};
			oldData[j].dataName = model[j].name;
			oldData[j].method = null;
			oldData[j].data = bars;
			count += 1;
			if (count >= model.length){
			    setFinishEvent(newdata, oldData, diffFunc);
			    // console.log(oldData);
			    // db.close();
			} 
		    }
		}
            })(i));   
	}
	// });

    }
    /***************************************END DB********************************************/
    /*
      var modeltest = [
      {
      name : 'passport',
      situation : {USERID:'myid'}
      },
      {
      name : 'loginModel',
      situation : ''
      }
      ];
      //console.log(modeltest[0].name);
      getDBData('newdatahere', modeltest, function(oldData,newdata){
      console.log(oldData);
      console.log(newdata);
      });
    */
    fw.getDBData = getDBData;


//after get data from DB, invoke diffFunc and store to DB
    var setFinishEvent = function(newdata, oldData, diffFunc){
	//	finishColEvent.once('collected',function(newdata, oldData, diffFunc){
	
	var lastDBOprFunc = function (result){
	    console.log('--------------------------LAST DB OPERATOR ------------------');
	    //TODO set intervalLock = 1
	    //console.log(result);
	    var dbOprDone = 0;
	    var _callback = function(){
		if (dbOprDone >= result.length-1){
		    fw.callback();
		    intervalLock = 0;
		}
		else
		    dbOprDone++;
	    };
	    if (result.length == 0){
		//暂时不callback，否则会引起一个push
		intervalLock = 0;
	    }

	    for (var i=0; i<result.length; i++){
		var handle = getDbCollectionHandler(result[i].dataName);
		console.log(i+' / ' +result.length);
		if (result[i].method == 'insert' ){
		    console.log('///insert///');
		    handle.insert(result[i].data,function(err,re){
			if (err)
			    console.log(err);

			_callback();
		    });
		    console.log(result[i].data);
		}

		
		if (result[i].method == 'update'){
		    var updateDone = 0;
		    var update_callback = function(){
			if (updateDone >= result[i].data.length)
			    _callback();
			else
			    updateDone++;
		    };

		    for (var j=0; j<result[i].data.length; j++){
			var _data = result[i].data[j];//TODO check all fields
			console.log('///update///');
			console.log(_data);
			//TODO safe validate
			if (_data['options'] == '' || typeof _data['options'] == 'undefined'){
			    handle.update(_data.criteria, _data.data, function(err, re){
				if (err)
				    console.log(err);
				update_callback();
			    });
			}else
			    handle.update(_data.criteria, {'$set' : _data.data},function(err,re){
				if (err)
				    console.log(err);
				update_callback();
			    });
		    }
		    
		}
		if (result[i].method == 'remove'){
		    console.log('///remove///');
		    var _data = result[i].data;
		    console.log(_data);
		    for (var k=0; k<_data.length; k++){
			handle.remove(_data[k],function(err,re){
			    if (err)
				console.log(err);
			    _callback();
			});
		    }
		}
	    }
	}//?lastDBOprFunc

	diffFunc(null,oldData, newdata, lastDBOprFunc);

    }

    var requestHttp = function(requestOption, model, diffFunc){
	var jsonObj;
	var newData;
	var req = https.request(requestOption, function(res){
	    var _data = '';
	    res.on('data', function(chunk){
		_data += chunk;
	    });
	    
	    res.on('end', function(){
		/*console.log('-----data response from internet-----');
		console.log(_data);*/
		try {
		    jsonObj = JSON.parse(_data);
		    newData = jsonObj;
		    newData['statusCode'] = res.statusCode;
		    //newData['headers'] = JSON.parse(res.headers);
		}catch(err){
		    console.log('Error: json parse error');
		    //return;
		}
		
		//TODO CONNECT DB AND diffFunc
		getDBData(newData, model, diffFunc);

	    });
	});
	
	//timeout = 3s, after abort request
	req.setTimeout(3000,function(){
	    console.log('timeout');
	    req.abort();
	});

	req.on('error', function(err){
	    console.log(err);
	});

	req.end();
	//setFinishEvent();

    }


    fw.regPoller = function (httpOption, model, diffFunc){
	fw.dbOpData = [];
	if (typeof httpOption != 'object' || httpOption == null)
	    return null;

	if ( httpOption['ishttps'] == 1 || httpOption.ishttps == '1'){
	    https = require('https');
	    console.log('using https');
	}
	else{
	    https = require('http');
	    console.log('using http');
	}
	fw.server_model = model;
	/* console.log('++++++++++++++++');
	   console.log(model);*/

	requestOption = makeOption(httpOption);
	requestHttp(requestOption, model, diffFunc);
	
    };

    var validateStr = function (userop, defaultop, param){
	var value = ((typeof userop[param] == 'string') 
		     && (userop[param] != ''))? userop[param] : defaultop[param];
	return value;

    }


    var makeOption = function(httpOption){
	var host = validateStr(httpOption, httpconf, 'host');  

	if (typeof httpOption.port == 'string')
	    httpOption.port = parseInt(httpOption.port);
	var port = ((typeof httpOption.port == 'number') && !isNaN(httpOption.port))? httpOption.port : httpconf.port; 

	var path = validateStr(httpOption, httpconf, 'path');

	var method = validateStr(httpOption, httpconf, 'method').toUpperCase();
	method = (method == 'POST' || method == 'GET')? method : 'POST';

	var headers = {};
	if (typeof httpOption.headers != 'object'){
	    headers = httpconf.headers;
	}else{
	    if (typeof httpOption.headers.Cookie == 'object')
		headers['Cookie'] = query.stringify(httpOption.headers.Cookie,';');
	    else{
		if (typeof httpOption.headers.Cookie == 'string')
		    headers['Cookie'] = httpOption.headers.Cookie;
		else
		    headers['Cookie'] = query.stringify(httpconf.headers.Cookie,';');
	    }
	    headers['Content-Type'] = validateStr(httpOption.headers, httpconf.headers, 'Content-Type');
	}
	if (typeof httpOption.content == 'string'){
	    headers['Content-Length'] = httpOption.content.length;
	}else
	    headers['Content-Length'] = '0';

	//TODO add 'accept' and other parameter
	var opt = {
	    'host' : host,
            'port' : port,
            'path' : path,
            'method' : method,
            'headers' : headers
	}
	
	console.log(opt);
	return opt;

    }

    //no use, for future
    var findData = function(dbname, method){
	for (var i=0; i<dbOpData.length; i++){
	    if (dbOpData[i].dataName == dbname && dbOpData[i].method == method){
		return i;
	    }
	}
	return null;
    }


    fw.insert = function(dbname, data){
	var insertItem = {};
	insertItem.dataName = dbname;
	insertItem.method = 'insert';
	insertItem.data = data;//这里的data，可以直接给对象或数组
	fw.dbOpData.push(insertItem);
    }
    fw.update = function(dbname, criteria, options, data){
	/*var index = findData(dbname,'update');//合并数据用，暂时没用
	if (index == null)
	    insertItme = {};
	else
	    insertItem = dbOpData[i];*/

	var updateItem = {};
	updateItem.dataName = dbname;
	updateItem.method = 'update';
	updateItem.data = [];
	updateItem.data[0] = {};
	updateItem.data[0].criteria = criteria;
	updateItem.data[0].options = options;
	updateItem.data[0].data = data;
	fw.dbOpData.push(updateItem);
    }
    fw.remove = function(dbname, criteria){
	var removeItem = {};
	removeItem.dataName = dbname;
	removeItem.method = 'remove';
	removeItem.data = [];
	removeItem.data[0] = criteria;
	fw.dbOpData.push(removeItem);
    }

    fw.getOpData = function(){
	return fw.dbOpData;
    }

    /***************Interval Exec**********************/
    var pollLoop = function(){
	if (this.status == 'running'){
	    var intervalHandle = setTimeout(function(){
		if (intervalLock == 0){//Can set intervalTimes here
		    intervalLock = 1;
		    require(fw['userjsfile'])(fw);
		    pollLoop();
		}else{
		    console.log('没有执行完');
		    pollLoop();
		}
	    }, fw['interval']);
	    fw.handle = intervalHandle;
	}
    }
    this.status = 'stop';
    this.Start = function(){
	require(fw['userjsfile'])(fw);
	intervalLock = 1;
	this.status = 'running';
	pollLoop();
	//return intervalHandle;
    }

    this.Stop = function(){
	this.status = 'Stop';
    }

}

