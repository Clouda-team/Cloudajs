var runnable = function(fw){
	(function(fw){
		// sense　对像空间
		if (fw.sense)return fw.sense;
		var sense = fw.addSubPackage('sense');
		
		/**
		 * runSenseContext执行的方法周期内，将创建inspector，用于监视用户处理逻辑中的getter方法的执行.
		 * 在用户处理逻辑完成后自动销毁，使在runSenseContext方法周期外的用户逻辑代码，不再重复监听getter.
		 * 
		 * @param customClosure {function} 用户方法，在此方法中使用的所有sense对像，将被监听.
		 */
		sense.__reg('runSenseContext',function(customClosure){
			/*
			 * 监视器,用于监视customClosure的执行过程中，对sense对像的调用.
			 */
			sense.__reg('_senseInspector', function(senseObjInstance, key){
				senseObjInstance.addObserver(key, customClosure);
			}, true);
			
			//FIXME 如果用户逻辑中存在异步调用或setTimeout，将导到依赖关系丢失。
			// 触发用户处理过程
			customClosure();
			
			//用户代码执行完成后，销毁inspector
			sense.__reg('_senseInspector', function(){}, true);
		});
		
		var Sense = {
				/**
				 * 根据键名取得键值.如果触发时间点在runSenseContext的方法周期中,将向外部检查器注册当前context中，对某个key的依赖.
				 * @param key
				 * @returns　{any}
				 */
				get:function(key){
					sense._senseInspector && sense._senseInspector(this, key);
					if( typeof this.container != 'object') {
						 console.warn('no container error in sense get on line 38 '+key);
						return;
					}
					return this.container[key];
				},
				/**
				 * 设置或修改键值
				 * @param key {string}
				 * @param value　{any}
				 */
				set:function(key, value){
					this.container[key] = value;
					
					if(this.observer.length != 0){
						for(var i = 0, l = this.observer.length; i < l; i++){
							if(this.observer[i].key != key  || this.toBeCommited.some(function(item){
								return item(this.observer[i]);
							},this)){
								continue;
							}
							this.toBeCommited.push((function(that, observerItem){
								return function(checkObserver){
									if(arguments.length === 0 ){
										//fw.dev('exec customCloser', observerItem.customClosure.length);
										observerItem.customClosure.call(that, key);
									}else{
										return checkObserver == observerItem;
									}
								};
							})(this, this.observer[i]));
						}
					}
				},
				/**
				 * 确认修改session，并自动重新触发对相关依赖的用户方法.
				 * @returns {Boolean}
				 */
				commit:function(){
					var toBeCommited = this.toBeCommited;
					if(toBeCommited.length === 0){
						return true;
					}
					
					var tapped_blocks = [];
					fw.controller.__reg('_tapped_blocks', tapped_blocks, true);
					
					for (var i = 0, l = toBeCommited.length; i < l; i++){
						toBeCommited[i]();
					}
					
					//每个Controller的render方法会保证局部渲染一定等待主渲染流程完成才开始。
					fw.controller.__load('reactiveRender')(tapped_blocks);
				
					toBeCommited.length = 0;
				},
				addObserver:function(key, customClosure){
					// 去重
					for(var i = 0, l = this.observer.length; i < l; i++){
						if(this.observer[i].key === key && this.observer[i].customClosure == customClosure ){
							return; //两个函数不会相等的，不知道谁写的，但这行永远不会执行 FIXME ，上面的函数改成toString后会造成session.get在两个onload是相等的bug
						}
					}
					
					this.observer.push({
						key : key,
						customClosure : customClosure
					});
				},
				removeObserver:function(func){
					for(var i = 0, l = this.observer.length; i < l; i++){
						if(this.observer[i].customClosure === func){
							this.observer.splice(i, 1);
							return;
						}
					}
				},
				cleanObserver:function(){
				    this.observer.length = 0;
				    this.toBeCommited.length = 0;
				}
		};
		
		/**
		 * 创建继承自sense对像的类.
		 * @param constructor {function} 目标类的构造方法
		 * @param proto {object} 用于constructor的prototype，
		 *                       如果提供，则使用该对像做为继承prototype并附加方法，
		 *                       如果不提供，则使用constructor.prototype
		 * @returns {function} 继承处理过的构造方法
		 */
		sense.__reg('extend',function(constructor,proto){
			
			// 创建一个当前目标构造方法的代理方法，用于初始化sence对像。
			var proxy_constructor = (function(){
				return function(){
					// 对像属性
					this.toBeCommited = [];
					this.observer = [];
					this.container = {};
					// 执行正真的构造方法
					constructor.apply(this,arguments);
				};
			})(constructor);
			
			// copy sense的方法至目标构造方法的prototype
			proxy_constructor.prototype = fw.utils.cpp(proto || constructor.prototype,Sense);
			
			return proxy_constructor;
		});
		
	})(fw);
}
//for node
if(typeof module !='undefined' && module.exports){
	module.exports = runnable;
}else{
    runnable(sumeru);
}
