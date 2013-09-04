var path = require("path");
var fs = require("fs");
var assert = require("assert");

var equal = function( actual, expected, message ) {
    assert.equal(actual, expected);
};

describe('baeBuild', function() {
    var appBaeServerConfPath = path.join(__dirname,"../app/server_config/bae.js");
    var appBaeServerConfTemplate = path.join(__dirname,"../sumeru/build/baeConfig/bae.js.template");

    it('There is a file named app/server_config/bae.js', function(){
        equal(fs.existsSync(appBaeServerConfPath), true, "app/server_config/bae.js exist");
    });

    it('There is a file named sumeru/build/baeConfig/bae.js.template',function(){
        equal(fs.existsSync(appBaeServerConfTemplate), true, "app/server_config/bae.js exist");
    })

    var contentConf = fs.readFileSync(appBaeServerConfPath,'utf-8');
    var contentTemplate = fs.readFileSync(appBaeServerConfTemplate,'utf-8');
    contentTemplate = contentTemplate.replace(/\/\*\$[\w\W]*\$\*\/[\n\r]*/,"");
    it('The contents are same between app/server_config/bae.js and sumeru/build/baeConfig/bae.js.template',function(){
        equal(contentConf == contentTemplate, true);
    })
});