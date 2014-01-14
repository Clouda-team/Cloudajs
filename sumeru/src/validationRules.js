var runnable = function(fw){
	fw.validation.addrule("length" , {
										"runat":"both",
										"func":function(v,min,max){
											var v = v+""||"",
												len = v.length;
											if(len>parseInt(max)){
												if(len<parseInt(min)){
													return 0;
												}
												return 1;
											}else if(len<parseInt(min)){
												return 2;
											}else{
												return -1;
											}
										},
										"msg":["$1长度不能大于$3，且不能小于$2。","$1长度不能大于$3。","$1长度不能小于$2。"]
									});
	fw.validation.addrule("minlength" , {
										"runat":"both",
										"func":function(v,min){
											var v = v+""||"",
												len = v.length;
											return len>parseInt(min);
										},
										"msg":"$1长度不能小于$2。"
									});
	fw.validation.addrule("maxlength" , {
										"runat":"both",
										"func":function(v,max){
											var v = v+""||"",
												len = v.length;
											return len<parseInt(max);
										},
										"msg":"$1长度不能大于$2。"
									});
	fw.validation.addrule("required" , {
										"runat":"both",
										"func":function(v){
											var v = typeof v != "undefined"?v+"":"";
											var len = v.length;
											return len>0;
										},
										"msg":"$1为必填项。"
									});
	fw.validation.addrule("number" , {
										"runat":"both",
										"regexp":"^[0-9]+$",
										"msg":"$1必须为数字。"
									});
	fw.validation.addrule("telephone" , {
										"runat":"both",
										"regexp":"^(0[0-9]{2,3}\-)?([2-9][0-9]{6,7})+(\-[0-9]{1,4})?$",
										"msg":"$1必须为电话号码格式。"
									});
	fw.validation.addrule("mobilephone" , {
										"runat":"both",
										"regexp":"(^0?[1][358][0-9]{9}$)",
										"msg":"$1必须为手机号码格式。"
									});
	fw.validation.addrule("email" , {   
										"runat":"both",
										"regexp":"^[a-zA-Z0-9_\.\+\-]+\@([a-zA-Z0-9\-]+\.)+[a-zA-Z0-9]{2,4}$",
										"msg":"$1必须为email格式。"
									});
	fw.validation.addrule("onlyletter" , {
										"runat":"both",
										"regexp":"^[a-zA-Z]+$",
										"msg":"$只能是字母。"
									});
	fw.validation.addrule("nospecialchars" , {
										"runat":"both",
										"regexp":"^[0-9a-zA-Z]+$",
										"msg":"$1不能包含特殊字符。"
									});
	fw.validation.addrule("date" , {
										"runat":"both",
										"regexp":"^[0-9]{2,4}[\/\-]{1}[0,1]{0,1}[0-9]{1}[\/\-]{1}[0,3]{0,1}[0-9]{1}$",
										"msg":"$1格式不正确。"
									});
	fw.validation.addrule("chinese" , {  
										"runat":"both", 
								        "regexp":"^[\u4e00-\u9fa5]+$",
										"msg":"$1必须为中文。"
								    });
	fw.validation.addrule("url" , {   
										"runat":"both",
								        "regexp":"^[A-Za-z]+://[A-Za-z0-9-_]+\\.[A-Za-z0-9-_%&\?\/.=]+$",
										"msg":"$1必须为URL。"
								    });
	fw.validation.addrule("unique" , {
									    /**
									     * asyncFunc 这个东西存在的理由是，有些验证是需要用到server端的特性的，比如查数据库
									       典型的应用场景：用户名不重复验证

									       这里的asyncFunc是在server端运行，其中测callback是server端生成的。
									       this == dbCollectionHandle
									     */
										"runat":"server",
								        "asyncFunc":function(callback,k,v,modelObj){
								        	var where = {};
								        	where[k] = v;
								        	this.find(where).toArray(function(err,items){
								        		var result = true;
								        		if(!err){
								                	if(items.length>0){
								                		result = false;
								                	}
								                	callback.call(this,err,result);
								                }else{
								                	callback.call(this,err);
								                }
								        	});
								    	},
										"msg":"$1不能重复。"
								    });
}

//for node
if(typeof module !='undefined' && module.exports){
    module.exports = runnable;
}else{
    runnable(sumeru);
}
