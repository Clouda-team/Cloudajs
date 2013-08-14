Library.net = sumeru.Library.create(function(exports){	
	exports.get = function(options){
		var xhr = new window.XMLHttpRequest();
		
		xhr.onreadystatechange = function(){
		if (xhr.readyState == 4) {
			var result, error = false;
				if ((xhr.status >= 200 && xhr.status < 300) || (xhr.status == 0 && location.protocol == 'file:')) {
				  result = xhr.responseText;
				  options.callback(result);
				} else {
				  options.callback(xhr.responseText);	
				}
			}
		};
		
		xhr.open('GET', options.url, true);
		xhr.send(options.query || '');
	};
	
	
	return exports;
});