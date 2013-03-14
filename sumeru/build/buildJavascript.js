module.exports = function(directory,dstDir){
    var fs = require('fs');
    var path = require('path');
    //var uglify = path.join(directory,'server/node_modules/', 'UglifyJs');	
    var jsp = require('UglifyJs').parser;
    var pro = require('UglifyJs').uglify;

    //默认路径和默认路径下的package.json
    var baseUrl = __dirname;
    var manifest = '';

    //命令行的第一个参数默认为指定根目录
    //var directory = process.argv.splice(2)[0];

    //如果指令目录存在， 覆盖默认baseUrl 和 manifest
    if(fs.existsSync(directory) && fs.existsSync(directory + '/package.js')){
		baseUrl = directory;
		manifest = directory + '/package.js';
    }else{
		baseUrl += baseUrl + directory;
		manifest = baseUrl + '/package.js';
    }

    if(fs.existsSync(manifest)){
	    !fs.existsSync(dstDir + '/bin') && fs.mkdirSync(dstDir + '/bin');
	
		var buildEntireContent = '';
		var buildCSSEntireContent = '';
		var targetCSSFileName = dstDir + '/bin/sumeru.css';
		var offline_manifest = dstDir + '/bin/cache.manifest';
	
		var readPackage = function(path){
		    var url = path + '/package.js';
		    var entireContent = fs.readFileSync(url, 'utf-8');
		    var contentReg = /packages\s*\(\s*(.*)\s*\)/mg;
		    var dirnameList = [];
		    
		    //去掉换行符、换页符、回车符等
		    entireContent = entireContent.replace(/\n|\r|\t|\v|\f/g, '');
		    
		    //取出参数， 存于dirnameList
		    var result = contentReg.exec(entireContent);
		    entireContent = result[1];
		    entireContent = entireContent.replace(/'|"/mg, '');
		    dirnameList = entireContent.split(',');
		    
		    dirnameList.forEach(function(dirname){
				dirname = dirname.trim();
				if(!dirname)return;
				
				var reg = /.js$/g,
				cssReg = /.css$/g;
				
				var fileUrl = path + '/' + dirname;
				if(reg.test(dirname)){
				    buildEntireContent += ';'+fs.readFileSync(fileUrl, 'utf-8');
				}else if(cssReg.test(dirname)){
		            buildCSSEntireContent += fs.readFileSync(fileUrl, 'utf-8');
				}else{
				    readPackage(fileUrl);
				}
		    });
		}
		readPackage(directory);
		
		var debugPara = /var\s*SUMERU_APP_FW_DEBUG\s*=\s*true/ig;
		buildEntireContent = buildEntireContent.replace(debugPara, 'var SUMERU_APP_FW_DEBUG=false');
		
		fs.writeFileSync(targetCSSFileName, buildCSSEntireContent, 'utf8');

		var orig_code = buildEntireContent;

		var ast = jsp.parse(orig_code); // parse code and get the initial AST
		ast = pro.ast_mangle(ast); // get a new AST with mangled names
		ast = pro.ast_squeeze(ast); // get an AST with compression optimizations
		var final_code = pro.gen_code(ast); // compressed code here
		fs.writeFileSync(dstDir + '/bin/sumeru.js', final_code);


		//create manifest file
		var first_line_str = 'CACHE MANIFEST \n#version:'+Date.now() + '\n';
		var cache_title = 'CACHE:\n';

		//扫描view目录并列入缓存清单
		var baseViewDir = directory + '/view';
        var allFiles = [];
        var cacheViewStr = '';
		var readAllFileInView = function(bsvdir, httpBase){
			if(path.existsSync(bsvdir)){
	            var theDirFiles = fs.readdirSync(bsvdir);
	   			if(theDirFiles && theDirFiles.length > 0){
	                for(var i=0; i < theDirFiles.length; i++){
	                    if(theDirFiles[i].indexOf('.') > -1){
	                    	allFiles.push(httpBase + '/' + theDirFiles[i]);
	                    }else{
                            readAllFileInView(bsvdir + '/' + theDirFiles[i], httpBase + '/' + theDirFiles[i]);
	                    }
	                }
			    }
			}
		};
		readAllFileInView(baseViewDir,  typeof process.BAE != 'undefined' ? '../../view' : '../view');
        allFiles.forEach(function(cfile){
            cacheViewStr += cfile + '\n';
        });

        var cache_res_list = '../index.html\napp.css\n';
            cache_res_list += 'sumeru-min.js\n';
            cache_res_list += cacheViewStr;

        var network_title = 'NETWORK:\n';
        var network_res_list = '*'

        var cache_content_str = first_line_str + cache_title + cache_res_list + network_title + network_res_list;
        if(fs.existsSync(offline_manifest)){
        	fs.unlinkSync(offline_manifest);
        }
        fs.writeFileSync(offline_manifest, cache_content_str, 'utf8');
    }else{
	    console.log('Not specified directory.');
    }
}
