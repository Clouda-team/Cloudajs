/**
 * @author fantao
 */
FantomX.math = function(){}
FantomX.math.distance = function(a,b){
	var distance = Math.abs(b - a);
	return distance;
}
FantomX.math.direct = function(a,b){
	var direct = 0;
	var distance = FantomX.math.distance(a,b);
	direct = (b - a) ? distance / (b - a):0;//防止0做除数
	return direct;
}
FantomX.math.gbsMin = function(a,b){//求两数的最小公倍数
	var me = this;
	var A = parseInt(a);
	var B = parseInt(b);
	var gm = me.gysMax;
	var value = (A*B)/gm(A,B);
	return value;
}
FantomX.math.gysMax = function(a,b){//求两数的最大公约数
	var A = parseInt(a);
	var B = parseInt(b);
	var r = 0;
	while(r = A%B){
		A = B;
		B = r;
	}
	return B;
}
FantomX.math.divide = function(array,n){//把movement数组重新分成n份儿
	var me = this;
	var arrayOuter = [];
	var current = 0;
	var arrayInner = [];
	var gm = me.gbsMin(array.length,n);

	for (var l = 0; l < n; l++){
		arrayInner = [];
		for (var h = 0; h < array.length; h++){
			arrayInner.push(array[parseInt(current/n)]);
			current++;		
		}
		arrayOuter.push(arrayInner);
	}
	return FantomX.math.arrayRebuilt(arrayOuter);
}
FantomX.math.arraySum = function(array){//求一维数组和
	return eval(array.join("+"));
}
FantomX.math.arrayAvg = function(array){//求一维数组平均值
	var me = this;
	var output = [];
	output = me.arraySum(array) / array.length;
	return output;
}
FantomX.math.arrayRebuilt = function(array){
	//将二维数组的每个数组求平均值后再变成一个一维数组
	var me = this;
	var output = [];
	for(var i = 0;i < array.length;i++){
		output.push(me.arrayAvg(array[i]));
	}
	return output;
}
