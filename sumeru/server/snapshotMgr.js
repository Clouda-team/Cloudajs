var runnable = function(fw){
	
	var VERSION_LENGTH = 8; //snapshot version hash length
	var DEFAULT_CAPACITY = 100;
	var MAX_CAPACITY = 300;

	var totalSnapshots = 0;

	function createSnapshotMgr(pubname, capacity){
		var snapshotMgr = new SnapshotMgr(pubname, capacity || DEFAULT_CAPACITY);
		return snapshotMgr;
	}

	function SnapshotMgr(pubname, capacity){
		this.pubname = pubname;
		this.capacity = capacity;
		this.snapshot = [];
		this.versionMap = [];
	}

	SnapshotMgr.prototype = {
		
		add :  function(data){
			if(this.snapshot.length >= this.capacity || totalSnapshots === MAX_CAPACITY){
				this.remove();
			}
			var version = fw.utils.randomStr(VERSION_LENGTH);
			this.versionMap.push(version);
			this.snapshot.push(data);
			totalSnapshots++;
			return version;
		},
		
		remove : function(){
			this.snapshot.shift();
			this.versionMap.shift();
			totalSnapshots--;
		},
		
		getLatest : function(){
			var snap = this.snapshot;
			return snap[snap.length - 1];
		},
		
		get : function(version){
			var index = this.versionMap.indexOf(version);
			if(index >=0){
				return this.snapshot[index];
			}
			return false; //no version log
		},

		reset : function(){
			totalSnapshots = totalSnapshots - this.versionMap.length;
			this.snapshot = [];
			this.versionMap = [];
		}
		
	}
	
	return {
		createSnapshotMgr : createSnapshotMgr
	}
}


if(typeof module !='undefined' && module.exports){
    module.exports = runnable;
}