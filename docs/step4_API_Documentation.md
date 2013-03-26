# API 文档

##Router

用于建立URL中hash与Controller之间的对应关系，一个Controller可以对应多个URL，但是一个URL只能对应一个Controller。

* #### add({pattren:'', action:''})

	在router中添加一组hash与Controller的对于关系
	
		sumeru.router.add(
			{				pattern: '/studentList',				action: 'App.studentList'			}
		);

	*  pattern

		URL中hash部分的值
	
	*  action

		对应Controller的名称


* #### setDefault(controllerName)

	设置默认启动Controller
	
		sumeru.router.setDefault('App.studentList');
		
		
## Model

Model用来定义App的数据模型。

	 Model.student = function(exports){
    	exports.config = {
        	fields: [
        		{name : 'studentName', type: 'string'},
           		{name :	'age',         type: 'int'},
          		{name :	'gender',      type: 'string'}
        	]
    	};
     };

### 属性

* #### name

	字段的名称

* #### type

	字段的数据类型，包括一下数据类型：
	
	* int
	
		整型
	
	* datatime
	
		日期
	
	* string
	
		字符串数
	
	* object
	
		对象
		
	* array
	
		数组
	
	* model
	
		数据模型
	
	* collection
	
		数据集合

* #### relation

	使用relation时type属性值必须为“model”。
	
		{name: 'class',  type: 'model', relation: 'one' , model:'Model.class'},
	
	* one
	
		引用一个Model
		
	* many
	
		引入一个Model的集合（Collection）

		
		
* #### defaultValue

	字段的默认值

		{name: 'gender',  type: 'string', defaultValue:'male'},


* #### validate()

		{name: 'name',  type: 'string', validation:'length[1,20]'},

		
	字段的验证，validation包括以下方法：
	
	* length[min,max] 
		
		字段值的长度在min-max的范围。
		
	* minlength(min)
	
		字段值不小于min
		
	* maxlength(min)
	
		字段值不大于min
		
	
	* required
	
		字段值不能为空
		
	
	* unique
	
		字段值必须唯一
		
	* number	
		
		字段值必须为数字		
		
	* telephone
	
		字段值必须为电话号码格式
		
	* mobilephone
	
		字段值必须为手机号码格式
		
	* email
	
		字段值必须为email格式
		
	* onlyletter
	
		字段值必须是字母
		
	* nospecialchars
	
		字段值不能包含特殊字符
		
	* date
	
		字段值必须是日期格式
		
	* url
		
		字段值必须是URL
		
	* chinese
	
		字段值必须省中文
		
	
	注：多个验证条件之间使用" | "连接

		{name: 'name',  type: 'string', validation:'length[1,20]|required'},
		
	* #### 自定义验证方法( addrule() )

		除了上面的验证方法外，还可以自定义验证方法。
		
			sumeru.validation.addrule(ruleName,{
			
										"runat" : "client",
										"regxp" : " ",
										"func"  : function(){},
										"msg"   : "",
										
									   });

		* rulename
		
			验证方法的名称，如"chinese"、"url"
			
		* runat
		
			定义在哪个端上（client/server）进行验证
			
			* client
			
				在客户端上进行验证
				
			* server
				
				在服务器端进行验证
				
			* both
			
				两段都需要验证
			
		* regxp
		
			使用自定义正则表达式对字段进行验证
			
		* func
		
			使用自定义函数对字段进行验证
			
		* msg
		
			验证后返回的信息

* #### create(modelName)
		
	创建一个model
	
		var newStudent = sumeru.model.create('Model.student')

* #### setter
		
		newStudent.studentName = 'John';		
		
* #### set(key,value) (--deprecated)

	设置Model中相应字段的值
	
		newStudent.set('studentName','John');

		
* #### setData(dataMap)
		
	使用dataMap对Model赋值
	
		newStudent.setData({'studnetName' : 'Smith',
							        'age' : 19,
							     'gender' : 'male'
						  });

* #### getter
		
		var name = newStudent.studentName;
		
* #### get(key) (--deprecated)
		
	获取某一字段的值
	
		newStudent.get('studentName');
		
* #### getId()
		
	获取model的唯一Id
	
		newStudent.getId();
		
* #### getData()
		
	返回一个JSON数据对象
	
		newStudent.getData();
		
* #### destroy()
		
	删除model
	
		newStudent.destroy();
		
* #### onValidation(ispass, runat, validationResult)

	 对Model验证结果的监听方法
	 
	 * ispass
	 
	 	验证是否通过的标志
	 	
	 	* true
	 	
	 		验证通过
	 	
	 	* false
	 	
	 		验证不通过
	 	
	 * runat
	 
	 	返回进行验证的端（客户端或者服务器端）
	 	
	 	* client
	 	
	 		表示在客户端进行验证
	 		
	 	* server
	 	
	 		表示在服务器端进行验证
	 
	 * validationResult
	 
	 	验证返回信息
	 	
	 		newStudent.onValidation = function(ispass, runat, validationResult){
	 		
				if(ispass){console.log("Validation success ！");}

				console.log((runat=='client'?'Client':'Server')+(ispass==true?'Validation Success!':'Validation failed!'));

				for(var i = validationResult.length-1; i>=0; i--){
					console.log(runat=='client'?'Client':'Server')+'result is：'+validationResult[i].msg);
				}
			};
	 
	 	
## Collection

Collection是Model的集合，我们之前曾使用过的subscribe()返回的结果集即是Collection。

	session.studentCollection = env.subscribe("pub-allStudents",function(myCollection){

    });


* #### create(dataMap)

	 创建一个Collection
	 
	 	sumeru.collection.create({'studnetName' : 'Smith',
							        	  'age' : 19,
							           'gender' : 'male'
				s		        });
   
    
* #### size()
		
	获取collection中包含Model的数量。
	
		session.studentCollection.size();
	
		
* #### add(row)
		
	在collection中添加一行数据（每行数据实际是一个Model）。
	
		session.studentCollection.add(newStudent);
	
* #### update(updateMap,where)
		
	更新collection中满足条件的数据。
	
		session.studentCollection.update({'name':'Jack'},{'name':'John'});
	
* #### remove(where)
		
	将数据从collection中去除，但并不实际删除。
	
		session.studentCollection.remove({'name':'John'});
		
	当没有参数时，去除collection中所有数据。		
	
* #### destroy(where)
		
	将数据从collection中实际删除。
	
		session.studentCollection.destroy({'name':'John'});
		
	当没有参数时，删除collection中所有数据。
	
* #### setData(dataMap)
		
	使用dataMap对Model赋值
		
* #### find(where)

	查询Collection中符合条件的所有数据。
		
		session.studentCollection.find({'name':'John'});
	
	当没有参数时，返回所有的数据。
		
* #### addSorters()
		
	collection中添加排序方法
	
		session.studentCollection.addSorters('time','DESC')
		
	collection按照"time"降序排序。
		
* #### clearSorters()
		
	清空collection中排序方法
	
		session.studentCollection.clearSorters();
		
* #### applyStorters()
		
	手动执行所有的排序方法
	
		session.studentCollection.applyStorters();
		
* #### get()
		
	根据下标取出对应的数据
	
		session.studentCollection.get(2);	
		
		
* #### toJSON()
		
	返回一个JSON对象
	
		session.studentCollection.toJSON();
		
* #### getData()
		
	获取包含所有数据的数组
	
		session.studentCollection.getData();
		
* #### save()
		
	将collection的修改保存到Server。
	
		session.studentCollection.save();
		
* #### pluck(key)
		
	返回Collection某一字段所有数据的数组
	
		session.studentCollection.pluck('age');
		
		
* #### hold()
		
	暂停collection实时更新
	
		session.studentCollection.hold();	
		
* #### releaseHold()
		
	恢复对collection的实时更新
	
		session.studentCollection.releaseHold();
			
* #### where()
		
	在collection中指定查询条件，需要与find、update、remove、destroy连用。
	
		session.studentCollection.where({'gender':'male'});
		
		session.studentCollection.find();
		
	返回collection中‘gender’值为‘male’数据的数组。
	
						
* #### orWhere()
		
	在collection中添加一个“or”条件，需要与find、update、remove、destroy连用。
	
		session.studentCollection.orWhere({'gender':'male'});
		
		session.studentCollection.find();
		
		
* #### clearWheres()
		
	清空collection中所有查询条件
		
		session.studentCollection.clearWheres()
		
		
		
## View

View使用handlebars组件作为模板引擎，handlebars语法请参考官网。

sumeru对handlebars的语法做了一些扩展：

* #### {{> viewName}}

	在一个View中引用另一个View。
	
* #### {{$ alert("data.length"); }}

	在View中直接执行Javascript代码，并将返回结果输出在View中。




## To Be Continue

	 
 
 
	 
	 	


	
		
	
		

		
	