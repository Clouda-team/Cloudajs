var http = require("http"),
	net = require("net");


var option = {
	port	:	2012,
	method	:	'POST'
};

var req = http.request(option, function(res){
	console.log('STATUS: ' + res.statusCode);
  	console.log('HEADERS: ' + JSON.stringify(res.headers));
	res.setEncoding('utf8');
	res.on('data', function (chunk) {
		console.log('BODY: ' + chunk);
	});
});

req.write('data\n');
req.write('data\n');
req.end();


//tcp connection
var tcpClient = net.connect(2013, function(){
	tcpClient.write('test tcp');
});

tcpClient.setEncoding('utf8');
tcpClient.on('data', function(data){
	console.log(data);
});
