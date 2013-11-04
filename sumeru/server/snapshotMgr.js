/**
 * snapshot管理器
 * redo subscribe时，查看snapshots里是否有版本信息。
 * huangxin03
 */

var o = require(__dirname + '/ObjectId.js');


var ENABLE = true;
var DEFAULT_CAPACITY = 60;
var MAX_CAPACITY = 600;
var totalSnapshots = 0;

var snapshotMgr = {};

function SnapshotMgr(pubname, capacity){
	this.pubname = pubname;
	this.capacity = capacity;
	this.snapshot = [];
	this.versionMap = [];
}

SnapshotMgr.prototype = {
	
	add :  function(pubname, data){
		if(this.snapshot.length >= this.capacity || totalSnapshots === MAX_CAPACITY){
			this.remove();
		}
		var version = o.ObjectId();
		this.versionMap.push(version);
		this.snapshot.push(data);
		totalSnapshots++;
		return version;
	},
	
	remove : function(pubname){
		if(this.versionMap.length){
			this.versionMap.shift();
			this.snapshot.shift();
			totalSnapshots--;
		}
	},
	
	get : function(pubname, version){
		var index = this.versionMap.indexOf(version);
		if(index >=0){
			return this.snapshot[index];
		}
		return false;
	}
	
}

//snapshotMgr是SnapshotMgr instance的容器
snapshotMgr.get = function(pubname, version){
	if(!ENABLE){ return false;}
	if(!snapshotMgr[pubname]){
		return false;
	}
	return snapshotMgr[pubname].get(pubname, version);
}

snapshotMgr.add = function(pubname, data){
	if(!ENABLE){ return 0;}
	snapshotMgr[pubname] = snapshotMgr[pubname] || new SnapshotMgr(pubname, DEFAULT_CAPACITY);
	return snapshotMgr[pubname].add(pubname, data);
}

if(typeof module !='undefined' && module.exports){
    module.exports = snapshotMgr;
}