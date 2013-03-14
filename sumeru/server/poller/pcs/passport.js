var crypto = require('crypto');
//var conf = require('./conf.js');
var https = require('https');
var query = require('querystring');

//var config = conf.getConfigure();//config is a json object
var config = require(__dirname + '/config.json');
/*
 parameter errno = -10;
 json parse errno = -11;
 reponse statusError = header.statusCode;
 passport return error = return value; 
*/
var errCode = {
    errno : '',
    error : '',
    vcodestr : '' // if errno=257,this vcode will be set
};

function makeQuery(userinfo)//no use
{
    var queryString = '';
    for (var key in userinfo)
    {
	queryString = queryString 
	    + key + '=' + userinfo[key]
	    + '&'
    }
    queryString = queryString.substring(0,queryString.length - 1);
    return queryString;
} 

function _genSign(userinfo,sapiKey)
{
    //ksort(); //need to sort userinfo's key
    var queryString = query.stringify(userinfo);
  
    var addKey = queryString + '&sign_key=' + sapiKey;
    
   // console.log('addKey ::' + addKey);
    var md5 = crypto.createHash('md5');
    var result = md5.update(addKey).digest('hex');//hex, default is binary
   // console.log('result ::' + result);
    return result;
}

//parameter: username ,password, callback
var passportLogin = function(){
    var arg = arguments;
    var vcode='';
    var callback;
    if (typeof arg[2] != 'function'){
	vcode = arg[2];
	callback = arg[3];
    }else
	callback = arg[2];

    if ((typeof callback) != 'function'){
	console.log('callback is undefined');
	return;
    }
    if ((typeof arg[0]) != 'string' || (typeof arg[1]) != 'string'){
	errCode.error = 'PASSPORT login failed, wrong username or password';
	errCode.errno = -10;
	callback(errCode, null);
	return;
    }
    
   
    var passConf = config.PASSPORT;
    var userinfo;
    var paswd = new Buffer(arg[1]);
   //console.log(passConf.username);
  // console.log('passss::'+ paswd.toString('base64'));
    if (vcode == ''){
	userinfo = {
	    'appid' : passConf.appid,
	    'crypttype' : passConf.crypttype,
	    'isphone' : passConf.isphone,
	    'login_type' : passConf.login_type,
	    'password' : paswd.toString('base64'),//'amJrODIwNTI4MQ==',
	    'tpl' : passConf.tpl,
	    'username' : arg[0]
	};
    }else{
	userinfo = {
	    'appid' : passConf.appid,
	    'crypttype' : passConf.crypttype,
	    'isphone' : passConf.isphone,
	    'login_type' : passConf.login_type,
	    'password' : paswd.toString('base64'),//'amJrODIwNTI4MQ==',
	    'tpl' : passConf.tpl,
	    'username' : arg[0],
	    'vcodestr' : vcode.vcodestr,
	    'verifycode' : vcode.verifycode
	    
	}
    }

    var sig = _genSign(userinfo, passConf.sapiKey/*'0b6a775369cf9ac7d0e427e181a28b38'*/);
    userinfo['sig'] = sig;

    //console.log(userinfo);
   
/*****************   Send request   ***********************/

    var content = query.stringify(userinfo);//real query string
    var options = {
      host: passConf.url,
      port: 443,
      path: passConf.path,
      method: 'POST',
      headers:{
        'Content-Type':'application/x-www-form-urlencoded',
        'Content-Length': content.length
      }
    };
    //console.log(options);
    //console.log('PASS Query String : ' + content);

    var req = https.request(options, function(res) {
	if (res.statusCode != 200){
	    console.log('Login failed');
	    errCode.error = res.headers;
	    errCode.errno = res.statusCode;
	    callback(errCode, null);
	    return;
	}
	//console.log("statusCode: ", res.statusCode);
	console.log("headers: ", res.headers);

	var setcookie = res.headers['set-cookie'][0];
	var baiduid = (query.parse(setcookie,';')).BAIDUID;
	//console.log(baiduid);

	var _data = '';
	res.on('data',function(chunk){
		_data += chunk;
	});
	res.on('end', function() {
	    //process.stdout.write(d);
	    try {
		var jsonObj = JSON.parse(_data);
	    }catch(err){
		//console.log(err);
		errCode.errno = -11;
		errCode.error = err;
		callback(errCode,null);
	    }
	    //console.log('---return--:' + jsonObj);

	    var uid = jsonObj.uid;
	    if (!uid || (typeof(uid) == 'undefined') || (uid == '')){
		//console.log('Passport return :' + _data.toString());
		errCode.errno = jsonObj.errno;
		errCode.error = _data.toString();
		if (jsonObj.errno = '257')
		{
		    errCode.vcodestr = jsonObj.vcodestr;
		}
		//TODO here can also add baiduid 
		callback(errCode, null);
		return;
	    }

	    jsonObj['baiduid'] = baiduid;
	    callback(null,jsonObj);

	});
    });

    req.write(content);
    req.end();

    req.on('error', function(e) {
	console.error(e);
    });
}

exports.passportLogin = passportLogin;


//sample test
passportLogin('javcily','jbk8205281',function(err,json){
    if (!err){
	console.log('---------------------------------------');
	console.log(json);
    }else{
	console.log(err);
	if (err.errno == '257'){    
	    console.log('+++++++++++++++Vcode log+++++++++++');
	    console.log(json);
	}
    }
});


/*
var vstr = {
    'verifycode' : '2433',
    'vcodestr' : '00135339194701560CE2D2821C7513B3ACC0249358D918CF6DF4BAD60B14FEF1EEBB9645AD7A10EE44DE98ABED073C586D8BC3B2A773711274E411A28374AD38B9F08DB7A71489D6106285CFD463F192053A70F75199AF10B946A4FC8AC28F0206BE6522C26B0614A2774C9BA0C23F304D123E1D15E1ADB237699638D9D9709542F0DA2E2E16AA21CA455985C6FD637096AF4896B07F1602800AF3941A88401833FB5182438A7FAD'
}
passportLogin('hilujingfeng','lujingfeng_w', vstr, function(err,json){console.log(json);})
*/


//var content = 'appid=1&crypttype=1&isphone=0&login_type=2&password=amJrODIwNTI4MQ%3D%3D&tpl=pp&username=javcily&sig=c8d4d34df82e621fb782223c6048048e';
//sample content with javcily

