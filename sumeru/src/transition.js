(function(fw){
	
	fw.addSubPackage('transition');
	
	var blockClassName = '__viewBlock__';

	var _trim = function(str){
		return str.replace(/(^\s*)|(\s*$)/g, ""); 
	};
    var _getObj = function(id){
        return document.getElementById(id);
    };
    var _createObj = function(tn){
        return document.createElement(tn);
    };
	/**
	 * add className
	 * klass可以是string或array
	 */
    var _addClass = function(obj,klass){
      var klass = _hasClass(obj,klass);
      if (klass.length===0) return;
      var _ks = _trim(obj.className).replace(/\s+/g," ").split(" ");
        _ks = _ks.concat(klass);
        obj.className = _ks.join(" ");
    };
    
    var _hasClass = function(obj,klass) {
        if ( typeof klass === 'string'){
            klass = [klass];
        }
        var neededItems = [];
        Array.prototype.forEach.call(klass,function(k){
            var rex = new RegExp("( |^)" + k+"( |$)",["i"]);
            if ( !obj.className.match(rex) ) {
                neededItems.push(k);
            }
        });
        return neededItems;
   }
	/**
	 * remove className
	 * klass可以是string或array
	 */
	var _removeClass = function(obj,klass){
		var _ks = _trim(obj.className).replace(/\s+/g," ").split(" ");
		if(klass instanceof Array){
			for (var i=0,len=_ks.length;i<len;i++){
				if(klass.indexOf(_ks[i])>-1){
					_ks.splice(i,1);
				}
			}
		}else{
		    if ( klass.search("^") === 0 ) {
		        var regx = new RegExp(klass,"");
		        for (var i=0,len=_ks.length;i<len;i++){
                    if( _ks[i] && _ks[i].match(regx) ){
                        _ks.splice(i,1);
                    }
                }
		    } else {
				for (var i=0,len=_ks.length;i<len;i++){
    				if( _ks[i] === klass ){
    					_ks.splice(i,1);
    				}
    			}
            }
		}
		obj.className = _ks.join(" ");
	};

	/**
	 * add/remove className
	 * klass可以是string或array
	 */
	var _arClass = function(obj,addks,removeks){
		var _ks = _trim(obj.className).replace(/\s+/g," ").split(" ");
		if(removeks instanceof Array){
			for (var i=0,len=_ks.length;i<len;i++){
				if(removeks.indexOf(_ks[i])>-1){
					_ks.splice(i,1);
				}
			}
		}else{
			for (var i=0,len=_ks.length;i<len;i++){
				if(_ks[i]===removeks){
					_ks.splice(i,1);
				}
			}
		}
		_ks = _ks.concat(addks);
		obj.className = _ks.join(" ");

	}
    var _toggleClass = function(obj, kless, kless2){
        var _ks = _trim(obj.className).replace(/\s+/g," ").split(" ");
        var _index = _ks.indexOf(kless);
        var _index2 = kless2?_ks.indexOf(kless2):-1;
        if(_index>=0){
            _ks.splice(_index,1);
            if(kless2){
                _ks.push(kless2);
            }
        }else{
            _ks.push(kless);
            if(_index2>=0)_ks.splice(_index2,1);
        }
        obj.className =  _ks.join(" ");
    }
	var _fixSreenSize = function(obj){
		obj.style.width = "100%";
	};
    /**
	 * act分为两种：
	 * 1：两个scene分开执行动画效果，
         * usage：
         * sumeru.transition.__load('_run')({"anim":["push",0],"dom":document.getElementById("a3")});
	 * 2：两个scene放在一个容器里执行动画效果 ，
         * usage：
         * sumeru.transition.__load('_run')({
                                                               "dom":[document.getElementById("a1"),document.getElementById("a2")],
                                                               "domsType":"flip",
                                                               "anim":["push",1],
                                                               callback:{"load":function(){alert("loaded");}}
                                                               });
         * sumeru.transition.__load('_run')({"type":"flipleft"});
         * sumeru.transition.__load('_run')({"type":"flipright"});
	 */
	var _act = {
		"push":[1,1,1,1],//0:up,1:right,2:down,3:left,4:z
		"rotate":[0,1,0,1],
		"fade":[0,0,0,0,2],
        "shake":[0,1,0,1],
        "none":[0,0,0,0,2]
	};
	var _pattern = {
		"show":"_g_{$}_sw",//show
		"standby":"_g_{$}_sb",//standby
		"hide":"_g_{$}_hd"//hide
	};
	var act_direct_name = ["top","right","bottom","left",""];
	
	//可以当速查表使用,目前只有subcontroller的转场使用
	var _subact = {
	    "push":{"up":"Up","down":"Down","left":"Left","right":"Right"},
        "bounce":{"":"","up":"Up","down":"Down","left":"Left","right":"Right"},//震动支持这些方向,_fw_bounceIn
        "fade":{"":"","up":"Up","down":"Down","left":"Left","right":"Right"},//fade，支持这些方向
        "rotate":{"":"","up":"UpLeft","down":"DownRight","left":"DownLeft","right":"UpRight"},
        "flip":{"x":"X","y":"Y"},
        "expand":{"x":"X","y":"Y","":""},//试验中，效果不好，不推荐使用
        "none":{"none":""},
        1:1
    };
    var _subact_class = {
        "push":["_fw_pushIn","_fw_pushOut"],
        "bounce":["_fw_bounceIn","_fw_bounceOut"],//震动支持这些方向,_fw_bounceOut
        "fade":["_fw_fadeIn","_fw_fadeOut"],//fade，支持这些方向
        "rotate":["_fw_rotateIn","_fw_rotateOut"],
        "flip":["_fw_flipIn","_fw_flipOut"],
        "expand":["_fw_expand","_fw_collapse"],//试验中，效果不好，不推荐使用
        "none":["_fw_none","_fw_hide"],
        1:1
    };
	
	//容器
	var _wrap = null;

	var _createClassName = function(status,act){
        if(!(act instanceof Array && act.length>1)){
            act = ['push',1];
        }
        var act_name = act[0]+(act_direct_name[act[1]].length>0?("_"+act_direct_name[act[1]]):"");
		return _pattern[status].replace("{$}",act_name);
	};
	var _setting = {
		showScene:{
			type:null,
			dom:null,
			anim:null,
			classname:null
		},
		hideScene:{
			type:null,
			dom:null,
			anim:null,
			classname:null
		}
	};
	var _isFirstLoad = true;
	var _init = function(){
		if (!(_wrap = document.getElementById("_smr_runtime_wrapper"))) {
			_wrap = document.createElement("div");
	        _wrap.className = "_smr_runtime_wrapper";
	        _wrap.id = "_smr_runtime_wrapper";
			document.body.appendChild(_wrap);
			// _fixSreenSize(_wrap);
		}
		_isFirstLoad = false;
	};

    var _createFlipObj = function(frontdom,backdom){
        var _box = _createObj("div"),
            _card = _createObj("div"),
            _front = _createObj("div"),
            _back = _createObj("div");
        _box.style.webkitPerspective = 1000;
        _card.className = "animated _g_flip_card";
        _front.className = "_g_flip_front";
        _back.className = "_g_flip_back";
        _front.appendChild(frontdom);
        _back.appendChild(backdom);
        _card.appendChild(_back);
        _card.appendChild(_front);
        _box.appendChild(_card);
        return _box;
    }
    var __dealTransitionAnim = function( target ) {

        var act_direct_name = {"up":0,"right":1,"down":2,"left":3,"z":4,"none":4};

        if(_act[target.anim[0]][act_direct_name[target.anim[1]]]<=0){
            target.anim = ['push',1];
        }
        if(target.transitionOut&&_act[target.transitionOut[0]][act_direct_name[target.transitionOut[1]]]<=0){
            target.transitionOut = ['push',1];
        }

        if(!target.type){
            target.type = "common";
        }
        
        if ( target.anim && typeof target.anim[1] !== 'undefined' &&  typeof act_direct_name[target.anim[1]] !== 'undefined' ) {
            
            target.anim = [target.anim[0],act_direct_name[target.anim[1]]];
            //target.anim[1] = act_direct_name[target.anim[1]];
        }
        
        if(!target.anim || typeof _act[target.anim[0]] === "undefined"
            ||typeof _act[target.anim[0]][target.anim[1]] === "undefined"
            ||_act[target.anim[0]][target.anim[1]]<=0){
            target.anim = ["push",1];
        }
       
        if ( target.transitionOut ) {//这里是反转
            if ( typeof target.transitionOut !=='object' ) {//有时侯transitionOut只传入true，表示反转target.anim
                target.anim[1] = (target.anim[1] + 2) % 4;
            } else {//其他时侯transitionOut传入的是反转前 的anim，则要反转target.transitionOut 然后赋值覆盖anim
                target.transitionOut[1] = (target.transitionOut[1] + 2) % 4;
                target.anim = target.transitionOut;
            }
        }
    }
	/**
	 * 切换场景
	 * @param target 目标scene
		{
			*type:"flip",//"common,flipleft,flipright"
			dom:document.getElementById("scene1"),//[document.getElementById("scene1"),document.getElementById("scene2")]
			*dom_back:document.getElementById("scene2"),只有在插入flip是type才需要
			anim:["push",1],//anim[1]:"top","right","bottom","left",""
			isback:false,
			callback:{
				"load":function(){},
				"hide":function(){}
			}
     * 限制：前一场景和后一场景的dom不能有重复的。
	 */
	var _transition = function(target){

		if(_isFirstLoad) _init();
        __dealTransitionAnim(target);
        
        var show = _setting.showScene;
        var hide = _setting.hideScene;

        var isChangeAnim = show&&show.anim?(show.anim[0]!=target.anim[0]||show.anim[1]!=target.anim[1]):true;

        switch(target.type){
            case "common":

                if(target.dom instanceof Array ){
                    target.dom_front = target.dom[0];
                    target.dom_back = target.dom[1];
                    
                }
                //fw.log(show.dom == target.dom,show.dom, target.dom)
                //有clonedom，说明是自己推自己，我要给他附加上去成背景图案，推完自己再抹去。
                if (target.cloneDom ) {
                    show.dom.parentNode.appendChild( target.cloneDom );
                    show.dom.addEventListener("webkitTransitionEnd", function(){
                        if ( target.cloneDom && target.cloneDom.parentNode ) {
                            target.cloneDom.parentNode.removeChild(target.cloneDom);//其他地方可能已经删除了
                            delete target.cloneDom;
                        }
                    }, false);
                    show.dom = target.cloneDom;
                } else if ( show.dom == target.dom ){//dom相同,自己转自己，而且没有clonedom，说明是不想让他转场，否则会传入之前clone的clonedom
                    return false;
                } else {
                    delete target.cloneDom;
                }
                
                if( (target.dom instanceof Array&&(show.dom == target.dom_front||show.dom == target.dom_back))
                    ||(typeof show.dom_front != "undefined"?
                                (show.dom_front == target.dom_front
                                ||show.dom_front == target.dom_back
                                ||show.dom_front == target.dom)
                        :false)
                    ||(typeof show.dom_back != "undefined"?
                                (show.dom_back == target.dom_front
                                ||show.dom_back == target.dom_back
                                ||show.dom_back == target.dom)
                        :false)){
                    return false;
                }
                    
                if(target.dom instanceof Array ){
                    target.dom = _createFlipObj(target.dom[0],target.dom[1]);
                }
                //hide对象隐藏
                if(hide&&hide.dom){

                    if(hide.dom_front){
                        var f_rm = 0;
                        //如果hide scene是flip dom 需要回收生成的辅助节点
                        if(hide.dom_front!=target.dom
                            &&hide.dom_front!=target.dom_front
                            &&hide.dom_front!=target.dom_back){
                            hide.dom_front.className = hide.front_classname?("hide "+hide.front_classname):"hide";
                            _wrap.appendChild(hide.dom_front);
                            f_rm++;
                        }
                        if(hide.dom_back!=target.dom
                            &&hide.dom_back!=target.dom_front
                            &&hide.dom_back!=target.dom_back){
                            hide.dom_back.className = hide.back_classname?("hide "+hide.back_classname):"hide";
                            _wrap.appendChild(hide.dom_back);
                            f_rm++
                        }
                        _wrap.removeChild(hide.dom);
                        
                    }else{
                        if(hide.dom!=target.dom
                            &&hide.dom!=target.dom_front
                            &&hide.dom!=target.dom_back){
                        hide.dom.className = hide.classname?("hide "+hide.classname):"hide";
                        }
                    }
                }
                //保存scene 原有的classname
                if(target.dom_front){

                    target.front_classname = (target.dom_front.className).replace(/(_g_[\S]*)|(transi)|(hide)|(animated)/g,"")
                        .replace(new RegExp(blockClassName,"g"),"")
                        .replace(/(^\s*)|(\s*$)/g,"")+blockClassName;
                    target.dom_front.className = target.front_classname;

                    target.back_classname = (target.dom_back.className).replace(/(_g_[\S]*)|(transi)|(hide)|(animated)/g,"")
                        .replace(new RegExp(blockClassName,"g"),"")
                        .replace(/(^\s*)|(\s*$)/g,"")+blockClassName;
                    target.dom_back.className = target.back_classname;
                }else{
                    target.classname = (target.dom.className).replace(/(_g_[\S]*)|(transi)|(hide)|(animated)/g,"")
                        .replace(new RegExp(blockClassName,"g"),"")
                        .replace(/(^\s*)|(\s*$)/g,"")+blockClassName;
                    target.dom.className = target.classname?("hide "+target.classname):"hide";
                }


                var _standby = target.dom;
                var _hide = hide.dom?hide.dom:false;
                var _show = show.dom?show.dom:false;


                //准备dom对象状态
                if(isChangeAnim){//只有动画效果也发生改变时才需要修改show dom的class
                    if(_show){
                        _show.className = show.classname?(blockClassName+" "+show.classname):blockClassName;
                        _addClass(_show,_createClassName("show",target["anim"]));
                    }
                }

                _addClass(_standby,[_createClassName("standby",target["anim"]),blockClassName]);


                //把dom移动到wrap中
                if(_wrap!=_standby.parentElement){
                    _wrap.appendChild(_standby);
                }
                _removeClass(_standby,"hide");

                //动画效果
                var timeout = isChangeAnim?10:1;

                setTimeout(function(){
                    if(_act[target.anim[0]][target.anim[1]]==1){
                        if(_show)_addClass(_show,"transi");
                        _addClass(_standby,"transi");
                    }
                    if(_show)_arClass(_show,_createClassName("hide",target["anim"]),_createClassName("show",target["anim"]));

                    _arClass(_standby,_createClassName("show",target["anim"]),_createClassName("standby",target["anim"]));


                    if(_act[target.anim[0]][target.anim[1]]==2){
                        if(_show)_addClass(_show,"animated");
                        _addClass(_standby,"animated");
                    }
                },timeout);

                //动画结束后的处理
                if(_setting.showScene.anim)_setting.showScene.anim = target.anim;
                _setting.hideScene = _setting.showScene;
                _setting.showScene = target;
                if(_setting.hideScene.callback&&_setting.hideScene.callback.hide){(_setting.hideScene.callback.hide)();}
                if(target.callback&&target.callback.load){(target.callback.load)()};
                break;
            case "flipleft":
                _removeClass(show.dom.firstChild,["_g_flip_card_right","_g_flip_card_right_def"]);
                _toggleClass(show.dom.firstChild,"_g_flip_card_left","_g_flip_card_left_def");
                break;
            case "flipright":
                _removeClass(show.dom.firstChild,["_g_flip_card_left","_g_flip_card_left_def"]);
                _toggleClass(show.dom.firstChild,"_g_flip_card_right","_g_flip_card_right_def");
                break;
        }
        return true;
	};
	//@dom dom
	//@object anim
	//@bool transitionOut
	//重构子转场@sundong
	var _subtransition = function ( target ,ishide) {
	    
	    var _standby = target.dom;
        if ( !target.anim ) target.anim = ["push","down"]
	    if ( ishide ) {//这里是离场
            if ( _subact[target.anim[0]] && typeof _subact[target.anim[0]][target.anim[1]]!=='undefined' ){
                _removeClass(_standby,"^_fw_");
                _addClass(_standby,_subact_class[target.anim[0]][1] + _subact[target.anim[0]][target.anim[1]]);
            }
            _standby.style.display = "";
            _standby.addEventListener("webkitAnimationEnd", _hideMe, false);
            
        } else {//这里是进场
	        
            _addClass(_standby,"animated");
            
            if ( _subact[target.anim[0]] && typeof _subact[target.anim[0]][target.anim[1]]!=='undefined' ){
                _removeClass(_standby,"^_fw_");
                _addClass(_standby,_subact_class[target.anim[0]][0] + _subact[target.anim[0]][target.anim[1]]);
            }
            _standby.style.display = "block";
            _standby.removeEventListener("webkitAnimationEnd", _hideMe, false);
	    }
	}
	var _hideMe = function(){
	    this.style.display = "none";
	}
	
    fw.transition.__reg('_init', _init, 'private');
    fw.transition.__reg('_run', _transition, 'private');
    fw.transition.__reg('_serverRun', function(){
        
    }, 'private');
	fw.transition.__reg('_subrun', _subtransition, 'private');
	
	
})(sumeru);
