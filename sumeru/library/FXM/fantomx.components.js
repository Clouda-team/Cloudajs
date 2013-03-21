/**
 * @author fantao
 */
( function () {

var F =FantomX;
F.P = {};
var Flipcard = function (element, jsonArg) {
	var me = this;
	jsonArg = jsonArg || {};
	me.element = element || me.element || null;
	me.side = 1;
	me.onsideA = me.onsideA || jsonArg.onsideA || null;
	me.onsideB = me.onsideB || jsonArg.onsideB || null;
	me.time = jsonArg.time;
	me.ease = jsonArg.ease;
}
Flipcard.prototype.showSide = function (side, orientation) {
	var me = this;
	var sideFunc = {};
	if (me.side == side) {
		return false;
	} 
	F.C.flip(me.element,{from:0, to:-180, time:me.time, ease:me.ease, orientation:orientation, onchange:function () {
			
			if (me.side == -1) {
				sideFunc = me.onsideA;
				me.side = 1;
			}
			else if (me.side == 1) {
				sideFunc = me.onsideB;
				me.side = -1;
			}
			sideFunc.call(me.element,null);
		}
	});
}
Flipcard.prototype.flip = function (element, side, orientation) {
	var me = this;
	me.element = me.element || element;
	me.showSide (side, orientation);
	
}
F.P.Flipcard = Flipcard;	
})();