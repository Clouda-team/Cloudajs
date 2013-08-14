var touch = Library.touch = sumeru.Library.create(function(exports){
    //工具类接口
    var isPlainObject = function(obj) {
        if (!obj || type(obj) !== "object" || obj.nodeType || obj === obj.window ) {
            return false;
        }
        var hasOwnProperty = Object.prototype.hasOwnProperty;
        // Not own constructor property must be Object
        if (obj.constructor && !hasOwnProperty.call(obj, "constructor") &&
            !hasOwnProperty.call(obj.constructor.prototype, "isPrototypeOf")) {
            return false;
        }

        var key;
        for (key in obj) {}

        return key === undefined || hasOwnProperty.call(obj, key);
    };
    
    var typeMap = {};
    "Boolean Number String Function Array Date RegExp Object".split(' ').forEach(function(item){
        typeMap["[object " + item + "]"] = item.toLowerCase();
    });
    
    var type = function(obj){
            return obj == null ?
                'null' :
                typeMap[ Object.prototype.toString.call(obj)] || "object";
        },
        
        isObject = function(obj){
            return type(obj) === 'object';
        },
        
        isArray  = function(obj){
            return type(obj) === 'array';
        },
        isFunction = function(obj){
            return type(obj) === 'function';
        },
        isString = function(obj){
            return type(obj) === 'string';
        },
        isBoolean = function(obj){
            return type(obj) === 'bollean';
        },
        isNumber = function(obj){
            return type(obj) === 'number';
        },
        isDate = function(obj){
            return type(obj) === 'date';
        },
        isRegExp = function(obj){
            return type(obj) === 'regexp';
        },
        
        extend = function(){
            var options, name, src, copy, copyIsArray, clone,
                target = arguments[0] || {},
                i = 1,
                length = arguments.length,
                deep = false;
        
            //Handle a deep copy situation
            if(typeof target === "boolean") {
                deep = target;
                target = arguments[1] || {};
                // skip the boolean and the target
                i = 2;
            }
        
            //Handle case when target is a string or something (possible in deep copy)
            if ( typeof target !== "object" && !isFunction(target) ) {
                target = {};
            }
        
            // if only one argument is passed, do nothing
            if (length === i) {
                return target;
            }
        
            for ( ; i < length; i++) {
                // Only deal with non-null/undefined values
                if ((options = arguments[i]) != null) {
                    // Extend the base object
                    for (name in options) {
                        src = target[name];
                        copy = options[name];
        
                        // Prevent never-ending loop
                        if (target === copy) {
                            continue;
                        }
        
                        // Recurse if we're merging plain objects or arrays
                        if (deep && copy && (isPlainObject(copy) || (copyIsArray = isArray(copy)) ) ) {
                            if (copyIsArray) {
                                copyIsArray = false;
                                clone = src && isArray(src) ? src : [];
        
                            } else {
                                clone = src && isPlainObject(src) ? src : {};
                            }
        
                            // Never move original objects, clone them
                            target[name] = extend(deep, clone, copy);
        
                        // Don't bring in undefined values
                        } else if (copy !== undefined) {
                            target[ name ] = copy;
                        }
                    }
                }
            }
        
            //Return the modified object
            return target;
        };
        
    var _utils = (function(){
        var randomStr = '1234567890abcdefghijklmno'+
                  'pqrstuvwxyzABCDEFGHIGKLMNOPQRSTUVWXYZ';
        var randomStrLen = randomStr.length - 1;
        return {
            query: function(selector){
                return document.querySelectorAll(selector);
            },
            randomStr: function(max){
                var rv = '';
                max = (typeof max === 'undefined') ? 8 : max;
                
                for(var i=0; i < max; i++){
                    rv += randomStr[Math.floor(Math.random() * (randomStrLen + 1))];
                }
                return rv;
            },
            //获取某个元素的Data ID, 如果该元素不存在该id， 则随机生成一个id， 并分配给
            //该元素的uid attribute。
            //return {uid}
            getElUID: function(el){
                var uid = el.getAttribute('data-uid');
                if(!uid){
                    uid = this.randomStr(18);
                    el.setAttribute('data-uid', uid);
                }
                return uid;
            },
            addEvents: function(el, types, callback){
                types = types ? types.split(" ") : [];
                for(var i= 0,len=types.length; i<len; i++) {
                    if(el.addEventListener){
                        callback && el.addEventListener(types[i], callback, false);
                    }
                }
            },
            removeEvents: function(el, types, callback){
                types = types ? types.split(" ") : [];
                for(var i= 0,len=types.length; i<len; i++) {
                    if(el.removeEventListener){
                        el.removeEventListener(types[i], callback, false);
                    }
                }
            },
            
            deepCopy: function(obj1, obj2){
                if(!obj2){
                    obj2 = obj1;
                    obj1 = {};
                }
                extend(true, obj1, obj2);
                return obj1;
            }
        }
    })();
    
    var _touchData = (function(){
        var dataMap = {};//key是一个uid, value是data object， 代表uid的是一个数据集合。
        return {
            get: function(el, key){
                var uid = _utils.getElUID(el);
                dataMap[uid] = dataMap[uid] || {};
                if(arguments.length === 1){
                    return dataMap[uid];
                }else{
                    return dataMap[uid][key];
                }
            },
            set: function(el, key, value){
                var uid = _utils.getElUID(el);
                dataMap[uid] = dataMap[uid] || {};
                dataMap[uid][key] = value;
            }
        }
    })();
    
    /*
     *事件管理器，托管由用户定义的事件和处理程序。
     */
    var eventManager = (function(){
        var eventHanlderMap = {};
        var hdInterMap = {};
        return {
            trigger: function(el, type, paras){
                var uid = _utils.getElUID(el);
                var handlers = eventHanlderMap[uid][type]['handler'];
                var smrEv = smrEventList;
                var swipeList = [
                                  smrEv.SWIPE_START, smrEv.SWIPING, 
                                  smrEv.SWIPE_END, smrEv.SWIPE_LEFT,
                                  smrEv.SWIPE_RIGHT, smrEv.SWIPE_UP,
                                  smrEv.SWIPE_DOWN, smrEv.SWIPE
                                ];
                                
                var execHandler = function(func, el, ops, pr){
                    //当配置interval大于0， 对event handler进行切片处理
                    if(ops && ops.interval){
                        hdInterMap[func] = hdInterMap[func] || {};
                        hdInterMap[func]['list'] = hdInterMap[func]['list'] || [];
                        
                        hdInterMap[func]['list'].push((function(h,e,p){
                            return function(){
                                h.call(e, p);
                            }
                        })(func, el, pr));
                        
                        if(!hdInterMap[func]['interval']){
                            hdInterMap[func]['interval'] = setInterval((function(h){
                                return function(){
                                    var prx = hdInterMap[h]['list'].shift();
                                    if(prx){
                                        prx();
                                    }else{
                                        clearInterval(hdInterMap[h]['interval']);
                                        hdInterMap[h]['interval'] = null;
                                    }
                                }
                            })(func), ops.interval);
                        }
                    }else{
                        func.call(el, pr);
                    }
                };
                
                for(var i=0, len=handlers.length; i < len; i++){
                    var ops = handlers[i].options;
                    //如果是sumeru swipe类事件， 加速度处理
                    if(swipeList.indexOf(type) != -1){
                        if(ops && ops.swipeFactor){
                            var duration = paras.duration/1000;
                            paras.factor = (10 - ops.swipeFactor) * duration * duration * 10;
                        }
                    }
                    
                    if(ops && ops.__binding_live){
                        var target = paras.originEvent.target;
                        
                        //兼容ios4, 文本节点的父节点为target
                        if(target && target.nodeType === 3){
                            target = target.parentNode;
                        }
                        var liveEls = _utils.query(ops.__binding_live);
                        if(liveEls && liveEls.length > 0){
                            liveEls = Array.prototype.slice.apply(liveEls, [0]);
                            liveEls.forEach(function(le){
                                if(le.contains(target)){
                                    execHandler(handlers[i], le, ops, paras);
                                }
                            });
                        }
                    }else{
                        execHandler(handlers[i], el, ops, paras);
                    }
                }
            },
            off: function(){
                if(typeof arguments[0] === 'undefined'){
                   return;
                }
                
                var uid = _utils.getElUID(arguments[0]);
                
                //解除live的绑定
                if(typeof arguments[3] === 'string'){
                    var handlers = [];
                    try{
                        handlers = eventHanlderMap[uid][arguments[1]]['handler'];
                    }catch(e){ 
                        handlers = [];
                    }
                    if(arguments[2]){
                        var index = handlers.indexOf(arguments[2]);
                        if(index > -1){
                            var h = handlers.splice(index, 1);
                            delete h.options;
                        }
                    }else{
                        for( var i=0; i < handlers.length; i++){
                            var ops = handlers[i].options;
                            if(ops && ops.__binding_live 
                                && ops.__binding_live === arguments[3]){
                                var h = handlers.splice(i, 1);
                                delete h.options;
                                i--;
                            }
                        }
                    }
                    return false;
                }
                
                //解除on绑定
                if(arguments.length == 1){
                    eventHanlderMap[uid] = null;
                }else if(arguments.length === 2){
                    eventHanlderMap[uid] && (eventHanlderMap[uid][arguments[1]] = null);
                }else{
                    if( eventHanlderMap[uid] && 
                        eventHanlderMap[uid][arguments[1]] &&
                        eventHanlderMap[uid][arguments[1]]['handler'] ){
                        var handlers = eventHanlderMap[uid][arguments[1]]['handler'];
                        var index = handlers.indexOf(arguments[2]);
                        if(index > -1){
                            var h = handlers.splice(index, 1);
                            delete h.options;
                        }
                    }
                }
            },
            add: function(el, type, hanlder, options){
                var uid = _utils.getElUID(el);
                eventHanlderMap[uid] = eventHanlderMap[uid] || {};
                eventHanlderMap[uid][type] = eventHanlderMap[uid][type] || {};
                
                eventHanlderMap[uid][type]['handler']  = eventHanlderMap[uid][type]['handler'] || [];
                !options || (hanlder.options = options);
                typeof hanlder === 'function' ? eventHanlderMap[uid][type]['handler'].push(hanlder) : null;
            },
            hasHandler: function(el, type){
                try{
                    var uid = _utils.getElUID(el);
                    var handlers = eventHanlderMap[uid][type]['handler'];
                    return handlers && handlers.length > 0 ? true : false; 
                }catch(e){
                    return false;
                }
            },
            isEmpty: function(el){
                var uid = _utils.getElUID(el);
                var thisEvent = eventHanlderMap[uid];
                for(var type in thisEvent){
                    if(thisEvent[type] && 
                        thisEvent[type]['handler'] &&
                        thisEvent[type]['handler']['length'] !== 0){
                        return false;
                    }
                }
                return true;
            }
        }
    })();
    
    var config = {
        tap: true,
        doubleTap: true,
        tapMaxDistance: 10,
        hold: true,
        holdTime: 650,//ms
        maxDoubleTapInterval: 300,
       
        //swipe
        swipe: true,
        swipeTime: 300,
        swipeMinDistance: 18,
        swipeFactor: 5,
        
        drag: true,
        //pinch config, minScaleRate与minRotationAngle先指定为0
        pinch: true,
        minScaleRate: 0,
        minRotationAngle: 0
    };
    /*
     *@constructor SmrEvent: one element, one SmrEvent obj. 这个对象
     *封装了旋转、pinchin、pinchout、swipe、tap等事件。
     */
    var SmrEvent = (function(){
        var _hasTouch = ('ontouchstart' in window);
        
        /**
         * 获取事件的位置信息
         * @param  ev, 原生事件对象
         * @return array  [{ x: int, y: int }]
         */
        function getPosOfEvent(ev){   
            //多指触摸， 返回多个手势位置信息
            if(_hasTouch) {
                var pos = [];
                var src = null;
                
                for(var t=0, len=ev.touches.length; t<len; t++) {
                    src = ev.touches[t];
                    pos.push({ x: src.pageX, y: src.pageY });
                }
                return pos;
            }//处理PC浏览器的情况
            else {
                return [{
                    x: ev.pageX,
                    y: ev.pageY
                }];
            }
        };
        /**
         *获取两点之间的距离
         */
        function getDistance(pos1, pos2){
            var x = pos2.x - pos1.x, y = pos2.y - pos1.y;
            return Math.sqrt((x * x) + (y * y));
        };
        
        /**
         *计算事件的手势个数
         *@param ev {Event}
         */
        function getFingers(ev){
            return ev.touches ? ev.touches.length : 1;
        };
        //计算收缩的比例
        function calScale(pstart/*开始位置*/, pmove/*移动中的位置*/){
            if(pstart.length >= 2 && pmove.length >= 2) {
                var disStart = getDistance(pstart[1], pstart[0]);
                var disEnd = getDistance(pmove[1], pmove[0]);
                
                return disEnd / disStart;
            }
            return 1;
        };
        
        //return 角度，范围为{-180-0，0-180}， 用来识别swipe方向。
        function getAngle(p1, p2){
            return Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
        };
        //return 角度， 范围在{0-180}， 用来识别旋转角度
        function _getAngle180(p1, p2){
            var agl = Math.atan((p2.y - p1.y) * -1 / (p2.x - p1.x)) * (180 / Math.PI);
            return (agl < 0 ? (agl + 180) : agl);
        };
        
        //根据角度计算方位 
        //@para agl {int} 是调用getAngle获取的。
        function getDirectionFromAngle(agl) {
            var directions = {
                up: agl < -45 && agl > -135,
                down: agl >= 45 && agl < 135,
                left: agl >= 135 || agl <= -135,
                right: agl >= -45 && agl <= 45 
            };
            for(var key in directions){
                if(directions[key])return key;
            }
            return null;
        };
        
        
        //取消事件的默认行为和冒泡
        function preventDefault(ev){
            ev.preventDefault();
            ev.stopPropagation();
        };
        
        function getXYByElement(el){
            var left =0,  top = 0;
            
            while (el.offsetParent) {
                left += el.offsetLeft;
                top += el.offsetTop;
                el = el.offsetParent;
            }
            return { left: left, top: top };
        };
        
        return function(el){
            var me = this;
            var pos = {start : null, move: null, end: null};
            var startTime = 0; 
            var fingers = 0;
            var startEvent = null;
            var moveEvent = null;
            var endEvent = null;
            var startSwiping = false;
            var startPinch = false;
            var startDrag = false;
            
            var __offset = {};
            var __touchStart = false;
            var __holdTimer = null;
            var __tapped = false;
            var __lastTapEndTime = null;
            
            function triggerEvent(name, paras){
                if(typeof me["on"+ name] === 'function'){
                    me["on"+ name](paras);
                }
            };
            
            function reset(){
                startEvent = moveEvent = endEvent = null;
                __tapped = __touchStart = startSwiping = startPinch = false;
                startDrag = false;
                pos = {};
                __rotation_single_finger = false;
            };
            
            function isTouchStart(ev){
                return (ev.type === 'touchstart' || ev.type === 'mousedown');
            };
            function isTouchMove(ev){
                return (ev.type === 'touchmove' || ev.type === 'mousemove');
            };
            function isTouchEnd(ev){
                return (ev.type === 'touchend' || ev.type === 'mouseup' || ev.type === 'touchcancel');
            };
            
            function triggerCustomEvent(el, customEventName, eventObj, copy){
                if(eventManager.hasHandler(el, customEventName)){
                    copy = typeof copy == 'undefind' ? true : copy;
                    
                    if(copy){
                       eventObj = _utils.deepCopy(eventObj);
                    }
                    eventObj.type = customEventName;
                    eventObj.startRotate = function(){
                       me.startRotate();
                    }
                    triggerEvent(customEventName, eventObj);
                }
            };
            
            var __scale_last_rate = 1;
            var __rotation_single_finger = false;
            var __rotation_single_start = [];//元素坐标中心位置
            var __initial_angle = 0;
            var __rotation = 0; 
            
            var __prev_tapped_end_time = 0;
            var __prev_tapped_pos = null;
            
            var gestures = {
                _getAngleDiff: function(currentPos){
                    var diff = parseInt(__initial_angle - _getAngle180(currentPos[0], currentPos[1]), 10);
                    var count = 0;
                    
                    while(Math.abs(diff - __rotation) > 90 && count++ < 50) {
                        if(__rotation < 0){
                            diff -= 180;
                        }else{
                            diff += 180;
                        }
                    }
                    __rotation = parseInt(diff, 10);
                    return __rotation;
                },
                pinch: function(ev){
                    if(config.pinch){
                        //touchend进入此时的getFinger(ev) < 2
                        if(!__touchStart)return;
                        if(getFingers(ev) < 2){
                            if(!isTouchEnd(ev))return;
                        }
                        var em = eventManager;
                        var scale = calScale(pos.start, pos.move);
                        var rotation = this._getAngleDiff(pos.move);
                        var eventObj = {
                            type: '',
                            originEvent: ev,
                            scale: scale,
                            rotation: rotation,
                            direction: (rotation > 0 ? 'right' : 'left'),
                            fingersCount: getFingers(ev),
                            startRotate: function(){
                               me.startRotate();
                            }                                           
                        };
                        if(!startPinch){
                            startPinch = true;
                            eventObj.fingerStatus = "start";
                            triggerCustomEvent(el, smrEventList.PINCH_START, eventObj);
                        }else if(isTouchMove(ev)){
                            eventObj.fingerStatus = "move";
                        }else if(isTouchEnd(ev)){
                            eventObj.fingerStatus = "end";
                            triggerCustomEvent(el, smrEventList.PINCH_END, eventObj);
                        }
                        
                        triggerCustomEvent(el, smrEventList.PINCH, eventObj);
                        
                        if(Math.abs(1-scale) > config.minScaleRate){
                            var scaleEv = _utils.deepCopy(eventObj);
                            
                            //手势放大, 触发pinchout事件
                            var scale_diff = 0.00000000001;//防止touchend的scale与__scale_last_rate相等，不触发事件的情况。
                            if(scale > __scale_last_rate){
                                __scale_last_rate = scale - scale_diff;
                                triggerCustomEvent(el, smrEventList.PINCH_OUT, scaleEv, false);
                            }//手势缩小,触发pinchin事件
                            else if(scale < __scale_last_rate){
                                __scale_last_rate = scale + scale_diff;
                                triggerCustomEvent(el, smrEventList.PINCH_IN, scaleEv, false);
                            }
                            
                            if(isTouchEnd(ev)){
                                __scale_last_rate = 1;
                            }
                        }
                        
                        if(Math.abs(rotation) > config.minRotationAngle){
                            var rotationEv = _utils.deepCopy(eventObj), eventType;
                            
                            eventType = rotation > 0 ? smrEventList.ROTATION_RIGHT : smrEventList.ROTATION_LEFT;
                            triggerCustomEvent(el, eventType, rotationEv, false);
                            triggerCustomEvent(el, smrEventList.ROTATION, eventObj);
                        }
                        
                        //preventDefault(ev);
                    }
                },
                rotateSingleFinger: function(ev){
                    if(__rotation_single_finger && getFingers(ev) < 2){
                        if(!pos.move)return;
                        if(__rotation_single_start.length < 2){
                            var docOff = getXYByElement(el);
                            
                            __rotation_single_start = [{
                                x: docOff.left + el.offsetWidth/2,
                                y: docOff.top + el.offsetHeight/2
                            }, pos.move[0]];
                            __initial_angle = parseInt(_getAngle180(__rotation_single_start[0], __rotation_single_start[1]), 10);
                        }
                        var move = [__rotation_single_start[0], pos.move[0]];
                        var rotation = this._getAngleDiff(move);
                        var eventObj = {
                            type: '',
                            originEvent: ev,
                            rotation: rotation,
                            direction: (rotation > 0 ? 'right' : 'left'),
                            fingersCount: getFingers(ev)
                        };
                        
                        if(isTouchMove(ev)){
                            eventObj.fingerStatus = "move";
                        }else if(isTouchEnd(ev) || ev.type === 'mouseout'){
                            eventObj.fingerStatus = "end";
                            triggerCustomEvent(el, smrEventList.PINCH_END, eventObj);
                        }
                        
                        eventType = rotation > 0 ? smrEventList.ROTATION_RIGHT : smrEventList.ROTATION_LEFT;
                        triggerCustomEvent(el, eventType, eventObj);
                        triggerCustomEvent(el, smrEventList.ROTATION, eventObj);
                    }
                },
                swipe: function(ev){
                    //目前swipe只存在一个手势上
                    if(!__touchStart || !pos.move || getFingers(ev) > 1){
                        return;
                    }
                    
                    var em = eventManager;
                    var now = Date.now();
                    var touchTime = now - startTime;
                    var distance = getDistance(pos.start[0], pos.move[0]);
                    var position = {
                       x: pos.move[0].x - __offset.left,
                       y: pos.move[0].y - __offset.top
                    };
                    var angle = getAngle(pos.start[0], pos.move[0]);
                    var direction = getDirectionFromAngle(angle);
                    var touchSecond = touchTime/1000;
                    var factor = ((10 - config.swipeFactor) * 10 * touchSecond * touchSecond);
                    var eventObj = {
                        type: smrEventList.SWIPE,//DEFAULT: smrEventList.SWIPE event.
                        originEvent: ev,
                        position: position,
                        direction: direction,
                        distance: distance,
                        distanceX: pos.move[0].x - pos.start[0].x,
                        distanceY: pos.move[0].y - pos.start[0].y,
                        angle: angle,
                        duration: touchTime,
                        fingersCount: getFingers(ev),
                        factor: factor
                    };
                    if(config.swipe){
                        var swipeTo = function(){
                            var elt = smrEventList;
                            switch(direction){
                                case 'up': triggerCustomEvent(el, elt.SWIPE_UP, eventObj);break;
                                case 'down': triggerCustomEvent(el, elt.SWIPE_DOWN, eventObj);break;
                                case 'left': triggerCustomEvent(el, elt.SWIPE_LEFT, eventObj);break;
                                case 'right': triggerCustomEvent(el, elt.SWIPE_RIGHT, eventObj);break;
                            }
                        };
                        
                        if(!startSwiping){
                            eventObj.fingerStatus = eventObj.swipe = 'start';
                            startSwiping = true;
                            triggerCustomEvent(el, smrEventList.SWIPE_START, eventObj);
                        }else if(isTouchMove(ev)){
                            eventObj.fingerStatus = eventObj.swipe = 'move';
                            triggerCustomEvent(el, smrEventList.SWIPING, eventObj);
                            
                            if(touchTime > config.swipeTime && 
                              touchTime < config.swipeTime + 50 &&
                              distance > config.swipeMinDistance){
                                swipeTo();
                                triggerCustomEvent(el, smrEventList.SWIPE, eventObj, false);
                            }
                        }else if(isTouchEnd(ev) || ev.type === 'mouseout'){
                            eventObj.fingerStatus = eventObj.swipe = 'end';
                            triggerCustomEvent(el, smrEventList.SWIPE_END, eventObj);
                            
                            if(config.swipeTime > touchTime && 
                                distance > config.swipeMinDistance){
                                swipeTo();
                                triggerCustomEvent(el, smrEventList.SWIPE, eventObj, false);
                            }
                        }
                    }
                    
                    if(config.drag){
                        if(!startDrag){
                            eventObj.fingerStatus = eventObj.swipe = 'start';
                            startDrag = true;
                        }else if(isTouchMove(ev)){
                            eventObj.fingerStatus = eventObj.swipe = 'move';
                        }else if(isTouchEnd(ev)){
                            eventObj.fingerStatus = eventObj.swipe = 'end';
                        }
                        triggerCustomEvent(el, smrEventList.DRAG, eventObj);
                    }
                },
                tap: function(ev){
                    if(config.tap){
                        var em = eventManager;
                        var now = Date.now();
                        var touchTime = now - startTime;
                        var distance = getDistance(pos.start[0], pos.move ? pos.move[0]:pos.start[0]);
                        
                        clearTimeout(__holdTimer);//去除hold事件
                        
                        var isDoubleTap = (function(){
                            if(__prev_tapped_pos && config.doubleTap &&
                                (startTime - __prev_tapped_end_time) < config.maxDoubleTapInterval){
                                var doubleDis = getDistance(__prev_tapped_pos, pos.start[0]);
                                if(doubleDis < 16)return true;
                            }
                            return false;
                        })();
                        
                        if(isDoubleTap){
                            triggerEvent(smrEventList.DOUBLE_TAP, {
                                type: smrEventList.DOUBLE_TAP,
                                originEvent   : ev,
                                position        : pos.start[0]
                            });
                            return;
                        }
                        
                        if(config.tapMaxDistance < distance)return;
                        
                        if(config.holdTime > touchTime && getFingers(ev) <= 1){
                            //clearTimeout在ios上有时不work（alert引起的）， 先用__tapped顶一下
                            __tapped = true;
                            __prev_tapped_end_time = now;
                            __prev_tapped_pos = pos.start[0];
                            
                            if(em.hasHandler(el, smrEventList.TAP)){
                                triggerEvent(smrEventList.TAP, {
                                    type: smrEventList.TAP,
                                    originEvent   : ev,
                                    fingersCount: getFingers(ev),
                                    position        : pos.start[0]
                                });
                            }
                            if(em.hasHandler(el, smrEventList.CLICK)){
                                triggerEvent(smrEventList.CLICK, {
                                    type: smrEventList.CLICK,
                                    originEvent   : ev,
                                    fingersCount: getFingers(ev),
                                    position        : pos.start[0]
                                });
                            }
                        }
                    }
                },
                hold: function(ev){
                    if(config.hold) {
                        clearTimeout(__holdTimer);
                        
                        __holdTimer = setTimeout(function() {
                            if(!pos.start)return;
                            var distance = getDistance(pos.start[0], pos.move ? pos.move[0]:pos.start[0]);
                            if(config.tapMaxDistance < distance)return;
                            
                            if(!__tapped){
                                triggerEvent("hold", {
                                    type: 'hold',
                                    originEvent: ev,
                                    fingersCount: getFingers(ev),
                                    position: pos.start[0]
                                });
                            }
                        }, config.holdTime);
                    }
                }
            };
            
            var handlerOriginEvent = function(ev){
                switch(ev.type){
                    case 'touchstart':
                    case 'mousedown':
                        __rotation_single_finger = false;
                        __rotation_single_start = [];
                        triggerCustomEvent(el, ev.type, {
                           originEvent: ev
                        });
                        
                        __touchStart = true;
                        if(!pos.start || pos.start.length < 2){
                            pos.start = getPosOfEvent(ev);
                        }
                        if(getFingers(ev) >= 2){
                            __initial_angle = parseInt(_getAngle180(pos.start[0], pos.start[1]), 10);
                        }
                        
                        startTime = Date.now(); 
                        startEvent = ev;
                        __offset = {};
                        
                        //来自jquery offset的写法: https://github.com/jquery/jquery/blob/master/src/offset.js
                        var box = el.getBoundingClientRect();
                        var docEl = document.documentElement;
                        __offset = {
                            top: box.top  + ( window.pageYOffset || docEl.scrollTop )  - ( docEl.clientTop  || 0 ),
                            left: box.left + ( window.pageXOffset || docEl.scrollLeft ) - ( docEl.clientLeft || 0 )
                        };
                        
                        gestures.hold(ev);
                        break;
                    case 'touchmove':
                    case 'mousemove':
                        triggerCustomEvent(el, ev.type, {
                            originEvent: ev
                        });
                        if(!__touchStart  || !pos.start)return; 
                        pos.move = getPosOfEvent(ev);
                        
                        if(getFingers(ev) >= 2){
                            gestures.pinch(ev);
                        }else if(__rotation_single_finger){
                            gestures.rotateSingleFinger(ev);
                        }else{
                            gestures.swipe(ev);
                        }
                        break;
                    case 'touchend':
                    case 'touchcancel':
                    case 'mouseup':
                    case 'mouseout':
                        triggerCustomEvent(el, ev.type, {
                            originEvent: ev
                        });
                        if(!__touchStart)return;
                        endEvent = ev;
                        
                        if(startPinch){
                            gestures.pinch(ev);
                        }else if(__rotation_single_finger){
                            gestures.rotateSingleFinger(ev);
                        }else{
                            if(startSwiping){
                                gestures.swipe(ev);
                            }
                        }
                        gestures.tap(ev);
                        
                        reset();
                        __initial_angle = 0;
                        __rotation = 0;
                        if(ev.touches && ev.touches.length === 1){
                            __touchStart = true;
                            __rotation_single_finger = true;
                        }
                        break;
                }
            };
            
            
            var eventNames = _hasTouch ? 'touchstart touchmove touchend touchcancel': 
                'mouseup mousedown mousemove mouseout';
            _utils.addEvents(el, eventNames, handlerOriginEvent);      
            
            this.tearDown = function(){
                _utils.removeEvents(el, eventNames, handlerOriginEvent); 
            }
            
            this.startRotate = function(){
                __rotation_single_finger = true;
            }
        }
    })();
    
    /*
     *@param el {Element} 
     *@param types {String} 事件类型， 可以空格分割多个事件。
     *@param handler {Function} 事件处理函数
     *@param options {Object}
     *{
     *  swipeFactor: int (1-10) 加速度因子， 值越大速率越大。
     *  interval: 0 //单位ms， 用来对handler的回调进行切片。
     *}
     */
    var _on = function(){
        if(typeof arguments.length < 3)throw 'Please specify complete argments';
        var element = typeof arguments[0] === 'string' ? 
                          _utils.query(arguments[0]) : [arguments[0]];
        var types = arguments[1].split(' ');
        var handler = arguments[arguments.length - 1];
        var options = arguments.length > 3 ? arguments[arguments.length - 2] : undefined;
        
        element = Array.prototype.slice.apply(element, [0]);
        element.forEach(function(el){
            for(var i=0; i < types.length; i++){
                var eventName = mapEvent(types[i]);
                if(event.special[eventName]){
                    eventManager.add(el, eventName, handler, options);
                    event.special[eventName].setUp.apply(this, [el, eventName]);
                }else{
                    _utils.addEvents(el, eventName, handler);
                }
            }
        });
    };
    
    var _live = function(){
        if(arguments.length < 3){
            throw new Error('wrong argument');
        }
        //如果指定的第一个元素不为选择器, 则交给on处理。
        if(typeof arguments[0] != 'string'){
            _on.apply(exports, arguments);
            return;
        }
        var options = arguments.length > 3 ? arguments[arguments.length - 2] : {};
        var types = arguments[1];
        var handler = arguments[arguments.length - 1];
        options.__binding_live = arguments[0];
        _on.apply(exports, [document.body, types, options, handler]);
    };
    
    
    var _off = function(selector, types, handler, liveSelector){
        if(typeof selector === 'undefined'){
           throw 'Please specify the selector.';
        }
        
        selector = typeof selector === 'string' ? _utils.query(selector) : [selector];
        selector = Array.prototype.slice.apply(selector, [0]);
        
        if(!types){
            eventManager.off(selector);
            _utils.removeEvents(selector);
        }else{
            types = types.split(' ');
            selector.forEach(function(el){
                types.forEach(function(type, index){
                    var args = [el, mapEvent(type)];
                    handler ? args.push(handler) : null; 
                    liveSelector ? args.push(liveSelector) : null; 
                    
                    if(event.special[type]){
                        eventManager.off.apply(eventManager, args);
                        if(eventManager.isEmpty(el, type)){
                            event.special[type].tearDown(el);
                        }
                    }else{
                        _utils.removeEvents.apply(this, args);
                    }
                });
            });
        } 
    };
    
    var _die = function(selector, types, handler){
        _off(document.body, types, handler, selector);
    }
    
    var touchEvent = {
       'touchstart': 'mousedown',
       'touchmove': 'mousemove',
       'touchend': 'mouseup'
    };
    
    var mapEvent = function(eventName){
        if(!('ontouchstart' in window ) && touchEvent[eventName]){
            return touchEvent[eventName];
        }
        return eventName;
    };
    /**
     *全局可配置的参数：
     *{
     *  tap: true, //tap类事件开关, 默认为true
     *  doubleTap: true, //doubleTap事件开关， 默认为true
     *  hold: true,//hold事件开关, 默认为true
     *  holdTime: 650,//hold时间长度
     *  swipe: true,//swipe事件开关
     *  swipeTime: 300,//触发swipe事件的最大时长
     *  swipeMinDistance: 18,//swipe移动最小距离
     *  swipeFactor: 5,//加速因子, 值越大变化速率越快 
     *  pinch: true,//pinch类事件开关
     *}
     */
    var _config = function(customConfig){
        if(typeof customConfig !== 'object')return;
        config = extend(config, customConfig);
    };
    
    function touchSetup(el, type){
        var touchEv = _touchData.get(el, '_touchEv');
        if(!touchEv){
            touchEv = new SmrEvent(el);
            _touchData.set(el, '_touchEv', touchEv);
        }
        
        touchEv['on'+type] = function(paras){
            eventManager.trigger(el, type, paras);
        }
    };
    
    function tearDown(el){
        var touchEv = _touchData.get(el, '_touchEv');
        if(!touchEv)return;
        _touchData.set(el, '_touchEv', null);
        touchEv.tearDown();
    }
    var smrSpecical = { setUp: touchSetup, tearDown: tearDown};
    var smrEventList = {
        TOUCH_START: 'touchstart',
        TOUCH_MOVE: 'touchmove',
        TOUCH_END: 'touchend',
        TOUCH_CANCEL: 'touchcancel',
        
        MOUSE_DOWN: 'mousedown',
        MOUSE_MOVE: 'mousemove',
        MOUSE_UP: 'mouseup',
        
        CLICK: 'click',
        
        //PINCH TYPE EVENT NAMES
        PINCH_START: 'pinchstart',
        PINCH_END: 'pinchend',
        PINCH: 'pinch',
        PINCH_IN: 'pinchin',
        PINCH_OUT: 'pinchout',
        
        ROTATION_LEFT: 'rotateleft',
        ROTATION_RIGHT: 'rotateright',
        ROTATION: 'rotate',
        
        SWIPE_START: 'swipestart',
        SWIPING: 'swiping',
        SWIPE_END: 'swipeend',
        SWIPE_LEFT: 'swipeleft',
        SWIPE_RIGHT: 'swiperight',
        SWIPE_UP: 'swipeup',
        SWIPE_DOWN: 'swipedown',
        SWIPE: 'swipe',
        
        DRAG: 'drag',
        
        //HOLD AND TAP  
        HOLD: 'hold',
        TAP: 'tap',
        DOUBLE_TAP: 'doubletap'
    };
    
    var event = {};
    event.special = {};
    Object.keys(smrEventList).forEach(function(key){
        event.special[smrEventList[key]] = smrSpecical;
    });
    
    exports.live = _live;
    exports.die = _die;
    exports.on = _on;
    exports.off = _off;
    exports.config = _config;
    return exports;
});