//version 0.2.11
var touch = touch || {};

(function(doc, exports) {
	'use strict';
	var os = (function() {
		var navigator = window.navigator,
		userAgent = navigator.userAgent,
		android = userAgent.match(/(Android)[\s\/]+([\d\.]+)/),
		ios = userAgent.match(/(iPad|iPhone|iPod)\s+OS\s([\d_\.]+)/),
		wp = userAgent.match(/(Windows\s+Phone)\s([\d\.]+)/),
		isWebkit = /WebKit\/[\d.]+/i.test(userAgent),
		isSafari = ios ? (navigator.standalone ? isWebkit: (/Safari/i.test(userAgent) && !/CriOS/i.test(userAgent) && !/MQQBrowser/i.test(userAgent))) : false,
		os = {};

		if (android) {
			os.android = true;
			os.version = android[2];
		}
		if (ios) {
			os.ios = true;
			os.version = ios[2].replace(/_/g, '.');
			os.ios7 = /^7/.test(os.version);
			if (ios[1] === 'iPad') {
				os.ipad = true;
			} else if (ios[1] === 'iPhone') {
				os.iphone = true;
				os.iphone5 = screen.height == 568;
			} else if (ios[1] === 'iPod') {
				os.ipod = true;
			}
		}
		if (wp) {
			os.wp = true;
			os.version = wp[2];
			os.wp8 = /^8/.test(os.version);
		}
		if (isWebkit) {
			os.webkit = true;
		}
		if (isSafari) {
			os.safari = true;
		}

		return os;
	})();

	var PCevts = {
		'touchstart': 'mousedown',
		'touchmove': 'mousemove',
		'touchend': 'mouseup',
		'touchcancel': 'mouseout'
	};

	var utils = {
		getType: function(obj) {
			return Object.prototype.toString.call(obj).match(/\s([a-z|A-Z]+)/)[1].toLowerCase();
		},
		getSelector: function(el) {
			if (el.id) {
				return "#" + el.id;
			}
			if (el.className) {
				var cns = el.className.split(/\s+/);
				return "." + cns.join(".");
			} else if(el === document){
				return "body";
			}else{
				return el.tagName.toLowerCase();
			}
		},
		matchSelector: function(target, selector) {
			return target.webkitMatchesSelector(selector);
		},
		getEventListeners: function(el) {
			return el.listeners;
		},
		getPCevts: function(evt) {
			return PCevts[evt] || evt;
		},
		forceReflow: function() {
			var domTreeOpDiv = document.getElementById("domTreeOp");
			if (!domTreeOpDiv) {
				domTreeOpDiv = document.createElement("div");
				domTreeOpDiv.id = "domTreeOp";
				document.body.appendChild(domTreeOpDiv);
			}
			var parentNode = domTreeOpDiv.parentNode;
			var nextSibling = domTreeOpDiv.nextSibling;
			parentNode.removeChild(domTreeOpDiv);
			parentNode.insertBefore(domTreeOpDiv, nextSibling);
		},
		simpleClone: function(obj){
			return JSON.parse(JSON.stringify(obj));
		}
	};

	/** 底层事件绑定/代理支持  */
	var proxyid = 0;
	var proxies = [];
	var _trigger = function(el, evt, detail) {

		detail = detail || {};
		var e,
			opt = {
			bubbles: true,
			cancelable: true,
			detail: detail
		};

		if (typeof CustomEvent !== 'undefined') {
			e = new CustomEvent(evt, opt);
			if (el) {
				el.dispatchEvent(e);
			}
		} else {
			e = document.createEvent("CustomEvent");
			e.initCustomEvent(evt, true, true, detail);
			if (el) {
				el.dispatchEvent(e);
			}
		}
	};

	/**
	 * {DOM} element
	 * {String} eventName
	 * {Function} handler
	 */
	var _bind = function(el, evt, handler) {
		el.listeners = el.listeners || {};

		if (!el.listeners[evt]) {
			el.listeners[evt] = [handler];
		} else {
			el.listeners[evt].push(handler);
		}
		var proxy = function(e) {
			if (os.ios7) {
				utils.forceReflow();
			}
			e.originEvent = e;
			e.startRotate = function() {
				__rotation_single_finger = true;
			};
			for (var p in e.detail) {
				if(p !== 'type'){
					e[p] = e.detail[p];
				}
			}
			var returnValue = handler.call(e.target, e);
			if(typeof returnValue !== "undefined" && !returnValue){
				e.stopPropagation();
				e.preventDefault();
			}
		};

		handler.proxy = handler.proxy || {};
		if (!handler.proxy[evt]) {
			handler.proxy[evt] = [proxyid++];
		} else {
			handler.proxy[evt].push(proxyid++);
		}
		proxies.push(proxy);

		if( el.addEventListener){ el.addEventListener(evt, proxy, false); }
	};

	/**
	 * {DOM} element
	 * {String} eventName
	 * {Function} the same handler of _bind
	 */
	var _unbind = function(el, evt, handler) {
		if (!handler) {
			var handlers = el.listeners[evt];
			if (handlers && handlers.length) {
				handlers.forEach(function(handler) {
					el.removeEventListener(evt, handler, false);
				});
			}
		} else {
			var proxyids = handler.proxy[evt];
			if (proxyids && proxyids.length) {
				proxyids.forEach(function(proxyid) {
					if (el.removeEventListener) {
						el.removeEventListener(evt, proxies[proxyid], false);
					}
				});
			}
		}
	};

	/**
	 * {DOM} delegate element
	 * {String} eventName
	 * {String} selector of sub elements
	 * {Function} handler
	 */
	var _delegate = function(el, evt, sel, handler) {
		var proxy = function(e) {
			var target, returnValue;
			e.originEvent = e;
			e.startRotate = function() {
				__rotation_single_finger = true;
			};
			for (var p in e.detail) {
				if(p !== 'type'){
					e[p] = e.detail[p];
				}
			}
			var integrateSelector = utils.getSelector(el) + " " + sel;
			var match = utils.matchSelector(e.target, integrateSelector);
			var ischild = utils.matchSelector(e.target, integrateSelector + " " + e.target.nodeName);
			if (!match && ischild) {
				if (os.ios7) {
					utils.forceReflow();
				}
				target = e.target;
				while (!utils.matchSelector(target, integrateSelector)) {
					target = target.parentNode;
				}
				returnValue = handler.call(e.target, e);
				if(typeof returnValue !== "undefined" && !returnValue){
					e.stopPropagation();
					e.preventDefault();
				}
			} else {
				if (os.ios7) {
					utils.forceReflow();
				}
				if (match || ischild) {
					returnValue = handler.call(e.target, e);
					if(typeof returnValue !== "undefined" && !returnValue){
						e.stopPropagation();
						e.preventDefault();
					}
				}
			}
		};

		handler.proxy = handler.proxy || {};
		if (!handler.proxy[evt]) {
			handler.proxy[evt] = [proxyid++];
		} else {
			handler.proxy[evt].push(proxyid++);
		}
		proxies.push(proxy);

		el.listeners = el.listeners || {};
		if (!el.listeners[evt]) {
			el.listeners[evt] = [proxy];
		} else {
			el.listeners[evt].push(proxy);
		}
		if(el.addEventListener){el.addEventListener(evt, proxy, false);}
	};

	/**
	 * {DOM} delegate element
	 * {String} eventName
	 * {String} selector of sub elements
	 * {Function} the same handler of _on
	 */
	var _undelegate = function(el, evt, sel, handler) {
		if (!handler) {
			var listeners = el.listeners[evt];
			listeners.forEach(function(proxy) {
				el.removeEventListener(evt, proxy, false);
			});
		} else {
			var proxyids = handler.proxy[evt];
			if (proxyids.length) {
				proxyids.forEach(function(proxyid) {
					if (el.removeEventListener) {
						el.removeEventListener(evt, proxies[proxyid], false);
					}
				});
			}
		}
	};

	/** 手势识别 */
	var config = {
		tap: true,
		doubleTap: true,
		tapMaxDistance: 10,
		hold: true,
		holdTime: 650,
		//ms
		maxDoubleTapInterval: 300,

		//swipe
		swipe: true,
		swipeTime: 300,
		swipeMinDistance: 18,
		swipeFactor: 5,

		drag: true,
		pinch: true,
		minScaleRate: 0,
		minRotationAngle: 0
	};

	var _hasTouch = ('ontouchstart' in window);
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
		DRAGSTART : 'dragstart',
		DRAGEND : 'dragend',

		//HOLD AND TAP  
		HOLD: 'hold',
		TAP: 'tap',
		DOUBLE_TAP: 'doubletap'
	};

	/**
	 * 获取事件的位置信息
	 * @param  ev, 原生事件对象
	 * @return array  [{ x: int, y: int }]
	 */
	function getPosOfEvent(ev) {
		//多指触摸， 返回多个手势位置信息
		if (_hasTouch) {
			var posi = [];
			var src = null;

			for (var t = 0, len = ev.touches.length; t < len; t++) {
				src = ev.touches[t];
				posi.push({
					x: src.pageX,
					y: src.pageY
				});
			}
			return posi;
		} //处理PC浏览器的情况
		else {
			return [{
				x: ev.pageX,
				y: ev.pageY
			}];
		}
	}
	/**
		 *获取两点之间的距离
		 */
	function getDistance(pos1, pos2) {
		var x = pos2.x - pos1.x,
		y = pos2.y - pos1.y;
		return Math.sqrt((x * x) + (y * y));
	}

	/**
	 *计算事件的手势个数
	 *@param ev {Event}
	 */
	function getFingers(ev) {
		return ev.touches ? ev.touches.length: 1;
	}
	//计算收缩的比例
	function calScale(pstart, pmove) {
		if (pstart.length >= 2 && pmove.length >= 2) {
			var disStart = getDistance(pstart[1], pstart[0]);
			var disEnd = getDistance(pmove[1], pmove[0]);

			return disEnd / disStart;
		}
		return 1;
	}

	//return 角度，范围为{-180-0，0-180}， 用来识别swipe方向。
	function getAngle(p1, p2) {
		return Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
	}
	//return 角度， 范围在{0-180}， 用来识别旋转角度
	function _getAngle180(p1, p2) {
		var agl = Math.atan((p2.y - p1.y) * -1 / (p2.x - p1.x)) * (180 / Math.PI);
		return (agl < 0 ? (agl + 180) : agl);
	}

	//根据角度计算方位 
	//@para agl {int} 是调用getAngle获取的。
	function getDirectionFromAngle(agl) {
		var directions = {
			up: agl < -45 && agl > -135,
			down: agl >= 45 && agl < 135,
			left: agl >= 135 || agl <= -135,
			right: agl >= -45 && agl <= 45
		};
		for (var key in directions) {
			if (directions[key]) return key;
		}
		return null;
	}

	function getXYByElement(el) {
		var left = 0,
		top = 0;

		while (el.offsetParent) {
			left += el.offsetLeft;
			top += el.offsetTop;
			el = el.offsetParent;
		}
		return {
			left: left,
			top: top
		};
	}

	function reset() {
		startEvent = moveEvent = endEvent = null;
		__tapped = __touchStart = startSwiping = startPinch = false;
		startDrag = false;
		pos = {};
		__rotation_single_finger = false;
	}

	function isTouchStart(ev) {
		return (ev.type === 'touchstart' || ev.type === 'mousedown');
	}
	function isTouchMove(ev) {
		return (ev.type === 'touchmove' || ev.type === 'mousemove');
	}
	function isTouchEnd(ev) {
		return (ev.type === 'touchend' || ev.type === 'mouseup' || ev.type === 'touchcancel');
	}

	var pos = {
		start: null,
		move: null,
		end: null
	};
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
	var __tapTimer = null;

	var __scale_last_rate = 1;
	var __rotation_single_finger = false;
	var __rotation_single_start = []; //元素坐标中心位置
	var __initial_angle = 0;
	var __rotation = 0;

	var __prev_tapped_end_time = 0;
	var __prev_tapped_pos = null;

	var gestures = {
		_getAngleDiff: function(currentPos) {
			var diff = parseInt(__initial_angle - _getAngle180(currentPos[0], currentPos[1]), 10);
			var count = 0;

			while (Math.abs(diff - __rotation) > 90 && count++<50) {
				if (__rotation < 0) {
					diff -= 180;
				} else {
					diff += 180;
				}
			}
			__rotation = parseInt(diff, 10);
			return __rotation;
		},
		pinch: function(ev) {
			var el = ev.target;
			if (config.pinch) {
				//touchend进入此时的getFinger(ev) < 2
				if (!__touchStart) return;
				if (getFingers(ev) < 2) {
					if (!isTouchEnd(ev)) return;
				}
				var scale = calScale(pos.start, pos.move);
				var rotation = this._getAngleDiff(pos.move);
				var eventObj = {
					type: '',
					originEvent: ev,
					scale: scale,
					rotation: rotation,
					direction: (rotation > 0 ? 'right': 'left'),
					fingersCount: getFingers(ev)
				};
				if (!startPinch) {
					startPinch = true;
					eventObj.fingerStatus = "start";
					_trigger(el, smrEventList.PINCH_START, eventObj);
				} else if (isTouchMove(ev)) {
					eventObj.fingerStatus = "move";
					_trigger(el, smrEventList.PINCH, eventObj);
				} else if (isTouchEnd(ev)) {
					eventObj.fingerStatus = "end";
					_trigger(el, smrEventList.PINCH_END, eventObj);
					reset();
				}

				if (Math.abs(1 - scale) > config.minScaleRate) {
					var scaleEv = utils.simpleClone(eventObj);

					//手势放大, 触发pinchout事件
					var scale_diff = 0.00000000001; //防止touchend的scale与__scale_last_rate相等，不触发事件的情况。
					if (scale > __scale_last_rate) {
						__scale_last_rate = scale - scale_diff;
						_trigger(el, smrEventList.PINCH_OUT, scaleEv, false);
					} //手势缩小,触发pinchin事件
					else if (scale < __scale_last_rate) {
						__scale_last_rate = scale + scale_diff;
						_trigger(el, smrEventList.PINCH_IN, scaleEv, false);
					}

					if (isTouchEnd(ev)) {
						__scale_last_rate = 1;
					}
				}

				if (Math.abs(rotation) > config.minRotationAngle) {
					var rotationEv = utils.simpleClone(eventObj), eventType;

					eventType = rotation > 0 ? smrEventList.ROTATION_RIGHT: smrEventList.ROTATION_LEFT;
					_trigger(el, eventType, rotationEv, false);
					_trigger(el, smrEventList.ROTATION, eventObj);
				}

			}
		},
		rotateSingleFinger: function(ev) {
			var el = ev.target;
			if (__rotation_single_finger && getFingers(ev) < 2) {
				if (!pos.move) return;
				if (__rotation_single_start.length < 2) {
					var docOff = getXYByElement(el);

					__rotation_single_start = [{
						x: docOff.left + el.offsetWidth / 2,
						y: docOff.top + el.offsetHeight / 2
					},
					pos.move[0]];
					__initial_angle = parseInt(_getAngle180(__rotation_single_start[0], __rotation_single_start[1]), 10);
				}
				var move = [__rotation_single_start[0], pos.move[0]];
				var rotation = this._getAngleDiff(move);
				var eventObj = {
					type: '',
					originEvent: ev,
					rotation: rotation,
					direction: (rotation > 0 ? 'right': 'left'),
					fingersCount: getFingers(ev)
				};

				if (isTouchMove(ev)) {
					eventObj.fingerStatus = "move";
				} else if (isTouchEnd(ev) || ev.type === 'mouseout') {
					eventObj.fingerStatus = "end";
					_trigger(el, smrEventList.PINCH_END, eventObj);
					reset();
				}

				var eventType = rotation > 0 ? smrEventList.ROTATION_RIGHT: smrEventList.ROTATION_LEFT;
				_trigger(el, eventType, eventObj);
				_trigger(el, smrEventList.ROTATION, eventObj);
			}
		},
		swipe: function(ev) {
			//目前swipe只存在一个手势上
			var el = ev.target;
			if (!__touchStart || !pos.move || getFingers(ev) > 1) {
				return;
			}

			var now = Date.now();
			var touchTime = now - startTime;
			var distance = getDistance(pos.start[0], pos.move[0]);
			var position = {
				x: pos.move[0].x - __offset.left,
				y: pos.move[0].y - __offset.top
			};
			var angle = getAngle(pos.start[0], pos.move[0]);
			var direction = getDirectionFromAngle(angle);
			var touchSecond = touchTime / 1000;
			var factor = ((10 - config.swipeFactor) * 10 * touchSecond * touchSecond);
			var eventObj = {
				type: smrEventList.SWIPE,
				//DEFAULT: smrEventList.SWIPE event.
				originEvent: ev,
				position: position,
				direction: direction,
				distance: distance,
				distanceX: pos.move[0].x - pos.start[0].x,
				distanceY: pos.move[0].y - pos.start[0].y,
				x : pos.move[0].x - pos.start[0].x,
				y : pos.move[0].y - pos.start[0].y,
				angle: angle,
				duration: touchTime,
				fingersCount: getFingers(ev),
				factor: factor
			};
			if (config.swipe) {
				var swipeTo = function() {
					var elt = smrEventList;
					switch (direction) {
					case 'up':
						_trigger(el, elt.SWIPE_UP, eventObj);
						break;
					case 'down':
						_trigger(el, elt.SWIPE_DOWN, eventObj);
						break;
					case 'left':
						_trigger(el, elt.SWIPE_LEFT, eventObj);
						break;
					case 'right':
						_trigger(el, elt.SWIPE_RIGHT, eventObj);
						break;
					}
				};

				if (!startSwiping) {
					eventObj.fingerStatus = eventObj.swipe = 'start';
					startSwiping = true;
					_trigger(el, smrEventList.SWIPE_START, eventObj);
				} else if (isTouchMove(ev)) {
					eventObj.fingerStatus = eventObj.swipe = 'move';
					_trigger(el, smrEventList.SWIPING, eventObj);

					if (touchTime > config.swipeTime && touchTime < config.swipeTime + 50 && distance > config.swipeMinDistance) {
						swipeTo();
						_trigger(el, smrEventList.SWIPE, eventObj, false);
					}
				} else if (isTouchEnd(ev) || ev.type === 'mouseout') {
					eventObj.fingerStatus = eventObj.swipe = 'end';
					_trigger(el, smrEventList.SWIPE_END, eventObj);

					if (config.swipeTime > touchTime && distance > config.swipeMinDistance) {
						swipeTo();
						_trigger(el, smrEventList.SWIPE, eventObj, false);
					}
				}
			}

			if (config.drag) {
				if (!startDrag) {
					eventObj.fingerStatus = eventObj.swipe = 'start';
					startDrag = true;
					_trigger(el, smrEventList.DRAGSTART, eventObj);
				} else if (isTouchMove(ev)) {
					eventObj.fingerStatus = eventObj.swipe = 'move';
					_trigger(el, smrEventList.DRAG, eventObj);
				} else if (isTouchEnd(ev)) {
					eventObj.fingerStatus = eventObj.swipe = 'end';
					_trigger(el, smrEventList.DRAGEND, eventObj);
				}
				
			}
		},
		tap: function(ev) {
			var el = ev.target;
			if (config.tap) {
				var now = Date.now();
				var touchTime = now - startTime;
				var distance = getDistance(pos.start[0], pos.move ? pos.move[0] : pos.start[0]);

				clearTimeout(__holdTimer); //去除hold事件
				var isDoubleTap = (function() {
					if (__prev_tapped_pos && config.doubleTap && (startTime - __prev_tapped_end_time) < config.maxDoubleTapInterval) {
						var doubleDis = getDistance(__prev_tapped_pos, pos.start[0]);
						if (doubleDis < 16) return true;
					}
					return false;
				})();

				if (isDoubleTap) {
					clearTimeout(__tapTimer);
					_trigger(el, smrEventList.DOUBLE_TAP, {
						type: smrEventList.DOUBLE_TAP,
						originEvent: ev,
						position: pos.start[0]
					});
					return;
				}

				if (config.tapMaxDistance < distance) return;

				if (config.holdTime > touchTime && getFingers(ev) <= 1) {
					//clearTimeout在ios上有时不work（alert引起的）， 先用__tapped顶一下
					__tapped = true;
					__prev_tapped_end_time = now;
					__prev_tapped_pos = pos.start[0];
					__tapTimer = setTimeout(function(){
						_trigger(el, smrEventList.TAP, {
							type: smrEventList.TAP,
							originEvent: ev,
							fingersCount: getFingers(ev),
							position: __prev_tapped_pos
						});
					}, 220);
				}
			}
		},
		hold: function(ev) {
			var el = ev.target;
			if (config.hold) {
				clearTimeout(__holdTimer);

				__holdTimer = setTimeout(function() {
					if (!pos.start) return;
					var distance = getDistance(pos.start[0], pos.move ? pos.move[0] : pos.start[0]);
					if (config.tapMaxDistance < distance) return;

					if (!__tapped) {
						_trigger(el, "hold", {
							type: 'hold',
							originEvent: ev,
							fingersCount: getFingers(ev),
							position: pos.start[0]
						});
					}
				},
				config.holdTime);
			}
		}
	};

	var handlerOriginEvent = function(ev) {

		var el = ev.target;
		switch (ev.type) {
		case 'touchstart':
		case 'mousedown':
			//__rotation_single_finger = false;
			__rotation_single_start = [];
			__touchStart = true;
			if (!pos.start || pos.start.length < 2) {
				pos.start = getPosOfEvent(ev);
			}
			if (getFingers(ev) >= 2) {
				__initial_angle = parseInt(_getAngle180(pos.start[0], pos.start[1]), 10);
			}

			startTime = Date.now();
			startEvent = ev;
			__offset = {};
			
			var box = el.getBoundingClientRect();
			var docEl = document.documentElement;
			__offset = {
				top: box.top + (window.pageYOffset || docEl.scrollTop) - (docEl.clientTop || 0),
				left: box.left + (window.pageXOffset || docEl.scrollLeft) - (docEl.clientLeft || 0)
			};

			gestures.hold(ev);
			break;
		case 'touchmove':
		case 'mousemove':
			if (!__touchStart || !pos.start) return;
			pos.move = getPosOfEvent(ev);
			if (getFingers(ev) >= 2) {
				gestures.pinch(ev);
			} else if (__rotation_single_finger) {
				gestures.rotateSingleFinger(ev);
			} else {
				gestures.swipe(ev);
			}
			break;
		case 'touchend':
		case 'touchcancel':
		case 'mouseup':
		case 'mouseout':
			if (!__touchStart) return;
			endEvent = ev;

			if (startPinch) {
				gestures.pinch(ev);
			} else if (__rotation_single_finger) {
				gestures.rotateSingleFinger(ev);
			} else if (startSwiping) {
				gestures.swipe(ev);
			} else {
				gestures.tap(ev);
			}

			reset();
			__initial_angle = 0;
			__rotation = 0;
			if (ev.touches && ev.touches.length === 1) {
				__touchStart = true;
				__rotation_single_finger = true;
			}
			break;
		}
	};

	/**
	开发者接口
	usage:
		touch.on("#test", "tap swipeleft swiperight", handler);
		touch.trigger("#test", "tap");
		touch.off("#test", "tap swipeleft swiperight", handler);
	 */
	var _on = function() {

		var evts, handler, evtMap, sel, args = arguments;
		if (args.length < 2 || args > 4) {
			return console.error("unexpected arguments!");
		}
		var els = utils.getType(args[0]) === 'string' ? doc.querySelectorAll(args[0]) : args[0];
		els = els.length ? Array.prototype.slice.call(els) : [els];
		//事件绑定
		if (args.length === 3 && utils.getType(args[1]) === 'string') {
			evts = args[1].split(" ");
			handler = args[2];
			evts.forEach(function(evt) {
				if (!_hasTouch) {
					evt = utils.getPCevts(evt);
				}
				els.forEach(function(el) {
					_bind(el, evt, handler);
				});
			});
			return;
		}
		
		function evtMapDelegate( evt ){
			 if (!_hasTouch) {
				evt = utils.getPCevts(evt);
			}
			els.forEach(function(el) {
				_delegate(el, evt, sel, evtMap[evt]);
			});
		}
		//mapEvent delegate
		if (args.length === 3 && utils.getType(args[1]) === 'object') {
			evtMap = args[1];
			sel = args[2];
			for (var evt1 in evtMap) {
			   evtMapDelegate(evt1);
			}
			return;
		}
		
		function evtMapBind(evt){
			if (!_hasTouch) {
				evt = utils.getPCevts(evt);
			}
			els.forEach(function(el) {
				_bind(el, evt, evtMap[evt]);
			});
		}
		
		//mapEvent bind
		if (args.length === 2 && utils.getType(args[1]) === 'object') {
			evtMap = args[1];
			for (var evt2 in evtMap) {
				evtMapBind(evt2);
			}
			return;
		}

		//兼容factor config
		if (args.length === 4 && utils.getType(args[2]) === "object") {
			evts = args[1].split(" ");
			handler = args[3];
			evts.forEach(function(evt) {
				if (!_hasTouch) {
					evt = utils.getPCevts(evt);
				}
				els.forEach(function(el) {
					_bind(el, evt, handler);
				});
			});
			return;
		}

		//事件代理
		if (args.length === 4) {
			var el = els[0];
			evts = args[1].split(" ");
			sel = args[2];
			handler = args[3];
			evts.forEach(function(evt) {
				if (!_hasTouch) {
					evt = utils.getPCevts(evt);
				}
				_delegate(el, evt, sel, handler);
			});
			return;
		}
	};

	var _off = function() {
		var evts, handler;
		var args = arguments;
		if (args.length < 1 || args.length > 4) {
			return console.error("unexpected arguments!");
		}
		var els = utils.getType(args[0]) === 'string' ? doc.querySelectorAll(args[0]) : args[0];
		els = els.length ? Array.prototype.slice.call(els) : [els];

		if (args.length === 1 || args.length === 2) {
			els.forEach(function(el) {
				evts = args[1] ? args[1].split(" ") : Object.keys(el.listeners);
				if (evts.length) {
					evts.forEach(function(evt) {
						if (!_hasTouch) {
							evt = utils.getPCevts(evt);
						}
						_unbind(el, evt);
						_undelegate(el, evt);
					});
				}
			});
			return;
		}

		if (args.length === 3 && utils.getType(args[2]) === 'function') {
			handler = args[2];
			els.forEach(function(el) {
				evts = args[1].split(" ");
				evts.forEach(function(evt) {
					if (!_hasTouch) {
						evt = utils.getPCevts(evt);
					}
					_unbind(el, evt, handler);
				});
			});
			return;
		}

		if (args.length === 3 && utils.getType(args[2]) === 'string') {
			var sel = args[2];
			els.forEach(function(el) {
				evts = args[1].split(" ");
				evts.forEach(function(evt) {
					if (!_hasTouch) {
						evt = utils.getPCevts(evt);
					}
					_undelegate(el, evt, sel);
				});
			});
			return;
		}

		if (args.length === 4) {
			handler = args[3];
			els.forEach(function(el) {
				evts = args[1].split(" ");
				evts.forEach(function(evt) {
					if (!_hasTouch) {
						evt = utils.getPCevts(evt);
					}
					_undelegate(el, evt, sel, handler);
				});
			});
			return;
		}
	};

	var _dispatch = function(el, evt, detail) {
		var args = arguments;
		if (!_hasTouch) {
			evt = utils.getPCevts(evt);
		}
		var els = utils.getType(args[0]) === 'string' ? doc.querySelectorAll(args[0]) : args[0];
		els = els.length ? Array.prototype.call(els) : [els];

		els.forEach(function(el) {
			_trigger(el, evt, detail);
		});
	};

	//init gesture
	function init() {
		var eventNames = _hasTouch ? 'touchstart touchmove touchend touchcancel': 'mouseup mousedown mousemove mouseout';
		_on(doc, eventNames, handlerOriginEvent);
	}

	init();

	exports.on = _on;
	exports.off = _off;
	exports.bind = _on;
	exports.unbind = _off;
	exports.live = _on;
	exports.die = _off;
	exports.config = config;
	exports.trigger = _dispatch;

})(document, touch);

Library.touch = sumeru.Library.create(function(exports){
    Library.objUtils.extend(exports, touch);
    return exports;
});