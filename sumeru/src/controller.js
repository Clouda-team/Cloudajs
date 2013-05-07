(function(fw){
    var _controller = fw.addSubPackage('controller');
   
    //所有当前活跃的控制器的容器
    //[{controller : controllerClass, renderFunc : renderFunc}, ...]
    //其中renderFunc主要是当服务器推送数据时，给MsgDispatcher使用的
    var activeController = [];
    var activeControllerId;
    var cloneDom = null;
    var transitionOut = false;//如果为true，则表明此controller是反转出场
    var globalIsforce = null;
    
    /**
     * 全局的模板ID => 数据的Map
     */
    _bindingMap = {};
    
    /**
     * 绑定数据和事件的方法
     */
    
    //FIXME 现在所有的widgetId都默认全App之内唯一
    // _bindingData中的widgetId, 是应该表示一个数据集的名称,由于数据集原本就是在messageDispatcher.js中向全局任意位置派发,所以此处全局唯一不应存在问题. wangsu
    var _bindingData = function(key, dataMap){
        var widgetId = this.__UK + "_" + key;
        if(!_bindingMap[widgetId]){
            _bindingMap[widgetId] = {
                view_data   :   {},
                eventMap    :   {}
            };
        }
        
        //如果存在tapped_blocks，则是在messageDispatcher处定义的
        var tapped_blocks = _controller.__load('_tapped_blocks');
        if(typeof tapped_blocks != 'undefined'){
            tapped_blocks.push({
                widgetId : widgetId
            });
        }

        for(var i in dataMap){
            if(dataMap.hasOwnProperty(i)){
                _bindingMap[widgetId].view_data[i] = dataMap[i];
            }
        }
    };
    
    //_bindingDataByPage和_bindingData的唯一区别是viewdata中细分了按页码存放的子数组
    var _bindingDataByPage = function(key, dataMap){
        var widgetId = this.__UK + "_" + key;
        if(!_bindingMap[widgetId]){
            _bindingMap[widgetId] = {
                view_data   :   {},
                eventMap    :   {}
            };
        }
        
        if (typeof dataMap.page == 'undefined') {
            throw "subscribeByPage always need a page parameter";
        };
        
        
        _bindingMap[widgetId].isByPage = true;
        
        var container = _bindingMap[widgetId]['view_data'][dataMap.page] = {}; 

        //如果存在tapped_blocks，则是在messageDispatcher处定义的
        var tapped_blocks = _controller.__load('_tapped_blocks');
        if(typeof tapped_blocks != 'undefined'){
            tapped_blocks.push({
                widgetId : widgetId,
                page    : dataMap.page,
                options : dataMap.options || {}
            }); 
        }
                
        for(var i in dataMap){
            if(dataMap.hasOwnProperty(i)){
                container[i] = dataMap[i];
            }
        }
        
    };
    var _cloneDom = function(instance) {
        cloneDom = instance.getDom().cloneNode(true);
        cloneDom.style.zIndex = "0";
        cloneDom.removeAttribute("id");
        var tpls = cloneDom.querySelectorAll("[tpl-id]");//去掉tpl-id，防止多加载
        for (var i = 0,len = tpls.length ; i < len ; i++ ) {
            tpls[i].removeAttribute("tpl-id");
        }
    }
    var _bindingEvent = function(key, eventFunc){
        var widgetId = this.__UK + "_" + key;
        if(!_bindingMap[widgetId]){
            _bindingMap[widgetId] = {
                view_data   :   {},
                eventMap    :   {}
            };
        }
        
        var self = this;
        
        _bindingMap[widgetId].eventMap['__default_key__'] = function(){eventFunc.call(self);};
        //立即执行一次
        _bindingMap[widgetId].eventMap['__default_key__']();
    };
    
    var queryElementsByTplId = function(id,rootElement){
        return (rootElement || document).querySelectorAll('block[tpl-id="' + id + '"]') || [];
    };
    
    //根据模板关系，从父模板到子模板，对每个block进行渲染  
    var doRenderByRelation = function(relationMap, func){
        for (var i in relationMap){
            func(i, relationMap[i]);
            doRenderByRelation(relationMap[i], func);
        }    
    };
    
    
    /**
     * 查找重用一个dom的controller,并无条件将其销毁...
     *   
     * FIXME 真狠..此处可能有销毁性能上的潜藏问题
     * @param id dom元素的id, 一般为模板根block的名称
     * @param butMe 需要跳过的销毁的controller id
     */
    var findAndDestroy = _controller.__reg('findAndDestroy',function(idArr,butMe){
        
        var destroyItems = activeController.filter(function(item){
            var id = item.__getID();
            if(id === butMe){
            }else if(idArr.indexOf(id)!== -1){
                return true;
            }
            return false;
        });
        
        destroyItems.forEach(function(item){
            item.destroy();
        });
    },true);
    
    /**
     * Controller's Env base
     */
    var _Environment = function(){
        this.isWaiting = 0;
        this.isWaitingChecker = null;
        this.callbackFunc = null;
        this.isDestroy = false;
        
        this.withEnyo = false;//third plugin enyojs
        
    };
    
    var _pubSubObject = new fw.pubsub._pubsubObject();
    
    _Environment.prototype = {
        
         __destroy:function(){
            fw.utils.cleanObj(this);
            this.isDestroy = true;
            fw.pubsub.clear();
        },
        
        setClockChecker : function(){
            var after = 8 * 1000;
            this.isWaitingChecker = setTimeout(function(){
                //这个checker可能会重复，所以添加hack
                if (this.isWaiting > 0)//hack
                    throw 'NOT call env.start after ' + after / 1000 + ' seconds, do you forget it?';
            }, after);
            // this.isWaitingChecker = setTimeout(function(){
                // throw 'NOT call env.start after ' + after / 1000 + ' seconds, do you forget it?';
            // }, after);
        },
        
        clearClockChecker : function(){
          clearTimeout(this.isWaitingChecker);  
        },
        
        setCallback : function(func){
            this.callbackFunc = func;
        },
        
        fireCallback : function(){
            if(this.isWaiting <= 0 && this.callbackFunc){
                this.callbackFunc();
            }
        },
        
        redirect:function(queryPath,paramMap,isforce){
            var urlHash = queryPath;
            if(paramMap){
                urlHash += "!" + fw.utils.mapToUriParam(paramMap);
            }
            fw.router.redirect(urlHash,isforce);
        },
        
        refresh:function(){
            return this.__getControllerInstance().__refresh();
        },
        
        /**
         * 调用一个子controller
         * @param conNam {string} controller的Name
         */
        callSub:function(conNam){
            this.__getControllerInstance().__callSubController(conNam);
        },
        
        wait : function () {//移到了pubsub.js中
            this.isWaiting++;
            this.setClockChecker();
        },
        
        start : function () {//移到了pubsub.js中
            this.clearClockChecker();
            if (--this.isWaiting <= 0) {
                this.isWaiting = 0;
                this.fireCallback(); 
            };
        },
        
        onload : function(){
            return [];
        },
        
        onrender : function(){
            //throw "Didn't specify a onrender event handler";
        },
        
        onready : function(){
        },
        
        /*
         * 以下情况执行该方法：
         *  当前controller移出屏幕并且dom对像将被复用时。
         *  性能调优时，长时间不活动的controller需要被暂停时。
         */
        onsleep : function(){
        },
        
        /*
         * 当controller从sleep中恢复活动时，执行该方法
         */
        onresume : function(){
        },
        
        /**
         * 通知controller将被销毁
         */
        ondestroy : function(){
        },
        
        /**
         * 当前controller收到错误消息时被触发
         */
        onerror : function(msg){
            console.log(msg);
        },
        
        subscribe : _pubSubObject.subscribe,
        subscribeByPage : _pubSubObject.subscribeByPage,
        prioritySubscribe : _pubSubObject.prioritySubscribe
    };
    
    var controllerBase = {
            __init:function(){
                var env = null;
                var tapped_block = [];
                if(this.__isInited === false){
                    env = this.getEnvironment();
                    session = this.getSession();
                    var that = this;
                    
                    activeController.push(this);
                    
                    // 构建空的tapped_blocks用于触发不使用subscribe时的block的渲染
                    fw.controller.__reg('_tapped_blocks', tapped_block, true); 
                    
                    var toLoad = env.onload();
                    
                    var doLoad = function(i) {
                        if (i >= toLoad.length) {
                            env.setCallback(null);
                            return;
                        }
                        
                        env.setCallback(function() {
                            doLoad(++i);
                        });
                        
                        fw.sense.runSenseContext((function(customClosure) {
                            return function() {
                                // 构建空的tapped_blocks用于触发不使用subscribe时的block的渲染
                                fw.controller.__reg('_tapped_blocks', [], true);
                                customClosure.call({});
                                // 触发同步使用session.bind所应产生的演染
                                that.__render(fw.controller._tapped_blocks);
                            };
                        })(toLoad[i]));
                        
                        // toLoad[i]();
                        
                        // 如果这次没调用wait函数，则fire生效。否则此fire进入后就立即推出了，等待resume方法的fire进行实际触发。
                        env.fireCallback();
                    };
                    
                    // 开始初始化记载数据
                    doLoad(0);
                    // 构建空的tapped_blocks用于触发不使用subscribe时的block的渲染
                    
                    // 触发第一次渲染
                    this.__render();
                    
                    // 标记初始化结束
                    this.__isInited = true;
                }
                
            },
            __render:function(tapped_block){
                var me = this;
                var item = tapped_block.widgetId;
                var env = this.getEnvironment();
                
                //FIXME 添加了enyo的hack
                if ( env.withEnyo ) {
                    this.__renderEnyo(tapped_block);
                    return true;
                } else if(typeof _bindingMap[item] == 'undefined' || me.__templateBlocks[item] == undefined){
                    return false;
                }
                
                var record = _bindingMap[item];
                if (record.isByPage) {
                    //如果是分页类的数据绑定
                    var targets = queryElementsByTplId(item),
                        page = tapped_block.page,
                        data = _bindingMap[item]['view_data'][page],
                        onePageContainer;
                    
                    for(var i = 0, l = targets.length; i < l; i++){
                        var target = targets[i];
                        if (tapped_block.options.cleanExist) { //如果指明要清除现有内容
                            var matched = target.querySelectorAll('[__page-unit-rendered-page]'),
                                existNode;
                            for (var x = 0, y = matched.length; x < y; x++){
                                existNode = matched[x];
                                existNode.parentNode.removeChild(existNode);
                                existNode.innerHTML = '';
                            };
                        };
    
    
                        //检查是否已被渲染的分页区域 page-unit-rendered-page
                        if (target.querySelectorAll('[__page-unit-rendered-page]').length == 0) {
                            //初次渲染
                            var html = me.__templateBlocks[item](data);
                            
                            //将标记的tpl-role=page_unit换为page-unit-rendered-page
                            html = html.replace(/tpl-role[\s]*=[\s]*['"]page_unit['"]/, '__page-unit-rendered-page="' + page + '"');
                            target.innerHTML = html;
                        } else {
                            var fakeNode = document.createElement('div');
                            fakeNode.innerHTML = me.__templateBlocks[item](data);
                            
                            var onePageDom;
                            
                            var onePageContentMatchElement = fakeNode.querySelector('[tpl-role="page_unit"]');
                            if (onePageContentMatchElement == null) {
                                //如果没有找到tpl-role的语法标记，则默认使用整个模板
                                onePageDom = fakeNode;
                            } else {
                                onePageDom = onePageContentMatchElement;
                            }
    
                            
                            
                            //将标记的tpl-role=page_unit换为page-unit-rendered-page
                            onePageDom.removeAttribute('tpl-role');
                            onePageDom.setAttribute('__page-unit-rendered-page', page);
                            
                            
                            //判断是否需要创建容器
                            var container;
                            if (container = target.querySelector('[__page-unit-rendered-page="' + page + '"]')) {
                                //如果已经存在容器
                                container.innerHTML = onePageDom.innerHTML;
                            } else {
                                onePageDom.innerHTML = onePageDom.innerHTML.replace(/tpl-role[\s]*=[\s]*['"]page_unit['"]/, '__page-unit-rendered-page="' + page + '"');
                                
                                //取当前最后一个单页面容器，插入在其后面
                                var tmp = target.querySelectorAll('[__page-unit-rendered-page]');
                                container = tmp[tmp.length - 1];
                                //insertAfeter
                                container.parentNode.insertBefore(onePageDom, container.nextSibling); 
                                //it will still work because when the second parameter of insertBefore is null then the onePageDom is appended to the end of the parentNode
                            }
                            
                            //重写HTML抹除事件绑定
                            target.innerHTML = target.innerHTML + ' ';
                        }    
                    }
                    
                    
                    var blockEvents = _bindingMap[item]['eventMap'];
                    for(var i in blockEvents){
                        blockEvents[i]();
                    }
                    
                } else {
                    var data = _bindingMap[item]['view_data'];
                    var targets = queryElementsByTplId(item);
                    
                    for(var i = 0, l = targets.length; i < l; i++){
                        var target = targets[i];
                        target.innerHTML = me.__templateBlocks[item](data);
                    }
                    
                    var blockEvents = _bindingMap[item]['eventMap'];
                    for(var i in blockEvents){
                        blockEvents[i]();
                    }
                    
                    //根据模板关系，从触发的当前模块块，对其下每个block重新进行渲染  
                    var found = null;
                    doRenderByRelation(me.__templateRelation, function(i, currentItem){
                        if (i == item) {
                            found = currentItem;
                        };
                    });
                    
                    doRenderByRelation(found, function(i){
                        if(_bindingMap[i]){ //如果都没绑定数据和事件，就不用处理重新绘制了
                            var data = _bindingMap[i]['view_data'];
                            
                            
                            var targets = queryElementsByTplId(i);
                            for (var x = 0, y = targets.length; x < y; x++){
                                var target = targets[x];
                                target.innerHTML = me.__templateBlocks[i](data);
                            }
                            
                            var blockEvents = _bindingMap[i]['eventMap'] || {};
                            for(var key in blockEvents){
                                blockEvents[key]();
                            }    
                        }
                    });
                }
                
                return true;
            },
            __renderEnyo: function( tapped_block ) {
                var enyoapp = session.get('enyoapp');
                if ( !enyoapp ) {
                    console.log("__renderEnyo -> no enyoapp detacted!");
                    return false;
                }
                    
                if ( !tapped_block ) {//第一次要render到body上
                    var doc = document.getElementById('view/blank@@content');
                    enyoapp.renderInto(doc);
                    return;
                }
                
                var item = tapped_block.widgetId;
                var tmp = item.split(".").pop();
                var blockEvents = _bindingMap[item]['eventMap'];
                //执行步骤,是enyo更新dom的步骤
                //1.销毁，2.更新数据，3.render
                enyoapp.$[tmp].destroyClientControls();
                enyoapp.$[tmp].fwdata =_bindingMap[item].view_data.fwdata;
                enyoapp.$[tmp].fwdataChanged();
                enyoapp.$[tmp].render();
                
                for( var i in blockEvents ) {//这里是执行enyo.
                    blockEvents[i]();
                }
                
            },
            __refresh:function(){
                var identifier = this.__getID(), constructor , instance;
                var arr = identifier.split("!");
                
                if(arr.length === 1){
                    arr.push('');
                }
                
                constructor = findController(arr[0]);
                
                if (constructor === false) {
                    //可能由第三方程序接管，framework停止响应
                    return;
                };
                
                this.destroy(true,true); // 销毁自身，但保留session
                
                //创建一个新的controller,将自动使用未被销毁的旧session
                instance = new MainController(identifier, fw.utils.uriParamToMap(arr[1]), constructor);
                instance.__init();
                
            },
            destroy:function(isKeepSession,isKeepDomForTrans){
                var id = this.__getID();
                var uk = this.__UK;
                //try {
                    var session = this.getSession();
                    var env = this.getEnvironment();
                    
                    //销毁之前，我要 clonedom 一份用于转场
                    //自己转自己，没有 clonedom 会出错，所以添加容错
                    if(!cloneDom && typeof this.getDom != 'undefined' && isKeepDomForTrans) _cloneDom(this);
                    
                    try {
                        env.ondestroy();                    // 通知用户controller将被销毁.
                    } catch (e) {}
                    
                    // 清理当前占用的dom
                    fw.render.clearTplContent(session);
                    
                    // 销毁过程..
                    if(isKeepSession !== true){
                        fw.session.destroy(session);
                    }else{
                        session.cleanObserver();
                    }
                    
                    env.__destroy();
                    
                    //销毁dom
                    //added view delete
                    fw.render.delTpl(this.tplName);
       
                    // 销毁子controller
                    if(this.__subControllerList){
                        for(var key in this.__subControllerList){
                            this.__subControllerList[key].destroy();
                        }
                    }
                    
                    // 清理_bindingMap
                    for(var key in _bindingMap){
                        if(key.indexOf(uk) === 0){
                            fw.utils.cleanObj(_bindingMap[key].view_data);
                            fw.utils.cleanObj(_bindingMap[key].eventMap);
                            fw.utils.cleanObj(_bindingMap[key]);
                            delete _bindingMap[key];
                        }
                    }
                    
                    // 外引对像　&　闭包方法
                    this.getSession = null;
                    this.getEnvironment = null;
                    this.__getIdentifier = null;
                    
                    delete this.getSession;
                    delete this.getEnvironment;
                    delete this.__getIdentifier;
                /*} catch (e) {
                    // TODO: handle exception
                    console.error(e);
                }finally{*/
                    var old = activeController;
                    
                    // 无论如何,清除activeController中的引用
                    activeController = old.filter(function(item){
                        return item.__getID() !== id;
                    });
                    
                    // 清空旧数组
                    old.length = 0;
                    
                    SUMERU_APP_FW_DEBUG && console.log('destory ["' + id + '"]');
                //}
            }
    };
    
    /**
     * 子controller的基类
     * 子controller，访问父controller的session与传入的collection对像用于触发父对像的随动反馈.
     * @param id {string} 
     * @param params {any} 传入参数
     */
    var SubControler =  function(id, params, _parent , constructor){
        var me = this;
        var env , session;
        env= new _Environment();
        session = fw.session.create(id);  // 相同的id会返回相同的session
        session.bind = _bindingData;
        session.event = _bindingEvent;
        //FIXME 为了与给HP的代码一致，临时给出一个简单的eventMap实现。后续要与事件库一起考虑
        session.eventMap = fw.event.mapEvent;
        
        session.__isSubController = true;
        
        // 取得父controller的session
        session.getMain = function(){
            return _parent.session;
        };
        
        env.isReady = function(){
            return false;  
        };
        
        env.show = function(){
            throw 'this controller not ready';
        };
        env.hide = function(){
            throw 'this controller not ready';
        };
        
        env.destroy = function(){
            me.destroy();
        };
        
        // 确保session bind时数据项唯一的随机字符串key
        env.__UK = session.__UK = this.__UK = "T" + fw.utils.randomStr(10);
        
        // 添加取得当前对像的get方法，
        // 保证值在controller的生命周期中是唯一，并且不可变更.
        
        this.getSession = function(){
            return session;
        };
        
        this.getEnvironment = function(){
            return env;
        };
        
        this.__getID = function(){
            return id;
        };
        
        this.__isFirstRender = true;
        this.__isInited = false;
        this.__templateBlocks = false;
        this.__templateRelation = false;
        
        constructor( env, session , params , _parent);
        
        env.__getControllerInstance = function(){
            return me;
        };
        
        SUMERU_APP_FW_DEBUG && console.log("create new : " + id);
    };
    
    SubControler.prototype = fw.utils.extendFrom(controllerBase,{
        __render:function(tapped_blocks){
            var me = this;
            var env = me.getEnvironment();
            var session = me.getSession();
            var _transitionType = null;//push left,right,down,up
            
            //此处env是在构造方法中创建，并在用户controller的构造方法执行时被替换了真正的生命周期方法.
            env.onrender(function(tplName, position , transitionType){
                 session.__currentTplName = tplName;          // 记录到session
                 var block , blockStyle = {
                         position : 'absolute',
                         top:0,
                         left:0,
                         width:'100%',
                         height:70,
                         display:'none'
                 };
                 //这里添加render时候的记录
                 _transitionType = (typeof transitionType !== 'undefined') ? ( transitionType ) : null;
                 
                 var doRender  = function(){
                    //pub sub触发的局部渲染
                    if (typeof tapped_blocks != 'undefined'){ //如果定义了tapped_blocks，那么就一定是来自msgDispater的局部渲染调用
                        
                        //优先抛弃length == 0的情况
                        if(!tapped_blocks.length){
                            return;
                        }
                        
                        //如果isFirstRender还为true，则说明数据push在首次渲染之前就到达了。需要等待首次渲染完成。
                        if (me.__isFirstRender) {
                            setTimeout(function(){
                                me.__render(tapped_blocks);
                            }, 50);
                            return;
                        }
                        for (var i = 0, l = tapped_blocks.length; i < l; i++){
                            //=====================
                            controllerBase.__render.call(me,tapped_blocks[i]);
                            //=====================
                        };
                        return;
                    }
                    
                    // 只记录模版的更新方法，模版骨架的创建方法，会在getTpl的时候，首次返回时解析.如果实在必须重新渲染骨架，使用 render.renderBone
                    var renderObject = fw.render.buildRender(session);
                    me.__templateBlocks = renderObject.renderBlock;
                    me.__templateRelation = renderObject.blocksRelation;
                     
                     
                    block = fw.render.getTplContent(session);
                    
                    fw.utils.setStyles(block,fw.utils.cpp(blockStyle,position));
                    
                    //对每个block进行渲染
                    //根据模板关系，从父模板到子模板，对每个block进行渲染  
                    doRenderByRelation(me.__templateRelation, function(i){
                        
                        var targets = queryElementsByTplId(i);
                        for(var x = 0, y = targets.length; x < y; x++){
                            var target = targets[x];
                            target.innerHTML = me.__templateBlocks[i]({});
                        }
                    });
                    
                    // 创建模版容器后，创真正的显示和隐藏方法
                    //这里添加转场动画,暂时只在onrender时候设置了默认动画，如果以后这里要加也可以
                    //其实这里很容易，因为只需要进场出场效果而已
                    env.show = function( transitionType ){
                       fw.transition._subrun({
                            "dom" : block,                               
                            "anim" : transitionType || _transitionType   // 如果没指明，则使用上一次的
                        },false);
                        if (!_transitionType && transitionType ) {
                            _transitionType = transitionType;
                        }
                    };
                    env.hide = function( transitionType ){
                         fw.transition._subrun({
                            "dom" : block,                               
                            "anim" : transitionType || _transitionType   // 如果没指明，则使用上一次的
                        },true);
                    };
                    
                    env.setPosition = function(css){
                        fw.utils.setStyles(block,css);
                    };
                    
                    env.isReady = function(){
                        return true;
                    };
                    
                    session.toBeCommited.length = 0;
                    
                    //FIXME 不能直接onready，还要判断是否FirstRender完成
                    env.onready(block);
                    
                    me.__isFirstRender = false;
                }; //end dorender  
                
                //这里修复了一个可能出现死锁的BUG，当tpl已经加载，对象却destroy的时候会出现，永远都是__isFirstRender == true
                //可能引起其他问题，另外不开控制台断点没问题,代码逻辑没问题，暂不修复 FIXME
                // if ( fw.render.getTplStatus(tplName) === 'loaded' ) {
                    // me.__isFirstRender = false;
                // }
                fw.render.getTpl(tplName,session,function(render){
                    me.tplName = tplName;//加入tplName入口
                    doRender();
                });
                
            });
        }
    });
    
    /**
     * controller
     */
    var MainController =  function(id, params , constructor){
        var me = this;
        var env , session;
        env= new _Environment();
        
        session = fw.session.create(id);  // 相同的id会返回相同的session
        session.bind = _bindingData;
        session.bindByPage = _bindingDataByPage;
        session.event = _bindingEvent;
        //FIXME 为了与给HP的代码一致，临时给出一个简单的eventMap实现。后续要与事件库一起考虑
        session.eventMap = fw.event.mapEvent;
        
        env.callSubController = function(name,param,forceFresh){
            return me.__callSubController(name,param,forceFresh);
        };
        
        // 确保session bind时数据项唯一的随机字符串key
        env.__UK = session.__UK = this.__UK = "T" + fw.utils.randomStr(10);
        
        session.__isSubController = false;
        // 添加取得当前对像的get方法，
        // 保证值在controller的生命周期中是唯一，并且不可变更.
        
        this.getSession = function(){
            return session;
        };
        
        this.getEnvironment = function(){
            return env;
        };
        
        this.__getID = function(){
            return id;
        };
        
        this.__isFirstRender = true;
        this.__isInited = false;
        this.__templateBlocks = false;
        
        this.__subControllerList = {};
        constructor( env, session , params);
        
        env.__getControllerInstance = function(){
            return me;
        };
        
        SUMERU_APP_FW_DEBUG && console.log("create new : " + id);
    };
    
    MainController.prototype = fw.utils.extendFrom(controllerBase,{
        __render:function(tapped_blocks){
            var me = this;
            var env = me.getEnvironment();
            var session = me.getSession();
            
            //此处env是在构造方法中创建，并在用户controller的构造方法执行时被替换了真正的生命周期方法.
            env.onrender(function( tplName, transitionType ){
                 session.__currentTplName = tplName;          // 记录到session
                 var tplContentDom;
                 var doRender  = function(){
                    //pub sub触发的局部渲染
                    if (typeof tapped_blocks != 'undefined'){ //如果定义了tapped_blocks，那么就一定是来自msgDispater的局部渲染调用
                        
                        //优先抛弃length == 0的情况
                        if(!tapped_blocks.length){
                            return;
                        }
                        
                        //如果isFirstRender还为true，则说明数据push在首次渲染之前就到达了。需要等待首次渲染完成。
                        if (me.__isFirstRender) {
                            setTimeout(function(){
                                me.__render(tapped_blocks);
                            }, 50);
                            return;
                        }
                        for (var i = 0, l = tapped_blocks.length; i < l; i++){
                            //=====================
                            controllerBase.__render.call(me,tapped_blocks[i]);
                            //=====================
                        };
                        return;
                    }
                    
                    // 只记录模版的更新方法，模版骨架的创建方法，会在getTpl的时候，首次返回时解析.如果实在必须重新渲染骨架，使用 render.renderBone
                    var renderObject = fw.render.buildRender(session);
                    me.__templateBlocks = renderObject.renderBlock;
                    me.__templateRelation = renderObject.blocksRelation;
                    
                    tplContentDom = fw.render.getTplContent(session);
                          
                    //根据模板关系，从父模板到子模板，对每个block进行渲染                
                    doRenderByRelation(me.__templateRelation, function(i){
                        var targets = queryElementsByTplId(i);
                        for(var x = 0, y = targets.length; x < y; x++){
                            var target = targets[x];
                            target.innerHTML = me.__templateBlocks[i]({});    
                        }
                    });
                    
                    me.__transition(tplName,transitionType,function() {
                        session.toBeCommited.length = 0;
                        env.onready(tplContentDom);
                    });
                    if ( env.withEnyo && me.__isFirstRender ) {//初始化enyo render,确保只执行一次!
                        controllerBase.__renderEnyo();
                    }
                    me.__isFirstRender = false;
                }; //end dorender  
                
                fw.render.getTpl(tplName,session,function(render){
                    doRender();
                });
            });
        },
        /**
         * 调用一个子controller
         * @param conNam {string} controller的名称
         */
        __callSubController:function(conNam,params,forceFresh){
            var constructor = findController(conNam), rootElement = this.__lastTransitionIn;
            
            if (constructor === false) {
                //可能由第三方程序接管，framework停止响应
                return;
            };
            
            var env = this.getEnvironment();
            var subEnv , subId = "__subFrom/" + this.__getID()  + "/" + conNam ,instance;
            var parent = {
                    session:this.getSession(),
                    env:fw.utils.getProxy(env,['redirect','refresh']),
                    tplContent:rootElement
            };
            
            if(!constructor){
               throw 'can not find a sub controller';
            }
            //这个判断添加一个feature，用于更新subcontroller add by sundong
            instance = this.__subControllerList[subId];
            if( instance && typeof forceFresh !== 'undefined' && forceFresh){
                instance.destroy();
            }
            if( instance = this.__subControllerList[subId] ){
                /**
                 * 重用子controller
                 */
            }else{
                instance = new SubControler(subId , params , parent , constructor);
                this.__subControllerList[subId] = instance;
                subEnv = instance.getEnvironment();
                // 代理env的一些事件方法，用于通知创建者子controller的生命周期
                subEnv.onready = (function(before,after){
                    return function(){
                        before.apply(this,arguments);
                        after && after.apply({},arguments);
                    };
                })(subEnv.onready,params.oncreated);
                
                subEnv.ondestroy = (function(before,after,superController,subId){
                    return function(){
                        try {
                            before.apply(this,arguments);
                            after && after();
                            
                        } catch (e) {
                            // TODO: handle exception
                            console.error(e);
                        }finally{
                            // 子controller被destroy时，自动清理父controller记录的__subControllerList,用于防止再次创建时引发错误.
                            superController.__subControllerList[subId] = null;
                            delete superController.__subControllerList[subId];
                        }
                        
                    };
                })(subEnv.ondestroy,params.ondestroy,this,subId);
                
                subEnv.onerror = (function(before,after){
                    return function(){
                        before.apply(this,arguments);
                        after && after.apply({},arguments);
                    };
                })(subEnv.onerror);
            }
            
            instance.__init();
            return fw.utils.getProxy(instance.getEnvironment(),['show','hide','setPosition','isReady','destroy']);
        },
        __transition:function(tplName,transitionType,oncomplete){
            
            var lastTransitionIn , rv,tmp;
            /*
             * 偷偷记录，当前url，session与使用dom的历史关系，用于返回,
             * 由于controller的id，由controllerPath + params组成，
             * 所以此处不再从url中取值.直接取得session中序列化部份的的值对session的key进行排序.
             * 然后对形成新对像进行JSON序列化记录.拼到id后面，生成索引键.
             */
            this.urlToTplHistory = this.urlToTplHistory || {};
            var index = this.__getID();
            var session = this.getSession();
            var hashKey = session.__hashKey.sort();
            var jsonObj = {};
            
            hashKey.forEach(function(key){
                jsonObj[key] = session.get(key);
            },hashKey);
            
            
            index += JSON.stringify(jsonObj);
            
            // 如果提供tplName进行history记录处理,否则进行检索处理
            if(tplName || tplName === ""){
                
                // 此处不考虑一个完全不变的url对应多个tplName的问题，只记录最后一次的使用.所以，此处使用map结构，便于检索使用
                this.urlToTplHistory[index] = tplName;
                lastTransitionIn = fw.render.getTplContent(session);
            }else{
                // 查找历史记录
                tplName = this.urlToTplHistory[index];
                // 找到对应的tplName,并且的确被当前实例引用则使用，未找到，则使用最后一次的
                if(tplName || tplName == ""){
                    lastTransitionIn = fw.render.getTplContent(session);
                }else{
                    lastTransitionIn = this.__lastTransitionIn;
                }
                
                if(!lastTransitionIn){
                    // 如果此处再无法决定转场进入那一个controller，则认为转场失败.
                    return false;       
                }
            }
            
            
            //before转场，let's 对历史记录进行一下操作，
            //由于现在的逻辑是，无论是否为activecontroller，都必须走这里
            //这里很悲剧，我得不到 render 的 transiton 方法。
            if ( tmp = fw.historyCache.hitUrl([index ,(transitionType || this.__lastTransitionType)], globalIsforce) ) {
                transitionOut = tmp[1];
            }
            rv = fw.transition._run({
                "dom" : lastTransitionIn,                               
                "cloneDom" : cloneDom,
                "transitionOut" : transitionOut,
                "anim" : transitionType || this.__lastTransitionType,   // 如果没指明，则使用上一次的
                "callback" : {
                    "load" : oncomplete || function(){}                 // 如果不指明，则什么都不做
                }
            });
            
            transitionOut = false;//赋值完成，自己回归
            cloneDom = null;//赋值完成，自己回归
            
            // 如果转场未移动任务内容，则手动触发 oncomplete
            rv || (oncomplete || function(){})();
            
            // 记录最后当前controller移入的dom和转场效果类型
            //位置提前，因为js是引用传递，下面的run会修改这个类型
            //可能会长期不传入transitiontype，原来不加——lasttype会出现bug
            this.__lastTransitionType = (transitionType || this.__lastTransitionType);
            
            this.__lastTransitionIn = lastTransitionIn;
            return true;  // 
        },
        getDom : function() {
            return fw.render.getTplContent(this.getSession());
        }
    });
    
    _controller.__reg('create',function(constructor){
        return constructor;
    });
    
    /**
     * 根据名称查找controller
     */
    var findController = _controller.__reg("findController",function(path){
        var routeMap = fw.router.getAll();
        var pattern , find;
        for(var i = routeMap.length - 1; i >= 0; i--){
            
            // 因为已经path与params预先分离，所以此处要求路径整行完全匹配，即 ^ 到$
            pattern = new RegExp('^' + routeMap[i]['path'] + "$");  
            
            if((routeMap[i]['path'] == '' && path == '') || (routeMap[i]['path'] !== '' && pattern.test(path) === true)){
                if(find = eval(routeMap[i]['action'])){
                    return find; 
                }else{
                    // 如果找到匹配的path，但是结果是undefined或null等，说明controller载入不成功或配置内容错误.
                    throw "find a controller [" + path +"], but undefined.";
                }
            }
        }
        
        //检查是否有第三方处理器，如果有，按顺序调用，如果有任何一个返回true，则表示匹配成功
        var externalProcessors = sumeru.router.externalProcessor.getAll(),
            processor;
        
        //这里不用forEach是因为要return本层函数
        for(var i = 0, l = externalProcessors.length; i < l; i++){
            processor = externalProcessors[i];
            if (true === processor(path)) {
                //已经匹配成功，并且在if中已经移交第三方processor处理
                return false;
            };
        }
        
        //走到这里说明没有route config匹配，检查是否有默认项
        if (typeof SUMERU_DEFAULT_CONTROLLER != 'undefined') {
            return eval(SUMERU_DEFAULT_CONTROLLER);
        };
       
       throw "Can NOT find a controller [" + path +"]";
       
    }, SUMERU_APP_FW_DEBUG ? false : true);
    
    
    var _testReusing = function(item,queryPath){
        var tmpId = item.__getID();
        return tmpId.indexOf(queryPath + "!") == 0;
    };
    
    /**
     * controller的管理器的触发方法,将自动根据当前运行中的controller决定创建新的或使用已有的.
     * @param queryPath {string} 访问controller的路径
     * @param params {string} 调用参数的字符串表示
     * @param onFound {function} 当找到controller时,触发该回调.
     */
    var dispatch = _controller.__reg('dispatch',function(queryPath,params,isforce){
        
        var identifier = queryPath + "!" + (typeof(params) != 'string' ? "" : params);
        var constructor, instance = null , item = false;
        constructor = findController(queryPath);
        
        if (constructor === false) {
            //可能由第三方程序接管，framework停止响应
            return;
        };
        console.log("dispatch " + identifier);
        
        /*
         * 检测当前controller队列
         * 
         * 重用dom的controller执行sleep.
         * 调用已有的controller执行wakeup.
         * 其它的continue;
         */
        
        globalIsforce = isforce; //因为转场时候要判断是否为强制刷新，所以这里我设置了全局变量来存放是否强制刷新
        
        var tmpId = null;
        for(var key in activeController){
            item = activeController[key];
            tmpId = item.__getID();
            if(tmpId == identifier){
                
                // ID完全匹配的,转场进入即可
                instance = item;
                
                // 如果转场失败，则认为dom被销毁，此时，销毁找到的controller实例，进入创建新controller的过程.
                if(!instance.__transition() || isforce){
                    instance.destroy();
                    item = false;
                };
                
                SUMERU_APP_FW_DEBUG && console.log("ROUTER FULL QUERY PATH : " + identifier);
                break;
            }else if(_testReusing(instance = item , queryPath)){
				//@patchbysundong20121127:
				//我对这里进行了改进，转场再销毁自身前，我要保存一下它的当前副本，用来下一步进行动画切换,
				//这里clone，在render时传入
				//fixbug20121130,有时，不会走这里destroy，相反，他会直接进行转场,trans
				//_cloneDom(instance);//挪到了destroy里面
				// queryPath匹配的，重用根DOM. 交由controller构造方法自己处理,此处仅 sleep被复用的controller即可。
				
                //！！！这里匹配有两种可能：1.当前active的是自身，则自身转自身。2.当前active的不是自身，则不cloneDom，而直接转场
                if (activeControllerId === queryPath){//说明当前active的就是自身，所以对自身进行转场（clonedom）
                    instance.destroy(false,true);
                    item = false;
                    SUMERU_APP_FW_DEBUG && console.log("ROUTER SAME QUERY PATH: " + identifier);
                }else{//说明当前active的不是自身，所以对别人进行转场
                    if(!instance.__transition() || isforce){
                        instance.destroy();
                        item = false;
                        SUMERU_APP_FW_DEBUG && console.log("ROUTER FULL QUERY PATH: " + identifier);
                    }
                }
                
                
            }else{
                // 完全不匹配的，创建新的controller.
                item = false;
                SUMERU_APP_FW_DEBUG && console.log("ROUTER NOT MATCH : " + identifier);
            }
        }
        
        // 找到已存在的controller实例，则直接使用，不再创建新的
        if(!item){
            instance = new MainController(identifier, fw.utils.uriParamToMap(params) , constructor);
        }
        //设置当前 activeControllerId
        activeControllerId = queryPath;
        
        instance.__init();
        
        return;
    }, SUMERU_APP_FW_DEBUG ? false : true);
    
    /**
     * 在数据push到之后，对于所有当前活跃的控制器，都调用其render方法（主要考虑三屏的场景）
     */
    _controller.__reg("reactiveRender" , function(tapped_blocks){
        activeController.forEach(function(item){
            //每个Controller的render方法会保证局部渲染一定等待其自己的主渲染流程完成才开始。
            item.__render(tapped_blocks);
        });
    });
    
    return;
    
})(sumeru);
