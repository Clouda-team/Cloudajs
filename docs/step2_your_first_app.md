在《从这里开始》中介绍了如何使用Clouda开发“Hello World”，现在我们真正使用Clouda开发一个App---"留言大厅"。


### 首先预览一下"留言大厅"

<img style="max-width:45%;;" src="./images/hall.png">

在"留言大厅"这个应用中，用户可以在这里留言，也可以看到别人的留言

因为需要存储留言，所以在正式开始之前我们需要先安装MongoDB，并在127.0.0.1的27017端口上启动（此地址可在app/server_config/database.js中进行配置），MongoDB是我们依赖的数据库，在以后各种应用中都会经常用到。


###（1）在"app/model/"下创建message.js，输入以下代码：

* message.js

		Model.message = function(exports){	
			exports.config = {		
				fields : [
					{name: 'content', type: 'text'},
					{name: 'time', type: 'datetime',defaultValue: 'now()'}
				]
			};
		};

   可以看到我们刚刚创建了一个包含content和time两个字段的Model，并取名为message，关于Model在下一篇文档中会做专门的说明。	

###（2）修改“app/model/package.js”

* package.js

		sumeru.packages(
			'message.js'
		);

	如我们在上一篇文档中做过的一样，在model/package.js中添加刚刚新增的文件。
	
###（3）在"app/publish/"下创建pub-message.js，输入以下代码

* pub-message.js

		module.exports = function(fw){
			fw.publish('message', 'pub-message', function(callback){
				var collection = this;
				collection.find({}, {}, function(err, items){
					callback(items);
		 		});
			});   
		}

	pub-message.js描述了Server将什么类型的数据发布到客服端，在上面的代码中，我们通过publish查询了message model的全部数据，并使用callback将他们发布给客户端，关于publish在下一篇文档中会做专门介绍。


### (4) 在"app/controller/"下创建hall.js

* hall.js


		sumeru.router.add(
			{
				pattern: '/hall',
				action : 'App.hall'
			}
		);

	我们在上一篇文档中已经看到过router，sumeru.router.add()作用是添加一个URL(其路径部分)与Controller的映射关系，关于router在下一篇文档中会做专门说明。

		App.hall = sumeru.controller.create(function(env, session){
			var getMsgs = function(){       
				session.messages = env.subscribe('pub-message', function(msgCollection){
					//manipulate synced collection and bind it to serveral view blocks.
		            session.bind('message-hall', {
		            	data    :   msgCollection.find(),
		            });              

		        });
			};		
			//onload is respond for handle all data subscription
			env.onload = function(){            
				return [getMsgs];            
			};

	大家可以看到在这里多了一个env.onload()，这是Controller的第一个时态，Controller中需要使用的数据都在这个时态中加载，我们先在这里添加上面的代码，关于env.onload()方法会在下一篇文档中做专门介绍。
		
			//sceneRender is respond for handle view render and transition
			env.onrender = function(doRender){
				doRender('hall', ['push', 'left']);
			};

	在上一篇文档中我们已经见过env.onrender()，这是Controller的第二个时态，负责对View(视图)的渲染，关于该时态在后续会做专门说明。
		
			//onready is respond for event binding and data manipulate
			env.onready = function(){			
				session.event('message-hall', function(){     
					var messageubmitButton = document.getElementById('messageSubmit');
					var clearHistoryButton = document.getElementById('clearHistory');
		     		messageubmitButton.addEventListener('click', submitMessage); 
		     		clearHistoryButton.addEventListener('click',clearHistory);                             
		        });
			};

	我们看到这里多了一个env.onready()，这是Controller的第三个时态，在View渲染完成后，事件绑定、DOM操作等业务逻辑都在该时态中完成；每段逻辑使用session.event包装，从而建立事件与视图block的对应关系。
	
	可以看到，我们使用了submitMessage()和clearHistory()两个还没有定义的方法，下面我们来实现它们。
		
			var submitMessage = function(){
				var input = document.getElementById('messageInput'),
		        	inputVal = input.value.trim();		
		       	if (inputVal == '') {
		           return false; 
		       	};
		       	session.messages.add({
		           content : inputVal,         
		       	});
		       	session.messages.save();
		       	input.value = '';          
			};

	在submitMessage()中我们使用了session.message.add()和session.message.save()，.add()用于在collection中新增一个Model。.save()是用于将collection的修改保存到Server，在通常情况下，调用.save()方法会自动触发对应视图block的更新。
	
	从这里可以看出，Clouda设计的核心是面向数据的，当数据发生改变时Clouda会自动更新与该数据有关联的视图block，我们称之为"随动反馈"，这是Clouda的一个重要特性。

			var clearHistory = function(){
				session.messages.destroy();
				session.messages.save();
			}		
		});

	同.add()的使用方法类似，.destroy()作用是将collection中的数据全部清空，数据清空后同样我们调用.save()根据数据的变化重新渲染与该数据关联视图block。
		

###（5）修改"app/controller/package.js"

* pacakge.js

		sumeru.packages(
			'hall.js'
		);

如前面一样，在controller/package.js中添加刚刚新增的文件。	

###（6）在"app/view/"下创建hall.html

* hall.html

		<block tpl-id="message-hall">
			<style>
				button{width:100px; height:40px;}
				#content{width:360px;height:300px;margin-top:10px;}
			</style>	
			<div align="center">
				<h1>Clouda message Hall</h1>
		 		<input style="height:40px; width:260px;padding-left: 5px;" id="messageInput" placeholder="Say Something Now:"/>
		   		<button id="messageSubmit">submit</button> <br/>
				<textarea readonly="readonly" id="content">
				    {{#each data}}
				        {{this.content}}
		            {{/each}}
				</textarea><br/>		
				<button id="clearHistory">clear history</button> 	
			</div>
		</block>

	与上一篇文档中我们看到的View不同，这次hall.html中多了"{{this.content}}"，这是插入模板渲染所需的数据变量，Clouda使用handlebars组件作为模板引擎，关于handlebars语法请查看handlebars官网。

至此，App代码部分已经完成。

### （7）运行"留言大厅"

启动MongoDB

	sudo ./mongod -dbpath ../data/db

重新启动Clouda

	sumeru start

在浏览器中输入"localhost:8080/debug.html/hall"运行"留言大厅"。
