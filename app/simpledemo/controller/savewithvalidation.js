/**
 * sumeru F / W
 * Copyright
 * License
 */
sumeru.router.add({
    pattern    :   '/simpledemo/savewithvalidation',
    action  :   'App.sdsavewithvalidation'
});

App.sdsavewithvalidation = sumeru.controller.create(function(env, session){

	var view = 'savewithvalidation';

	var g = function(id){
		return document.getElementById(id);
	}
	
	var getUserlist = function(){
		session.sduser = env.subscribe('pub-sduser', function(sduserCollection){
            //add a default sorter to collection
            sduserCollection.addSorters("age","DESC");
            
            //manipulate synced collection and bind it to serveral view blocks.
           session.bind('sduserlist', {
                data    :   sduserCollection
            });
        });
	}

	var none = function(){
		console.log('onload nothing');
	}
	//对于每一个loader，自动创建一个闭包。 监听其中session、collection的改变，作为reactive的source
	env.onload = function(){
		return [getUserlist];
	};
	
	env.onerror = function(){
		console.log('App.sdsavewithvalidation error.');
	};

	env.onrender = function(doRender){
		doRender(view, ['rotate','left']);
	};
	
	env.onready = function(doc){
		//var sdcollection = sumeru.collection.create({modelName : 'Model.sduser'});
		var clearError = function(){
			g('sdnameerror').innerHTML = '';
			g('sdageerror').innerHTML = '';
		}
		session.sduser.onValidation = function(ispass, runat, validationResult){
			//console.log(validationResult);
			if(ispass){clearError();}

			g('sdvalidation').innerHTML = (runat=='c'?'客户端':'服务端')+(ispass==true?'验证通过':'验证失败')+'<br/>';

			for(var i = validationResult.length-1; i>=0; i--){
				g('sd'+validationResult[i].key+'error').innerHTML += (runat=='c'?'客户端':'服务端')+'验证结果：'+validationResult[i].msg;
				
				this.remove({smr_id:validationResult[i].smr_id});
			}

			//服务端验证通过后。重新渲染一次数据
			if(runat=='s'&&ispass){
				this.render();
			}
		};
		Library.touch.on('#sdsave', 'touchstart', function(){
			clearError();
			var name = g('sdname').value;
			var age = g('sdage').value;

			session.sduser.add({"name":name,"age":age})

			session.sduser.save();

        });

        //secureSave  与 save的不同之处在于secureSave需要在onValidation函数中调用渲染数据接口renderData()。
		Library.touch.on('#sdensuresave', 'touchstart', function(){
			clearError();
			var name = g('sdname').value;
			var age = g('sdage').value;

			session.sduser.add({"name":name,"age":age})

			session.sduser.ensureSave();

        });
	};
    
});