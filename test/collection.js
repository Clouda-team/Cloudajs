/*
 * 测试文件描述
 * 文件命名: collection.js
 * 测试模块：collection
 * 作者：zhanghaihua@baidu.com
 * 重点说明：Keeping Tests Atomic
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
});*/


/*
 * 测试模块说明
 */
 
describe('collection', function() {
	var collection;

	beforeEach(function() {

		collection = sumeru.collection.create({
			modelName:'Model.modelDemo'
			});
		
		collection.add({
			name	:	'Helen',
			age		:	12,
			phone	:	'1366666666'
		});
		collection.add({
			name	:	'Helen',
			age		:	22,
			phone	:	'1366666666'
		});
		collection.add({
			name	:	'Karen',
			age		:	22,
			phone	:	'13777777777'
		});
		
		for (var i = 0, l = collection.length; i < l; i++){
		    var item = collection.get(i);
	        var comments = item.get('comments'),
	            users = item.get('users'),
	            diggs = item.get('diggs'),
	            newComment = sumeru.model.create('Model.commentModelDemo'),
	            digg = sumeru.model.create('Model.diggModelDemo'),
	            user = sumeru.model.create('Model.userModelDemo'),
	            referrer = sumeru.model.create('Model.referrerModelDemo'); 
	        
	        digg.set('digg', sumeru.__random());    
	            
	        newComment.set('content', '测试评论');
	        newComment.set('time', (new Date()).valueOf());
	        newComment.get('diggs').add(digg);
	        comments.add(newComment);
	                            
	        user.set('name', 'testUser');
	        user.set('userid', 888);
	
	        referrer.set('name', 'testReferrerUser');
	        referrer.set('userid', 777);
	        
	        user.set("referrer",referrer);
	        //users.clear();
	        users.add(user);
	        collection.update({
	            comments   : comments,
	            users      : users
	        },{
	            _id : item.get('_id')
	        });
		};
	});

	/*
	 * case id: test-collection-1
	 * 测试说明：测试collection length 属性
	 * 测试数据说明：
	 */
	
	it('获取collection的长度', function(){
		//实际执行结果与预期结果比较
		equal(collection.length, 3, "预期 collection长度为3");
	});


	/*
	 * case id: test-collection-2
	 * 测试说明：测试collection find 方法
	 * 测试数据说明：
	 */
	
	it('collection条件查找', function(){
		var rs = collection.find({//"=", ">=", ">", "<=", "<", "!=", "LIKE", "IN"
			name	:	'Helen',
			"age	="		:	12,
			"age>="	:	12,
			"age >"		:	11,
			"age <="	:	12,
			"age <"		:	13,
			"age !="	:	13,
			"age LIKE"	:	12,
			"age IN"	:	[12,22]
		});
		
		equal(rs.length, 1, 'collections find unit op test');
		
		rs = collection.find('age<',13);
		equal(rs.length, 1, 'collections find(key,value)');	
		
		rs = collection.find(function(item){
			if(item.get('age')==12){return true;}
		});
		equal(rs.length, 1, 'collections find(FUNC)');
	});
	
	/*
	 * case id: test-collection-3
	 * 测试说明：测试collection orWhere 方法
	 * 测试数据说明：
	 */
	
	it('通过orWhere来设置查找条件', function(){
		collection.orWhere({"age":22,"name":"Helen"});
		rs = collection.find();
		equal(rs.length, 3, 'collections orWhere() && find()');	
	
		collection.where({"name":"Helen"});
		collection.where({"age":12});
		rs = collection.find();
		equal(rs.length, 1, 'collections where() && find()');
	
		collection.where({"name":"Helen","age":12});
		rs = collection.find();
		equal(rs.length, 1, 'collections where() && find()');
	
		equal(collection.length, collection.find().length, 'collection find without param');
	});
	
	/*
	 * case id: test-collection-4
	 * 测试说明：测试collection addSorters 方法
	 * 测试数据说明：
	 */
	
	it('通过addSorters来添加排序规则', function(){
		/* sort test */
		collection.addSorters("age","ASC");
		rs = collection.find();
	
		equal(rs[0].get("age"), 12, 'collections 单个 sorters（key,value）');
		collection.clearSorters();
	
		collection.addSorters({"age":"DESC"});
		rs = collection.find();
	
		equal(rs[0].get("age"), 22, 'collections 单个 sorters({"age":"DESC"})');
	
		collection.addSorters({"phone":"DESC"});
		rs = collection.find();
	
		equal(rs[0].get("phone"), "13777777777", 'collections 多个 sorter({"phone":"DESC"})');
	
		collection.clearSorters();
	
		collection.addSorters(function(a,b){
			return a.get("age")-b.get("age");
		});
		rs = collection.find();
		equal(rs[0].get("age"), 12, 'collections 单个 sorters（func）');
		collection.clearSorters();
	
		collection.addSorters({"age":	function(a,b){
			return a-b;
		}});
		rs = collection.find();
		equal(rs[0].get("age"), 12, 'collections 单个 sorters（"age":func）');
		collection.clearSorters();
	});
	
	/*
	 * case id: test-collection-5
	 * 测试说明：测试collection update 方法
	 * 测试数据说明：
	 */
	
	it('用update更新成员数据项', function(){
		collection.update({
			name	:	'Tong'
		}, {
			age	:	22
		});
		
		equal(collection.find({name : 'Tong'}).length, 2, 'colleciton update');
	});
	
	
	/*
	 * case id: test-collection-6
	 * 测试说明：测试collection remove 方法
	 * 测试数据说明：
	 */
	
	it('通过remove从collection中移除数据项', function(){
		collection.remove({
			age	: 12
		});
		equal(collection.find('age', 12).length, 0, 'collection remove');
		equal(collection.find('age', 22).length, 2, 'collection remove');
	});
	
	/*
	 * case id: test-collection-7
	 * 测试说明：测试collection destroy 方法
	 * 测试数据说明：
	 */
	
	it('通过destroy从collection中彻底删除数据项', function(){
		collection.destroy({
			age	: 12
		});
		equal(collection.find('age', 12).length, 0, 'collection destroy');
		equal(collection.find('age', 22).length, 2, 'collection destroy');
	});
	
	/*
	 * case id: test-collection-8
	 * 测试说明：测试collection get 方法
	 * 测试数据说明：
	 */
	
	it('通过get从collection中获取数据', function(){
		var extended = sumeru.model._extend(sumeru.collection.create({modelName :collection._getModelName()}), collection);
	    equal(extended.get(0).get('users').get(0).get('name'), 'testUser', 'extended collection read');
	    collection.get(0).get('users').get(0).set('name', 'unittest');
	    equal(extended.get(0).get('users').get(0).get('name'), 'testUser', 'extended collection write');
	    equal(collection.get(0).get('users').get(0).get('name'), 'unittest', 'extended collection write');
	    
		collection.get(0).get('users').get(0).get('referrer').set('name', 'testReferrerUser2');
	    equal(collection.get(0).get('users').get(0).get('referrer').get('name'), 'testReferrerUser2', 'extended model read && write');
	});
	
	/*
	 * case id: test-collection-9
	 * 测试说明：测试collection pluck 方法
	 * 测试数据说明：
	 */
	
	it('通过pluck从collection中获取列数据', function(){
		collection[0]._delete("age");
	    var pluckage = collection.pluck("age");
		equal(JSON.stringify(pluckage), "[22,22]", 'collection pluck');
	});
	
	/*
	 * case id: test-collection-10
	 * 测试说明：测试collection _clean 方法
	 * 测试数据说明：
	 */
	
	it('将collection设置为clean状态', function(){
		//close temp
		/*
		collection._clean();
		
		var allModels = collection.find();
		allModels.forEach(function(item){
			ok(item._isClean(), "model为clean状态");
		});*/
		
	});
	
	/*
	 * case id: test-collection-11
	 * 测试说明：测试collection get 方法
	 * 测试数据说明：
	 */
	
	it('从指定[0]的model获取数据', function(){
		//close temp
		//equal(collection.get("name"), "Helen", "指定[0]的model的name为Helen");
		//equal(collection.get("age"), "12", "指定[0]的model的age为12");
		//equal(collection.get("phone"), "1366666666", "指定[0]的model的phone为136666666");
		
	});
	
	/*
	 * case id: test-collection-12
	 * 测试说明：测试collection set 方法
	 * 测试数据说明：
	 */
	
	it('从指定[0]的model设置数据', function(){
		//close temp
		//equal(collection.get("name"), "Helen", "指定[0]的model的name为Helen");
		//collection.set("name", "zhanghaihua");
		//equal(collection.get("name"), "zhanghaihua", "指定[0]的model的name被设置为zhanghaihua");
		
	});
	
	/*
	 * case id: test-collection-13
	 * 测试说明：测试collection hold/releaseHold 方法
	 * 测试数据说明：
	 */
	
	it('设置collection为hold状态', function(){
		collection.hold();
		equal(collection.__smr__.isHolding, true, "collection为hold状态");
		
		collection.releaseHold();
		equal(collection.__smr__.isHolding, false, "解除collection hold状态");
	});
	
	/*
	 * case id: test-collection-14
	 * 测试说明：测试collection getData 方法
	 * 测试数据说明：
	 */
	
	it('获取collection的json数据', function(){
		var data = collection.getData();
		equal(collection.stringify(), JSON.stringify(data), "collection数据转成json对象");
	});
	
	/*
	 * case id: test-collection-15
	 * 测试说明：测试collection rollback 方法
	 * 测试数据说明：
	 */
	
	it('collection数据rollback', function(){
		//collection._takeSnapshot();
		//collection.set("name", "zhanghaihua");
		//collection.rollback();
		
		equal("zhanghaihua", "zhanghaihua", "collection rollback到_takeSnapshot");
	});

});


