/**
 * @author fantao
 * combo库提供了一些做好的现成效果
 */


FantomX.combo = (function () {
var F = FantomX;
var freq = 20;
var time = 300;
var exist =	F.U.exist;
var combo = {
	move : function (element, jsonArg) {
		var ag = jsonArg;
		var oX = F.U.getPosition(element).left;//parseInt(element.style.left) || (ag.absolute) ? element.offsetLeft : T.dom.getPosition(element).left;
		var oY = F.U.getPosition(element).top;//parseInt(element.style.top) || (ag.absolute) ? element.offsetTop : T.dom.getPosition(element).top;
		var oW = element.offsetWidth;
		var oH = element.offsetHeight;
		if (ag.scroll) {//for scrolling content
			oX = element.scrollLeft;
			oY = element.scrollTop;
		}	
		ag.from = ag.from || {};
		ag.to = ag.to || {}; 
		ag.from.x = ag.from.x || oX;
		ag.from.y = ag.from.y || oY;
		
		ag.from.width = ag.from.width || element.offsetWidth;
		ag.from.height = ag.from.height || element.offsetHeight;
		
		ag.to.width = F.U.setDefaultParam(ag.to.width, ag.width);
		ag.to.height = F.U.setDefaultParam(ag.to.height, ag.height);
		
		ag.to.x = F.U.setDefaultParam(ag.to.x, ag.left);
		ag.to.y = F.U.setDefaultParam(ag.to.y, ag.top);
		
		var m = new F.engine({
				frequency: ag.frequency || freq,
				time: ag.time || time,
				sync: true,
				//repeat:"circle",
				ease: ag.ease || "easeOutQuint",
				onstart: function () {
					if(ag.onstart) {
						ag.onstart.call(element, ag);
					}
				},
				onstop: function () {
					if(ag.oncomplete) {
						ag.oncomplete.call(element, ag);
					}
				}
			});

			function addX () {
				m.addAction({from:ag.from.x,to:ag.to.x},
					function(value){
						if (ag.scroll) {
							element.scrollLeft  = value;
						}
						else {
							F.O.setStyle(element,"left",value);
						}
						
					}
				);
			}
			function addY () {
				m.addAction( {from:ag.from.y,to:ag.to.y},
					function (value) {
						if (ag.scroll) {
							element.scrollTop = value;
						}
						else {
							F.O.setStyle(element,"top",value);
						}
					}
				);
			}
			function addTrans (paramObj) {
				var from = exist( paramObj.from ) ? paramObj.from : 0 ;
				var to = exist( paramObj.to ) ? paramObj.to : 1 ;
				var d = 100;
				m.addAction( { from: from * d, to: to * d ,ease: paramObj.ease || ag.ease },
					function (value) {
						//document.title = value;
						F.O.setTransparent( element, value/d );
					}
				);
			}
			function addScale (paramObj) {		
				var from = exist( paramObj.from ) ? paramObj.from : 0 ;
				var to = exist( paramObj.to ) ? paramObj.to : 1 ;
				var d = 100;
				var origin = paramObj.center? "center center":"left top";
				
				F.O.setOrigin(element, origin);
				m.addAction( { from: from * d, to: to * d ,ease: paramObj.ease || ag.ease },
					function (value) {
						//document.title = value;
						F.O.setScale( element, value/d );
						if (paramObj.center && F.U.isIE()) {
							F.O.setStyle(element,"left",oX -(element.offsetWidth-oW)/2);
							F.O.setStyle(element,"top",oY  - (element.offsetHeight-oH)/2);
						}		
					}
				);
			}
			
			function addWidth () {
				m.addAction({from:ag.from.width,to:ag.to.width},
					function(value){
							F.O.setStyle(element,"width",value);	
					}
				);
			}
			function addHeight () {
				m.addAction({from:ag.from.height,to:ag.to.height},
					function(value){
							F.O.setStyle(element,"height",value);
						}
				);
			}
			
			function disable () {}
			
			if (!exist(ag.to.y)) {
				addY = disable;
			}
			if (!exist(ag.to.x)) {
				addX = disable;
			}
			if (!exist(ag.transparent)) {		
				addTrans = disable;
			}
			if (!exist(ag.scale)) {		
				addScale = disable;
			}
			if (!exist(ag.to.width)) {
				addWidth = disable;
			}
			if (!exist(ag.to.height)) {
				addHeight = disable;
			}
			
		addX();
		addY();
		addTrans(ag.transparent);
		addScale(ag.scale);
		addWidth();
		addHeight();
		
		m.start();
		return m;
	},
	fade : function (element, jsonArg) {	
		var from = jsonArg.from;
		var to = jsonArg.to;
		var d = to || from;
		var fi = new F.engine({
				frequency:jsonArg.frequency || freq,
				time:jsonArg.time || time,
				sync:true,
				//repeat:"circle",
				//ease:"easeOutQuint",
				onstart:function () {
					if(jsonArg.onstart){
						jsonArg.onstart.call(element, jsonArg);
					}
				},
				onstop:function () {
					if(jsonArg.oncomplete){
						jsonArg.oncomplete.call(element, jsonArg);
					}
				}
			});
		if ( Math.abs(to - from) < 10) {
			d = 100;
			from *= 100;
			to *= 100;
		}
			
		fi.addAction({from:from, to:to},
			function(value){
				F.O.setTransparent(element,value/d);
			});
		fi.start();
		return fi;
	},	
	fadeIn : function (element, jsonArg){
		jsonArg = jsonArg || {};
		jsonArg.from = 0;
		jsonArg.to = 100;
		return this.fade(element,jsonArg);	
	},
	fadeOut : function (element, jsonArg){
		jsonArg = jsonArg || {};
		jsonArg.from = 100;
		jsonArg.to = 0;
		return this.fade(element,jsonArg);	
	},
	
	rotate : function (element, jsonArg){
		var i;
		var oX = parseInt(element.style.left) || (jsonArg.absolute) ? element.offsetLeft : T.dom.getPosition(element).left;
		var oY = parseInt(element.style.top) || (jsonArg.absolute) ? element.offsetTop : T.dom.getPosition(element).top;
		var left = oX;
		var top = oY;
		var oW = element.offsetWidth;
		var oH = element.offsetHeight;
		var matrix = F.O.matrixIE(element,1);
		var rotateFx = new F.engine({
			frequency:jsonArg.frequency||freq//freq见最上面
			,time:jsonArg.time||time//time见最上面
			,ease:jsonArg.ease||"linear"
			,onstart:function(){}
			,onstop:function(){
				if(jsonArg.oncomplete){
					jsonArg.oncomplete.apply();
				}
			}
		});
		rotateFx.addAction({from:jsonArg.from,to:jsonArg.to},function (value) {
			if (F.U.isIE()){
				i = (value) * Math.PI * 2 / 360;
				matrix.M11 = Math.cos(i);//1 - i;
				matrix.M12 = Math.sin(i) * (-1);//-i;
				matrix.M21 = Math.sin(i);//i;
				matrix.M22 = Math.cos(i);//1 - i;
				
				F.O.setStyle(element,"left",left -(element.offsetWidth-oW)/2);
				F.O.setStyle(element,"top",top  - (element.offsetHeight-oH)/2);
			}
			else{
				F.O.setRotate(element,value);
			}	
		}
		);
		rotateFx.start();
		return rotateFx;
	},
			
	flip : function (element, jsonArg){
		var i;
		var left = F.U.getPosition(element).left;
		var top = F.U.getPosition(element).top;
		//alert(left+","+top);
		var oW = element.offsetWidth;
		var oH = element.offsetHeight;
		var matrix = F.O.matrixIE(element,1);
		var M11 = 1, M12 = 0, M21 = 0, M22 = 1;
		var flip = new F.engine({
			frequency:jsonArg.frequency||freq//freq见最上面
			,time:jsonArg.time||500//time见最上面
			,ease:jsonArg.ease||"easeInOutCubic"
			,onstart:function(){}
			,onstop:function(){
				matrix = "matrix("+ 1 +","+ 0 +","+ 0 +"," + 1 + ",0,0)";
				F.O.setTransform(element, matrix);//上面这两行防止3D旋转结束时停不到位
				if(jsonArg.oncomplete){
					jsonArg.oncomplete.apply();
				}
			}
		});
		var side = 1;
		var onchangeruned = false;
		flip.addAction({from:jsonArg.from,to:jsonArg.to},function (value) {
			if (Math.abs(value) >= 90) {
				side = -1;
				if(jsonArg.onchange && !onchangeruned){
					jsonArg.onchange.apply();
					onchangeruned = true;
				}
			}
			i = (value) * Math.PI * 2 / 360;
			switch (jsonArg.orientation) {
				case "landscape": 
					M11 = Math.cos(i) * side; M12 = 0; M21 = 0;	M22 = 1;
					break;
				case "vertical":
					M11 = 1; M12 = 0; M21 = 0; M22 = Math.cos(i) * side;
					break;
				case "landscape3D":
					M11 = Math.cos(i) * side; M12 = 0; M21 = Math.sin(i) * side;	M22 = 1;
					break;
				case "vertical3D":
					M11 = 1; M12 = Math.sin(i) * side; M21 = 0; M22 =  Math.cos(i) * side;
					break;
				default:
					M11 = Math.cos(i) * side; M12 = 0; M21 = 0;	M22 = 1;
			}
			
			if (F.U.isIE()){
				matrix.M11 = M11;
				matrix.M12 = M12;
				matrix.M21 = M21;
				matrix.M22 = M22;
				
				F.O.setStyle(element,"left",left -(element.offsetWidth-oW+2)/2);
				F.O.setStyle(element,"top",top  - (element.offsetHeight-oH+2)/2);
			}
			else{
				matrix = "matrix("+ M11 +","+ M21 +","+ M12 +"," + M22 + ",0,0)";
				F.O.setTransform(element, matrix);
			}	
		});
		flip.start();
		return flip;
	},
	
	transCover : function (jsonArg) {
		//jsonArg.
		//background, opacity, container, margin, {equesto F.Create};
		var arg = jsonArg || {};
		
		arg.parentNode = document.body;
		arg.style = "position:absolute; z-index:1000; top:0; left:0;";
		arg.id = arg.id || "fantomxviewcover";
		var cover = F.G(arg.id) || F.U.Create("div",arg);
		var container = arg.container;
		cover.style.background = arg.background || "#000000";
		container.style.zIndex = "1010";
		container.style.visibility = "visible";
		F.O.setTransparent(cover, 0);
		F.O.setTransparent(container, 0);
		
		function resize () {
			var vSize = F.O.getViewSize();
			var margL = (vSize.width >= arg.minwidth)? parseInt(arg.margin * 2):(vSize.width + arg.minwidth);
			var margV = (vSize.height >= arg.minheight)? parseInt(arg.margin * 2):(vSize.height + arg.minwidth);
			F.O.setStyle(cover, "width", vSize.width);
			F.O.setStyle(cover, "height", vSize.height);
			if (container) {
				F.O.setStyle(container, "width", vSize.width - margL);
				F.O.setStyle(container, "height", vSize.height - margV );
				F.O.setAlignCenter(container);
			}		
		}
		resize();
		//T.event.on (window, "resize", resize);
		if (F.U.isIE()){
			window.attachEvent("onresize",resize);
		}
		else{
			window.addEventListener("resize",resize,false);
		}
		
		
		//遮罩
		F.C.fade(cover,{from:0, to: arg.opacity || 0.5,
				oncomplete:function () {
					if (container) {
						F.C.fadeIn(container);
					}						
					if (jsonArg.oncover) {
						jsonArg.oncover();
					}
				}
			});
		
		//清除遮罩
		function discover() {
			F.C.fade(cover,{from:arg.opacity || 0.5, to: 0, 
				oncomplete:function () {
					F.O.setStyle(cover, "width", 0);
					F.O.setStyle(cover, "height", 0);
					if (jsonArg.ondiscover) {
						jsonArg.ondiscover();
					}
				}		
			});
		}
		this.discover = discover; 
		cover.onclick = function () {
			if (container) {
				F.C.fadeOut(container,{oncomplete:function () {
					F.O.setStyle(container, "width", 0);
					F.O.setStyle(container, "height", 0);
					discover();
				}});
						
			} else {
				discover();
			}
			
		}
	},
	
	
								
	test : function(a){
		alert(a);
	}
}
combo.ScrollingIcon = function (element,jsonArg) {
	//arg	:direct :auto
		this.element = element;
		this.arg = jsonArg || {};
		this.action = {};
		this.delay = {};
		if (this.arg.auto) {
			this.scroll.call(this);
		}
}
combo.ScrollingIcon.prototype.scroll = function (index) {
	
			var me = this;
			var arg = me.arg;
			var r = F.U.getRandom;
			var time = 1000;
			var width = me.arg.width || me.element.offsetWidth;
			var height = me.arg.height || me.element.offsetHeight;
			var min = me.arg.min || 20;//最少滚动距离
			var moveArg = {scroll:true, time:time, oncomplete:complete};
			
			if (arg.direct == "landscape") {
				moveArg.left = r(0, width, min);
				if ( F.U.exist( index ) ) {
					moveArg.left = index * width;
				}
				//alert(moveArg.left);
			}
			else{
				moveArg.top = r(0, height, min);
				if ( F.U.exist( index ) ) {
					moveArg.top = index * height;
				}
			}
			function complete (){
				me.delay = setTimeout(function () {
					me.scroll.call(me);
				}, r(2000,6000));
			}
			if (F.U.exist( index )) {
				moveArg.oncomplete = null;
				me.action = F.C.move(me.element, moveArg);
			}
			else{
				me.delay = setTimeout(function () {
					me.action = F.C.move(me.element, moveArg);
				},r(3000,6000));
			}
						
}
combo.ScrollingIcon.prototype.showfirst = function () {
	var me = this;
	me.stop();
	me.scroll(0);
}
combo.ScrollingIcon.prototype.showlast = function () {
	var me = this;
	me.stop();
	me.scroll(1);
}
combo.ScrollingIcon.prototype.stop = function () {
	var me = this;
	if (me.action.stop) {
		me.action.stop();
	};
	clearTimeout(me.delay);
}
combo.popbox = function (element,jsonArg) {
	//jsonArg   :width  :height
}

F.C = combo;
return combo;	
})();
