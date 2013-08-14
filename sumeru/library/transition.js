Library.transition = sumeru.Library.create(function(exports){
    var fw = sumeru;
	exports.slide = function(current, target, all, direction, disableAnimation){
		//FIXME 这里需要注册到Context里
		fw.__currentBodyPos = fw.__currentBodyPos || 0;
		var blockClassName = '__viewBlock__';
		
		if(direction == 'forward'){ //前进
			fw.__currentBodyPos -= 480;
			//current不动，target放在右边
			current.className = blockClassName;
			target.className = blockClassName + ' active';
			target.style.left = fw.__currentBodyPos * -1 + 'px';
//			if(target.id == 'view//helloworld/list@@content'){
//				target.style.height = '708px';
//			}
			document.getElementById('_smr_runtime_wrapper').className = 'animate';
			if(disableAnimation){
				document.getElementById('_smr_runtime_wrapper').style.webkitTransform = 'translateX(' + fw.__currentBodyPos + 'px)';
			} else {
	            document.getElementById('_smr_runtime_wrapper').style.webkitTransform = 'translateX(' + fw.__currentBodyPos + 'px)';
			}
		} else { //后退
			fw.__currentBodyPos += 480;
		
			//current不动，target放左边
			current.className = blockClassName;
			target.className = blockClassName + ' active';
			target.style.left = fw.__currentBodyPos * -1 + 'px';
			
			setTimeout(function(){
			   document.getElementById('_smr_runtime_wrapper').style.webkitTransform = 'translateX(' + fw.__currentBodyPos + 'px)';
			}, 0);
		}
		
	};
	
	
	exports.fade = function(current, target, all, direction, disableAnimation){
		//alert('fadeIn还没实现');
		//target.putUnder
		//current.fadeOut
		//setTimeout
		//    target.fadeIn
		fw.__currentBodyPos = fw.__currentBodyPos || 0;
		var blockClassName = 'fadein';
		var tg = target;
		if(direction == 'forward'){ //前进
			target.style.left = 0 + 'px';
			target.style.zIndex = 12;
			current.className = "fadeout";
			target.className = blockClassName + ' active';
			
			target.addEventListener('webkitAnimationEnd', function(){
				tg.style.visibility = "visible";
			}, false);	
		} else{
			
			current.className = "fadeout";
			current.addEventListener('webkitAnimationEnd', function(){
				target.style.visibility = "visible";
			}, false);
		}
		
	};
	
	return exports;
});