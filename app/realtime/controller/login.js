App.infLogin = sumeru.controller.create(function(env, session, paras, _parent){
    var fw = sumeru;
    var tplName = 'login';
    
	env.onload = function(){
		return [];
	};
	
	env.onrender = function(doRender){
        if(_parent){
            doRender(tplName,{top:10,left:0,width:'100%'});
        }else{
            doRender(tplName,['push',"left"]);
        }
	};
	
	env.onready = function(root){
    root.querySelector('.close').addEventListener('click', function(){
        env.hide();
    });
	    document.getElementById('login').addEventListener('click', function(){
		    var token = document.getElementById('d-token').value;
			var value = document.getElementById('d-password').value;
			fw.auth.login(token, value, 1000 * 60 * 60, function(){
			    if(this.isLogin()){
				    _parent.env.refresh();
				}else{
                    alert('登陆失败');				
				}
			});
		});
		
		document.getElementById('baidu-login').addEventListener('click', function(){
		    var token = document.getElementById('d-token').value;
			var value = document.getElementById('d-password').value;
			var code = document.getElementById('d-code').value;
            var callback = function(response){
			    if(this.isLogin()){
                    _parent.env.refresh();
                }else{
                    if(response.status == 5){
					   var codeEl = document.getElementById('verifyCode');
					   codeEl.innerHTML = '<img src="' +this.getVerifyCode()+ '"></img>';

					   alert('请输入验证码');
                    }else{
					   alert('登录失败');
                    }					
				}
			}
			fw.auth.baidu.login({
                token: token,
                password: value,
                callback: callback,
                verifyCode: code,
                expires: 1000 * 60 * 60
            });
		});
	};
});