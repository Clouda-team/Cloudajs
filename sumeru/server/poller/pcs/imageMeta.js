var runnable = function(fw){
   var http = require('http');
   var url = require('url');
   var imagemagick = require('imagemagick');
   
   imagemagick.identify.path = '/usr/bin/identify';

   
   var httpGet = function(http_url, callback){
       
       var options = url.parse(http_url);
       
       var request = http.get(options, function(response){
            var data = '';
            
            
            response.setEncoding('binary');
            
            response.on('data', function(chunk){
                data += chunk;
            });
            
            response.on('end', function(){
              getMeta(data, callback);  
            })
       });

       request.on('error', function(err){
	   console.log('Error : Image err'+err);
	   request.abort();
	   callback();
       });
       request.setTimeout(5000,function(){
	console.log('Error : Image Time Out');
	request.abort();
	callback();
	})
   };
   
   
   var getMeta = function(data, callback){

     imagemagick.identify({data : data}, function(err, meta){
        //console.log("imageMate error:"+err);
        //console.log(meta);
        callback(meta);      
     })
     
   };
   
   return {
       'get' : function(http_url, cb){
           httpGet(http_url, cb);
       }
   };
    
};


module.exports = runnable;
