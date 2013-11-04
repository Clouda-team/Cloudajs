var runnable = function(fw,viewPath){
    
    require(__dirname+"/../src/renderBase.js")(fw);//fw.render;//('render');
    var tpls = fw.render;
    //所有分子粒度模板的容器
    var tplMap = {};
    var tplMapCallbackStack = {};
    
    var MAIN = 'main_tpl';
    
    var fs = require('fs');
    var Handlebars = require(__dirname + "/../library/handlebars-1.0.0.beta.6.js");
    require(__dirname+"/../library/handlebars-helper.js")(Handlebars);//执行默认的helper
    
    
    tpls.__reg("getHandlebars",function(){
    	return Handlebars;
    });
    
    /*
     *　//　模版的ID,'view/' + tplName 产生 
     * tplId:{
     *  // 如果不是MAIN，就认为是子controller使用.销毁主controller时，应同时销毁子controller　
     *  type:{String}
     *  // 指向页面DOM的ID
     *  domId: {String}
     *  //使用当前模版的controllerId数组
     *  usering : [controllerId],
     * } 
     */
    tplContentToController = {};
    
    
    var cleanCSS = {
            top:'',
            left:'',
            right:'',
            bottom:'',
            width:'',
            height:'',
            display:'',
            position:'',
            margin:'',
            padding:'',
    };
    
    /**
     * 从一个tplName得到tplId
     */
    var getTplId = function(tplName){
        return 'view/' + tplName;
    };
    
    /**
     * 从一个tplName取得tplContentId
     */
    var getTplContentId = function(tplName){
        return getTplId(tplName) + "@@content";
    };
    
    var getTplContent = tpls.__reg('getTplContent',function(session){
        var id = getTplContentId(session.__currentTplName);
        if(session.__isSubController){
            id = session.__UK + "_" + id;
        }
        return document.getElementById(id);
    });
    
    var clearTplContent = tpls.__reg('clearTplContent',function(session){
        var dom = false;//getTplContent(session);
        
        if(dom){
            dom.innerHTML = '';
            /**
             * 如果当前的session是一个子controller的session，那么当前session所指向的controller所操
             * 作的dom，将为一个私有的dom，即只有当前controller会操作，所以，在销毁的时候，将记录一并销毁.
             */
            if(session.__isSubController){
                var __UK = session.__UK + "_";
                var recordId = __UK + getTplId(session.__currentTplName);
                tplContentToController[recordId] = null;
                delete tplContentToController[recordId];
                
                dom.parentElement.removeChild(dom);
            }else{
                /**
                 * 如果不是子controller，则保留dom及使用记录对像
                 */
                fw.utils.setStyles(dom,cleanCSS);
            }
        }
    });
    
    /**
     * 框架的模版为共用模版系统，即一个模版可以被多个controller合用，所以此处将tpl的容器抽出提供管理。
     * !!server渲染得不到模板的document，所以传入读取的模板render source
     */
    var buildRender = tpls.__reg("buildRender",function(session,source){
        
        var tpl = tpls._buildRender(session,source,Handlebars);
        
        return tpl;
    },true);
    
    tpls.__reg("getTplStatus",function(tplName){
        var tplId = getTplId(tplName)
        return tplMap[tplId];
    });
    tpls.__reg("delTpl",function(tplName){
        var tplId = getTplId(tplName)
        delete tplMap[tplId];
        delete tplMapCallbackStack[tplId];
    });
    // 从server端获取一个模版，并编译处渲染方法
    tpls.__reg("getTpl",function(tplName,session,oncomplete){
        var tplId = getTplId(tplName);
        var __UK = session.__UK + "_";
        //server render NEEDS HTML as STRING
        //设计思路 BY sundong
        //我认为nodejs的优势在于可以嵌套callback，异步的执行
        //使用event trigger替代轮巡检查settimeout，如有bug请指出
        if(typeof tplMap[tplId] !== 'undefined'){
        	if (tplMap[tplId] === 'loading'){
        		tplMapCallbackStack[tplId].push(oncomplete);
        	}else{
        		oncomplete(tplMap[tplId]);
        	}
        }else{
        	//关键逻辑在这里了，把原来通过net获得文件内容进行dom操作变成了通过fs读取文件内容
            //FIXME 写死了读取的文件路径
            tplMap[tplId] = 'loading';
            tplMapCallbackStack[tplId] = new Array();
            tplMapCallbackStack[tplId].push(oncomplete);
            var filepath = viewPath+"/"+tplId+".html";
            fs.exists(filepath,function(exists){
                if (exists){
                	fs.readFile(filepath, 'utf-8', function(error, entireContent){
                        tplMap[tplId] = entireContent;
                        for(var i =0;i<tplMapCallbackStack[tplId].length;i++){
                        	tplMapCallbackStack[tplId][i](tplMap[tplId]);
                        }
                        delete tplMapCallbackStack[tplId];
                    });
                    
                }else{
                    fw.log("file not exist", filepath);
                    delete tplMap[tplId];
                    delete tplMapCallbackStack[tplId];
                }
            });
        }
        
    },true);
    
};
if(typeof module !='undefined' && module.exports){
    module.exports = runnable;
}else{//这里是前端
    runnable(sumeru);
}