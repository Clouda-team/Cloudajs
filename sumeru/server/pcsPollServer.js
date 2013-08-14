//pcs 轮询服务

var pcs = require(__dirname  + '/driver/pcs.js');
var applog = require('./driver/applog.js');
// var log = require(__dirname  + '/../sumeru/log.js')(fw);

module.exports = function(fw, getDbCollectionHandler){
    
    
    require(__dirname  + '/../config/app-baidualbum.js')(fw);
    var im = require('./driver/imageMeta.js')(fw);
    
    
	var pcspoll = fw.config.defineModule('pcspoll');
	pcspoll({
		pcsInterval:1000,//pcs轮询时间间隔
		albumTableName:"pics",//轮询插入的model name
		albumTimelineTableName:"picsTimeline",//轮询插入的model name
		thumbnailHost:"127.0.0.1",//port
		thumbnailPort:"2013",//port
	});

	//compfunc 为比较函数。用于比较两个item是否一致
	var inArray = function(array,item,compfunc){
		if(typeof compfunc == "undefined"){
			compfunc = function(a,b){
				return (a["path"] == b["path"]
						&&a["ctime"] == b["ctime"]);
			}
		}
		for(var i=0,ilen = array.length;i<ilen;i++){
			var compvalue = compfunc(array[i],item);
			if(compvalue){
				return i;
			}
		}
		return -1;
	}
	//处理thumbnail的url 到代理上去。
	var getThumbnailURL = function(path,userinfo,width,height){
		var _thumbnail = pcs.GetThumbnailURL(path,width,height);
		_thumbnail = _thumbnail.replace(/^http\S+thumbnail/,"http://"+fw.config.pcspoll.get("thumbnailHost")+":"+fw.config.pcspoll.get("thumbnailPort")+"/thumbnail");
		var _u = {
			"USERID":userinfo["token"],
			"BDUSS":userinfo["info"]["bduss"]
		}
		_thumbnail += "&"+fw.utils.mapToUriParam(_u);
		return _thumbnail;
	}
	
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

	//将从pcs取出来的数据，格式化为要插入mongo DB的数据
	var formatPcsData = function(userinfo,value){
		var _obj = {};
		_obj["username"] = userinfo["token"];
		_obj["userid"] = value["user_id"];
		_obj["fs_id"] = value["fs_id"];
		_obj["ctime"] = value["ctime"];
		_obj["path"] = value["path"];
		_obj["filename"] = value["server_filename"];

		_obj["thumbnail"] = getThumbnailURL(_obj["path"],userinfo,640,1000);

		_obj["size"] = value["size"];
		_obj["src"] = value["s3_handle"];
		//_obj["width"] = 0;
		//_obj["height"] = 0;
		return _obj;
	}


    //offset目前只支持d，m
    var getDateFromTime = function(timestamp,offset){
        var d,dd;
        d = new Date(timestamp*1000);
        dd = new Date(d.getFullYear()+"-"+(d.getMonth()+1)+'-'+d.getDate());//去掉小时分钟和秒
        d = dd;//变换
        if (typeof offset != 'undefined' ){ //explain the offset
            if (offset.substr(-1) == "m") {
                d.setMonth((d.getMonth() - parseInt(offset) ));
            }else{
                d.setDate((d.getDate() - (parseInt(offset)) ));//1day表示当天
            }
        }
        return d.getFullYear()+"-"+(d.getMonth()+1);
    }

	//将全量的pcs抓取数据，转换成timeline数据
	var createTimelineData = function(username, data){
		var timeline = [];
		//console.log("---------------------------------------");
		//console.log(data);
		//console.log("---------------------------------------");
		for(var i=0, ilen = data.length;i<ilen;i++){
			var item  =data[i];
			var timename = getDateFromTime(item["ctime"],"0m");
			if(typeof timeline[timename] == "undefined"){
				timeline[timename] = {};
				timeline[timename]["username"] = username;
				timeline[timename]["userid"] = item["user_id"];
				timeline[timename]["timename"] = timename;
				timeline[timename]["size"] = 1;
				timeline[timename]["newsize"] = 1;
				timeline[timename]["stime"] = item["ctime"];
				timeline[timename]["etime"] = item["ctime"];
				timeline.push(timeline[timename]);
			}else{
				timeline[timename]["size"]++;
				timeline[timename]["newsize"]++;
				timeline[timename]["etime"] = item["ctime"];
			}
		}
		return timeline;
	}

	fw.reqPcsData = function(callback, userinfo, modelName){
		var username = userinfo.token,bduss = userinfo.info.bduss;
		var timelineModelName = fw.config.pcspoll.get("albumTimelineTableName");

	    pcs.GetFileList(function(err,data){
	        
	        if (err) {
	            fw.log('get file list error', err);
	            return;
	        };
	        
			if (!err){
				var newData = data["list"];

				//处理newdata只保留jpg,不需要了。所有图片格式都支持，ye~
				/*for(var i=0,ilen = newData.length;i<ilen;i++){
					if(!/\.jpg$/.test(newData[i]["s3_handle"])){
						newData.splice(i,1);
						i--;
					}
				}*/

				try{
	               	//根据新数据重新生成timeline
					var dbTimeline = getDbCollectionHandler(timelineModelName);
					dbTimeline.find({"username":username}).toArray(function(err, items){


						var timelineData = createTimelineData(username,newData);

	                	//diff新老数据
						for(var i=0,ilen = items.length;i<ilen;i++){
							var _index = inArray(timelineData,items[i],function(a,b){
																	return (a["userid"] == b["userid"]
																			&&a["timename"] == b["timename"]);
																});
							if(_index>=0){
								dbTimeline.update({_id:items[i]["_id"]},//{"userid":items[i]["userid"],"timename":items[i]["timename"]},
												{$set:{"newsize":parseInt(timelineData[_index]["size"]) - parseInt(items[i]["size"]),
														"size":timelineData[_index]["size"],
														"etime":timelineData[_index]["etime"]
													}});

								timelineData.splice(_index,1);
							}else{
								dbTimeline.remove({_id:items[i]["_id"]});
							}
						}
						if(timelineData.length>0){
							for(var i=0,ilen = timelineData.length;i<ilen;i++){
								dbTimeline.insert(timelineData[i]);
							};
						}
	                });
	                

					var dbPics = getDbCollectionHandler(modelName);
	                dbPics.find({"username":username}).toArray(function(err, items){

	                	var removeList = [];//记录需要删除的id
	                	var removedLen = 0;
	                	var insertedLen = 0;
	                	//var insertList = []//记录需要插入的obj,这个不需要了，需要插入的数据，世界就是newdata.

	                	//对callback进行包装，目的是所有的数据都处理完之后才执行
	                	var _callback = function(_type){
	                		if(_type=='remove'){
	                			removedLen++;
	                		}else if(_type=='insert'){
	                			insertedLen++;
	                		}
	                		if(removedLen>=removeList.length
	                			&&
	                			insertedLen>=newData.length){
			                		/*log.write("trigger model push++++");
			                		log.write("removedLen:"+removedLen);
			                		log.write("insertedLen:"+insertedLen);
			                		log.write("removeList.length:"+removeList.length);
			                		log.write("newData.length:"+newData.length);*/
									callback();
	                		}
	                	}

	                	//diff新老数据
						for(var i=0,ilen = items.length;i<ilen;i++){
							var _index = inArray(newData,items[i]);
							if(_index>=0){
								dbPics.update({_id:items[i]["_id"]},//{"userid":items[i]["userid"],"timename":items[i]["timename"]},
												{$set:{"thumbnail":getThumbnailURL(newData[_index]["path"],userinfo,640,1000),
														"src":newData[_index]["s3_handle"]
													}});

								newData.splice(_index,1);
							}else{
								removeList.push({_id:items[i]["_id"]});
								dbPics.remove({_id:items[i]["_id"]},{safe:true},function(){
									_callback("insert");
								});
							}
						}

						if(newData.length>0){

							/*log.write("dbitems:"+items.length);
							log.write("newData:"+newData.length);
							log.write(items[0]);
							log.write(newData[0]);*/
							for(var i=0,ilen = newData.length;i<ilen;i++){

								var picObj = formatPcsData(userinfo,newData[i]);

								//console.log('---xxx---xxx-', i);
								im.get(picObj["src"],function(_dbPics,_picObj,_i){
									return function(meta){
									    _picObj["width"] = meta.width;
									    _picObj["height"] = meta.height;

			                            _picObj["r"] = (_picObj["width"]/_picObj["height"]);
			                            _picObj["_r"] = 1/_picObj["r"];
			                            _picObj["_type"] = getLayoutType(_picObj["r"]);

										_dbPics.insert(_picObj,{safe:true},function(){
											_callback("insert");
										});

									}
								}(dbPics,picObj,i)
								);

										/*dbPics.insert(picObj,{safe:true},function(){
											_callback("insert");
										});*/

								//console.log(formatPcsData(username,newData[i]));
							};
							needPush = true;
						}

	                });
				}catch(e){
					applog.applog("new data error:"+e);
				}
				
	    	}else{
				fw.log("error:"+err);
	    	}
		},
		username,bduss);
	}
}