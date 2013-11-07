// Library.fileUploader = sumeru.Library.create(function(exports){
//     
// });
//sumeru.router

//properties: typeAllowed,max_size_allowed,onComplete
Library.fileUploader = sumeru.Library.create(function(exports){
    
    var fileUploader = function(properties){
      
        // this.typeAllowed = [];
        //this.max_size_allowed = 0;//无限制
        this.fileName = "defaultFile";
        this.extension = "";
        
        this.fileSize = 0;
        this.iPreviousBytesLoaded = 0;
        this.iPercentComplete = 0;
        
        
        this.routerPath = "";
        // this.file = null;
        this.form = null;
        this.target = "";
        
        this.status = fileUploader.PENDING;
        
        var me = this;
        for (var key in properties) {
            this[key] = properties[key];
        }
        //这些函数是上传内部逻辑的函数,不需要暴露对外的接口
        //---------begin-------------
        var router = sumeru.router.getRouterByPath(this.routerPath);
        if (router.type !=='file'){
            throw 'router matches type not file, fileuploader init failed!';
        }
        
        this.max_size_allowed = router.max_size_allowed || 0;
        this.file_ext_allowed = router.file_ext_allowed || '';//the value '' means no limit.
        
        var onSelect = function(e){
            var oFile = e.target.files[0];
            // little test for filesize
            if (this.max_size_allowed >0 && oFile.size > this.max_size_allowed) {
                me.onError("too big file");
                return;
            }
            var ext = oFile.name.replace(/.*\./,"").toLowerCase();
            var iLimit = false;
            if (this.file_ext_allowed ){//有限制
                iLimit = true;
                for(var i=0,len=this.file_ext_allowed;i<len;i++){
                    if (this.file_ext_allowed[i].toLowerCase() == ext) {
                        iLimit = false;
                    }
                }
            }
            if (iLimit == true){
                me.onError("extention not allowed");
                return;
            }
            this.fileSize = oFile.size;
            this.fileName = oFile.name;
            this.extension = ext;
            return true;
        };
        //---------end-------------
        this.form.querySelector("input[type='file']").addEventListener("change",function(){
            onSelect.apply(me,arguments);
            me.fileSelect && me.fileSelect.apply(me,arguments);
        });
    };
    fileUploader.PENDING = 0;
    fileUploader.UPLOADING = 1;
    // fileUploader.PAUSE = 2;
    fileUploader.COMPLETE = 3;
    // fileUploader.INCOMPLETE = 4;
    fileUploader.ABORT = 5;
    fileUploader.ERROR = 6;
    
    
    fileUploader.prototype.startUpload = function(){
        var me = this;
        me.status = fileUploader.UPLOADING;
        
        //这些函数是上传内部逻辑的函数,不需要暴露对外的接口
        //---------begin-------------
        var onProgress = function(e){
            if (!e.lengthComputable) {
                return ;
            }
            
            var iCB = e.loaded;
            var iDiff = iCB - this.iPreviousBytesLoaded;
            if (iDiff == 0)
                return;
            this.iPreviousBytesLoaded = iCB;
            iDiff = iDiff * 2;
            
            this.iPercentComplete = Math.round(e.loaded * 100 / e.total);
            this.iBytesTransfered = fileUploader.bytesToSize(iCB);
            
            
            var remained = this.fileSize - iCB;
            this.secondsRemaining = remained / iDiff;//1.
            
            var iSpeed = iDiff.toString() + 'B/s';
            if (iDiff > 1024 * 1024) {
                iSpeed = (Math.round(iDiff * 100/(1024*1024))/100).toString() + 'MB/s';
            } else if (iDiff > 1024) {
                iSpeed =  (Math.round(iDiff * 100/1024)/100).toString() + 'KB/s';
            }
            this.iSpeed = iSpeed;
        };
        //---------end-------------
        var vFD = new FormData(me.form); 
    
        // create XMLHttpRequest object, adding few event listeners, and POSTing our data
        var oXHR = new XMLHttpRequest();        
        oXHR.upload.addEventListener('progress', function(){
            onProgress.apply(me,arguments);
            me.onProgress && me.onProgress.apply(me,arguments);
            me.status = fileUploader.UPLOADING;
        }, false);
        
        oXHR.addEventListener('load', function(e){
            // me.success && me.success.apply(me,arguments);
            try{
                var data = JSON.parse(e.target.responseText);
                if (!data.errno){
                    me.onSuccess.call(me,data.data);
                }else{
                    me.onError.call(me,data.data);
                }
            }catch(error){
                me.onError.call(me,error.message);
            }
            
            me.status = fileUploader.COMPLETE;
        }, false);
        
        oXHR.addEventListener('error', function(){
            // me.error && me.error.apply(me,arguments);
            me.onError.apply(me,arguments);
            me.status = fileUploader.ERROR;
        }, false);
        
        oXHR.addEventListener('abort', function(){
            // me.abort && me.abort.apply(me,arguments);
            me.onAbort.apply(me,arguments);
            me.status = fileUploader.ABORT;
        }, false);
        
        oXHR.open('POST', me.routerPath);
        oXHR.send(vFD);
        
    };
    
    fileUploader.prototype.onSuccess = function(e,data){
    
    };
    
    fileUploader.prototype.onAbort = function(fileObj,data){
    
    };
    
    fileUploader.prototype.onError = function(msg){
        fw.log("error ",msg);
    };
    
    fileUploader.prototype.onComplete = function(fileObj,data){
    
    };
   
    exports.secondsToTime = fileUploader.secondsToTime = function(secs) { //convert seconds in normal time format
        var hr = Math.floor(secs / 3600);
        var min = Math.floor((secs - (hr * 3600))/60);
        var sec = Math.floor(secs - (hr * 3600) -  (min * 60));
    
        if (hr < 10) {hr = "0" + hr; }
        if (min < 10) {min = "0" + min;}
        if (sec < 10) {sec = "0" + sec;}
        if (hr) {hr = "00";}
        return hr + ':' + min + ':' + sec;
    };
    
    exports.bytesToSize = fileUploader.bytesToSize = function(bytes) {
        var sizes = ['Bytes', 'KB', 'MB','GB'];
        if (bytes == 0) return 'n/a';
        var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
    };
    
    exports.init = function(properties){
        return new fileUploader(properties);
    };
    return exports;
});
