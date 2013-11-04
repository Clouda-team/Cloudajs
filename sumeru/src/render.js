(function(fw){
    
    var tpls = fw.render;
    
    //所有分子粒度模板的容器
    var tplMap = {};
    var tplMapCallbackStack = {};
    
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
        var dom = getTplContent(session);
        
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
    tpls.__reg('buildRender',function(session){
    	//begin
    	var tplName = session.__currentTplName;
        var isSub = session.__isSubController;
        var __UK = session.__UK + "_";
        var tplId = getTplId(tplName);
        var tplContentId = (isSub ? __UK : "") + getTplContentId(tplName);
        var tplContentDom;
        
		var source = document.getElementById(tplId).innerHTML;
        //From build render base
    	var tpl = tpls._buildRender(session,source,Handlebars);
    	
    	//after
    	if(!(tplContentDom = document.getElementById(tplContentId))){
    		var container;
    		
	        if(session.__isSubController){
	            container = getTplContentId(session.getMain().__currentTplName);
	        }else{
	            container = '_smr_runtime_wrapper';
	        }
            //创建根结点
            tplContentDom = document.createElement('section');
            tplContentDom.id = tplContentId;
          
            // 插入
            document.getElementById(container).appendChild(tplContentDom);
        }
        //替换渲染内容的时候不能如此简单粗暴
        //当server渲染过了，那么替换渲染的uk为本uk即可，不需要清空数据
        //let's do it!
        var mat = tplContentDom.innerHTML.match(/tpl-id=["'](T[^_]*)/);
        if (!mat){
            tplContentDom.innerHTML = tpl.tplContent;
        }else{//i got server render
            var server_uk = new RegExp(mat[1],"g");
            tplContentDom.innerHTML = tplContentDom.innerHTML.toString().replace(server_uk,session.__UK);
        }
        
        return tpl;
    	
    });
    tpls.__reg("getTplStatus",function(tplName){
        var tplId = getTplId(tplName)
        return tplMap[tplId];
    });
    tpls.__reg("delTpl",function(tplName){
        var tplId = getTplId(tplName)
        delete tplMap[tplId];
    });
    // 从server端获取一个模版，并编译处渲染方法
    tpls.__reg("getTpl",function(tplName,session,oncomplete){
        var tplId = getTplId(tplName);
        var __UK = session.__UK + "_";
        
        if(typeof tplMap[tplId] !== 'undefined'){
        	//server render NEEDS HTML as STRING
	        //设计思路 BY sundong
	        //nodejs的优势在于可以嵌套callback，异步的执行
	        //使用event trigger替代轮巡检查settimeout，如有bug请指出
        	if (tplMap[tplId] === 'loading'){
        		tplMapCallbackStack[tplId].push(oncomplete);
        	}else{
        		oncomplete();
        	}
       		
        } else {
            var net = Library.net;
            tplMap[tplId] = 'loading';
            tplMapCallbackStack[tplId] = new Array();
            tplMapCallbackStack[tplId].push(oncomplete);
            
            net.get({
                url : sumeru.config.view.get('path') + tplId + '.html',
                callback : function(data){
                    tplMap[tplId] = 'loaded';
                    
                    var node = document.createElement('script');
                    
                    node.id = tplId;
                    node.type = 'text/x-sumeru-template';
                    node.innerHTML = data;
                    // 
                    document.getElementById('_smr_runtime_wrapper').appendChild(node);
                    for(var i =0;i<tplMapCallbackStack[tplId].length;i++){
                    	tplMapCallbackStack[tplId][i]();
                    }
                    // oncomplete();
                }
            });
        }
    },true);
})(sumeru);