var runnable = function(fw){
	
fw.addSubPackage('oquery');
var oQuery = {};
oQuery.OPERATORS = [
						["=", ">=", ">", "<=", "<", "!=", "LIKE", "IN","FUNC"],
						["AND"],
						["OR"]
					];
oQuery.OPENOPERATORS = ["=", ">=", ">", "<=", "<", "!=", "LIKE", "IN"];
oQuery.isUnitOp = function(op){
	return oQuery.OPERATORS[0].indexOf(op)>=0;
}

oQuery.query = function(item,q){
	var resultValue = false,subQ;
	for (op in q){
		if(oQuery.isUnitOp(op)){
			if(op == "FUNC"){
				var _func = q[op];
				if(_func instanceof Function){
					resultValue = oQuery.unitOp(op,
											_func,
											item);
				}else{
					resultValue = false;
					console.error("value is not a function.");
				}
			}else{
				resultValue = oQuery.unitOp(op,
											item.get(q[op]["key"]),
											q[op]["value"]);
			}
		}else{
			subQ = q[op];
			if(op=="AND"){
				resultValue = true;
				for(var i=0,l=subQ.length;i<l;i++){
					resultValue = oQuery.query(item,subQ[i])&&resultValue;
					if(!resultValue) break;
				}
			}else if (op=="OR"){
				for(var i=0,l=subQ.length;i<l;i++){
					resultValue = oQuery.query(item,subQ[i])||resultValue;
					if(resultValue) break;
				}
			}
		}

	}
	return resultValue;
}
//元计算
oQuery.unitOp = function(op,a1,a2){
	var resultValue = false;
	switch(op){
		case "=":
			if(a1 === a2){
				resultValue = true;
			}
			break;
		case ">=":
			if(a1 >= a2){
				resultValue = true;
			}
			break;
		case ">":
			if(a1 > a2){
				resultValue = true;
			}
			break;
		case "<=":
			if(a1 <= a2){
				resultValue = true;
			}
			break;
		case "<":
			if(a1 < a2){
				resultValue = true;
			}
			break;
		case "!=":
			if(a1 != a2){
				resultValue = true;
			}
			break;
		case "LIKE":
			if((a1+"").indexOf(a2)>=0){
				resultValue = true;
			}
			break;
		case "IN":
			if(a2.indexOf(a1)>=0){
				resultValue = true;
			}
			break;
		case "FUNC":
			resultValue = !!(a1.call(this,a2));
			break;
		default:
			resultValue = false;
			console.error("unit operator not support.");
	}
	
	return resultValue;
}
fw.oquery.__reg('_query', oQuery.query, 'private');
fw.oquery.__reg('_queryop', oQuery.OPENOPERATORS, 'private');

	
}
if(typeof module !='undefined' && module.exports){
	module.exports = runnable;
}else{
    runnable(sumeru);
}