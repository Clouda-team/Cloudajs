var runnable = function(fw){
	
fw.addSubPackage('validation');
var oValidation = oValidation||{};
oValidation.copyArgs = function(args){
	var _args = [];
	for(var i=0,ilen=args.length; i<ilen; i++){
		_args.push(args[i]);
	}
	return _args;
};
oValidation.validations = {};

/**
 * 将验证结果转换为msg，需要替换的是
 * $1  ->  label：验证的字段label

 * $2  ->  传入验证func/asyncFunc的第一个参数 eg：length[1,20] ,其中1为$2 20为$3
 * $3  ->  按上例类推
 */
oValidation.getErrorMsg = function(result,label,validation){
	//console.log(JSON.stringify(arguments));
	var _msgTemp="";
	if(oValidation.validations[validation]&&oValidation.validations[validation]["msg"]){
		if(Library.objUtils.isNumber(result)&&result>=0){
			_msgTemp = oValidation.validations[validation]["msg"][result];
		}else{
			_msgTemp = oValidation.validations[validation]["msg"];
		}
		_msgTemp = _msgTemp.replace("$1",label);
		for(var i=2,len=arguments.length;i<len;i++){
			_msgTemp = _msgTemp.replace("$"+(i-1),arguments[i]);
		}
	}
	return _msgTemp;
};
/**
 * 这里比较奇葩，验证通过返回false，否则返回result obj
 */
oValidation.unitValidation = function(runat,label,key,value,validation,callback,modelObj){//这里的callback参数只有在asyncFunc时，如果是func，则是arg1。。。，如果是regexp则没有这个参数
	/*
	 * 这个函数的arguments最后会拼装到func/asyncFunc/getErrorMsg 作为参数
	 */

	var returnvalue = true,errorMsg="";
	if(Library.objUtils.isFunction(validation)){
		returnvalue = validation.call(this,value);
	}else if(Library.objUtils.isRegExp(validation)){
		returnvalue = validation.test(value);
	}else if(Library.objUtils.isString(validation)){
		var vali = oValidation.validations[validation];
		if(vali){
			if(vali.runat.indexOf(runat)<0&&vali.runat!='both'){return false};//判断与预定义的运行方是否一致
			if(vali["regexp"]){
				returnvalue = (new RegExp(vali["regexp"])).test(value);
			}else if(vali["func"]){
				var _args = oValidation.copyArgs(arguments);
				_args.splice(0,5,value);

				returnvalue = vali["func"].apply(this,_args);
			}else if(vali["asyncFunc"]){
				vali["asyncFunc"].call(this,callback,key,value,modelObj);
				return "asyn";
			}
		}
	}
	if(!returnvalue||(Library.objUtils.isNumber(returnvalue)&&returnvalue>=0)){

		var _args = oValidation.copyArgs(arguments);
		_args.splice(0,5,returnvalue,label,validation);
		errorMsg = oValidation.getErrorMsg.apply(this,_args);

		returnvalue = {"value":returnvalue,"msg":errorMsg}
	}else{
		returnvalue = false;
	}
	return returnvalue;
};
oValidation.clientValidation = function(label,key,value,validation){
	var _args = oValidation.copyArgs(arguments);
	_args.unshift("client");
	return oValidation.unitValidation.apply(this,_args);
};
oValidation.serverValidation = function(label,key,value,validation){
	var _args = oValidation.copyArgs(arguments);
	_args.unshift("server");
	return oValidation.unitValidation.apply(this,_args);
};

oValidation.isAsynVali = function(valiKey){
	return (typeof oValidation.validations[valiKey] != 'undefined')
			&&(typeof oValidation.validations[valiKey]['asyncFunc'] != 'undefined');
};
/**
 * 用户自定义validation rule，可覆盖默认的validation，
 */
oValidation.addRule = function(key,value){
	oValidation.validations[key] = value;
};
fw.validation.__reg('addrule', oValidation.addRule, 'publish');
fw.validation.__reg('_svalidation', oValidation.serverValidation, 'private');
fw.validation.__reg('_cvalidation', oValidation.clientValidation, 'private');
fw.validation.__reg('_getvalidationmsg', oValidation.getErrorMsg , 'private');
fw.validation.__reg('_isasynvali', oValidation.isAsynVali , 'private');
};


if(typeof module !='undefined' && module.exports){
    module.exports = runnable;
}else{
    runnable(sumeru);
}