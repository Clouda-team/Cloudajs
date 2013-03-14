/**
 * sumeru F / W
 * Copyright
 * License
 */
sumeru.router.add({
    pattern    :   '/simpledemo/createmodelsavewithvalidation',
    action  :   'App.createmodelsavewithvalidation'
});

App.createmodelsavewithvalidation = sumeru.controller.create(function(env, session){

	var view = 'createmodelsavewithvalidation';

	var g = function(id){
		return document.getElementById(id);
	}
	

	var none = function(){
		console.log('onload nothing');
	}
	//对于每一个loader，自动创建一个闭包。 监听其中session、collection的改变，作为reactive的source
	env.onload = function(){
		return [];
	};
	
	env.onerror = function(){
		console.log('App.sdsavewithvalidation error.');
	};

	env.onrender = function(doRender){
		doRender(view, ['rotate','left']);
	};
	
	env.onready = function(doc){
		var clearError = function(){
			g('sdnameerror').innerHTML = '';
			g('sdageerror').innerHTML = '';
		}
		Library.touch.on('#sdsave', 'touchstart', function(){
			var sdmodel = sumeru.model.create('Model.sduser');
			sdmodel.onValidation = function(ispass, runat, validationResult){
				if(ispass){clearError();}
				console.log(arguments);
				g('sdvalidation').innerHTML = (runat=='c'?'客户端':'服务端')+(ispass==true?'验证通过':'验证失败')+'<br/>';

				for(var i = validationResult.length-1; i>=0; i--){
					g('sd'+validationResult[i].key+'error').innerHTML += (runat=='c'?'客户端':'服务端')+'验证结果：'+validationResult[i].msg;
				}
			};
			clearError();
			var name = g('sdname').value;
			var age = g('sdage').value;

			sdmodel.name = name;
			sdmodel.age = age;

			sdmodel.save();

        });
	};
    
});