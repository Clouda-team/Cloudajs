/**
 * sumeru F / W
 * Copyright
 * License
 */

/**
 * 
 * define (require,exports,context);
 */

/**
 * New Define format demostration
 * 
 * Router : 
 * 
 * //todo how about register router in controller &  think about if we should support writing all of the mess in a single file
 * 
*/

//ONE COMMENT TO TEST FOR GIT SERVER UPDATE TO git.scm.baidu.com

sumeru.router.add({
    pattern    :   '/real-time',
    action  :   'App.newInf'
});

App.newInf = sumeru.controller.create(function(env, session){
    var fw = sumeru;
	var view = 'index';
	var idField = 'smr_id'; // _id
	var modeltest = function(){
		session.setIfNull('int', 25);
		session.demoCollection = env.prioritySubscribe('real-time', session.get('int'), session.get('gender'), function(collection, info){
			session.bind('DataTable', {
				data	: 	collection.find()//collection.find({'int >=': session.get('int')})
			});
		});
		
		session.demoCollection.onValidation = function(result,struct){
			if(result!==true){
            	console.log("index.js:validation faild:");
            	console.log(struct);
            	var arr = [];
            	for(var i=0,ilen=struct.length;i<ilen;i++){
					arr.push(struct[i].key + " error : " + struct[i].msg);
            	}
            	document.getElementById('validation-result').innerHTML += arr.join("<br/>")+"<hr/>";//JSON.stringify(result);

            	return;

			}
		};
		session.bind('dynamicBlock', {
		    string : 'test'
		});
		
	};
	
	var noneSubscribe = function(){
    	session.bind('syncTable',{
    	    name : 'Kitty',
    	    age  : 10245987
    	});  
	};
	
	var testConfig = function(){
	    var config = fw.config;
		var maxConfig = config.get('maxComment');
		session.bind('textConfig',{
		    maxCount: maxConfig
    	}); 
		var configEl = document.getElementById('commentConfig');
		configEl && (configEl.getElementsByTagName('span')[0].innerHTML = maxConfig);
	};
	
	var subModelData = function(){
		env.subscribe('pub-subModel', function(count){
            session.bind('subModelStat', {
                count : count
            });
        });
	};
	
	var subModelName = function(){
	  session.subModelCollection = env.subscribe('pub-subModelName', function(collection){});  
	};
	
	var byPage = function(){
	    if (!session.get('lazyPage')) {
	        session.set('lazyPage', 1);
	    };
	    
	    var pageOptions = {
	        pagesize : 1, 
	        page : session.get('lazyPage'),
	        uniqueField : 'time' //排序的唯一字段
	    };
	    
	    session.lazyLoadCollection = env.subscribeByPage('real-time-by-page', pageOptions, session.get('int'), function(collection, info){
	        var page = info.page;
	        console.log('invoking page no.', page);
	        session.bindByPage('lazyloadTable', {
	            page : page, //must have
	            /*
	            options : {    //optional
	                cleanExist : true //是否清除原有内容，如果配置为true相当于传统的翻页。
	            },*/
	            data : collection.find(),
	        });
	    });
	}
	
	//对于每一个loader，自动创建一个闭包。 监听其中session、collection的改变，作为reactive的source
	env.onload = function(){
		return [modeltest, subModelData, noneSubscribe, testConfig, byPage, subModelName];
	};
	
	env.onerror = function(){
	    env.start();
	};

	env.onrender = function(doRender){
		doRender(view, ['push','left']);//doRender(view, ['none','none']);
	};
	
	env.onready = function(doc){
	    //FIXME 登陆部分界面的渲染没有和事件处理分开。
	    window.session = session;
	    var statusEl = document.getElementById('status');
        var exist = document.getElementById('exist');
        
        if(fw.auth.isLogin()){
            statusEl.innerHTML = fw.auth.getToken() + '已登录';
            exist.style.display = 'inline';
        }else{
            statusEl.innerHTML = '未登录';
            exist.style.display = 'none';
        }
        
        
        Library.touch.on('#exist', 'touchstart', function(){
            var statusEl = document.getElementById('status');
            statusEl.innerHTML = '未登录';
            this.style.display = 'none';
            
            fw.auth.logout(function(){
                env.refresh();
            });
        });

        Library.touch.on('#login-tongyao', 'touchstart', function(e){
            sumeru.auth.login('tongyao', '123456', function(){
                env.refresh();
            });
        });

        Library.touch.on('#interface', 'touchstart', function(e){
            sub = env.callSubController('/inf-login',{
                oncreated:function(dom){
                    dom.style.background = "blue";
                    dom.style.height = "150px";
                },
                ondestroy:function(){
                    sub = null;
                },
                onerror:function(msg){
                    console.log(msg);
                }
            });
            var showSub = function(){
                if(sub.isReady()){
                    sub.show(["none","none"]);//sub.show(["flip","x"]);
                }else{
                    setTimeout(showSub,50);
                }
            };
            sub && showSub();
        });
        
        Library.touch.on('#reg-int', 'touchstart', function(e){        
            sub = env.callSubController('/inf-register',{
                oncreated:function(dom){
                    dom.style.background = "blue";
                    dom.style.height = "150px";
                },
                ondestroy:function(){
                    sub = null;
                },
                onerror:function(msg){
                    console.log(msg);
                }
            });
            var showSub = function(){
                if(sub.isReady()){
                    sub.show(["bounce","up"]);
                }else{
                    setTimeout(showSub,50);
                }
            };
            sub && showSub();
        });
	    
	    
		session.event('DataTable', function(){
			var event = 'click';

			if(!!('ontouchstart' in window)){
				event = 'touchstart';
			}
			
			document.getElementById('Add').addEventListener(event, function(){
				//this.style.background
				//增加一个数据
				/*
				{
					model:{
						s_model:{
							ss_name:'submodel submodel'
						},
						s_collection:[{
							ss_name:'submodel subcollection 1',
						},{
							ss_name:'submodel subcollection 2',
						}],
						s_name:'submodel'
					},
					collection:[{
						s_model:{
							ss_name:'subcollection submodel'
						},
						s_collection:[{
							ss_name:'subcollection subcollection 1',
						},{
							ss_name:'subcollection subcollection 2',
						}],
						s_name:'subcollection'
					}],
					array:[1,2],
					object:{a:1,b:2,c:3},
					datetime:new Date().getTime(),
					boolean:false,
					string:"i'm string",
					int:26,
					name:'model'
				}
				*/
				var v = fw.utils.parseJSON(document.getElementById('model-data').value);

               	session.demoCollection.add(v);
                session.demoCollection.save();
				session.demoCollection.update({int : 36}, {smr_id : session.demoCollection.get(session.demoCollection.length - 1).get('_id')});
				
                session.demoCollection.save();
				console.log(session.demoCollection);
			});
			
			document.getElementById('Modify').addEventListener(event, function(){
			   if(session.get('int') == 41){
			       session.set('int', 25);
			   } else {
			       session.set('int', 41);
			   }
			   
			   session.commit();
			});
			
			Library.touch.on('#Refresh', 'touchstart', function(){
			   env.refresh(); 
			});
			
			Library.touch.on('#ModifySubModelName', 'touchstart', function(){
			   if(session.demoCollection.length){                               
                session.subModelCollection.update({
                    s_name : sumeru.utils.randomStr(10)
                }, {
                    smr_id : session.demoCollection[0].model.smr_id
                }); 
                session.subModelCollection.save();   
			   }
			});

			doc.querySelector('table').addEventListener(event, function(e){
				var e = e || window.event,
					target = e.target || e.srcElement;
				
				if(target.tagName.toLowerCase() == 'button'){
					if(target.className == 'delete' && target.getAttribute('data-id')){
						session.demoCollection.destroy({
							smr_id	: target.getAttribute('data-id')
						});
						session.demoCollection.save();
						return false;
					} else if (target.className == 'update' && target.getAttribute('data-id')){
                        var item = session.demoCollection.find({smr_id : target.getAttribute('data-id')})[0];
                        
                        var _array = item.get('array');
                        _array.push(_array[_array.length-1]+1);

                        var _object = item.get('object');
                        if(typeof _object.add != 'undefined'){
                        	_object.add++;
                        }else{
                        	_object.add = 1;
                        }
                        session.demoCollection.update({
                            string   : item.get('string')+ 1,
                            int     : item.get('int') + 1,
                            array    : _array,
                            object  : _object
                        },{
                            smr_id : item.get('smr_id')
                        });
                        
                        session.demoCollection.save();
                        return false;
                        
                    } else if (target.className == 'modf-coll' && target.getAttribute('data-id')){
                        var item = session.demoCollection.find({smr_id : target.getAttribute('data-id')})[0];
                        
                        var subCollection = item.collection,
                            newModel = fw.model.create('Model.subModelDemo',{
								s_model:{
									ss_name:'submodel submodel'
								},
								s_collection:[{
									ss_name:'submodel subcollection 1',
								},{
									ss_name:'submodel subcollection 2',
								}],
								s_name:'submodel'
							});
                        subCollection.add(newModel);
                                            
                      
                        session.demoCollection.update({
                            collection   : subCollection
                        },{
                            smr_id : item.get('smr_id')
                        });
                        
                        session.demoCollection.save();
                        return false;
                        
                    }
				}
			});

		});
		
		var event = 'click';

		if(!!('ontouchstart' in window)){
			event = 'touchstart';
		}

		document.getElementById('Config').addEventListener(event, function(){
		    var config = fw.__load('config');
		    if(config.get('maxComment') == 10){
			    config.set('maxComment', 6);
			}else{
			    config.set('maxComment', 10);
			}
			config.commit();
		});
		
        session.event('lazyloadTable', function(){
            var event = 'click';

            if(!!('ontouchstart' in window)){
                event = 'touchstart';
            }
            
            document.getElementById('loadMore').addEventListener(event, function(){
               session.set('lazyPage', session.get('lazyPage') + 1);
               session.commit();
            });
        });
		
		var timer = 0;
		setInterval(function(){
			timer += 0.01;
			document.getElementById('timer').getElementsByTagName('span')[0].innerHTML = timer; 
		}, 100);
	};
    
});