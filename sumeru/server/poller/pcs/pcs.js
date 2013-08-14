var applog = require('../../driver/applog.js');
//var log = require(__dirname  + '/../../../sumeru/log.js')(fw);
module.exports = function (fw){
    var query = require('querystring');
//    var conf = require('./conf.js');

    var reqOption;
//    var config = conf.getConfigure();
    var config = require(__dirname+'/config.json');
    var pcsconf = config.PCS;

    //var content = 'method=list&dir=%2Fapps%2FSumeru&app_id=403798&user_id=246813475';
    //body_param is not using
    var makeOption = function(cookie, sapi, method, url_param, body_param){
	
	url_param =(typeof(url_param) == "undefined")? '' : url_param;
	body_param = (typeof(body_param) == "undefined") ? '' : body_param;

	//var pcsconf = config.PCS;
	var queryString = {
	    'method' : method,
	    'app_id' : pcsconf.app_id,
	};

	var reqheader = query.stringify(queryString);

	if (url_param != '')
	    reqheader = reqheader  + '&' + query.stringify(url_param);

	//console.log('PCS reqheader : '+ reqheader);

	var options = {
	    host: pcsconf.url,
	    port: 443,
	    path: pcsconf.path + '/'+ sapi + '?' + reqheader,
	    method: 'POST',
	    headers:{
		'Cookie' : cookie,
		'Content-Type' : 'multipart/form-data',
		'Content-Length' : 0,
		//'connection': 'keep-alive',
		'accept': '*/*'
	    }
	};	
	//console.log('PCS OPTION : ');
	console.log(options);
	reqOption = options;
    }

    // var pcspoll = fw.config.defineModule('pcspoll');
    var pcspoll = {
	pcsInterval:10000,//pcs轮询时间间隔
	albumTableName:"pics",//轮询插入的model name
	albumTimelineTableName:"picsTimeline",//轮询插入的model name
	thumbnailHost:"127.0.0.1",//"172.22.149.10",//port
	thumbnailPort:"2013",//port
    };

    function PCSGetThumbnailURL(path,width,height){
	path =(typeof(path) != "string")? '/' : path;
	if (isNaN(width)){
	    console.log('width is not number');
	    return;
	}	
	if (typeof height == 'undefined'){
	    height = pcsconf.height;
	}else{
	    if (isNaN(height)){
		console.log('height is not number');
		return;
	    }	
	}
	
	var param = {
	    'method' : 'generate',
	    'app_id' : pcsconf.app_id,
	    'path' :  path,
	    'width' : width,
	    'height' : height
	};
	var querystring = query.stringify(param);
	var httpurl = 'http://' + 
	    pcsconf.url + 
	    pcsconf.path +
	    '/' +
	    'thumbnail?' + 
	    querystring
	//console.log(httpsurl);
	return httpurl;
    }

    var getThumbnailURL = function(path,userinfo,width,height){
	var _thumbnail = PCSGetThumbnailURL(path,width,height);//修改这里
	_thumbnail = _thumbnail.replace(/^http\S+thumbnail/,"http://"+pcspoll["thumbnailHost"]+":"+pcspoll["thumbnailPort"]+'/socket/');
	var _u = {
	    "USERID":userinfo["token"],
	    "BDUSS":userinfo["info"]["bduss"]
	}
	_thumbnail += "&"+query.stringify(_u);
	console.log('Thumbnail :  '+ _thumbnail);
	return _thumbnail;
    }

    var getLayoutType = function(r){//计算w/h比例范围
        var type;
        if(r>2){
            type = 0;
        }else if(r>0.5){
            type = 1;
        }else{
            type = 2;
        }
        return type;
    }

    //compfunc 为比较函数。用于比较两个item是否一致
    var inArray = function(array,item,compfunc){
	if(typeof compfunc == "undefined"){
	    compfunc = function(a,b){
		return (a["path"] == b["path"]
			&&a["ctime"] == b["ctime"]);
	    }
	}
	for(var i=0,ilen = array.length;i<ilen;i++){
	    var compvalue = compfunc(array[i],item);
	    if(compvalue){
		return i;
	    }
	}
	return -1;
    }


    //offset目前只支持d，m
    var getDateFromTime = function(timestamp,offset){
        // console.log(timestamp,offset)
        var d,dd;
        d = new Date(timestamp*1000);
        dd = new Date(d.getFullYear()+"-"+(d.getMonth()+1)+'-'+d.getDate());//去掉小时分钟和秒
        d = dd;//变换
        if (typeof offset != 'undefined' ){ // the offset
            if (offset.substr(-1) == "m") {
                d.setMonth((d.getMonth() - parseInt(offset) ));
            }else{
                d.setDate((d.getDate() - (parseInt(offset)) ));//1day表示当天
            }
        }
        return d.getFullYear()+"-"+(d.getMonth()+1);
    }



    //将全量的pcs抓取数据，转换成timeline数据
    var createTimelineData = function(username, data){
	var timeline = [];
	//console.log("---------------------------------------");
	//console.log(data);
	//console.log("---------------------------------------");
	for(var i=0, ilen = data.length;i<ilen;i++){
	    var item  =data[i];
	    var timename = getDateFromTime(item["ctime"],"0m");
	    if(typeof timeline[timename] == "undefined"){
		timeline[timename] = {};
		timeline[timename]["username"] = username;
		timeline[timename]["userid"] = item["user_id"];
		timeline[timename]["timename"] = timename;
		timeline[timename]["size"] = 1;
		timeline[timename]["newsize"] = 1;
		timeline[timename]["stime"] = item["ctime"];
		timeline[timename]["etime"] = item["ctime"];
		timeline.push(timeline[timename]);
	    }else{
		timeline[timename]["size"]++;
		timeline[timename]["newsize"]++;
		timeline[timename]["etime"] = item["ctime"];
	    }
	}
	return timeline;
    }

    var findDBCol = function(DBData, dbname){
	for (var i=0;i<DBData.length;i++){
	    if (DBData[i]['dataName'] == dbname)
		return i;
	}
	return null;
    }

    var formatPcsData = function(userinfo,value){
	var _obj = {};
	_obj["username"] = userinfo["token"];
	_obj["userid"] = value["user_id"];
	_obj["fs_id"] = value["fs_id"];
	_obj["ctime"] = value["ctime"];
	_obj["path"] = value["path"];
	_obj["filename"] = value["server_filename"];

	_obj["thumbnail"] = getThumbnailURL(_obj["path"],userinfo,640,1000);

	_obj["size"] = value["size"];
	_obj["src"] = value["s3_handle"];
	//_obj["width"] = 0;
	//_obj["height"] = 0;
	return _obj;
    }

    var processPCS = function(oldData, newData, callback){
	console.log('-----------------------oldData-----------------------');
	console.log(oldData);
	console.log('-----------------------newData-----------------------');
	console.log(newData);

	/*******************************************time line*****************************/
	
	var username = fw.userinfo.token,bduss = fw.userinfo.info.bduss;
	//业务逻辑

	newData = newData['list'];
	var timelineData = createTimelineData(username,newData);	
	var timelineIndex = findDBCol(oldData, 'picsTimeline');
	
	//console.log('Index ' +timelineIndex);
	var items = oldData[timelineIndex].data;
	for(var i=0,ilen = items.length;i<ilen;i++){
	    var _index = inArray(timelineData,items[i],function(a,b){
		return (a["userid"] == b["userid"]
			&&a["timename"] == b["timename"]);
	    });
	    if(_index>=0){
		fw.update(
		    'picsTimeline',
		    {_id:items[i]["_id"]},
		    '$set',
		    {"newsize":parseInt(timelineData[_index]["size"]) - parseInt(items[i]["size"]), "size":timelineData[_index]["size"], "etime":timelineData[_index]["etime"]}
		);

		timelineData.splice(_index,1);
		
	    }else{
		
		fw.remove('picsTimeline', {_id:items[i]["_id"]});
	    }
	}
	if(timelineData.length>0){
	    for(var i=0,ilen = timelineData.length;i<ilen;i++){
		console.log('------timelineData insert----');
		fw.insert('picsTimeline', timelineData[i]);
	    };
	}

	/*****************************************pics*****************************/	
	var dbPics = 'pics';
	var picsIndex = findDBCol(oldData, 'pics');
	if (picsIndex != null){
	    items = oldData[picsIndex].data;
	}
	else{
	    console.log('第一次插入数据');
	    items = [];
	}
	var pollEnd = false;
	var removeList = [];//记录需要删除的id
	var removedLen = 0;
	var insertedLen = 0;

	var _callback = function(_type){
	    if(_type=='remove'){
		removedLen++;
	    }else if(_type=='insert'){
		insertedLen++;
	    }
	    //console.log('removeLen:'+removedLen+'   insertLen'+insertedLen);
	    if(pollEnd&&removedLen==removeList.length
	       &&
	       insertedLen==newData.length){
		/*log.write("trigger model push++++");
		  log.write("removedLen:"+removedLen);
		  log.write("insertedLen:"+insertedLen);
		  log.write("removeList.length:"+removeList.length);
		  log.write("newData.length:"+newData.length);*/
		console.log('----------------------Callback啦------------------');
		callback(fw.getOpData());
		
		//fw.reqPcsDataing = false;
		//console.log("***************************************");
		//console.log('reqPcsData end');
		//console.log("***************************************");
	    }
	}

	
	for(var i=0,ilen = items.length;i<ilen;i++){
	    var _index = inArray(newData,items[i]);
	    if(_index>=0){
		fw.update(
		    dbPics,
		    {_id:items[i]["_id"]},
		    '$set',
		    {"thumbnail":getThumbnailURL(newData[_index]["path"],fw.userinfo,640,1000),"src":newData[_index]["s3_handle"]
		    }
		);

		newData.splice(_index,1);
	    }else{
		removeList.push({_id:items[i]["_id"]});
		fw.remove(dbPics,{_id:items[i]["_id"]});
		_callback("remove");
	    }
	}
	
	if (newData.length == 0){
	    callback([]);
	}
	if(newData.length>0){
	    console.log('------------------newData.length>0--------------'+newData.length);
	    for(var i=0,ilen = newData.length;i<ilen;i++){

		var picObj = formatPcsData(fw.userinfo, newData[i]);
		var im = require('./imageMeta.js')(fw);//修改路径
		
		im.get(picObj["thumbnail"],function(_dbPics,_picObj,_i){
		    return function(meta){
			if(typeof meta != 'undefined'
			   && typeof meta.width != 'undefined'){
			    _picObj["width"] = meta.width;
			    _picObj["height"] = meta.height;

			    _picObj["r"] = (_picObj["width"]/_picObj["height"]);
			    _picObj["_r"] = 1/_picObj["r"];
			    _picObj["_type"] = getLayoutType(_picObj["r"]);

			    fw.insert(_dbPics, _picObj);
			    _callback("insert");
			    //console.log(_picObj);
			}else{
			    
			    applog.applog("read img size error :");
			    applog.applog("_picObj:");
			    applog.applog(_picObj);
			    applog.applog("meta:");
			    applog.applog(meta);
			    _callback("insert");
			}

		    }
		}(dbPics,picObj,i)
		      );

		//console.log(formatPcsData(username,newData[i]));
	    };
	}
	pollEnd = true;

	/*	
		fw.insert('pics',newData);
		fw.update('pics', {'error_code' : 31045}, '$set', {'error_msg' : 'my msg'});
		fw.remove('pics', {'error_code' : 31045});
		console.log('-------------------------------');
		//console.log(fw.getOpData().length);*/
	//return fw.getOpData();

    }




    var pcsSend = function(){
	var arg = arguments;
	//var callback = arg[0];//no use
	var model = [
	    {
		name : 'pics',//DB collection name
		situation : {'username' : fw.userinfo.token}
	    },
	    {
		name : 'picsTimeline',
		situation : {'username' : fw.userinfo.token}
	    }   
	];
	
	fw.regPoller(reqOption, model, function(err, oldData, newData, callback){
	    console.log('^^^^^^^^^^^^^^^diff func^^^^^^^^^^^^^^^^^^');
	    var result = [];
	    //Insert it 
	    var afterProcessData = processPCS(oldData, newData,callback);
	    /*
	    //TODO modify below
	    for (var i=0; i<oldData.length; i++){
	    result[i]={};
	    result[i].dataName = oldData[i].dataName;
	    result[i].method = 'insert';
	    result[i].data = afterProcessData;
	    };*/
	   // return afterProcessData;
	});
    }

    var GetFileList = function(callback, username, BDUSS){
	// dir =(typeof(dir) != "string")? '' : dir;
	//  var url_param = {'dir' : pcsconf.dir + dir};    
	var url_param = {'type' : pcsconf.type};
	//TODO need cache
	//cookie = query.stringify(cookie,';');
	pcsAccess(
	    callback, 
	    username, 
	    BDUSS,
	    'stream',
	    'list',
	    url_param);
    };

    var pcsAccess = function(callback, username, BDUSS, sapi, method, url_param){ 
	if (typeof callback != 'function'){
    	    console.log('callback is undefined');
	    return;
	}
	if ((typeof username != 'string') || (typeof BDUSS != 'string')){
    	    console.log('username or BDUSS should be string');
	    callback('username or BDUSS should be string', null);
	    return;
	}
	reqOption = '';
	var cookie = {
	    'USERID' : username,
	    'BDUSS' : BDUSS
	};
	cookie = query.stringify(cookie,';');

	makeOption(cookie, sapi, method, url_param);
	reqOption['ishttps'] = 1;
	pcsSend(callback);
    };

    GetFileList(function(){}, fw.userinfo.token, fw.userinfo.info.bduss);
}

