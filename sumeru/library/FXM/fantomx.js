/**
 * FantomX Effects generator
 * For Mobile Device 0.1
 * @author fantao
 *
 */
var FantomX = function (){					
}

FantomX.utility = {};

FantomX.utility.isIE = function () {return !-[1,];}

FantomX.utility.Id = function (id) {return document.getElementById(id);}
FantomX.G = FantomX.utility.Id;

FantomX.utility.Create = function (tagName,jsonArguments) {
	//jsonArguments  JSON参数列表：
	//className, innerHTML, parentNoda, src, href, target
	
	var ja = jsonArguments;//简写
	var element = document.createElement(tagName);
	if (ja){
		if (ja.className) element.className = ja.className;
		if (ja.style) element.setAttribute("style", ja.style);
		if (ja.innerHTML) element.innerHTML = ja.innerHTML;
		if (ja.src) element.src = ja.src;
		if (ja.href) element.href = ja.href;
		if (ja.target) element.target = ja.target;
		if (ja.parentNode) ja.parentNode.appendChild(element);
		if (ja.childNode) element.appendChild(ja.childNode);
	}	
	return element;
}
FantomX.Create = FantomX.utility.Create;

FantomX.utility.setDefaultParam = function (paramValue,defaultValue){
	if (typeof(paramValue) == "undefined"){
		return defaultValue;
	}
	else{
		return paramValue;
	}
}
FantomX.utility.Runonce = function () {
	this.state = {};
}

FantomX.utility.exist = function (varible) {
	var exist = false;
	if (typeof(varible) != "undefined") {
		exist = true;
	}
	return exist;
}

FantomX.utility.getRandom = function(min, max, block) {
	var r = Math.random() * (max - min) + min;
	if (block) {
		r = parseInt(r / block);//取整
		r = r * block;
		if (max == block) {
			r = Math.random();
			r = r < 0.5 ? min : block;
		}
	}
	return r;
};

FantomX.utility.getPosition = function ( element ) {
	var pos = {left:0, top:0};
	if (element.parentNode.style.position == "absolute" || element.parentNode.style.position == "relative") {
		if ( element.style.left ) {
			pos.left = parseInt(element.style.left);
		}
		if ( element.style.top ) {
			pos.top = parseInt(element.style.top);
		}
	}
	else{
		pos.left = element.offsetLeft;//T.dom.getPosition(element).left;
		pos.top = element.offsetTop;//T.dom.getPosition(element).top;
	}
	return pos;
}

FantomX.utility.Runonce.prototype.check = function (func, state) {
	var me = this;
	if (state == me.state) {
		return false;
	}
	else{
		func();
		me.state = state;
	}
}

FantomX.utility.buildMovement = function(movement){
	/*
	 * 将动作数据格式化为相对比例
	 */
	var copyMM = [];
	var sum = 0;//和
	var avg = 0;//平均值
	for(var i = 0;  i < movement.length; i++){
		copyMM[i] = movement[i]//复制数组的值，防止引用对原始数组破坏
		sum = sum + Math.abs(movement[i]);
	}
	avg = sum/movement.length;
	for(var j = 0;  j < copyMM.length; j++){
		copyMM[j] = (copyMM[j]-avg) / avg;
	}
	//copyMM = copyMM.reverse();//将数组反向排列，以便动作数据符合直观感受
	return copyMM;
}

FantomX.utility.inherits = function (sub, parent) {
	var Bs = new Function();
		   
	Bs.prototype = parent.prototype;   
	sub.prototype = new Bs();   
	sub.prototype.superClass = parent;   
	sub.prototype.constructor = sub;
}

FantomX.utility.log = function(message){
	var logger = document.getElementById("logger");
	logger.innerHTML += message + "<br />";
}

FantomX.U = FantomX.utility;
