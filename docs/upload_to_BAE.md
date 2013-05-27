# Framework托管到BAE


Framework是基于node.js开发的，所以需要node.js环境以及需要数据库的支持，百度开发者中心上BAE提供整套的环境的支持，只需简单的配置就可以快速运行基于framework开发的应用，具体方法如下：


（1）登陆[百度开发者中心](http://developer.baidu.com)，如果没有百度帐号请先注册百度帐号，并注册成为开发者；


（2）使用BAE，如果是第一次使用，需要先发送邮件到dev_support@baidu.com申请开通node.js权限。


![](images/intro_4_2.png)

（3）node.js权限开通后，点击 “创建应用” ，如图：

![](images/intro_4_3.png)

（4）点击 “确定”后在页面点击“云环境(BAE)”

![](images/intro_4_4.png)

（5）完成“应用域名”申请，以及选择使用“node.js”环境

![](images/intro_4_5.png)

（6）“创建新版本”，并使用SVN下载版本代码

![](images/intro_4_6.png)

（7）将本地sumeru工程文件拷贝到SVN下载版本代码目录下

（8）修改app.conf文件

	handlers:
  		- url : ^/socket/(.*)
    		script: $1.nodejs

  		- url : ^/view/(.*)
    		script: /__bae__/bin/view/$1

  		- url : ^/bin/(.*)
    		script: /__bae__/bin/$1

  		- url : ^/hiUpload/(.*)
    		script: /__bae__/static/hiUpload/$1

  		- url : /server/(.*)
    		script: /index.html

  		- url : ^/publish/(.*)
    		script: /index.html

  		- url : (*.ico)
    		script: $1
  
  		- url : ^/sumeru/(.*)
    		script : /sumeru/$1
  
  		- url : ^/sumeru\.js
    		script : /sumeru/sumeru.js
    
  		- url : (.*)
    		script: /app/$1
    
  		- expire : .* modify 0 seconds
  		- expire : .jpg modify 10 years
  		- expire : .swf modify 10 years
  		- expire : .png modify 10 years
  		- expire : .gif modify 10 years
  		- expire : .JPG modify 10 years
  		- expire : .ico modify 10 years
  
  		- mime: .manifest text/cache-manifest
  		
  		
  也可点击<http://pan.baidu.com/share/link?shareid=474214&uk=1077217927>下载该文件
	
（9）修改app.js文件

	 require("./sumeru/server/run.js");
	
	
	 
（10） **仅0.7.10（含）以下版本，需要执行本步骤**  修改sumeru/server/DbCollectionHandler.js


	//修改该文件第133 - 141行代码：

	if(process && process.BAE){
            host = process.env.BAE_ENV_ADDR_MONGO_IP;
            port = parseInt(process.env.BAE_ENV_ADDR_MONGO_PORT);
            username = process.env.BAE_ENV_AK;//fw.config.get('bae_user');
            password = process.env.BAE_ENV_SK;//fw.config.get('bae_password');
        }
        
        var server = new mongodb.Server(host, port, serverOptions);
        //your dbname为分配的dbname
        var db = new mongodb.Db('your dbname', server, {});
        

    
（11）修改app/config/sumeru.js文件

	将第7行
	     location.hostname + ':' + socketPort + '/socket/' : '';
	修改成：
	     location.hostname + '/socket/' : '';
	 
**0.7.11（含）以上版本，修改第15行：**
      	
      在第15行修改dbname配置项
      	sumeru.config({
      		dbname : 'ZOimsCLxRKfWyBDsYRWd',
      	
      		
	
（12）修改根目录下的package.json文件

	将第5行：
	     "main": "index.js"
	修改成：
	     "main": "app.js"
（13）进入sumeru/build/，并运行 node runBuild.js


（14）使用SVN上传代码，并在BAE上上线该应用，访问您自己的应用地址，如果您是使用示例程序，可以访问 域名+index.html#/itworks
