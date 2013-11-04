(function(){
    Library.domUtils = sumeru.Library.create(function(exports){
        exports.on = function(dom,type,handle){
            if(dom && type && handle){
                if(type.indexOf('on') == 0){
                    type = type.substr(2);
                }
                dom.addEventListener(type,handle);
            }
        };
        
        exports.hasClass = function(dom,testClassName){
            if(dom.className == ""){
                return false;
            }
            
            if(dom.classList && dom.classList.contains){
                return dom.classList.contains(testClassName);
            }
            
            var classArr = dom.className.split(' ');
            return classArr.indexOf(testClassName) !== -1;
        };
    });
})();