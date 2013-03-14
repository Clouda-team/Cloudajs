App.infRegister = sumeru.controller.create(function(env, session, paras, _parent){
    var fw = sumeru;
    var tplName = 'register';
	
	env.onload = function(){
		return [];
	};
	
	env.onrender = function(doRender){
	    if(_parent){
            doRender(tplName,{top:10,left:0,width:'100%'});
        }else{
            doRender(tplName,['push',1]);
        }
	};
	
	env.onready = function(root){
    root.querySelector('.close').addEventListener('click', function(){
        env.hide();
    });
	    document.getElementById('register').addEventListener('click', function(){
		    var token = document.getElementById('r-token').value;
			var password = document.getElementById('r-password').value;
			var age = document.getElementById('r-age').value;
			fw.auth.register(token, password, {age: age}, function(){
			    env.redirect('/real-time');
			});
		});
	};
});