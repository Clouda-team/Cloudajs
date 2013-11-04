/*
 * 测试文件描述
 * 文件命名: test.js
 * 测试模块：sample
 * 作者：zhanghaihua@baidu.com
 * 重点说明：
 * Keeping Tests Atomic
 */
 
var assert = require("assert")

/*
 * case id: test-template-1
 * 测试说明：同步实例
 * 测试数据说明：
 */
 
describe('Array', function(){
  describe('#indexOf()', function(){
    it('should return -1 when the value is not present', function(){
      assert.equal(-1, [1,2,3].indexOf(5));
      assert.equal(-1, [1,2,3].indexOf(0));
    });
  });
});


/*
 * case id: test-template-2
 * 测试说明：异步实例
 * 测试数据说明：
 */
describe('a suite of tests', function(){
  this.timeout(500);

  it('should take less than 500ms', function(done){
    setTimeout(done, 300);
  });

  it('should take less than 500ms as well', function(done){
    setTimeout(done, 200);
  });
});

