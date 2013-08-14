var runnable = function(fw){
   var http = require('http');
   var url = require('url');
   var imagemagick = require('imagemagick');
   
   imagemagick.identify.path = fw.config.get('imagemagick_identify');

   
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
   };
   
   
   var getMeta = function(data, callback){

     imagemagick.identify({data : data}, function(err, meta){
        callback(meta);      
     })
     
   };
   
   return {
       get : function(http_url, cb){
           httpGet(http_url, cb);
       }
   };
    
};


module.exports = runnable;
