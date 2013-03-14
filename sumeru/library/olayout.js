;
Library.olayout = sumeru.Library.create(function(exports){   
    
    var layout = exports.layout = function(g_images ,conf){

        var _g_images = g_images||[];
        var g_loadCount = 0;
        var g_len = _g_images.length;
        var conf = conf||null/*{
                "size":584,
                "space":10//图片间距
            };*/
        /*var _g_images = [];
        for(var i=0;i<g_len;i++){
            _g_images.push(g_images[i]["dataMap"]);
        }*/
        var loadImg = function(){
            for(var i=0;i<g_len;i++){
                var _img = new Image();
                _img.src = _g_images[i]["thumbnail"];//"imgs/"+i+".jpg";
                _g_images[i]["img"] = _img;
                _g_images[i]["_src"] = _img.src;

                _img.onload = function(){
                    g_loadCount++;
                    if(g_loadCount>=g_len){

                        for(var i=0;i<_g_images.length;i++){
                            var _imgObj = _g_images[i];
                            var _img = _imgObj["img"];
                            _imgObj["width"] = _img.width;
                            _imgObj["height"] = _img.height;
                            _imgObj["r"] = (_imgObj["width"]/_imgObj["height"]);
                            _imgObj["_r"] = 1/_imgObj["r"];
                            _imgObj["_type"] = getLayoutType(_imgObj["r"]);
                        }
                        var layoutImgObj = new layoutImg(_g_images,conf);
                        var newImgs = layoutImgObj.resizeImgs();

                        //callback(newImgs);
                    }

                }
                //g_images.push(_imgObj);
            }
        };

        var getLayoutType = function(r){//计算w/h比例范围
            var type;
            if(r>2){
                type = 0;
            }else if(r>0.5){
                type = 1;
            }else{
                type = 2;
            }
            return type;
        }
        /*var showImgs = function(){
            console.log(g_images);
            for(var i=0;i<g_images.length;i++){
                var _imgObj = g_images[i];
                var _img = _imgObj["img"];
                _imgObj["width"] = _img.width;
                _imgObj["height"] = _img.height;
                _imgObj["r"] = (_imgObj["width"]/_imgObj["height"]);
                _imgObj["_r"] = 1/_imgObj["r"];
                _imgObj["_type"] = getLayoutType(_imgObj["r"]);
            }
            var layoutImgObj = new layoutImg(g_images);
            var newImgs = layoutImgObj.resizeImgs();

            console.log(newImgs);

            var warpNode = document.getElementById("warp");
            for(var i=0;i<newImgs.length;i++){

                var _imgObj = newImgs[i];
                var _img = _imgObj["img"];
                var _imgNode = document.createElement("img");
                _imgNode.src = _imgObj["_src"];
                _imgNode.width = _imgObj["width"];
                //_imgNode.height = _imgObj["height"];

                warpNode.appendChild(_imgNode);
            }
        }*/
        var layoutImg = function(imgsArr,conf){
            this.imgs = imgsArr;
            this.conf =conf||{
                "size":600,
                "space":10//图片间距
            };

            /**
             * 统一图片的高度或宽度
             */
            this._unifiedSize = function(ukey,dkey,imgs){
                var usize,dsize,imgsLen = imgs.length,_rate;
                usize = imgs[0][ukey];
                dsize = imgs[0][dkey];
                //以第一张为基准，所以第一张不需要变化
                for(var i=1;i<imgsLen;i++){
                    _rate = usize/imgs[i][ukey];
                    imgs[i][ukey] = usize;
                    imgs[i][dkey] *= _rate;
                    dsize += imgs[i][dkey];
                }

                var returnObj = {"imgs":imgs};
                returnObj[ukey] = usize;
                returnObj[dkey] = dsize;
                returnObj["r"] = (returnObj["width"]/returnObj["height"]);;
                returnObj["_r"] = 1/returnObj["r"];
                returnObj["_type"] = getLayoutType(returnObj["r"]);

                return returnObj;//这里要考虑是不是直接用引用进行计算的问题。改了，不用管了
            }
            /**
             * type == "v" 进行width固定的纵向拼接
             * type == "height" 进行height固定的横向拼接
             * size表示高度或宽度
             * space表示间距
             */
            this._spliceImg = function(type,imgs,size,space){
                var ukey,//需要保持一致的那条边
                    dkey,//需要进行拼接的那条边
                    imgsLen = imgs.length,
                    imgsObj;

                //step1:确定统一的改高度还是宽度
                if(type == "v"){
                    ukey = "width";//需要统一的
                    dkey = "height";//进行拼接的
                }else{
                    ukey = "height";
                    dkey = "width";
                }

                //step2:统一高度/宽度
                imgsObj = this._unifiedSize(ukey,dkey,imgs);

                //step3:把统一了高度/宽度的图片拼接到一定的宽度和高度，space使用conf的space
                var space = space||this.conf.space;
                var size = size||this.conf.size;
                var _realTargetSize = size-(space*(imgsLen-1))//实际的目标size是减掉space的size


                var _realSize = imgsObj[dkey];
                var _rate = _realTargetSize/_realSize;
                imgsObj[ukey] *= _rate;
                imgsObj[dkey] *= _rate;
                for(var i=0;i<imgsLen;i++){
                    imgsObj["imgs"][i][ukey] = imgsObj[ukey];
                    imgsObj["imgs"][i][dkey] *= _rate;
                    
                    if(imgsObj["imgs"][i]["imgs"]){
                        var subImgs = imgsObj["imgs"][i]["imgs"];
                        /*var __realTargetSize = imgsObj["imgs"][i][dkey]-(space*(imgsLen-1))
                        var ___rate = __realTargetSize/imgsObj["imgs"][i][dkey];*/
                        for(var si=0,silen=subImgs.length;si<silen;si++){
                            subImgs[si][ukey] = imgsObj[ukey];
                            subImgs[si][dkey] *= _rate/**___rate*/;
                        }
                    }
                }
                return imgsObj;
            }
            //重新计算宽高
            this._preLayout = function(imgs){
                if(imgs instanceof Array){
                    var imgsLen = imgs.length;
                    if(imgsLen==2){//一定是横向拼接
                        imgs = (this._spliceImg("height",imgs))["imgs"];
                    }else if(imgsLen>2){//计算拼接方式
                        /*imgs.sort(function(a,b){
                            return (a["r"]>b["r"]);//倒序。应该是已经倒序好了的数据
                        });*/
                        
                        if(imgs[0]["_type"]==2){
                            var limg,rimgs,rimgsObj,imgsObj;
                            limg = imgs[0];
                            rimgs = imgs.slice(1);
                            rimgsObj = this._spliceImg("v",rimgs,limg["height"]);
                            imgsObj = this._spliceImg("height",[limg,rimgsObj]);

                            imgs.length = 0;
                            imgs.push(imgsObj["imgs"][0]);//fixed me 这里可以做一个随机
                            imgs = imgs.concat(imgsObj["imgs"][1]["imgs"]);
                        }else{
                            imgs = (this._spliceImg("height",imgs))["imgs"];
                        }
                    }else{//修改单张的大小
                        for(var i=0;i<imgsLen;i++){
                            imgs[i]["width"] = this.conf.size;
                            imgs[i]["height"] = this.conf.size/imgs[i]["r"];
                        }
                    }
                }else if(imgs instanceof Object){
                    imgs["width"] = this.conf.size;
                    imgs["height"] = this.conf.size/imgs["r"];
                }
                return imgs;
            }

            /**
             * w/h>2  独成一行
             * w/h<0.5 等待下一个 同样的 或者两个不一样的
             * w/h>0.5 && w/h<=2 等待下一个 同样的 如果两个不一样将这个独立成一行
             */
            this.resizeImgs = function(){
                var //imgsLen = this.imgs.length,
                    _img,_r,__r,__type,
                    _countDiff,//左右两侧的高度差
                    newImgs = [],//用于存放resize后的所有图片
                    _tempImgs = [];//用于存放未resize的图片

                this._organize = function(img,tempImgs){//组成一个layout
                    if(tempImgs){
                        tempImgs.push(img);
                        newImgs = newImgs.concat(this._preLayout(tempImgs));
                    }else{
                        var tempImgs = _tempImgs;
                        if(img){
                            _tempImgs.push(img);
                        }

                        newImgs = newImgs.concat(this._preLayout(tempImgs));

                        _tempImgs.length = 0;
                    }
                }
                this._getCountHR = function(imgs){//右侧累计的高宽比
                    var imgsLen = imgs.length,
                        countHeightRate = 0;
                    for(var i=1;i<imgsLen;i++){
                        countHeightRate += imgs[i]["_r"];
                    }
                    return countHeightRate;
                }
                for(var i=0;i<this.imgs.length;i++){
                    _img = this.imgs[i];
                    _r = _img["r"];
                    __r = _img["_r"];
                    __type = _img["_type"];
                    if(__type==0){
                        newImgs = newImgs.concat(this._preLayout(_img));
                    }else if(__type == 1){
                        if(_tempImgs.length>0){
                            if(_tempImgs[0]["_type"]==1){//第一个为类似正方形
                                if(_tempImgs.length<2&&Math.random()>0.01){
                                    this._organize(_img);
                                }else{
                                    _tempImgs.push(_img);
                                }
                            }else{//第一个为长方形
                                _countDiff = _tempImgs[0]["_r"] - this._getCountHR(_tempImgs);
                                /*console.log(_tempImgs[0]["_r"])
                                console.log(_countDiff)*/
                                if(Math.abs(_countDiff)<1){//右侧累计的高宽比（快要达到/超过了）第一个img的高宽比
                                    this._organize(_img);
                                }else{
                                    _tempImgs.push(_img);
                                }
                            } 
                        }else{
                            _tempImgs.push(_img);
                        }
                    }else{//长条形的
                        if(_tempImgs.length>0){
                            if(_tempImgs.length==1){
                                _countDiff = __r - _tempImgs[0]["_r"];
                                if(Math.abs(_countDiff)<1){//差值小于1，则认为可以进行拼接
                                    this._organize(_img);
                                }else if(_countDiff>0){//新来的大于旧的，反转
                                    _tempImgs.unshift(_img);
                                }else{
                                    _tempImgs.push(_img);
                                }
                            }else{//>1 第一个必须为长方形，且为高宽比最大的长方形
                                //最可怕的是新来的
                                _countDiff = __r - _tempImgs[0]["_r"];

                                if(Math.abs(_countDiff)<1){//差值小于1，则认为可以进行拼接
                                    this._organize(_img,[_tempImgs[0]]);
                                    //temp 中第一个和最后一个拼接成功了，所以i要回滚到第一个之后的那个并且将最后一个插入到第一个之后
                                    _tempImgs.unshift(_img);
                                    var _tempImgsLen = _tempImgs.length;
                                    this.imgs.splice((i-_tempImgsLen)+1,_tempImgsLen,_tempImgs);
                                    _tempImgs.length = 0;
                                    i -= (_tempImgsLen-2);
                                }else if(_countDiff>0){//新来的大于旧的，反转
                                    _tempImgs.unshift(_img);
                                }else{
                                    _tempImgs.push(_img);
                                }

                            }
                        }else{
                            _tempImgs.push(_img);
                        }
                    }
                }
                this._organize();
                return newImgs;
            }
        }

        //loadImg();

        var layoutImgObj = new layoutImg(_g_images,conf);
        return layoutImgObj.resizeImgs();
    };
    
    
    return exports;
});