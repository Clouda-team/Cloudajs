# API 文档 


##Router

用于建立URL(其路径部分)和Controller的对应关系，一个Controller可以对应多个URL，但是一个URL只能对应一个Controller。

* ### add

        语法：add({pattren:'', action:''})

	在router中添加一组pattren与Controller的对于关系
	
		sumeru.router.add(
			{
				pattern: '/studentList',
				action: 'App.studentList'
			}
		);

	*  pattern

		URL(其路径部分的值)
	
	*  action

		对应Controller的名称

    如果你想**关闭Server渲染**，可使用下面方法：
                                                    
        sumeru.router.add(
            {
             	pattern: '/studentList',
                action: 'App.studentList'
             	server_render:false
         	}
        )

    *  server_render

        Server渲染开关，false：关闭，默认为开启


* ### setDefault

        语法：setDefault(controllerName)

	设置默认启动Controller
	
		sumeru.router.setDefault('App.studentList');

* ### externalProcessor.add(processor);

        语法：sumeru.router.externalProcessor.add(processor);

    添加外部处理器

        添加一个backbone的外部处理器

        sumeru.router.externalProcessor.add(Backbone.Router.extend());
		
		
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

##### 属性

* ##### name

	字段的名称

* ##### type

	字段的数据类型，包括一下数据类型：

<table border="0" cellpadding="0" cellspacing="0" style="margin-left: 30px;" >

	<tr style="background-color:#3982ff">
		<th>类型</th>
		<th>意义</th>
	</tr>

	<tr>
		<th>int</th>
		<th>整形</th>
	</tr>

	<tr>
		<th>datetime</th>
		<th>日期</th>
	</tr>

	<tr>
		<th>string</th>
		<th>字符串数</th>
	</tr>
	<tr>
		<th>object</th>
		<th>对象</th>
	</tr>
	<tr>
		<th>array</th>
		<th>数组</th>
	</tr>
	<tr>
		<th>model</th>
		<th>数据模型</th>
	</tr>
	<tr>
		<th>collection</th>
		<th>数据集合</th>
	</tr>

</table>
	

* ### relation

	使用relation时type属性值必须为“model”。
	
		{name: 'class',  type: 'model', relation: 'one' , model:'Model.class'},
	
	* one
	
		引用一个Model
		
	* many
	
		引入一个Collection

		
		
* ### defaultValue

	字段的默认值

		{name: 'gender',  type: 'string', defaultValue:'male'},


* ### validation

		{name: 'name',  type: 'string', validation:'length[1,20]'},

		
	字段的验证，validation包括以下方法：


<table border="0" cellpadding="0" cellspacing="0" style="margin-left: 30px;">

	<tr style="background-color:#3982ff">
		<th>方法</th>
		<th>意义</th>
	</tr>

	<tr>
		<th>length[min,max] </th>
		<th> 字段值的长度在min-max的范围。</th>
	</tr>

	<tr>
		<th>minlength(min)</th>
		<th>字段值不小于min</th>
	</tr>

	<tr>
		<th>maxlength(min)</th>
		<th>字段值不大于min</th>
	</tr>
	<tr>
		<th>required</th>
		<th>字段值不能为空</th>
	</tr>
	<tr>
		<th>unique</th>
		<th>字段值必须唯一</th>
	</tr>
	<tr>
		<th>telephone</th>
		<th>字段值必须为电话号码格式</th>
	</tr>
	<tr>
		<th>mobilephone</th>
		<th>字段值必须为手机号码格式,长度为11位且必须为数字</th>
	</tr>
	<tr>
		<th>email</th>
		<th> 字段值必须为email格式</th>
	</tr>

	<tr>
		<th>onlyletter</th>
		<th>字段值必须是字母</th>
	</tr>

	<tr>
		<th>nospecialchars</th>
		<th>字段值不能包含特殊字符</th>
	</tr>
	<tr>
		<th>date</th>
		<th>字段值必须是日期格式</th>
	</tr>
	<tr>
		<th>url</th>
		<th>字段值必须是URL</th>
	</tr>

	<tr>
		<th>chinese</th>
		<th>字段值必须是中文</th>
	</tr>


</table>
	
		
	
注：多个验证条件之间使用" | "连接

		{name: 'name',  type: 'string', validation:'length[1,20]|required'},
		
* ### addRule

	除了上面的验证方法外，还可以自定义验证方法。
		
		sumeru.validation.addRule(ruleName,{
										"runat" : "client",

										验证方法  ,

										"msg"   : "",
									   });

	* ruleName
		
		验证方法的名称，如"chinese"、"url"
			
	* runat
		
		定义在哪个端上（client/server）进行验证
			
		* client
			
			在客户端上进行验证
				
		* server
				
			在服务器端进行验证
				
		* both
			
			两段都需要验证

	* 验证方法：该API中框架提供三种自定义验证方法（**三种方法（regxp/func/asyncFunc）每次只能使用一种**）
			
        * regxp

            使用自定义正则表达式对字段进行验证

                  sumeru.validation.addRule(ruleName,{
                                                        "runat" : "client",

                                                        "regxp" : "()",

                                                        "msg"   : "",
                                                });

        * func

            使用自定义函数对字段进行验证

                  sumeru.validation.addRule(ruleName,{
                                                         "runat" : "client",

                                                         "func" : function(){},

                                                         "msg"   : "",
                                                });

        * asyncFunc

             该验证函数在服务器端运行，先获取指定modelObj的数据，然后根据asyncFunc中的方法进行验证，在callback中给出验证的结果。

                  sumeru.validation.addRule(ruleName,{
                                                        "runat" : "client",

                                                        "asyncFunc":function(callback,k,v,modelObj){}

                                                        "msg"   : "",
                                                });

    * msg

        验证失败后返回的信息

* ### create

        语法：create(modelName)
		
	创建一个model
	
		var newStudent = sumeru.model.create('Model.student')

* ### setter
		
		newStudent.studentName = 'John';		
		
* ### set

        语法：set(key,value)

	设置Model中相应字段的值
	
		newStudent.set('studentName','John');

		
* ### setData

        语法：setData(dataMap)
		
	使用dataMap对Model赋值
	
		newStudent.setData({'studnetName' : 'Smith',
							        'age' : 19,
							     'gender' : 'male'
						  });

* ### getter
		
		var name = newStudent.studentName;
		
* ### get

        语法：get(key)
		
	获取某一字段的值
	
		newStudent.get('studentName');
		
* ### getId

        语法：getId()
		
	获取model的唯一Id
	
		newStudent.getId();
		
* ### getData

        语法：getData()
		
	返回一个JSON数据对象
	
		newStudent.getData();
		
* ### destroy

        语法：destroy()
		
	删除model
	
		newStudent.destroy();
		
* ###  onValidation

        语法：onValidation(ispass, runat, validationResult)

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

	 详细代码和说明请参考《Examples》文档。
	 	
## Collection

Collection是Model的集合，我们之前曾使用过的subscribe()返回的结果集即是Collection。

	session.studentCollection = env.subscribe("pub-allStudents",function(myCollection){

    });


* ### create

        语法：create(dataMap)

	 创建一个Collection
	 
	 	sumeru.collection.create({'studnetName' : 'Smith',
							        	  'age' : 19,
							           'gender' : 'male'
						        });
   
    
* ### size

        语法：size()
		
	获取collection中包含Model的数量。
	
		session.studentCollection.size();
	
		
* ### add

        语法：add(row)
		
	在collection中添加一行数据（每行数据实际是一个Model）。
	
		session.studentCollection.add(newStudent);
	
* ### update

        语法：update(updateMap,where)
		
	更新collection中满足条件的数据。
	
		session.studentCollection.update({'name':'Jack'},{'name':'John'});
	
* ### remove

        语法：remove(where)
		
	将数据从collection中去除，但并不实际删除。
	
		session.studentCollection.remove({'name':'John'});
		
	当没有参数时，去除collection中所有数据。		
	
* ### destroy

        语法：destroy(where)
		
	将数据从collection中实际删除。
	
		session.studentCollection.destroy({'name':'John'});
		
	当没有参数时，删除collection中所有数据。
	
* ### setData

        语法：setData(dataMap)
		
	使用dataMap对Model赋值
		
* ### find

        语法：find(where)

	查询Collection中符合条件的所有数据。
		
		session.studentCollection.find({'name':'John'});
	
	当没有参数时，返回所有的数据。
		
* ### addSorters

        语法：addSorters()
		
	collection中添加排序方法
	
		session.studentCollection.addSorters('time','DESC')
		
	collection按照"time"降序排序。
		
* ### clearSorters

        语法：clearSorters()
		
	清空collection中排序方法
	
		session.studentCollection.clearSorters();
		
* ### applyStorters

        语法：applyStorters()
		
	手动执行所有的排序方法
	
		session.studentCollection.applyStorters();
		
* ### get

        语法：get()
		
	根据下标取出对应的数据
	
		session.studentCollection.get(2);	
		
		
* ### toJSON

        语法：toJSON()
		
	返回一个JSON对象
	
		session.studentCollection.toJSON();
		
* ### getData

        语法：getData()
		
	获取包含所有数据的数组
	
		session.studentCollection.getData();
		
* ### save

        语法：save()
		
	将collection的修改保存到Server。
	
		session.studentCollection.save();
		
* ### pluck

        语法：pluck(key)
		
	返回Collection某一字段所有数据的数组
	
		session.studentCollection.pluck('age');
		
		
* ### hold

        语法：hold()
		
	暂停collection实时更新
	
		session.studentCollection.hold();	
		
* ### releaseHold

        语法：releaseHold()
		
	恢复对collection的实时更新
	
		session.studentCollection.releaseHold();
			
* ### where

        语法：where()
		
	在collection中指定查询条件，需要与find、update、remove、destroy连用。
	
		session.studentCollection.where({'gender':'male'});
		
		session.studentCollection.find();
		
	返回collection中‘gender’值为‘male’数据的数组。
	
						
* ### orWhere

        语法：orWhere()
		
	在collection中添加一个“or”条件，需要与find、update、remove、destroy连用。
	
		session.studentCollection.orWhere({'gender':'male'});
		
		session.studentCollection.find();
		
		
* ### clearWheres

        语法：clearWheres()
		
	清空collection中所有查询条件
		
		session.studentCollection.clearWheres()
		
		
		
## View

View使用handlebars组件作为模板引擎，handlebars语法请参考官网。

为了更快的开发视图代码，Clouda对handlebars的语法做了一些扩展：

* ### view中引入view

        语法： {{> viewName}}

	在一个View中引用另一个View。
	
* ### view中使用JS

        语法： {{$ alert("data.length"); }}

	在View中直接执行Javascript代码，并将返回结果输出在View中。

* ### foreach

  用于快速遍历一个对象或数组

        语法：{{#foreach}}{{/foreach}}

  用法示例：

          <p id="test-foreach-caseB">
              {{#foreach customObj}}
                  {{key}} : {{value}}
              {{/foreach}}
          </p>

* ### compare

    比较两个对象

        语法：
            {{#compare a operator b}}
            {{else}}
            {{/compare}}

    可以使用的operator：

    <table border="0" cellpadding="0" cellspacing="0" style="margin-left: 30px;" >

    <tr style="background-color:#3982ff">
        <th> operator </th>
    </tr>

    <tr>
        <th> == </th>
    </tr>

    <tr>
        <th> ===</th>
    </tr>

    <tr>
        <th> != </th>
    </tr>
    <tr>
        <th> !== </th>
    </tr>
    <tr>
        <th> < </th>
    </tr>
    <tr>
        <th> <= </th>
    </tr>
    <tr>
        <th> > </th>
    </tr>
    <tr>
        <th>  >= </th>
    </tr>
    <tr>
        <th> typeof </th>
    </tr>

    </table>

    用法示例：

        {{#compare a "<" b}}
            a < b
        {{else}}
            a >= b
        {{/compare}}

        {{#compare a "typeof" "undefined"}}
            undefined
        {{/compare}}

    **注意**：当省略operator时，系统默认使用操作符 ==：

        {{#compare 1 1}}
            1 == 1
        {{/compare}}

* ### sumeru.config.view.set

        语法：sumeru.config.view.set('path', viewpath);

    一般情况下将编写的view文件存放在app/view文件夹下，如果编写的view文件不在View文件夹下，我们也提供View文件路径配置的方法，框架会在配置路径下寻找需要的View文件:

    实例：

        sumeru.config.view.set('path', 'path/to/');


    则Clouda会在如下目录中加载视图：

	    app目录/path/to/view/

    注意:即使是修改viewpath的情况下，**在最内一侧仍然需要有一层view文件夹**，如上面路径的最后部分。


## Transition

当场景发生转换时，通过transition定义场景转换效果。

	 doRender(viewName,transition)
	 
* viewName

	需要渲染View的名称


*  transition

	
	* ### push

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
		
	* ### rotate

		旋转

		* 方向
	
			* left

		
			* right
		

	* ### fade

		渐变

		* 方向
	
			* z-index
		
				垂直方向


	* ### shake

		退出场景时先缩小后放大退出，进入场景从左或者右边推入


		* 方向
	
			* left
		
				从左推入进场
		
			* right
	
				从右推入进场

	* ### none

		没有转场效果


		* 方向参数
	
			* z
		
				默认参数
	
	实例：
		
		env.onrender = function(doRender){
	 		doRender('student', ['push', 'down']);
		};
		env.onrender = function(doRender){
	 		doRender('student', ['none', 'z']);
		};

## Controller

如果你曾经接触过MVC模型，那么将会很熟悉Controller的概念。在Clouda中，Controller是每个场景的控制器，负责实现App的核心业务逻辑。

* ### create

        语法：sumeru.controller.create(function(env,session){});

	创建一个Controller

		App.studentList = sumeru.controller.create(function(env,session){});


* ### env

    * #### redirect

             语法：env.redirect(queryPath,paramMap,isforce)

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


    * #### refresh

            语法： env.refresh()

        重新加载当前Controller

            env.refresh();


    * #### onload

            语法：env.load()

        onload()是Controller的第一个时态，Controller中需要使用的数据都在这个时态中加载。

            env.onload = function(){
                return [ ];
            };


    * #### onrender

            语法：env.onrender()

        当数据获取完成后，这些数据需要显示在视图(View)上，这个过程通过onrender()中的代码来实现，这是Controller的第二个时态，负责完成对视图(View)的渲染和指定转场方式。

            env.onrender = function(doRender){
                doRender(viewName,transition);
            };

    * #### onready

            语法：onready()

        这是Controller的第三个时态，在View渲染完成后，事件绑定、DOM操作等业务逻辑都在该时态中完成；每段逻辑使用session.event包装，从而建立事件与视图block的对应关系。

            env.onready = function(){

                session.event(blockID,function(){

                });

            };

    * #### onsleep

            语法：env.onsleep()

        当Controller长时间不处于活动状态时，可能会被置为睡眠状态，以确保正在运行中的Controller具有足够的资源。如果需要在Controller被暂停之前运行一些逻辑（比如暂存状态等），可以在onsleep()中完成。

            env.onsleep = function(){
            };

    * #### onresume

            语法：env.onresume()

        当处在睡眠状态的Controller被唤醒时，onresume()时态将被调用。该时态可用于执行一些恢复性业务逻辑

            env.onresume = function(){
            };

    * #### ondestroy

            语法：env.ondestroy

        当Controller被销毁时，ondestroy()将被调用。

            env.ondestroy = function(){
            };


    * #### onerror

            语法： env.onerror

        当前Controller收到错误消息时被触发

            env.onerror = function(){
            };


* ### subscribe

        语法：  不带参数： env.subscribe(publishName, function(collection){});
                带参数：  env.subscribe(publishName,arg1,arg2, ... , function(collection){});

    关于subscribe方法请查看“Publish/Subscribe”章节。

			
			
* ### session


	* #### set

	        语法：session.set(key,value)

		在session中设置“key”的值
		
			session.set('page',10);

	* #### get

	        语法：session.get(key)
	
		获取session中“key”的值
		
			session.get('page');
			
	* #### bind

	        语法：session.bind(block-id,dataMap)
	
		将数据绑定到视图中block-id容器
		
			session.bind('student-list',{
							
				data : Collection.find()
			
			});
			
		一般在subscribe(publishName,function(Collection){})的function(Collection){}中使用。

	* #### event

	        语法：seesion.event(block-id,function(){})
	
		建立事件与视图block的对应关系
		
			session.event('student-list'，function(){
			
				var submitButton = document.getElementById('submit');
				
				submitButton.addEventListener('click', submitMessage); 
			
			});
			
	* #### eventMap

	        语法：session.eventMap(id,eventMap)
	
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
			
	* #### commit

	        语法：session.commit()
	
		触发数据对应视图block的更新
		
			session.commit();
	

### sub controller

创建的Controller可以作为另外一个Controller的子Controller使用。


* #### callSubController

        语法：  callSubController(queryPath,options)

	在当前Controller中调用一个子Controller，配合show()和hide()方法使用。
	
							
	* #### isready

	        语法：env.isready(){}
		
		当前Controller的子Controller已经加载完成
		
			env.isready = function(){
			};
		
		
	* #### show

	        语法：env.show(){}
	
		显示当前当前Controller的子Controller
		
			env.show = function(){
			};
		
	* #### hide

	        语法：env.hide(){}
	
		隐藏当前Controller的子Controller
		
			env.hide = function(){
			};
		
	* #### destory

	        语法：env.destory(){}
	
		销毁当前Controller的子Controller
		
			env.destroy = function(){
			};		
						

## Touch

在开发移动端的应用中会使用到很多的手势操作，例如一指拖动、两指旋转等等，为了方便开放者快速集成这些手势，在Clouda中内置了事件和手势库`Library.touch`，下面将详细的介绍如何使用Library.touch。

### touch.config

    语法： touch.config(config)

对手势事件库进行全局配置。

参数描述：

* config为一个对象

        {
            tap: true,                  //tap类事件开关, 默认为true
            doubleTap: true,            //doubleTap事件开关， 默认为true
            hold: true,                 //hold事件开关, 默认为true
            holdTime: 650,              //hold时间长度
            swipe: true,                //swipe事件开关
            swipeTime: 300,             //触发swipe事件的最大时长
            swipeMinDistance: 18,       //swipe移动最小距离
            swipeFactor: 5,             //加速因子, 值越大变化速率越快
            drag: true,                 //drag事件开关
            pinch: true,                //pinch类事件开关
        }

### touch.on

    语法：touch.on(element, types, options, callback)

绑定指定元素的事件。

参数描述：

* element: 元素对象或选择器。

* types: 事件的类型, 可接受多个事件以空格分开，支持原生事件的透传, 支持的一些事件类型有:

<table border="0" cellpadding="0" cellspacing="0" style="margin-left: 30px;" >

    <tr>
        <th> pinchstart </th>
        <th> 双指缩放动作开始 </th>
    </tr>
    <tr>
        <th> pinchend </th>
        <th> 双指缩放动作结束 </th>
    </tr>
    <tr>
        <th> pinch </th>
        <th> 双指缩放事件 </th>
    </tr>
    <tr>
        <th> pinchin </th>
        <th> 双指向里缩小 </th>
    </tr>
    <tr>
        <th> pinchout </th>
        <th> 双指向外放大 </th>
    </tr>
    <tr>
        <th> rotateleft </th>
        <th> 向左旋转 </th>
    </tr>
    <tr>
        <th> rotateright </th>
        <th> 向右旋转 </th>
    </tr>
    <tr>
        <th> rotate </th>
        <th> 旋转事件 </th>
    </tr>
    <tr>
        <th> swipestart </th>
        <th> 单指滑动动作开始 </th>
    </tr>
    <tr>
        <th> swiping </th>
        <th> 单指滑动事件 </th>
    </tr>
    <tr>
        <th> swipeend </th>
        <th> 单指滑动动作结束 </th>
    </tr>
    <tr>
        <th> swipeleft </th>
        <th> 单指向左滑动 </th>
    </tr>
    <tr>
        <th> swiperight </th>
        <th> 单指向右滑动事件 </th>
    </tr>
    <tr>
        <th> swipeup </th>
        <th> 单指向上滑动 </th>
    </tr>
    <tr>
        <th> swipedown </th>
        <th> 单指向下滑动 </th>
    </tr>
    <tr>
        <th> swipe </th>
        <th> 单指滑动事件 </th>
    </tr>
    <tr>
        <th> drag </th>
        <th> 单指向左右拖动 </th>
    </tr>
    <tr>
        <th> hold </th>
        <th> 单指按住不放事件 </th>
    </tr>
    <tr>
        <th> tap </th>
        <th> 单指点击 </th>
    </tr>
    <tr>
        <th> doubletap </th>
        <th> 单指双击 </th>
    </tr>
  </table>

例如旋转实例如下：

    var angle = 30;
    touch.on('#rotation .target', 'touchstart', function(ev){
    ev.startRotate();
    ev.originEvent.preventDefault();
    ev.originEvent.stopPropagation();
    });
    touch.on('#rotation .target', 'rotate', {interval: 10}, function(ev){
    var totalAngle = angle + ev.rotation;
    if(ev.fingerStatus === 'end'){
      angle = angle + ev.rotation;
    }

    this.style.webkitTransform = 'rotate(' + totalAngle + 'deg)';
    });

更多使用实例请查看<http://code.baidu.com/>

* options(可选): 目前可配置的参数为:

        {
           //采样频率
           interval: 10,//性能参数，值越小，实时性越好， 但性能可能略差， 值越大， 性能越好。遇到性能问题时，可以将值设大调优，建议值设置为10。
           //swipe加速度因子（swipe事件专用）
           swipeFactor: 5 //(int: 1-10)值越大，速率更快。
        }

* callback: 事件处理函数， 该函数接受的参数为一个gesture event object, 可访问的属性有：

    * originEvent   //触发某事件的原生对象

    * type  //事件的名称

    * rotation  //旋转角度

    * scale  //缩放比例

    * direction  //操作的方向属性

    * fingersCount  //操作的手势数量

    * position  //相关位置信息, 不同的操作产生不同的位置信息。

    * distance  //swipe类两点之间的位移

    * distanceX  //swipe类事件x方向的位移

    * distanceY   //swipe类事件y方向的位移

    * angle   //swipe类事件触发时偏移角度

    * factor   //swipe事件加速度因子

    * startRotate //启动单指旋转方法，在某个元素的touchstart触发时调用。

### touch.live

    语法：touch.live(selector, types, options, callback)

使用方法基本上与on相同，live的第一个参数只接受`css3选择器`。通过`live()`方法附加的事件处理程序适用于匹配选择器的当前及未来的元素（比如由脚本创建的新元素）


### touch.off

    语法：touch.off(element,types,callback)

解除某元素上的事件绑定。

参数描述：

* element：元素对象或选择器

* types：事件的类型

* callback：时间处理函数

## Publish/Subscribe


### subscribe

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



### publish

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
                              skip    : (options.page-1)*options.pagesize,
                              "gender": gender
                             }, function(err, items){
                callback(items);
            });
        });

    * sort

        排序

    * limit

        每页显示的个数

    * skip

        当前页与起始页间隔的个数

    详细的使用情况请查看《Example》文档中的实例。

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

* #### external

    实现了三方数据同步的方法，用来满足从三方网站/三方接口获取和同步数据的需求。

    * extfind(pubName,callback)

        在publish文件中发布第三方数据

            fw.publish('news','pubnews',function(callback){
                var collection = this;

                collection.extfind('pubnews',callback);
            });

    使用该方法需要在publish下添加一个如何获取第三方数据的配置文件

    * config[pubname]

        * pubname

            与publish中collection.extfind(pubname,callback)方法pubname一致，全局唯一

        * uniqueColumn

            uniqueColumn为三方数据唯一标识，类型为`String`

                uniqueColumn : "name",

        * fetchUrl: function((/** arg1, arg2, arg3 */)){}

            指定抓取的URL。arg1,arg2为传递的参数

                fetchUrl : function(/** arg1, arg2, arg3 */){
                    return 'http://some.host.com';
                }

        * resolve : function(originData){}

            resolve方法作用是将抓取回来的原始数据(originData)转化成为符合Model定义的数据(resolved)

                resolve : function(originData){
                    var j = JSON.parse(originData);
                    var resolved = j;
                    return resolved;
                }

        * fetchInterval

            fetchInterval为可选参数，用来指定抓取时间间隔，单位为ms

        * buffer

            buffer为可选参数，值为true时表示获取原始Buffer，否则获取原始数据字符串


        * type

            声明此模块为归属为'external'

                return {
                    type : 'external',
                    config : config
                }

        实例如下：

            /**
             * 获取三方数据信息，由开发者自定义
             */
            function runnable(){
                //{Object} config是所有三方publish配置的容器
                var config = {};

                config['pubext'] = {
                    //{String} uniqueColumn为三方数据唯一标识
                    uniqueColumn : "name",

                    //{Function} fetchUrl的参数就是订阅时发起的参数，返回值为pubext所抓取的url地址
                    fetchUrl : function(/** arg1, arg2, arg3 */){
                        return 'http://some.host.com';
                    },

                    //{Function} resolve方法作用是将抓取回来的原始数据(originData)转化成为符合Model定义的数据(resolved)
                    resolve : function(originData){
                        var j = JSON.parse(originData);
                        var resolved = j;

                        return resolved;
                    },

                    //{Number} fetchInterval为可选参数，用来指定抓取时间间隔，单位为ms
                    fetchInterval : 60 * 1000,

                    //{Boolean} buffer为可选参数，值为true时表示获取原始Buffer，否则获取原始数据字符串
                    buffer : false
                }

                //最后需要声明此模块为归属为'external'
                return {
                    type : 'external',
                    config : config
                }

            }

            module.exports = runnable;

    * 指定三方增/删/改接口以及数据

        当数据发生变化时，如何使用Clouda达到三方数据同步的效果，具体实现方法如下：

        * 较为紧凑的声明方式

            * postUrl

                `postUrl`方法用来指定三方post接口的地址信息, 参数type为增量类型，增量类型为'insert','update','delete'三者之一;

            * prepare

                `prepare`方法用来将增量数据转化成为符合三方POST接口要求的post数据，参数type同为增量类型，参数data为增量的实际数据。


            实例如下：

                /**
                 *	三方数据POST请求信息，由开发者自定义
                 */
                function runnable(){

                    var config = {}

                    config['pubext'] = {

                        /**
                         * 声明三方POST接口地址
                         * {String} type为'delete', 'insert', 'update'其中之一
                         * 如果subscribe时带参数，参数会按照subscribe顺序接在postUrl的参数中
                         */
                        postUrl : function(type /** arg1, arg2, arg3... */){
                            var options = {
                                host : 'some.host.com',
                                path : '/' + type ,
                                headers: {
                                    //在此自定义header内容，clouda默认的 'Content-Type': 'application/x-www-form-urlencoded'
                                    'Content-Type': ...
                                }
                            }
                            return options;
                        },

                        /**
                         * prepare方法将增量数据转化为符合三方要求的post数据。
                         * {String} type为增量操作，值为'delete', 'insert', 'update'其一;
                         * {Object} data为增量数据，如：{ name : 'user1', age : 26 }。
                         */
                        prepare : function(type, data){
                            var prepareData = {};  //prepareData为三方post所需的data
                            if(type === "delete"){
                                prepareData.name = data.name;
                            }else if(type === "insert"){
                                prepareData.name = data.name;
                                prepareData.age = data.age;
                            }else{
                                prepareData.name = data.name;
                                prepareData.age = data.age;
                            }

                            return prepareData;
                        }
                    }

                    return {
                        type : 'external',
                        config : config
                    }

                }

                module.exports = runnable;


        * 较为工整的声明方式

            * `deleteUrl`，`insertUrl`，`updateUrl`

                三个方法作用等同于`postUrl`，返回不同操作下三方接口url信息

            * `onDelete`，`onInsert`，`onUpdate`

                三个方法作用等同于`prepare`方法, 返回经过处理，传给三方接口的post数据

            实例如下：

                function runnable(){

                    var config = {};

                    config['pubext'] = {
                        //arg1, arg2, arg3是subscribe时输入的参数
                        deleteUrl : function(/** arg1, arg2, arg3... */){
                            return {
                                host : 'some.host.com',
                                path : '/delete'
                            }
                        },

                        insertUrl : function(/** arg1, arg2, arg3... */){
                            return {
                                host : 'some.host.com',
                                path : '/insert'
                            }
                        },

                        updateUrl : function(/** arg1, arg2, arg3... */){
                            return {
                                host : 'some.host.com',
                                path : '/update'
                            }
                        },

                        onInsert : function(data){
                            var prepareData = {};
                            prepareData.name = data.name;
                            prepareData.age = data.age;
                            return prepareData;
                        },

                        onUpdate : function(data){
                            var prepareData = {};
                            prepareData.name = data.name;
                            prepareData.age = data.age;
                            return prepareData;
                        },

                        onDelete : function(data){
                            var prepareData = {}
                            prepareData.name = data.name;
                            return prepareData;
                        }
                    }

                    return {
                        type : 'external',
                        config : config
                    }

                }

                module.exports = runnable;

    * sumeru.external.get

        向第三方发送get请求

            var url = "http://some.host.com";
            var getCallback = function(data){
            	console.log(data);
            }
            sumeru.external.get(url, getCallback);

    * sumeru.external.post

        向第三方发送post请求

            var options = {
                host : "some.host.com",
                path : "/insert"
            }

            var postData = {
                name : sumeru.utils.randomStr(8),
                age : parseInt( 100 * Math.random())
            }

            var postCallback = function(data){
                console.log(data);
            }

            sumeru.external.post(options, postData, postCallback);


    * sumeru.external.sync

        将抓取最新的三方数据，并将新数据推送至前端

            var cb = function(data){
                console.log(data);
            }
            var url = "some.host.com";
            sumeru.external.sync(modelName, pubName, url, cb);

    具体使用请查看《Example》文档中的SpiderNews实例。


## Auth


* ### create

    创建一个auth对象

        sumeru.auth.create(env)

    实例：

        var myAuth = sumeru.auth.create(env);

### Auth对象的方法

* ### on

    增加一个用户系统相关的事件监听器
		
        on(type,handle);

    参数说明：

    * type

        每次认证状态变化时被触发，类型string，目前只支持一个事件类型,即 “statusChange”

    * handle

        事件处理函数. 可接收两个参数`err`与`status`

        * err

        有错误产生时的错误对像

        * status

            表示当前认证状态的字符串

            * not_login

                当前未登陆

            * logined

                已登陆

            * doing_login

                正在登陆过程中

    实例：

        var myAuth = sumeru.auth.create(env);

        var statusChangeHandle = function(err,status){
            if(err){
                // err.code | err.msg
                return;
            };

            switch(status){
                case "not_login" :
                    // do something
                    break;
                case "logined" :
                    // do something
                    break;
                case "doing_login" :
                    // do something
                    break;
                default:
                    // do something
            }
        }

        myAuth.on('statusChange',statusChangeHandle);


* ### removeListener

    移除由on方法增加的监听器

        removeListener(type,handle)

    参数说明：

    * type

        事件名称, 目前只支持一个事件,即“statusChange”

    * handle

        事件处理函数


* ### removeAllListener

    一次性移除所有已添加的监听器事件

        removeAllListener(type)

    参数说明：

    * type

        事件名称, 目前只支持一个事件,即“statusChange”

    实例：

        var myAuth = sumeru.auth.create(env);
        myAuth.removeAllListener('statusChange');


* ### login

    根据token,pwd登陆由`authMethod`所指定的类型用户系统. 不提供`authMethod`时默认为`local`. 登陆过程中的每次状态变化将触发`statusChange`事件

        login(token,pwd,[args],[authMethod])

    参数说明：

    * token

        用户的用户名，类型为string

    * pwd

        用户的密码，类型为string

    * args

        登陆时需附加的其它信息,具体内容根据`authMethod`的不同传入内容将不同.如不提供默认为{},类型为map，所有除用户名和密码外需要传入的其它数据（如验证码等），都需要通过这个args参数传入

    * authMethod

        登陆用户的类型，默认为“local”，类型为string

    实例：

        var myAuth = sumeru.auth.create(env);

        var statusChangeHandle = function(err,status){
            if(err){
                // err.code | err.msg
                return;
            };

            switch(status){
                case "not_login" :
                    // do something
                    break;
                case "logined" :
                    // do something
                    break;
                case "doing_login" :
                    // do something
                    break;
                default:
                    // do something
            }
        }

        myAuth.on('statusChange',statusChangeHandle);

        // 完整的调用方式
        myAuth.login('userName','pwd',{a:100,b:200,c:[1,2,3]},'authMehtod_XXX');

        // 也可使用以下不完整的参数调用方式。
        // 1.省略authMethod认为 authMethod = 'local'
        // myAuth.login('userName',’pwd‘,{a:100,b:200});

        // 2.同时省略args与authMethod时，认为args={},authMethod='local'
        // myAuth.login('userName','pwd');


* ### logout

	登出，并触发statusChange变化

        logout()

    实例：

        var myAuth = sumeru.auth.create(env);
		myAuth.logout();



* ### getStatus

    取得当前的认证状态. 返回值为String类型

        getStatus()

    返回值如下：

    * not_login

        当前未登陆

    * logined

        已登陆

    * doing_login

        正在登陆过程中

    实例：

        var myAuth = sumeru.auth.create(env);
        myAuth.getStatus();


* ### getLastError

    取得最后一个操作发生的错误信息，每一个新操作产生时，上一次的错误信息将被清空

        getLastError()

    实例：

        var myAuth = sumeru.auth.create(env);
        var errObj = myAuth.getLastError();

        console.log(errObj);


* ### getUserInfo

    取得当前认证用户的信息,如果未登陆则返回`null`

        getUserInfo()

    实例：

        var myAuth = sumeru.auth.create(env);
        myAuth.getUserInfo();

    userInfo结构如下：

        userInfo = {
            "token":"token",
            "info":{"param1":"modify1","param2":"modify2","param3":["1","2"]},
            "status":"online",
            "smr_id":"5253a5aa546610001200014a",
            "__clientId":"7qgj3s1grr",
            "userId":"5253a5a95466100012000148",
            "clientId":"183ou3qrg_QZKUYDxapKFO",
            "authMethod":"local",
            "expires":1381213910081
        }

    注意：其中info字段的内容，来源于`register`时提供的userInfo


* ### register

    注册一个用户

        register(token,pwd,userInfo, authMethod, callback)

    参数说明：

    * token

        用户的登陆标识，类型为string

    * pwd

        登陆密码，类型为string

    * userInfo

        新的用户信息对像，类型为object

    * authMethod

        目标的用户类型，类型为string

    * callback

        注册完成后的回调方法,可接收一个`err`参数,当产生错误时返回对应的错误对像,如果成功,返回`null`

    实例：

        var myAuth = sumeru.auth.create(env);
        myAuth.register('user123','pwd',{age:100},local,function(err){
            if(err){
                // 注册失败
                return；
            }
            // 注册成功
            // do something ..
        });

    注意：在注册前，尽量使用sumeru.auth.registerValidate() 进行验证，可以有效减少错误发生。

* ### registerValidate

    测试一个注册信息是否可用

        registerValidate(userInfo,authMethod,callback)

    参数说明：

    * userInfo

        待测试的注册信息，类型为object

    * authMethod

        用户类型，类型为string

    * callback

        测试完成后的回调函数，可接收err与isUsefull参数

            * err

                产生错误是传入对应的错误对像

            * isUserfull

                值为`true`时表示测试的用户可以使用

    实例：

        var myAuth = sumeru.auth.create(env);
        myAuth.registerValidate({token:'user123',age:100},'local',function(err,isUsefull){
            if(isUserfull){
                // 注册信息验证成功，可以进行注册
                myAuth.register('user123','pwd',{age:100},local,function(err){
                    if(err){
                        // 注册失败
                        return；
                    }
                    // 注册成功
                    // do something ..
                });
            }else{
                // 注册信息验证失败
                //err.code || err.msg
            }
        });


* ### modifyUserInfo

    修改用户信息

        modifyUserInfo(token,pwd,userInfo,authMethod,callback)

    参数说明：

    * token

        用户的登陆标识

    * pwd

        登陆密码

    * userInfo

        用户信息对像

    * authMethod

        用户类型

    * callback

        用户信息修改完成后的回调函数，可接受一个`err`参数，当修改信息发生错误时，返回产生的错误信息，如果修改成功，则返回`null`

* ### modifyPassword

    修改用户登陆密码信息

        modifyPassword(token,oldPwd,newPwd,authMethod,callback)

    参数说明：

    * token

        用户的登陆标识

    * oldPwd

        当前密码

    * newPwd

        新密码

    * authMethod

        目标的用户类型

    * callback

        修改完成后的回调函数，可接收一个`err`参数,当修改信息发生错误时，返回产生的错误信息,如果修改成功,则为`null`

## Library


* ### create

        语法：create(factory)

	创建一个Library库，sumeru.Library.create(factory);
		
		
		Library.timeUtils = sumeru.Library.create(function(exports){	
			exports.formatDate = function(time){
				return time.getFullYear();
			};
		});

* ### getter


	使用一个Library
	
		Library.timeUtils.formatDate(new Date());
		
		
## Reachability

查看网络连接状态


* ### getStatus

        语法：getStatus()

	获取当前网络状态

		sumeru.reachability.getStatus();


网络状态有以下三种：

* ##### STATUS_OFFLINE

	当前处于离线状态

		sumeru.reachability.STATUS_OFFLINE;
	
	
* ##### STATUS_CONNECTING

	当前处于网络连接状态

		sumeru.reachability.STATUS_CONNECTING;


* ##### STATUS_CONNECTED

	当前已连接到网络

		sumeru.reachability.STATUS_CONNECTED;



## File Uploading

* #### Library.fileUploader.init()

    完成端上上传文件的初始化

具体方法：

    var myUploader = Library.fileUploader.init({
        routerPath:"/files",
        onSuccess:function(urlLink){//成功之后的处理，此处有保存文件的逻辑

        },
        fileSelect:function(e){//用户选择文件之后的处理

        },
        onProgress:function(e){//进度更新

        },
        onError:function(e){//出错

        },
        onAbort:function(e){//中断

        },
    });

* ##### routerPath

   与router中的pattern对应

* ##### onSuccess:function(urlLink)

   成功之后的处理，此处有保存文件的逻辑

* ##### fileSelect:function(e)

   用户选择文件之后的处理

* ##### onProgress:function(e)

   进度更新

* ##### onError:function(e)

   当上传出错时在该方法中处理

* ##### onAbort:function(e)

   当出现`中断`时在该方法中处理


* #### startUpload()

    端上上传文件的方法

        myUploader.startUpload();


## package.js


package.js用于将文件之间的依赖关系添加到Clouda中，我们可以使用下面的语法编写该文件：

	 sumeru.packages(
	 	'student.js',
	 	'class/',
	 	..... ,

	 	'studentList.js'
	 )
	 
如果参数为文件夹，则Clouda会加载相应文件夹下的package.js。
	 
并不是在所有文件夹下新建文件或者文件夹后需要修改package.js文件，view文件夹和publish文件夹例外。


	 	
 	
 
	 
	 	


	
		
	
		

		
	
