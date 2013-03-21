Library.screenUtils = sumeru.Library.create(function(exports){
		
	var fullScreen = exports.fullScreen = function(){
	    function hideAddressBar(){
            var docElement = document.documentElement,
                innerHeight = window.innerHeight,
                outterHeight = window.outerHeight,
                devicePixelRatio = window.devicePixelRatio;
            
            docElement.style.height = '100%';
                
            if(scrollHeight<outterHeight){
               docElement.style.height=(outterHeight/window.devicePixelRatio) +'px';
            }

            setTimeout(function(){window.scrollTo(0,1)},0);
        }
        window.addEventListener("load",function(){hideAddressBar();});
        window.addEventListener("orientationchange",function(){
            //这句话保证在android设备上rotate后不会出现错误的zoom
            document.documentElement.style.height = 'auto';
            hideAddressBar();
            setTimeout(function(){
                hideAddressBar();
            }, 800)
        });
	}
	
	return exports;
});
