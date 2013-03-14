//server side config
var socketPort = 
    (typeof process !== 'undefined' && 
     typeof process.BAE !== 'undefined') ?
    process.env.APP_PORT : 8082;
var clientSocketServer = typeof location !== 'undefined' ? 
        location.hostname + ':' + socketPort + '/socket/' : '';

sumeru.config({
   httpServerPort: 8084,   sumeruPath: '/../../sumeru',
   soketPort: socketPort,
   clientSocketServer : clientSocketServer
});
