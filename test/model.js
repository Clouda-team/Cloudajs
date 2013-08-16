/*
 * 测试文件描述
 * 文件命名: model.js
 * 测试模块：Model
 * 作者：zhanghaihua@baidu.com
 * 重点说明：
 */

var expect = require("chai").expect;
var run = require('./support/sumeru.js');
var fw = run.fw;


var assert = require("assert");

/**
 * Assert that the first two arguments are equal, with an optional message.
 * Prints out both actual and expected values.
 * @name equal
 * @function
 * @example equal( format( "Received {0} bytes.", 2), "Received 2 bytes.", "format() replaces {0} with next argument" );
 */
var equal = function( actual, expected, message ) {
	assert.equal(actual, expected);
};

/**
 * @name notEqual
 * @function
 */
var notEqual = function( actual, expected, message ) {
	//QUnit.push( expected != actual, actual, expected, message );
	assert.notEqual(actual, expected);
};

function ok(expr, msg) {
  	if (!expr) throw new Error(msg);
}

/*
describe('sumeruReady', function () {
	it("sumeru initialized", function( done ){
    	fw.sumeruReady( function (dbready) {
    		done();
    	});
  	});  	
});
*/

/*
 * 测试模块说明
 */
 
describe("model", function() {
	var model;
	
	beforeEach(function() {
		model = sumeru.model.create('Model.modelDemo',{
			name	:	'Helen',
			age		:	12,
			phone	:	'13666666666'
		});
		
		
	    var newComment = sumeru.model.create('Model.commentModelDemo'),
	        newDigg = sumeru.model.create('Model.diggModelDemo'),
	        newUser = sumeru.model.create('Model.userModelDemo');
		
		
	    newUser.set('name', 'testUser_' + sumeru.__random());
	    newUser.set('userid', 888);
		
		newDigg.set('digg', 1234);
		newDigg.get('diggusers').add(newUser);
		
		newComment.set('content', '测试评论');
	    newComment.set('time', (new Date()).valueOf());
	    newComment.get('diggs').add(newDigg);
	    model.get('comments').add(newComment);
	    model.get('users').add(newUser);		
	    
	    //伪装成都是非dirty的状态
	    model._setDirty(false);
	    model.get('comments').find()[0]._setDirty(false);
	    model.get('comments').find()[0].get('diggs').find()[0]._setDirty(false);
	    model.get('comments').find()[0].get('diggs').find()[0].get('diggusers').find()[0]._setDirty(false);
	});

	/*
	 * case id: test-model-1
	 * 测试说明：测试model get 方法
	 * 测试数据说明：
	 */
	
	it('通过get获取Model中的数据', function(){
		equal(model.get('name'), 'Helen', 'plain string value read');          
	    equal(model.get('age'), 12, 'plain number value read');                 
	    equal(model.get('comments').find()[0].get('content'), '测试评论', 'subCollection plain string value read');     
	    equal(model.get('comments').find()[0].get('diggs').find()[0].get('digg'), 1234, '3rd level subCollection plain string value read');  
	    equal(model.get('comments').find()[0].get('diggs').find()[0].get('diggusers').find()[0].get('userid'), 888, '4th level subCollection plain string value read');     
		
		    
	    var extended = sumeru.model._extend(sumeru.model.create(model._getModelName()), model);
	    equal(extended.get('name'), 'Helen', 'extended model read plain string');
	    equal(extended.get('age'), 12, 'extended model read read number');
	    equal(extended.get('comments').find()[0].get('content'), '测试评论', 'subCollection plain string value read');     
	    equal(extended.get('comments').find()[0].get('diggs').find()[0].get('digg'), 1234, '3rd level subCollection plain string value read');  
	    equal(extended.get('comments').find()[0].get('diggs').find()[0].get('diggusers').find()[0].get('userid'), 888, '4th level subCollection plain string value read');     
	    
	    //修改原model，测试修改是否生效，及extend的结果是否不受影响。
	    model.set('name', 'unittest');
	    model.set('age', 13);
	    model.get('comments').find()[0].set('content','修改内容');
	    model.get('comments').find()[0].get('diggs').find()[0].set('digg', 2345);
	    model.get('comments').find()[0].get('diggs').find()[0].get('diggusers').find()[0].set('userid', 999);
	    
	    equal(model.get('name'), 'unittest', 'plain string value write');          
	    equal(model.get('age'), 13, 'plain number value write');                 
	    equal(model.get('comments').find()[0].get('content'), '修改内容', 'subCollection plain string value write');     
	    equal(model.get('comments').find()[0].get('diggs').find()[0].get('digg'), 2345, '3rd level subCollection plain string value write');  
	    equal(model.get('comments').find()[0].get('diggs').find()[0].get('diggusers').find()[0].get('userid'), 999, '4th level subCollection plain string value write');     
	    
	    //extend的应该保持untouched的
	    equal(extended.get('name'), 'Helen', 'UNTOUCHED extended model read plain string');
	    equal(extended.get('age'), 12, 'UNTOUCHED extended model read read number');
	    equal(extended.get('comments').find()[0].get('content'), '测试评论', 'UNTOUCHED subCollection plain string value read');     
	    equal(extended.get('comments').find()[0].get('diggs').find()[0].get('digg'), 1234, 'UNTOUCHED 3rd level subCollection plain string value read');  
	    equal(extended.get('comments').find()[0].get('diggs').find()[0].get('diggusers').find()[0].get('userid'), 888, 'UNTOUCHED 4th level subCollection plain string value read');     
	});
	
	/*
	 * case id: test-model-2
	 * 测试说明：测试model set 方法
	 * 测试数据说明：
	 */
	
	it('通过set设置Model中的数据', function(){
		var extended = sumeru.model._extend(sumeru.model.create(model._getModelName()), model);
		extended.set('name', 'unittest');
	    extended.set('age', 13);
	    extended.get('comments').find()[0].set('content','修改内容');
	    extended.get('comments').find()[0].get('diggs').find()[0].set('digg', 2345);
	    extended.get('comments').find()[0].get('diggs').find()[0].get('diggusers').find()[0].set('userid', 999);
	    
	    equal(extended.get('name'), 'unittest', 'extended plain string value write');          
	    equal(extended.get('age'), 13, 'extended plain number value write');                 
	    equal(extended.get('comments').find()[0].get('content'), '修改内容', 'extended subCollection plain string value write');     
	    equal(extended.get('comments').find()[0].get('diggs').find()[0].get('digg'), 2345, 'extended 3rd level subCollection plain string value write');  
	    equal(extended.get('comments').find()[0].get('diggs').find()[0].get('diggusers').find()[0].get('userid'), 999, 'extended 4th level subCollection plain string value write');     
	    
	    //原model应该保持untouched的
	    equal(model.get('name'), 'Helen', 'UNTOUCHED model read plain string');
	    equal(model.get('age'), 12, 'UNTOUCHED model read read number');
	    equal(model.get('comments').find()[0].get('content'), '测试评论', 'UNTOUCHED subCollection plain string value read');     
	    equal(model.get('comments').find()[0].get('diggs').find()[0].get('digg'), 1234, 'UNTOUCHED 3rd level subCollection plain string value read');  
	    equal(model.get('comments').find()[0].get('diggs').find()[0].get('diggusers').find()[0].get('userid'), 888, 'UNTOUCHED 4th level subCollection plain string value read');     
	    
	    delete extended;
	});
	
	/*
	 * case id: test-model-3
	 * 测试说明：测试model isDirty 属性
	 * 测试数据说明：
	 */
	
	it('通过get获取Model中的数据', function(){
		equal(model.__smr__.isPhantom, true, 'isPhantom');
	    
	    //测试_setDirty是否生效    
	    equal(model.__smr__.isDirty, false, 'before modify model plain string, isDirty == false');     
	    model.set('name', 'unittest');
	    equal(model.__smr__.isDirty, true, 'after modify model plain string, isDirty = false');
	    
	});
	
	/*
	 * case id: test-model-4
	 * 测试说明：测试model validation 方法
	 * 测试数据说明：
	 */
	
	it('通过get获取Model中的数据', function(){
		equal(model.__smr__.isDirty, false, 'before modify 4th level plain string, isDirty == false');    
	    var fourthModel = model.get('comments').find()[0].get('diggs').find()[0].get('diggusers').find()[0];
	    equal(fourthModel.__smr__.isDirty, false, 'before modify 4th level model plain string, isDirty = false');    
	    fourthModel.set('userid', 999);
	    equal(fourthModel.__smr__.isDirty, true, 'after modify 4th level model plain string, isDirty = true');
	    equal(model.__smr__.isDirty, false, 'after modify 4th level model plain string, isDirty untouched');
	    
	    model.set('age', 1883);
	    var _validation = model.validation();
	    equal(_validation.length, 1, 'validation success');
	});

});
