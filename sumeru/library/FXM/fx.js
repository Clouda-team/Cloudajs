(function() {
   function write(path, scriptList) {
	   for (var i = 0; i < scriptList.length; i++) {
		document.write('<script type="text/javascript" src="' + path + scriptList[i] + ' "></script>');
	   }
   }
   // scripts list
   var SCRIPT_PATH = FX_SCRIPT_PATH || 'fxlib/';
   var SCRIPT_LIST = [
         'fantomx.js',
         'fantomx.math.js',
         'fantomx.tween.js',
         'fantomx.engine.js',
         'fantomx.combo.js',
         'fantomx.operator.js'
         ];
   write(SCRIPT_PATH, SCRIPT_LIST);
})();