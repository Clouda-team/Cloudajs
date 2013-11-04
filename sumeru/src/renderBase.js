var runnable = function(fw){
    
    var tpls = fw.addSubPackage('render');
    
    //所有分子粒度模板的容器
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
    var tplContentToController = {};
    
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
    
    var escapeRegex = function(str){
    	return (str+'').replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
    }
    tpls.__reg("_buildRender",function(session,source,Handlebars){
        var tplName = session.__currentTplName;
        var isSub = session.__isSubController;
        var __UK = session.__UK + "_";
        var tplId = getTplId(tplName);
        
        var recordId = (isSub ? __UK : "") + tplId;     // 不能变更tplId，因为tplId将用于在缓存模版的script中取值
        
        var tplContentId = (isSub ? __UK : "") + getTplContentId(tplName);
        
        var controllerId = session.__getId();           //　session与controller共用相同ID.
        var tplContentDom;

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
        tpl.domId = tplContentId;
        
        
        /**
         * 重用模版的根结点.
         */
        
        var reg_replaceUK = /(<[\s]*block[^>]+tpl-id=['"])(.+)(['"][^>]*>)/gm;
        // var parserElement = document.createElement('div');
        
        // var source = document.getElementById(tplId).innerHTML;
        
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
            nearbyBlockPairEnd = /(<[\s]*\/[\s]*block[\s]*>)[\s\S]*/mi; //最近的一个结束符
        
        //source = source + ' ';  //加一个空格是为了兼容readBlockRelation的正则
        var source_ = source,
            emptyedBlockSource_ = source, //最终将是清理掉每个block标签中内容的结果，对于有嵌套的不做清除
            relationLevelStack = [blocksRelation];
        
        //这个函数匹配之后做什么
        //匹配<block>后用handlebars进行了渲染
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
                        var tmp_reg = new RegExp('<[\\s]*block[^>]+tpl-id=[\'"]' + match_tplid  + '[\'"][^>]*>([\\s\\S]+)<[\\s]*\/[\\s]*block[\\s]*>' + escapeRegex(source_) + '$', 'mi');
                        //注意这里使用的是原始的source
                        var tmp_match = source.match(tmp_reg);
                        if (tmp_match) {
                            tpl.renderBlock[match_tplid] = Handlebars.compile(tmp_match[1]);
                        };
                    };
                    
                } else {
                    relationLevelStack.pop();
                    tpl.renderBlock[match_tplid] = Handlebars.compile(source_.substr(0, pairEndPos));
                    
                    //对于没有嵌套的，在渲染骨架时，清除其内的内容
                    var emptyBottomBlockRegexp = new RegExp('(<[\\s]*block[^>]+tpl-id=[\'"]' + match_tplid  + '[\'"][^>]*>)[\\s\\S]*?(<[\\s]*\/[\\s]*block[\\s]*>)', 'mi');
                    emptyedBlockSource_ = emptyedBlockSource_.replace(emptyBottomBlockRegexp, "\$1\$2");
                
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
        
        //使用非贪婪匹配正则，去掉block中的元素
        
        //source = source.replace(/(<block[^>]*>)[\s\S]*?(<\/block>)/ig,"\$1\$2");
        //先把骨头架子渲染出来，不带有具体的block内容
        var renderFunc = tpl.renderBone = Handlebars.compile(emptyedBlockSource_);
        //recycle
        // parserElement = null;
        tpl.tplContent = renderFunc({});
        
        return tpl;
    },true);
    
}
if(typeof module !='undefined' && module.exports){
    module.exports = runnable;
}else{//这里是前端
    runnable(sumeru);
}