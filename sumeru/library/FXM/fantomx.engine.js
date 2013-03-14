/**
 * @author fantao
 * fx_engine.js
 * 效果引擎 
 */
FantomX.engine = function(jsonArg){
	//振荡器构造函数
	/*
	 * jsonArg参数列表
	 * frequency:频率
	 * //from:初始值
	 * //to:到达值
	 * //movement:动作数组
	 * //overstep:越界处理方式
	 * autostart:是否在对象初始化时自动启动
	 * condition:振荡器运行终止条件
	 * 
	 * onstart:当动作开始时调用
	 * onsufficient:当condition条件满足时调用
	 * onaction:振荡器运行中调用
	 * onstop:当动作停止时调用
	 * 
	 */
	if(typeof(jsonArg)=="undefined"){jsonArg = {};}//防止无参数时对jsonArg操作报错
	
	var arg = jsonArg;
	var me = this;
	var setDefault = FantomX.utility.setDefaultParam;
	me.jsonArg = jsonArg;
	this.gotToStopDoing = false;
	//this.oscillator = {};
	this.frequency = setDefault(arg.frequency,40);//频率
	this.time = setDefault(arg.time,0);//持续时间
	this.startTime = 0;
	this.step = setDefault(arg.step,10);//步进值（平均）/*时间和步进值 必须提供一种*/
	this.movement = setDefault(arg.movement,[10]);
	this.ease = setDefault(arg.ease,"linear");
	this.sync = setDefault(arg.sync,false);
	this.repeat = setDefault(arg.repeat,null);
	this.percent = 0;
	this.syncIndex = 0;
	this.stepslot = 0;
	
	this.condition = setDefault(arg.condition,false);//振荡器运行终止条件
	this.autostart = setDefault(arg.autostart,false);//是否在对象初始化时自动启动
	
	this.onstart = setDefault(arg.onstart,function(){});//当动作开始时调用
	this.onsufficient = setDefault(arg.onsufficient,function(){});//当condition条件满足时调用
	this.onaction = setDefault(arg.onaction,function(){});//振荡器运行中调用
	this.onstop = setDefault(arg.onstop,function(){});//当动作停止时调用
	
	this.actionList = [];//动作列表，是用来组合动作的，此数组中的action将被同步执行，同时开始、同时结束。	
}
FantomX.engine.prototype.reset = function(jsonArg){
	var me = this;
	var setDefault = FantomX.utility.setDefaultParam;
	var arg = jsonArg || me.jsonArg;
	this.gotToStopDoing = false;
	//this.oscillator = {};
	this.frequency = setDefault(arg.frequency,40);//频率
	this.time = setDefault(arg.time,0);//持续时间
	this.step = setDefault(arg.step,10);//步进值（平均）/*时间和步进值 必须提供一种*/
	this.movement = setDefault(arg.movement,[10]);
	this.ease = setDefault(arg.ease,"linear");
	this.sync = setDefault(arg.sync,false);
	this.repeat = setDefault(arg.repeat,null);
	this.percent = 0;
	this.syncIndex = 0;
	this.stepslot = 0;
	
	this.condition = setDefault(arg.condition,false);//振荡器运行终止条件
	this.autostart = setDefault(arg.autostart,false);//是否在对象初始化时自动启动
	
	this.onstart = setDefault(arg.onstart,function(){});//当动作开始时调用
	this.onsufficient = setDefault(arg.onsufficient,function(){});//当condition条件满足时调用
	this.onaction = setDefault(arg.onaction,function(){});//振荡器运行中调用
	this.onstop = setDefault(arg.onstop,function(){});//当动作停止时调用
	
	this.actionList = this.actionList || [];
}
FantomX.engine.behavior = function(jsonArg,onaction){
	//jsonArg.from;
	//jsonArg.to;
	
	var me = this;
	var arg = jsonArg;
	var jsonData = {element:arg.element || window,index:arg.index};
	var from = arg.from;
	var to = arg.to;
	var distance = 0;
	var direct = 0;//方向有三个有效值：0,1,-1分别代表静止、前进和后退
	var time = arg.time;
	var startTime = new Date().getTime();//开始时间
	var step = parseInt(arg.step);
	var freq = arg.frequency;
	var ease = FantomX.tween[arg.ease];
	var repeat = arg.repeat;
	var percent = 0;//已经完成多少的百分比
	var stepsHowmany = 0;
	var stepLength = 0;
	var arrayStep = [];
	var currentStep = 0;
	var arrival = false;
	var startpoint = parseFloat(from);//这是一个缓存变量 设定当前的起始点 默认与from相同
	var begin = parseFloat(from);//这是from的copy ，begin是可读写的 from是只读的
	var end = parseFloat(to);//这是to的copy ，end是可读写的 to是只读的
	var now = parseFloat(from);
	var output = {};
	
	var swap = 0;
	
	//0.计算[路程]绝对值和[方向];
	
	me.init = function(){
		from = arg.from;
		to = arg.to;
		distance = 0;
		direct = 0;//方向有三个有效值：0,1,-1分别代表静止、前进和后退
		time = arg.time;
		startTime = new Date().getTime();
		step = parseInt(arg.step);
		freq = arg.frequency;
		ease = FantomX.tween[arg.ease];
		repeat = arg.repeat;
		percent = 0;//已经完成多少的百分比
		stepsHowmany = 0;
		stepLength = 0;
		arrayStep = [];
		currentStep = 0;
		arrival = false;
		startpoint = parseFloat(from);//这是一个缓存变量 设定当前的起始点 默认与from相同
		begin = parseFloat(from);//这是from的copy ，begin是可读写的 from是只读的
		end = parseFloat(to);//这是to的copy ，end是可读写的 to是只读的
		now = parseFloat(from);
		output = {};
		
		distance = FantomX.math.distance(begin,to) || 1;
		direct = FantomX.math.direct(begin,to);
	}
	
	me.init();
	//3.每次被调用execute方法执行时 都返回一个当前的运行值 并 将当前步长从步长数组中删除掉
	me.execute = function(percentAll){
		if(arrival && !repeat){//如果此行为已经到达 就不再继续执行内容 直接返回json数据
			return output;
		}
		if(!time){
			percent = 1-FantomX.math.distance(begin,end) / distance;
		}
		
		me.percent = percent;
		
		//同步
		if (arg.sync || time){ percent = percentAll; }	
		
		//循环方式begin
		switch (repeat) {
			case "loop":percent = 0;
			break;
			
			case "circle":
				//越界判断处理begin
				begin = begin + step * direct;
				/**/
				//FantomX.utility.log("C1:"+begin+",C2:"+percent);
				arrival = ((percent >= 1)) * 1;
				if((begin * direct >= end * direct)){
					begin = parseFloat(startpoint);
					swap = begin;
					begin = end;
					end = swap;
					direct *= -1;
					startpoint = parseFloat(begin);
					percent = 0;
					//me.percent = percent;
				}
				if(arrival) {		
					arrival = 0;
					percent = 1;
					me = null;
					//me.percent = percent;
				}
				//越界判断处理end
			break;
			
			default:
				//越界判断处理begin
				if (!time){
					begin = begin + step * direct;
					/**/
					if(begin * direct >= end * direct){
						begin = end;
					}
				}
				arrival = ((percent >= 1)) * 1;
				if(arrival) {	
					now = end;
					begin = end;
				}
				else{
					
				}
				//越界判断处理end
		}
		//循环方式end
				
		
		//得到最终计算结果
		if (now != end && !arrival) { 
			now = Math.ceil(startpoint + ease(percent) * distance * direct);
		}
		
		if(onaction){
			onaction.call(jsonData,now);
		}
		output = {arrival:arrival,percent:percent,stepHowmany:distance/step};
		
	return output;
	}
}
FantomX.engine.prototype.addAction = function (jsonArg,onaction){
	//jsonArg.from;
	//jsonArg.to;
	var me = this;
	var arg = jsonArg;
	arg.frequency = me.frequency;
	arg.time = me.time;
	arg.step = me.step;
	arg.ease = arg.ease || me.ease;
	arg.sync = me.sync;
	arg.repeat = arg.repeat || me.repeat
	//arg.movement = arg.movement || me.movement;
	
	var bh = new FantomX.engine.behavior(jsonArg,onaction);
	me.actionList.push(bh);
}
FantomX.engine.prototype.action = function (){
	//振荡器行为——振荡器的主要任务
	var me = this;
	var excution = {};
	var arrival = 0;
	var condition = false;
	var newTime = new Date().getTime();
	
	for(var i=0;i < me.actionList.length;i++){
		excution = me.actionList[i].execute(me.percent)
		arrival += excution.arrival;
		if (excution.stepHowmany > me.stepslot){
			me.stepslot = excution.stepHowmany;
			me.syncIndex = i;		
		}
	}
	if (me.time) {
		me.percent = (newTime - me.startTime) / me.time;
		if (me.percent > 1) me.percent = 1;
	}
	else{

		me.percent = me.actionList[me.syncIndex].percent;
	}
	//FantomX.utility.log("arrival:" + arrival + "，actionList.length" + me.actionList.length);
	condition = (arrival == me.actionList.length);
	me.onaction.apply(me,arguments);
	if(condition){//振荡器状态终止条件 需要在onaction中赋值
		me.stop.apply(me,arguments);
		me.onsufficient.apply(me,arguments);
		me.onstop.apply(me,arguments);
	}
	else{	
		me._oscillator = setTimeout(
						function(){		
								me.action.apply(me,arguments);
						},
						me.frequency
					);
		//me.current = Math.round(Math.random()*100);
	}
}
FantomX.engine.prototype.start = function (){
	//使振荡器启动
	var me = this;
	me.stop.apply(me,arguments);
	me.onstart.apply(me,arguments);
	if(me.actionList.length){
		me.restart.apply(me);
	}
	me.startTime = new Date().getTime();
	me.action.apply(me,arguments);
}
FantomX.engine.prototype.restart = function (){
	//使振荡器启动
	var me = this;
	me.reset.apply(me);
	for(var i=0;i < me.actionList.length;i++){
		me.actionList[i].init();
	}
}
FantomX.engine.prototype.stop = function (){
	//使振荡器停止
	var me = this;
	me.gotToStopDoing = true;
	clearTimeout(me._oscillator);
	me.condition = false;
	//me.percent = 0;
}