var http = require('http');
var url = require('url');
var path = require('path');
var query = require('querystring');
var makeOption = function(addr,cookie){
    var reqOptions = {
	host: 'pcs.baidu.com',
	port: 80,
	path: '/rest/2.0/pcs/'+ addr,
	method: 'GET',
	headers:{
            'Cookie' : cookie,
            'Content-Type' : 'multipart/form-data',
            'Content-Length' : 0,
            'accept': '*/*'
	}
    };
    return reqOptions;
}
var pcsGet = function(reqOption,response){
    var req = http.request(reqOption, function(res) {
	console.log("statusCode: ", res.statusCode);
        //console.log("headers: ", res.headers);
	response.writeHead(200,res.headers);
	res.on('data',function(chunk){
	    response.write(chunk);
	});
	res.on('end', function() {
	    //response.write(_data);
	    console.log('----------------------END OF PCS REQUEST-------------------');
	    response.end();
	});
    });

    req.on('error', function(e) {
	console.error(e);
    });
    req.end();
}

function proxyFind(res, cookie,addr){
    /*var cookie = {
      'USERID' : 'jibimily@yahoo.com.cn',
      'BDUSS' : '3V4MC16WjFRRkpCS09HU2xzeUxjd25rbUk5bXJrUGhUbUg1N055cEVmYlllWTlSQUFBQUFBJCQAAAAAAAAAAAouTyDhc4IuAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAYIArMAAAALBGZXYAAAAA6p5DAAAAAAAxMC4zNi4xNNgrolDYK6JQR'
      };*/

    //cookie = query.stringify(cookie,';');

    var myopt = makeOption(addr, cookie);
    console.log('---make option----');
    console.log(myopt);
    pcsGet(myopt,res);
};

//test();



// Create an HTTP tunneling proxy
var proxy = http.createServer(function (request, response) {
    console.log('---------------------new request----------------');    
    var pathname = url.parse(request.url).path;
    console.log('pathname :' +pathname);
    pathname = pathname.replace(/socket\//g,'thumbnail' );
    var usrIndex = pathname.lastIndexOf('USERID');
   
    if (usrIndex == -1)
    {
	console.log('No USERID');
    	response.writeHead(200, {'Content-Type': "text/plain"});
	response.write('No USERID');
      	response.end();
	return; 
	
    }
    var clientCookie = pathname.substring(usrIndex, pathname.length);
    var requestpath = pathname.substring(1,usrIndex-1);
    clientCookie = query.stringify(query.parse(clientCookie),';');
    //console.log(clientCookie);
    //console.log(requestpath);
    // return;
    // response.writeHead(200, {'Content-Type': contentType});
    //var clientCookie = request.headers.cookie;//check cookie undefined
    
    //console.log(clientCookie);
    //console.log(typeof clientCookie);
    proxyFind(response, clientCookie, requestpath);

    /*response.write(pathname);
      console.log(pathname);
      console.log(ext);
      response.end();*/



});


proxy.listen(2013, function() {

    /*
    // make a request to a tunneling proxy
    var options = {
    port: 1337,
    host: '127.0.0.1',
    method: 'CONNECT',
    path: 'www.baidu.com:80'
    };

    var req = http.request(options);
    req.end();

    req.on('connect', function(res, socket, head) {
    console.log('got connected!');

    // make a request over an HTTP tunnel
    socket.write('GET / HTTP/1.1\r\n' +
    'Host: www.baidu.com:80\r\n' +
    'Connection: close\r\n' +
    '\r\n');
    socket.on('data', function(chunk) {
    console.log(chunk.toString());
    });
    socket.on('end', function() {
    proxy.close();
    });
    });*/
});
