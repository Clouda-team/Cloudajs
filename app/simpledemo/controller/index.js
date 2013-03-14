/**
 * sumeru F / W
 * Copyright
 * License
 */
sumeru.router.add({
    pattern    :   '/simpledemo/index',
    action  :   'App.sdindex'
});

App.sdindex = sumeru.controller.create(function(env, session){

	var view = 'index';

	var createLinklist = function(){
		var linklist = [
		{link:'http://' +location.host+ '/debug.html#/simpledemo/savewithvalidation',label:'save with validation.'},
		{link:'http://' + location.host + '/debug.html#/simpledemo/createmodelsavewithvalidation',label:'create a new model save with validation.'},

		];
		session.bind('linkList', {
		    data : linklist
		});
	}

	//对于每一个loader，自动创建一个闭包。 监听其中session、collection的改变，作为reactive的source
	env.onload = function(){
		return [createLinklist];
	};
	
	env.onerror = function(){
		console.log('App.sdindex error.');
	};

	env.onrender = function(doRender){
		doRender(view, ['rotate','left']);
	};
	
	env.onready = function(doc){
	};
    
});