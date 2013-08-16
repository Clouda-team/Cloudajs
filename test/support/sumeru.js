/*
 * 测试文件描述
 * 文件命名: sumeru.js
 * 测试模块: sumeru-server
 * 作者：zhanghaihua@baidu.com
 * 重点说明：
 * Keeping Tests Atomic
 */

/*
 * env SUMERU_COV为真，统计覆盖率，引用被instrumented的代码
 */
var libpath = process.env.SUMERU_COV ? '../../sumeru-cov/src' : '../../sumeru/src';
var libserverpath = process.env.SUMERU_COV ? '../../sumeru-cov/server' : '../../sumeru/server';

/*
 * env SUMERU_COV为真，统计覆盖率，引用被instrumented的代码
 */
var libpath = process.env.SUMERU_COV ? '../../sumeru-cov/src' : '../../sumeru/src';
var libserverpath = process.env.SUMERU_COV ? '../../sumeru-cov/server' : '../../sumeru/server';

//require(libserverpath + '/../build/build.js');
var fw = require(libpath + '/newPkg.js')();
/**
 * 在做其它引用之前，标记当前运行状态为 server.
 * 确保在此下引入的所有文件中，均可使用 fw.IS_SUMERU_SERVER做为当前运行环境的判断
 */
fw.__reg('IS_SUMERU_SERVER', true);
// fw.__reg('SUMERU_APP_FW_DEBUG', false);   // 单独关掉server端的debug开关

fw.__reg('idField', 'smr_id');
fw.__reg('clientIdField', '__clientId');


/**
 * 以下引入js均需使用newPkg.js的功能，在node中，整个运行过程中，只在这里载入一次，
 * 其它组件文件只需载入newPkg.js即可，否则将引发一个重复载入的错误。
 */

require(libpath + "/../server_client/server_router.js")(fw);

require(libpath + '/sumeru.js')(fw);
      
//client for nodejs runtime
require(libpath + "/session.js")(fw);
require(libpath + "/event.js")(fw);
require(libpath + "/pubsub.js")(fw);
require(libpath + "/sense.js")(fw);
require(libpath + "/pilot.js")(fw);

require(libpath + '/model.js')(fw);
require(libpath + '/modelPoll.js')(fw);
require(libpath + "/collection.js")(fw);//require model.js modelPoll.js

require(libpath + "/controller.js")(fw);
require(libpath + "/messageDispatcher.js")(fw);
	        
require(libpath + '/query.js')(fw);
require(libpath + '/dal.js');
require(libpath + '/authModel.js');


//test model
require('./modelDemo.js');
require('./userModelDemo.js');
require('./commentModelDemo.js');
require('./diggModelDemo.js');


exports.fw = fw;
