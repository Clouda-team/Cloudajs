/**
 * @author fantao
 */
//FantomX.operator = 

FantomX.operator = (function () {
var F = FantomX;	 
var operator = {
				setStyle : function (element, property, value) {
					//function doSet (argument) {
					  element.style[property] = value + "px";
					//}
					//setTimeout(doSet,10);
				},
				
				getFilterIE : function (element){
					//if ( !T.browser['ie'] ) {return false;}//非IE不执行
					var filters =  element.style.filter;
					if (filters) {
						return filters;
					}
					else{
						return "";
					}
				},
				
				setFilterIE : function (element, filterName, filterParam) {
					if ( !F.U.isIE() ) {return false;}//非IE不执行
					var getFilter = operator.getFilterIE;
					var filterString = getFilter(element);
					var fullName = filterName;
					var filterObject = null;
					
					if (filterString.indexOf(filterName + "(") < 0) {
						element.style.filter += "progid:DXImageTransform.Microsoft."+filterName+filterParam+"\r\n";
					}
					fullName = "DXImageTransform.Microsoft." + filterName;
					return element.filters[fullName];
				},
				
				setTransparent : function (element, value) {//0~1
					if (!F.U.isIE()) {
						element.style.opacity = value;
						return;
					}
					var transIE = {};
					value = value*100;
					transIE = operator.setFilterIE(element, "Alpha", "(Opacity="+value+")");
					
					transIE.opacity = value;
				},
				
				setAlphaBg : function (element, imgurl) {//0~1
					if (!F.U.isIE()) {
						element.style.backgroundImage = "url(" + imgurl + ")";
						return;
					}
					var sIE = operator.setFilterIE(element, "AlphaImageLoader", "(src='"+ imgurl +"',sizingMethod='scale')");
				},
				
				setTransform : function (element, string, origin) {
					if (F.U.isIE()) { return false; }
					element.style.webkitTransformOrigin = origin;
					element.style.MozTransformOrigin = origin;
					element.style.webkitTransform = string;
					element.style.MozTransform = string;
				},
				
				setOrigin : function (element, origin) {
					if(!F.U.isIE()){
						origin = origin||"center center";
						element.style.webkitTransformOrigin = origin;
						element.style.MozTransformOrigin = origin;
					}
				},
				
				setScale : function (element, rate, filterObj, dir) {
					if(!F.U.isIE()){

						rate = "matrix("+ rate +",0,0,"+ rate +",0,0)";
						element.style.webkitTransform = rate;
						element.style.MozTransform = rate;
							//element.fxscale	= rate;
						//}
						//setTimeout(doScale,0.000001);
						return;
					}
					//var scaler = {};
					//var d;
					//alert(filterObj);
					//if (!exist(filterObj)) {
					filterObj = filterObj || operator.setFilterIE(element, "Matrix", "(M11='1',sizingMethod='auto expand')");
					//}
					
					//var w = element.offsetWidth;
					//var h = element.offsetHeight;
					
					filterObj.M11 = rate;
					filterObj.M22 = rate;
					filterObj.M12 = 0;
					//scaler.M21 = rate;
					//设定中心点
					//d = rate >= 1 ? 1 : -1;
					//alert(d);
					
					//x = x - d * (w / rate);
					//y = y - d * (h / rate);
					//Fx.setPosition(element,x,y);
				},
				matrixIE : function (element, sizingMethod) {
					if(!F.U.isIE()){return false;}
					switch (sizingMethod) {
						case 0 : sizingMethod = "clip to original"; break;
						case 1 : sizingMethod = "auto expand"; break;
						default : sizingMethod = "clip to original";
					}
					var matrix = operator.setFilterIE(element, "Matrix", "(sizingMethod='" + sizingMethod + "')");
					return matrix;
				},
				setRotate : function(element, deg, origin) {
					var angleString = 'rotate('+deg+'deg)'
					var o = origin || "center center";
					element.style.webkitTransformOrigin = origin;
					element.style.MozTransformOrigin = origin;
					element.style.webkitTransform = angleString;
					element.style.MozTransform = angleString;
					operator.rotateIE(element,deg);
				},
				
				rotateIE : function (element, deg) {
					if (F.U.isIE()){
						var i;
						var left = element.offsetLeft;//T.dom.getPosition(element).left;
						var top = element.offsetTop;//T.dom.getPosition(element).top;
						var oW = element.offsetWidth;
						var oH = element.offsetHeight;
						var matrix = operator.matrixIE(element,1);
						i = (deg) * Math.PI * 2 / 360;
						matrix.M11 = Math.cos(i);//1 - i;
						matrix.M12 = Math.sin(i) * (-1);//-i;
						matrix.M21 = Math.sin(i);//i;
						matrix.M22 = Math.cos(i);//1 - i;
						
						F.O.setStyle(element,"left",left -(element.offsetWidth-oW)/2);
						F.O.setStyle(element,"top",top  - (element.offsetHeight-oH)/2);
					}
				},
				
				getViewSize : function () {
					var viewWidth = window.innerWidth || document.documentElement.clientWidth || document.body.offsetWidth;
					var viewHeight = window.innerHeight || document.documentElement.clientHeight || document.body.offsetHeight;
					return {width:viewWidth, height:viewHeight};
				},
				
				setAlignCenter : function (element) {
					var left = 0;
					var top = 0;
					var eleWidth = element.offsetWidth;
					var eleHeight = element.offsetHeight;
					var vSize = operator.getViewSize();					
					function getCenter (length) {
						return length / 2;
					}
					
					left = getCenter(vSize.width) - getCenter(eleWidth);
					top = getCenter(vSize.height) - getCenter(eleHeight);
					
				    operator.setStyle(element, "left", left);
				    operator.setStyle(element, "top", top);
				},
				
				
					
				test:function(a){
					alert(a);
				}
}
F.O = operator;
return operator;	
})();
