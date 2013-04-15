# API 文档 


##Router

用于建立URL中hash与Controller之间的对应关系，一个Controller可以对应多个URL，但是一个URL只能对应一个Controller。

* #### add({pattren:'', action:''})

	在router中添加一组hash与Controller的对于关系
	
		sumeru.router.add(

			{
				pattern: '/studentList',
				action: 'App.studentList'
			}

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
	
	* datetime
	
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
	
		引入一个Collection

		
		
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



## transition

当场景发生转换时，通过transition定义场景转换效果。

	 doRender(viewName,transition)
	 
* viewName

	需要渲染View的名称


* ### transition

	
	* #### push

		推出
	
		* 方向
	
			* left
		
				从左向右推出
		
			* right
		
				从右向左推出
		
			* up
		
				从上向下推出
		
			* down
		
				从下向上推出
		
	* #### rotate

		旋转

		* 方向
	
			* left

		
			* right
		

	* #### fade

		渐变

		* 方向
	
			* z-index
		
				垂直方向


	* #### shake

		退出场景时先缩小后放大退出，进入场景从左或者右边推入


		* 方向
	
			* left
		
				从左推入进场
		
			* right
	
				从右推入进场

	* #### none

		没有转场效果


		* 方向
	
			* z-index
		
				垂直方向
	
	实例：
		
		env.onrender = function(doRender){
	 		doRender('student', ['push', 'down']);
		};

## Controller

如果你曾经接触过MVC模型，那么将会很熟悉Controller的概念。在sumeru中，Controller是每个场景的控制器，负责实现App的核心业务逻辑。

* #### create()

	创建一个Controller

		App.studentList = sumeru.controller.create(function(env,session){});
 
 
* ### env

	env包含Controller中常用的一些方法。


	* #### redirect(queryPath,paramMap,isforce)

		 一个Controller跳转到另一个Controller
	 
	 		env.redirect('/studentList',{'class':'101'});
	 	
	 	* queryPath
	 
	 		router中pattern的值
	 	
	 	* paramMap
	 
	 		需要向跳转Controller传递的参数
	 	
	 	
	 	* isforce
	 
	 		是否强制生成一个全新的Controller实例。
	 		
	 		
	 	如果在redirect中使用paramMap，可以在跳转目标Controller的create()中"param"接受参数。
	 	
	 		App.studentList = sumeru.controller.create(function(evn,session,param){
	 		
	 		
	 		});

	 	
	* #### refresh()

		重新加载当前Controller
	
			env.refresh();
		
		
	* #### onload()

		onload()是Controller的第一个时态，Controller中需要使用的数据都在这个时态中加载。
	
		 	env.onload = function(){	 		
	 			return [ ];	 		
	 		};


	* #### onrender()

		当数据获取完成后，这些数据需要显示在视图(View)上，这个过程通过onrender()中的代码来实现，这是Controller的第二个时态，负责完成对视图(View)的渲染和指定转场方式。
	
			env.onrender = function(doRender){	
				doRender(viewName,transition);		
			};

	* #### onready()

		这是Controller的第三个时态，在View渲染完成后，事件绑定、DOM操作等业务逻辑都在该时态中完成；每段逻辑使用session.event包装，从而建立事件与视图block的对应关系。

	 		env.onready = function(){
	
				session.event(blockID,function(){		
		
				});
	
	 		};

	* #### onsleep()

		当Controller长时间不处于活动状态时，可能会被置为睡眠状态，以确保正在运行中的Controller具有足够的资源。如果需要在Controller被暂停之前运行一些逻辑（比如暂存状态等），可以在onsleep()中完成。
	
	 		env.onsleep = function(){
	 		};

	* #### onresume()

		当处在睡眠状态的Controller被唤醒时，onresume()时态将被调用。该时态可用于执行一些恢复性业务逻辑

	 		env.onresume = function(){
	 		};	

	* #### ondestroy()

		当Controller被销毁时，ondestroy()将被调用。

			env.ondestroy = function(){
	 		};	


	* #### onerror()

		当前Controller收到错误消息时被触发
	
			env.onerror = function(){
	 		};	

	
	* #### subscribe
	
		关于subscribe方法请查看“Publish/Subscribe”章节。
			
			
			
* ### session


	* #### set(key,value)

		在session中设置“key”的值
		
			session.set('page',10);

	* #### get(key)
	
		获取session中“key”的值
		
			session.get('page');
			
	* #### bind(block-id,dataMap)
	
		将数据绑定到视图中block-id容器
		
			session.bind('student-list',{
							
				data : Collection.find()
			
			});
			
		一般在subscribe(publishName,function(Collection){})的function(Collection){}中使用。

	* #### event(block-id,function(){})
	
		建立事件与视图block的对应关系
		
			session.event('student-list'，function(){
			
				var submitButton = document.getElementById('submit');
				
				submitButton.addEventListener('click', submitMessage); 
			
			});
			
	* #### eventMap(id,eventMap)
	
		对一个标签绑定多个事件
		
			session.eventMap('inputMessage',{
			
				'focus':function(e){	
					console.log('focus!');
				},
				
				'blur':function(e){
					console.log('blur');
				},
			
			});
			
		* id
		
			View中标签ID
		
		* eventMap
		
			事件Map
			
	* #### commit()
	
		触发数据对应视图block的更新
		
			session.commit();
	

### Sub Controller

创建的Controller可以作为另外一个Controller的子Controller使用。


* #### callSubController(queryPath,options)

	在当前Controller中调用一个子Controller，配合show()和hide()方法使用。
	
							
	* #### isready()
		
		当前Controller的子Controller已经加载完成
		
			env.isready = function(){
			};
		
		
	* #### show()
	
		显示当前当前Controller的子Controller
		
			env.show = function(){
			};
		
	* #### hide()
	
		隐藏当前Controller的子Controller
		
			env.hide = function(){
			};
		
	* #### destory()
	
		销毁当前Controller的子Controller
		
			env.destroy = function(){
			};		
						
			
## Publish/Subscribe


### Subscribe


* #### subscribe

	订阅被发布的数据，与pubilsh配合使用
		
	* 不带参数 env.subscribe(publishName, function(collection){});
			
			env.subscribe("pub-allStudents", function(studentCollection){

     		});
     			
     	* pulishName
     		
     		所定义的Publish的唯一名称，在一个App内全局唯一，该参数与sumeru.publish(modelName, publishName,function(callback))中的publishName名称需要保持一致。
     		
     		
     	* function(Collection){}
     		
     		Subscribe成功获得数据时，被调用的响应方法。
     		
     		
     * 带参数 env.subscribe(publishName,arg1,arg2, ... , function(collection){});

     	
     		env.subscribe("pub-StudentsWithGender", "male", function(msgCollection){

     		});



* #### subscribeByPage

	分页订阅数据


	* 不带参数 env.subscribeByPage(publishName, options, function(collection){});
	
			var pageOption{	
					
				pagesize : 1, 
	        	page : 2,
	        	uniqueField : 'time' 
	        	
			};
			
			env.subscribeByPage("pub-allStudents", pageOption, function(studentCollection){

     		});
     			
     		
     	* options
     		
     		分页设置
     		
     		* pageSize
     		
     			每页数据的数量
     			
     		* page
     		
     			页码
     			
     		* uniqueField
     		
     			 排序的唯一字段名    		
     		
     * 带参数 env.subscribeByPage(publishName, options, arg1,arg2, ... , function(collection){});

     	
     		env.subscribeByPage("pub-StudentsWithGender", pageOption, "male", function(msgCollection){

     		});



* #### prioritySubscribe

在断线重新连接的情况下，使用prioritySubscribe方法订阅数据优先被调用，使用方式与subscribe相同。



### Publish


* #### publish

	发布数据的方法，其运行在Server上。
	
	* 不带参数 sumeru.publish(modelName,pubName,function(callback){},options)
	
	
		* modelName
		
			被发布数据所属的Model名称
		
		* pubName
	
			所定义的Publish的唯一名称，在一个App内全局唯一，该参数与Controller中subscribe()成对使用。

		* function(callback)
		
			描述数据发布规则的自定义函数，在这里定义被发布数据所需要符合的条件。
			
		* options
		
			可在此添加以下六种事件
			
			* beforeInsert
			
				在实际插入数据到数据库前的事件
			
					beforeInsert : function(serverCollection, structData, userinfo, callback){
            			callback(structData);
	    			}
	    			
	    		* structData
	    		
	    			需要插入到数据库的数据，我们可以对该数据进行操作，然后将数据插入到数据库中，如果对数据没有修改，则将原数据添加到数据库中。
	    			
	    		* callback
	    			
	    			before系列的事件中如果不添加 callback()，将阻止数据对数据库的影响。 
	    			
	    		* callback(structData)
	    		
	    			如果需要对原数据进行修改，可以传入参数structData
	    			
	    	* afterInsert
	    	
	    		在实际插入数据到数据库后的事件
	    		
	    			afterInsert : function(serverCollection, structData){
        			}
        			
    		* beforeUpdate
			
				在实际更新数据库数据前的事件
			
					beforeUpdate : function(serverCollection, structData, userinfo, callback){
            			callback();
	    			}
	    			
	    	* afterUpdate
	    	
	    		在实际更新数据库数据后的事件
	    		
	    			afterUpdate : function(serverCollection, structData){
        			}
        			
      		* beforeDelete
			
				在实际删除数据库数据前的事件
			
					beforeDelete : function(serverCollection, structData, userinfo, callback){
            			callback();
	    			}
	    			
	    	* afterDelete
	    	
	    		在实际删除数据库数据后的事件
	    		
	    			afterDelete : function(serverCollection, structData){
        			}      	
			
	实例：
					
		module.exports = function(sumeru){
	
    		sumeru.publish('student', 'pub-allStudents', function(callback){
    		
    			var collection = this;

          		collection.find({}, function(err, items){
              		callback(items);
          		});

      		});       	  
  	 	}
	
	* 带参数 sumeru.publish(modelName,pubName,function(arg1, ..., callback){},options)
	
	实例：

		module.exports = function(sumeru){
	
    		sumeru.publish('student', 'pub-allStudents', function(gender,callback){
    		
    			var collection = this;

          		collection.find({'gender':gender}, function(err, items){
              		callback(items);
          		});

      		});       	  
  	 	}

* #### publishByPage

	分页发布数据
	
	sumeru.publishByPage(modelName,pubName,function(arg1,arg2,...,pageOptions, callback){},options)
	
	* options
	
		分页设置，有Controller中subscribeByPage()传入。
		
	实例：
	
		sumeru.publishByPage('student', 'pub-allStudents', function(gender,options,callback){
    		
    			var collection = this;

          		collection.find({ sort    :{'time':-1},
          						  limit   : options.pagesize,
          						  "gender": gender        						 
          						 }, function(err, items){
              		callback(items);
          		});

      	});


* #### publishPlain

	用于发布简单对象，而非Collection。
	
	sumeru.publishPlain(modelName,pubName,function(callback){},options)
	
	实例：
	
	如果需要发布Collection中数据的总数量，可使用下面方法：
	
		fw.publishPlain('student', 'pub-allStudents', function(callback){
	    	var collection = this;

	   		collection.count({},function(err, count){
            	callback(count);
       		});
		});
	
	

	下面的三种方法是包含权限中心的身份验证的Publish。


* #### securePublish 

	在身份验证成功的情况下发布数据
	
		sumeru.publish(modelName,pubName,function(userinfo, callback){},options)


* #### securePublishByPage 

	在身份验证成功的情况下分页发布数据
	
		sumeru.securePublishByPage(modelName,pubName,function(pageOptions,userinfo, callback){},options)


* #### securePublishPlain 

	在身份验证成功的情况下发布简单对象

		sumeru.securePublishPlain(modelName,pubName,function(userinfo, callback){},options)


## Auth

* #### login

	使用本地账户登陆，有两种给定参数的方式
	
	* sumeru.auth.login(token, password, expires, callback)
	
			sumeru.auth.login(token, value, 1000, function(){
			  
			});
			
		* token
		
			用户信息的唯一标识，比如邮箱，电话号码，身份证号等等
			
		* password
		
			用户密码
			
		* expires
		
			有效期
						
			
	* sumeru.auth.login({token: 'name', password: 'cryption', callback: function,expires: 1000})

			sumeru.auth.login({
        		token: token,
           		password: value,
            	callback: callback,
            	expires: 1000
        	});
        	
* #### baidu.login

	使用百度账户登陆,有两种给定参数的方式
	
	* sumeru.auth.baidu.login(token, password, verifycode, callback)
	
			sumeru.auth.login(token, value, 1000, verifycode, function(){
			  
			});
	
	* sumeru.auth.baidu.login({token: 'name', password: 'cryption', callback: function,verifycode:'code',expires: 1000})
	
			sumeru.auth.baidu.login({
        		token: token,
           		password: value,
            	callback: callback,
            	verifyCode: code,
            	expires: 1000
        	});


* #### logout

	退出

		sumeru.auth.logout();

* #### register

	sumeru提供一套帐号系统，可直接使用register方法完成注册
	
	sumeru.auth.register(token, password, info, callback);
	
		sumeru.auth.register(token, password, {age:18}, function(){});
		
	* info
	
		用户信息除用户名和密码以外的信息
		

* #### update 

	更新某用户的信息
	
	sumeru.auth.update(user,callback);
	
		sumeru.auth.update({info:{age: 18} },function(){});
		
	* user
	
		sumeru内建的user Model，结构如下：
		
			{	
				token：‘’,
				password : '', 
				info: {}
			}
		
		需要更新用户的哪项信息，直接传入值即可。

* #### getToken

	获取token

		sumeru.auth.getToken();

* #### getModel

	获取用户Model
	
		sumeru.auth.getModel();


* #### isLogin

	判断当前是否登陆
	
		sumeru.auth.isLogin();


* #### getVerifyCode

	获取图片验证码
	
		sumeru.auth.getVerifyCode();


## Library


* #### create(factory)

	创建一个Library库，sumeru.Library.create(factory);
		
		
		Library.timeUtils = sumeru.Library.create(function(exports){	
			exports.formatDate = function(time){
				return time.getFullYear();
			};
		});

* #### getter

	使用一个Library
	
		Library.timeUtils.formatDate(new Date());
		
		
## Reachability

网络连接状态


* #### getStatus()

	获取当前网络状态

		sumeru.reachability.getStatus();


网络状态有以下三种：

* #### STATUS_OFFLINE

	当前处于离线状态

		sumeru.reachability.STATUS_OFFLINE;
	
	
* #### STATUS_CONNECTING

	当前处于网络连接状态

		sumeru.reachability.STATUS_CONNECTING;


* #### STATUS_CONNECTED

	当前已连接到网络

		sumeru.reachability.STATUS_CONNECTED;



## Package.js		


package.js用于将文件之间的依赖关系添加到sumeru中，我们可以使用下面的语法编写该文件：

	 sumeru.packages(
	 	'student.js,
	 	'class/',
	 	.....
	 )
	 
如果参数为文件夹，则sumeru会加载相应文件夹下的package.js。
	 
并不是在所有文件夹下新建文件或者文件夹后需要修改package.js文件，view文件夹和publish文件夹例外。


	 	
 	
 
	 
	 	


	
		
	
		

		
	
