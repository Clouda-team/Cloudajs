/*
 * 测试文件描述
 * 文件命名: newPkg.js
 * 测试模块：newPkg
 * 作者：zhanghaihua@baidu.com
 * 重点说明：
 * Keeping Tests Atomic
 */


var expect = require("chai").expect;
var run = require('./support/sumeru.js');
var fw = run.fw;

/*
describe('sumeruReady', function () {
	it("sumeru initialized", function( done ){
    	fw.sumeruReady( function (dbready) {
    		done();
    	});
  	});  	
});*/

/*
 * case id: test-newPkg-1
 * 测试说明：同步实例
 * 测试数据说明：
 */

describe('newPkg', function () {
  describe("#addSubPackage", function () {
    it("完成增加名称空间", function () {
    	var a = fw.addSubPackage("abc");
    	expect(a).to.be.an.instanceof(Object);
		//expect(fw.addSubPackage("abc")).to.throwError();
    });
    
	it("should cause throw error", function () {
    	//var a = fw.addSubPackage("abc");
		//console.log(a);
		var fn = function() {
			return fw.addSubPackage("abc");
		}
    	//expect(a).to.be.an.instanceof(Object);
		expect(fn).to.throw('package ["' + 'sumeru_AppFW.abc' + '"] already exists');
    });

  });
  
  describe("#__reg", function () {
    it("完成向名称空间中注册资源", function () {
    	var a1 = fw.addSubPackage('a1');
		var b1 = a1.addSubPackage('b1');
 
 		// sync __reg , async __load
		fw.a1.b1.__reg('age',100,true);
		
		expect(fw.a1.b1.age).to.equal(100);
		expect(fw.a1.b1.__load("age")).to.equal(100);
    });
  });
    
    describe("#clear", function () {
    it("隐藏根命名空间下的私有成员", function () {
    	//var root = sumeru; // 引用最初的FW对像，
    	var a = fw.addSubPackage('a');
		var b = a.addSubPackage('b');
 
 		// sync __reg , async __load
		fw.a.b.__reg('age',100,true);
		
		//fw.clear();
		//expect(fw.a.b.age).to.be.an('undefined');
		expect(fw.a.b.age).to.equal(100);
		
		//console.log(root.a.b.age === 100);     // true
		//expect(fw.addSubPackage).to.be.an('undefined');
		//expect(fw.a.addSubPackage).to.be.an('undefined');
		//expect(fw.a.b.addSubPackage).to.be.an('undefined');

		//expect(a.addSubPackage).to.be.an('undefined');
		//expect(b.addSubPackage).to.be.an('undefined');
    });
    
  });
  
});
