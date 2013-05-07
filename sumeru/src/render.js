(function(fw){
    
    var tpls = fw.addSubPackage('render');
    
    //所有分子粒度模板的容器
    var tplMap = {};
    var MAIN = 'main_tpl';
    
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
    
    /**
     * 框架的模版为共用模版系统，即一个模版可以被多个controller合用，所以此处将tpl的容器抽出提供管理。
     */
    var buildRender = tpls.__reg("buildRender",function(session){
        var tplName = session.__currentTplName;
        var isSub = session.__isSubController;
        var __UK = session.__UK + "_";
        var tplId = getTplId(tplName);
        
        var recordId = (isSub ? __UK : "") + tplId;     // 不能变更tplId，因为tplId将用于在缓存模版的script中取值
        
        var tplContentId = (isSub ? __UK : "") + getTplContentId(tplName);
        
        var controllerId = session.__getId();           //　session与controller共用相同ID.
        var container = null , tplContentDom;

        if(tplContentToController[recordId] === undefined){
            tplContentToController[recordId] = {
                    type:MAIN,
                    domId:'',
                    usering:[]
            };
        }
        
        var tpl = tplContentToController[recordId];
        
        // 如果是子controller，则通过session取得父，并获取ID
        tpl.type = session.__isSubController ? session.getMain().__getId() : MAIN;
        
        tpl.domId = tplContentId;
        
        if(tpl.usering.indexOf(controllerId) == -1){
            tpl.usering.push(controllerId);
        }
        
        if(tpl.usering.length > 1){
            fw.controller.findAndDestroy(tpl.usering,controllerId);
        }
        
        // 解析
        
        //FIXME tplContent和renderBone似乎没有被调用
        var tpl = {
            tplContent:null,
            renderBone:null,
            renderBlock:{},
            blocksRelation : {}
        };
        
        
        if(session.__isSubController){
            container = getTplContentId(session.getMain().__currentTplName);
        }else{
            container = 'Runtime@@Wrapper';
        }
        
        /**
         * 重用模版的根结点.
         */
        if(!(tplContentDom = document.getElementById(tplContentId))){
            //创建根结点
            tplContentDom = document.createElement('section');
            tplContentDom.id = tplContentId;
          
            // 插入
            document.getElementById(container).appendChild(tplContentDom);
        }
        
        var reg_replaceUK = /(<[\s]*block[^>]+tpl-id=['"])(.+)(['"][^>]*>)/gm;
        var parserElement = document.createElement('div');
        var source = document.getElementById(tplId).innerHTML;
        
        //===================
        
        //　渲染方法
        source = source.replace(reg_replaceUK,function(match, p1, p2, p3){
            var rv = p1 + __UK + p2 + p3;
            return rv;
        });
        
        /**
         * blocksRelation
         * 存储嵌套模板关系的数据结构 
         * {
         *  tpl-id : {
         *          tpl-id : {空对象代表无下层嵌套view}，
         *          ...
         *      },
         * 
         *  tpl-id2 : ....
         * }
         */
        var blocksRelation = {};
        
        var blockPairStart = /(<[\s]*block[^>]+tpl-id=['"]([^'"\s]+)['"][^>]*>)([\s\S]*)/mi,
            blockPairEnd = /<[\s]*\/[\s]*block[\s]*>/mi,
            nearbyBlockPairEnd = /(<[\s]*\/[\s]*block[\s]*>)[\s\S]+/mi; //最近的一个结束符
        
        source = source + ' ';  //加一个空格是为了兼容readBlockRelation的正则
        var source_ = source,
            relationLevelStack = [blocksRelation];
        
        var readBlockRelation = function(){
            var pairStartMatcher,
                pairStartPos,
                pairStartLength,
                pairEndPos,
                match_tplid,
                nextPairStartPos;
                
            while (pairStartMatcher = source_.match(blockPairStart)){
                
                //读取当前匹配的tpl-id
                match_tplid = pairStartMatcher[2];
                
                //计算<block标签的长度
                pairStartLength = pairStartMatcher[1].length;
                
                //计算<block标签的index
                pairStartPos = source_.indexOf(pairStartMatcher[1]);
                
                //寻找第一个出现的结束标签
                pairEndPos = source_.search(blockPairEnd);
                
                if (pairEndPos == -1) {
                    //语法存在错误，少一个</block>的情况
                    pairEndPos = source_.length;
                };
                
                if (pairEndPos < pairStartPos) {
                    //如果在当前开头之前还有没处理的关闭标签，就退出这一层递归，交由上一层处理
                    return;
                };                
                
                //在关系表中记录当前匹配的tplid
                var relationStack = relationLevelStack[relationLevelStack.length - 1];
                relationStack[match_tplid] = {};
                
                //截取模板代码，只取当前匹配的<block标签的后面
                source_ = source_.substr(pairStartPos + pairStartLength);
                pairEndPos -= pairStartPos + pairStartLength;
                
                //寻找下一个出现的<block标签
                nextPairStartPos = source_.search(blockPairStart);
                
                
                relationLevelStack.push(relationStack[match_tplid]);
                
                //如果存在嵌套的下一个block开始标签
                if (nextPairStartPos != -1 && nextPairStartPos < pairEndPos) {
                    //递归进去读取子block
                    readBlockRelation(relationStack[match_tplid]);
                    
                    relationLevelStack.pop();
                    
                    //递归结束后，找到结束的</block>与当前等待的开始标签匹配
                    var nextPairEndMatcher = source_.match(nearbyBlockPairEnd);
                    if (nextPairEndMatcher) {
                        
                        var nextPairEndMatcherPos = source_.search(nearbyBlockPairEnd),
                            nextPairEndMatcherLength = nextPairEndMatcher[1].length;
                        
                        //截取模板代码，只取当前匹配的</block>标签的后面
                        source_ = source_.substr(nextPairEndMatcherPos + nextPairEndMatcherLength);
                        
                        //构造一个正则 从原始的source中提取出这一段html
                        var tmp_reg = new RegExp('<[\\s]*block[^>]+tpl-id=[\'"]' + match_tplid  + '[\'"][^>]*>([\\s\\S]+)<[\\s]*\/[\\s]*block[\\s]*>' + Library.string.escapeRegex(source_) + '$', 'mi');
                        //注意这里使用的是原始的source
                        var tmp_match = source.match(tmp_reg);
                        if (tmp_match) {
                            tpl.renderBlock[match_tplid] = Handlebars.compile(tmp_match[1]);
                        };
                    };
                    
                } else {
                    relationLevelStack.pop();
                    tpl.renderBlock[match_tplid] = Handlebars.compile(source_.substr(0, pairEndPos));
                
                    //截取模板代码，只取当前匹配的</block>标签的后面
                    var nextPairEndMatcher = source_.match(nearbyBlockPairEnd);
                    if (nextPairEndMatcher) {
                        
                        var nextPairEndMatcherPos = source_.search(nearbyBlockPairEnd),
                            nextPairEndMatcherLength = nextPairEndMatcher[1].length;
                       
                        source_ = source_.substr(nextPairEndMatcherPos + nextPairEndMatcherLength);
                    }
                }
            }    
        }
        
        readBlockRelation();
        
        delete relationLevelStack;

        tpl.blocksRelation = blocksRelation;
        
        parserElement.innerHTML = source;
        
        var blocks = parserElement.getElementsByTagName('block');
        for(var i in blocks){
            var item = blocks[i];
            if(item.nodeType == 1 
               && item.getAttribute('tpl-id') 
               && tpl.renderBlock[item.getAttribute('tpl-id')]){
                   
                //清空block中的内容，后续单独渲染。
                item.innerHTML = '';
            }
        }
        
        //FIXME 这里写死了Handlebars
        //先把骨头架子渲染出来，不带有具体的block内容
        var renderFunc = tpl.renderBone = Handlebars.compile(parserElement.innerHTML);
        //recycle
        parserElement = null;
        
        tplContentDom.innerHTML = renderFunc({});
        return tpl;
    },true);
    
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
        
        //FIXME 这里现在有请求两次的问题，因为两次render离得太近，第一次ajax请求还没返回
        if(typeof tplMap[tplId] !== 'undefined'){
            if(tplMap[tplId] == 'loaded'){
                oncomplete();
            } else if (tplMap[tplId] == 'loading'){
                var func__ = function(){
                    if(tplMap[tplId] == 'loaded'){
                        oncomplete();
                    } else {
                        setTimeout(function(){
                            func__();
                        }, 500);
                    }
                };
                
                func__();
            }
        } else {
            var net = Library.net;
            tplMap[tplId] = 'loading';
            net.get({
                url : sumeru.config.view.get('path') + tplId + '.html',
                callback : function(data){
                    tplMap[tplId] = 'loaded';
                    
                    var node = document.createElement('script');
                    
                    node.id = tplId;
                    node.type = 'text/x-sumeru-template';
                    node.innerHTML = data;
                    // 
                    document.getElementById('Runtime@@Wrapper').appendChild(node);
                    
                    oncomplete();
                }
            });
        }
    },true);
})(sumeru);