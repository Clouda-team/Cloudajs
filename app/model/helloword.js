sumeru.router.add({
  pattern:'/helloword',
  action:'App.helloword'
  });

App.helloworld = sumeru.controller.create(function(env,session){
    env.onrender = function(doRender){
        doRender("helloworld",["push", "left"]);
    };
});
sumeru.packages(
    'helloworld.js'
);

  
  
