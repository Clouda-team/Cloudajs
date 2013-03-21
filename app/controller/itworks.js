sumeru.router.add(

	{
		pattern: '/itworks',
		action: 'App.itworks'
	}

);

//sumeru.router.setDefault('App.itworks');


App.itworks = sumeru.controller.create(function(env, session){

	env.onrender = function(doRender){
		doRender("itworks", ['push','left']);
	};

});