var https = require('https');
var query = require('querystring');
var passport = require('./passport.js');
var conf = require('./conf.js');

var reqOption;
var config = conf.getConfigure();
var pcsconf = config.PCS;

//var content = 'method=list&dir=%2Fapps%2FSumeru&app_id=403798&user_id=246813475';
//body_param is not using
var makeOption = function(cookie, sapi, method, url_param, body_parm){
    
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
    //console.log(options);
    reqOption = options;
}

var pcsSend = function(){
    var arg = arguments;
    var callback = arg[0];
    var jsonObj;
    var req = https.request(reqOption, function(res) {
	 //console.log("statusCode: ", res.statusCode);
	//console.log("headers: ", res.headers);
	//console.log(res);
	var _data='';
	res.on('end', function() {
	    //process.stdout.write(_data);
	    try {
		jsonObj = JSON.parse(_data);
	    }catch(err){
		console.log('JSON parse error');
		callback(err,null);//TODO before here to check callback
		return;
	    }
	    //console.log(jsonObj);TODO remove this check
	    if ((typeof arg) != 'undefined'){
		if ((arg.length > 0) && (typeof(arg[0]) == 'function')){
		    callback = arg[0];
		    //arg = [].slice.call(arg, 1, arg.length);
			if (res.statusCode != '200'){
				callback(res.statusCode,jsonObj);
			}else
			    callback(null,jsonObj);
		}
	    }
	});//endof res.on
	res.on('data',function(chunk){
	    _data += chunk;
	});

    });//endof req

    //req.write(content);//maybe for upload file,use this!
    req.on('error', function(e) {
	console.error(e);
	callback('request error',null);
    });

    req.end();
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
    pcsSend(callback);
};

function LoginAndGetFileList(callback, username, password){
    passport.passportLogin(username, password, function(err, json){
	//console.log(json);
	if (!err)
	    GetFileList(callback, username, json.bduss);
	else
	    console.log(err);		
    });	
}

function GetThumbnailURL(path,width,height){
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

exports.GetFileList = GetFileList;
exports.LoginAndGetFileList = LoginAndGetFileList;
exports.GetThumbnailURL = GetThumbnailURL;
exports.pcsAccess = pcsAccess;//notice the parameter url_param, it must be set right
//sample test

//console.log(GetThumbnailURL('/apps/album/1.jpg',100));

/*
GetFileList(function(err,data){
    if (!err){
	console.log('OUT');
	console.log(data);
	
    }
    else
	console.log(err);}, 'jibimily@yahoo.com.cn', 
	    'Tg4OHY4empYcm1XaE00cDN0d0JvUEQ0ZEdqQmlufjZGLWYtTkVkVHVSTDY3NUZSQUFBQUFBJCQAAAAAAAAAAApBLjHhc4IuAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAYIArMAAAALBGZXYAAAAA6p5DAAAAAAAxMC4zOC4yOPqhpFD6oaRQe'
	   );
*/
/*
LoginAndGetFileList(function(err,data){
    if (!err){
	console.log('OUT');
	console.log(data);
    }else
	console.log(err);
},'xcdemo@126.com','bdxcdemo');
*/
