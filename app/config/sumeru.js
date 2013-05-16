//server side config
/*var socketPort = 
    (typeof process !== 'undefined' && 
     typeof process.BAE !== 'undefined') ?
    80 : 8082;
var clientSocketServer = typeof location !== 'undefined' ? 
        location.hostname + ':' + socketPort + '/socket/' : '';
*/
sumeru.config({
   //httpServerPort: 8080,
   sumeruPath: '/../sumeru'
   //soketPort: socketPort,
   //clientSocketServer : clientSocketServer
});
