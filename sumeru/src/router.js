/**
 * @file router.js
 * @author wangsu01
 * 
 * 操作url中的hash部份，在url的变化时，将程序导入不同的controller.
 * 
 * URL操作结构
 * 　
 *   　　URI#controller路径及名称?调用参数&SESSION结构 
 * 
 * 各部份具体样式及说明
 * 
 *   Index.html                                           // 正常资源URL
 *   #                                                    // hash部分分隔符
 *   /ControllerPath/ControllerName                       // controller目录结构及名称
 *   ?                                                    // 参数部份分隔符
 *   a=b&c=d&                                             // 用户参数，使用正常URL风格
 *   _smr_ignore=true&                                    // 忽略本次url变化
 *   _smr_ses_dat{                                        // SESSION 部份使用JSON风格，由‘SES_DAT{’定义开始边界，‘}’定义结束边界，中间部份统一使用ＵＲＩ编码一次，防止中文等特殊字符出错。
 *      ‘controllerPath1/controllerName1’ : {             // 每个session对像，KEY与[controller目结构及名称]部份相同，用于标记归属。
 *          key1:value1,
 *          key2:value2,
 *          …
 *          keyN:valueN
 *      },
 *      ‘controllerPath2/controllerName2’:{
 *          key1:value1,
 *          key2:value2,
 *          …
 *   　　　 keyN:valueN
 *       }
 *   }
 */
var SUMERU_ROUTER = SUMERU_ROUTER === undefined ? true : SUMERU_ROUTER;
(function(fw){
    var router = fw.addSubPackage('router');
    var utils = fw.utils;
    
    /**
     * 取得url中的hash部份
     */
    function getHash(){
        var idx = self.location.href.indexOf("#"),
            hash = '';
        
        if (idx >= 0) {
            hash = self.location.href.substr(idx + 1);
        }
        
        return hash;
    }
    
    /**
     * 折分url,返回三个主要部份
     * @param hash {string} 将折分的hash字符串
     * @returns {controll:{string},param:{string},session:{string}};
     */
    /*
     * testurl = "/real-time?a=1&b=abc%20def%28ghi%29&SEN_DAT{%27asdf%27%3A%7Bkey%3A100%2Ckey1%3A200%7D}"
     */
    var isInternalJoin = false;
    var isControllerChange = true, isParamsChange  = true, isSessionChange = true;
    var lastController = null ,lastParams = null,lastSession = null;
    var isIgnore = false , isforce = false;
    function splitHash(hash){
        
        var parts = {controller:'',params:'',session:''};
        var cursor_start = 0 , cursor_end;
        
        // 如果是空串,null,undefined,则认为没有参数,没有session,也没指定controller
        try{
            if(!hash){
                return parts;
            }
            
            cursor_end = hash.indexOf('!');
        
            /*
             * 如果cursor_end 为 -1,则表示根本没有session及params.
             * 直接将hash做为controller名称并返回parts
             */
            if(cursor_end == -1){
                parts.controller = hash;
                return parts;
            }
            
            if(hash.indexOf('_smr_ignore=true') != -1){
                isIgnore = true;
            }
            
            //取得controller,从位置 0 到第一个 '!' 
            parts.controller = hash.substring(cursor_start,cursor_end);
        
            cursor_start = cursor_end+1;
            cursor_end = hash.indexOf('_smr_ses_dat{');
            
            /*
             * 如果未找到session的开始标记, 由认为没有session部份,
             * 将cursor_end置为undefined,利用substring方法特性,直接取得cursor_start位置到最后的字符串
             */
            cursor_end = cursor_end == -1 ? undefined : cursor_end; 
            
            //取得controller参数,从上一个end位置到 SEN_DATA{ 开始的位置,最后一个&不影响结果
            parts.params = hash.substring(cursor_start,cursor_end);
            
            // 确认无参数,则将parts.paras置为null, 保证一致后续操作
            if(parts.params == "&"){
                parts.params = '';
            }
            /*
             * 如果在上一步没有找到session的开始标记,则直接不处理session部份
             */
            if(cursor_end === undefined){
                return parts;
            }
            
            cursor_start = cursor_end;
            // 自session标记起始处至遇到的第一个右花括号'}'为止,认为是session部份.
            cursor_end = hash.indexOf('}',cursor_start + '_smr_ses_dat{'.length);
            
            //取得session部份
            parts.session = hash.substring(cursor_start + '_smr_ses_dat{'.length ,cursor_end);
            
            // decode session
            parts.session = decodeURIComponent(parts.session);
            
            return parts;
        }finally{
            //处理变化标记并记录当前值
            isControllerChange = parts.controller != lastController;
            lastController = parts.controller;
            
            isParamsChange = lastParams != parts.params;
            lastParams = parts.params || "";
            
            isSessionChange = lastSession != parts.session;
            lastSession = parts.session;
            
            // debug log.
            if(SUMERU_APP_FW_DEBUG){
                console.log('isControllerChange :' + isControllerChange);
                console.log('isSessionChange :' + isSessionChange);
                console.log('isParamsChange :' + isParamsChange);
                console.log('parts of hash:' , parts);
            }
        }
        
    };
    
    /**
     * 将session部份,拼入hash
     */
    router.__reg('joinSessionToHash',function (serializeDat){
        // encode , serizlizeDat需要去掉两端的花括号,做为分隔符
        var string_session = utils.encodeURIComponentFull(serializeDat.substring(1,serializeDat.length - 1));
        var hash = lastController + "!" + (lastParams == '' ? '&' : lastParams);
        
        // 确认分隔符的存在
        if(hash.indexOf("!") == -1){
            hash += '!';
        }
        
        // 确认分隔符的存在
        if(hash[hash.length -1] != '&'){
            hash += '&';
        }
        
        // 拼入session
        hash += "_smr_ses_dat{" + string_session + "}";
        lastSession = string_session;
        isInternalJoin = true;      //标记拼接
        self.location.hash = hash;
        
    },true);
    
    router.__reg('redirect',function(urlHash,_isforce){
        
        // 确认分隔符的存在
        if(urlHash.indexOf("!") == -1){
            urlHash += '!';
        }
        
        // 确认分隔符的存在
        if(urlHash[urlHash.length -1] != '&'){
            urlHash += '&';
        }
        
        // 确认有session需要保持
        if(lastSession){
            urlHash += "_smr_ses_dat{" + utils.encodeURIComponentFull(lastSession) + "}";
        }
        
        self.location.hash = urlHash;
        isforce = !!_isforce;
    });
    
    
    /**
     * 监测url中hash的变化
     * 
     * 当前规则如下:
     *  controller部份变化 : 进入其它controller
     *  session变化 : 将变化推入session工厂
     *  params变化 : 进入一个新的当前controller
     * 
     */
    function __router(event){
        
        if(event){
            event.preventDefault();
        }
        
        var parts = splitHash(getHash());
        
        // 如果session序列化发生变化,并用不是内部拼接的(理论上此时应只有复制url产生),将变化的对像合并入session工厂.
        if(isSessionChange && !isInternalJoin){
            fw.session.setResume(parts.session);
        }
        
        // 
        if(isIgnore == false && (isControllerChange || isParamsChange)){
            // 进入目标controller.
            fw.init((function(contr, params){
                    return function(){
                        fw.controller.dispatch(contr, params,isforce);
                        isforce = false;
                    };
            })(parts.controller, parts.params));
        }
        
        // 还原标记为false
        isIgnore = isInternalJoin = isControllerChange = isSessionChange = isParamsChange = false;
    }
    
     fw.event.domReady(function() {
         if(SUMERU_APP_FW_DEBUG){
             sumeru.__require("./unit/qunit/qunit-1.9.0.js",function(exports){
                 var linkElement = document.createElement("link");
                 linkElement.href = "./unit/qunit/qunit-1.9.0.css";
                 linkElement.rel = "stylesheet";
                 
                 document.querySelector("head").appendChild(linkElement);
                 
                 var qunitBlock = document.createElement("div");
                 qunitBlock.id = 'qunit';
                 qunitBlock.style.position = 'fixed';
                 qunitBlock.style.zIndex = 10000;
                 qunitBlock.style.textAlign = 'left';
                 qunitBlock.style.overflow = 'scroll';
                 qunitBlock.style.height = screen.availHeight + "px";
                 qunitBlock.style.width = screen.availWidth + "px";
                 qunitBlock.style.left = '10000px';
                 qunitBlock.style.top = '10000px';
                 document.body.appendChild(qunitBlock);
                 
                 exports.showResource = function(){
                     qunitBlock.style.left = 0;
                     qunitBlock.style.top = 0;
                 };
                 
                 exports.hideResource = function(){
                     qunitBlock.style.left = '10000px';
                     qunitBlock.style.top = '10000px';
                 };
                 
                 exports.init();
                 exports.hideResource();
                 console.log('DEBUG MODE : QUNIT READIED.');
             },'Qunit');
         }else{
             window.test = function(){
             };
         }
         if(SUMERU_ROUTER){
             window.onhashchange = __router;
             __router();
         }
        
    });
    
    // DEBUG....
    if(SUMERU_APP_FW_DEBUG){
        router.__reg('splitHash',splitHash,true);
    }
    
    return ;
})(sumeru);
