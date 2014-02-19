/**
  *@fileoverview Build sumeru Javascript css and manifest file In this file，
  * and copy the built files to bin dir.
  *
  */
var sumeru = require(__dirname + '/../src/newPkg.js')();
require(__dirname + '/../src/log.js')(sumeru);
var _debug = false;

module.exports = function(sumeruDir, dstDir) {
  var fs = require('fs');
  var path = require('path');
  var UglifyJS = require('uglify-js');

  sumeruDir = path.join(sumeruDir, 'src');

  //默认路径和默认路径下的package.json
  var baseUrl = __dirname;
  var packagePath = path.join(sumeruDir, 'package.js');

  if (fs.existsSync(packagePath)) {
    var binDir = path.join(dstDir, 'bin');
    var buildEntireContent = '';
    var buildCSSEntireContent = '';
    var targetJsFileName = path.join(binDir, 'sumeru.js');
    var targetCSSFileName = path.join(binDir, 'sumeru.css');

    !fs.existsSync(binDir) && fs.mkdirSync(binDir);
  
    var readPackage = function(path) {
      var url = path + '/package.js';
      var entireContent = fs.readFileSync(url, 'utf-8');
      var contentReg = /packages\s*\(\s*(.*)\s*\)/mg;
      var commentReg = /\/\/.*(\n|\r)|(\/\*(.*?)\*\/)/mg;
      var dirnameList = [];
         
      //去掉在package.js里的注释
      entireContent = entireContent.replace(commentReg, '');  
      //去掉换行符、换页符、回车符等
      entireContent = entireContent.replace(/\n|\r|\t|\v|\f/g, '');
      //取出参数， 存于dirnameList
      var result = contentReg.exec(entireContent);
      if (result === null) {
           return;
      }
      entireContent = result[1];
      entireContent = entireContent.replace(/'|"/mg, '');
      dirnameList = entireContent.split(',');

      dirnameList.forEach(function(dirname) {
        dirname = dirname.trim();
        if (!dirname) {
          return;
        }

        var reg = /.js$/g,
        cssReg = /.css$/g;

        var fileUrl = path + '/' + dirname;
        if (reg.test(dirname)) {
          buildEntireContent += ';'+fs.readFileSync(fileUrl, 'utf-8');
        } else if (cssReg.test(dirname)) {
          buildCSSEntireContent += fs.readFileSync(fileUrl, 'utf-8');
        } else {
          readPackage(fileUrl);
        }
      });
    }
    //读取css and js 内容
    readPackage(sumeruDir);

    //关掉debug开关
    var debugReg = /var\s*SUMERU_APP_FW_DEBUG\s*=\s*true/ig;
    buildEntireContent = buildEntireContent.replace(debugReg,
      'var SUMERU_APP_FW_DEBUG=false');

    //压缩js代码
    var orig_code = buildEntireContent;
    var ast = UglifyJS.parse(orig_code); // parse code and get the initial AST
    var compressor = UglifyJS.Compressor({
        unused : false,
        warnings:false
    });
    ast.figure_out_scope();
    var compressed_ast = ast.transform(compressor);
    compressed_ast.figure_out_scope();
    compressed_ast.compute_char_frequency();
    compressed_ast.mangle_names(); // get a new AST with mangled names
    var final_code = compressed_ast.print_to_string(); // compressed code here


    // var final_code = UglifyJS.minify(orig_code, {
        // fromString : true
    // });
   
    //clean css
    var cleanCSS = require('clean-css');
    var packedCSS = new cleanCSS().minify(buildCSSEntireContent);
    

    //写入sumeru.js 和 sumeru.css文件
    fs.writeFileSync(targetCSSFileName, packedCSS, 'utf8');
    fs.writeFileSync(targetJsFileName, _debug?buildEntireContent:final_code, 'utf8');

  } else{
    sumeru.log('sumeru dir or sumeru package.js does not exist!');
  }
}