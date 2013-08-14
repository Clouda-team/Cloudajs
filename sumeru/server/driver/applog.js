var fs = require('fs');
var stream = fs.WriteStream('./log2');

/*stream.on('drain', function(){
  stream.write(fstream);
  stream.end();
  });
*/

var applog = function(logstr, type){
    var date = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    if (typeof logstr == 'object')
    {
    	try {
    	    logstr = JSON.stringify(logstr);
    	}catch(err){
    	    console.log(err);
    	}
    }
    var logitem = '['+ date+ '] ['+ type +'] - ' + logstr ;
    stream.write('\n'+logitem);
}

exports.applog=applog;

//sample test
/*
var xx = {'a' : 1, 'vx':'xxx'}
  applog(xx,'error');
  applog('1','error');
  applog('2','error');
  applog('34567','error');
  applog('4567','error');

  applog('nnnnn','error');
*/
