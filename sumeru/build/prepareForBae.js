/**
 *   build for bae config, mongodb issue and git empty dir issue.
 */

(function (){
    var path = require('path');
    var fs = require('fs');
    var exec = require('child_process').exec;
    var sumeru = require(__dirname + '/../src/newPkg.js')();
    require(__dirname + '/../src/log.js')(sumeru);

    var baseDir = path.join(__dirname, '../../');
    var baeConfDir = path.join(__dirname,'baeConfig');
    var baeDir = path.join(baseDir,'__bae__');
    var mongodbDir = path.join(baseDir,'node_modules/mongodb');
    var nodeModulesDir = path.join(baseDir,'node_modules');

    var baeServerConfigPath = path.join(baseDir,'app/server_config/bae.js');
    var args = process.argv.slice(2);

    var isUseGit = function() {
        if('git' == args[0]) {
            return true;
        }

        gitPath = path.join(baseDir,'../.git');
        return fs.existsSync(gitPath);
    }

    var isUseSvn = function() {
        if('svn' == args[0]) {
            return true;
        }

        gitPath = path.join(baseDir,'../.svn');
        return fs.existsSync(gitPath);
    }

    /**
     * 测试 git/svn 是否可用
     */
    var testEnv = function() {
        var shellTest = "";
        if(isUseGit()) {
            shellTest = 'git help';
        } else if(isUseSvn()) {
            shellTest = 'svn help';
        } else {
            sumeru.log("error: Please input git or svn as the first argument of this script");
            process.exit();
        }

        var isError = false;
        testShellHandler = exec(shellTest);
        testShellHandler.stderr.on('data', function (data) {
            isError = true;
            sumeru.log(data);
        });

        testShellHandler.on('close', function (code) {
            if(!isError) {
                startBuild();
            }
        });
    }

    /**
     * 替换bae config 中的dbname 和 site_url
     */
    var dealDbnameAndSiteUrl = function() {
        if(!args[1]) {
            sumeru.log("error: Please input db name as the second argument of this script");
            process.exit();
        }
        if(!args[2]) {
            sumeru.log("error: Please input site url name as the third argument of this script\nFor example:\n    Your app site url is: http://test.duapp.com/\n    you need to input: test\n");
            process.exit();
        }
        var dbname = args[1];
        var site_url_templ = "http://{site_url_prefix}.duapp.com/";
        var site_url = site_url_templ.replace(/{site_url_prefix}/,args[2]);

        var baeConfigTemplatePath  = path.join(baeConfDir,'/bae.js.template');
        var content = fs.readFileSync(baeConfigTemplatePath,'utf-8');
        //delete note
        content = content.replace(/\/\*\$[\w\W]*\$\*\//,"");
        //replace dbname
        content = content.replace(/dbname\s*:\s*'.*'/g, 'dbname : "' + dbname + '"' );
        //replace site_url
        content = content.replace(/site_url\s*:\s*'.*'/g, 'site_url : "' + site_url + '"');
        fs.writeFileSync(baeServerConfigPath, content);
    }

    /**
     * 将mongodb从版本库移除，并加入忽略列表
     */
    var dealMongodb = function() {

        var dealGitMogodb = function() {
            var mongodbIgnoreFilePath = path.join(nodeModulesDir,'.gitignore');
            shellRm = "git rm -r --cached " + mongodbDir;
            sumeru.log(shellRm);
            exec(shellRm);

            if(checkAddGitignoreFile()) {
                fs.appendFileSync(mongodbIgnoreFilePath, "\nmongodb");
            }

                //whether add mongodb into .gitignore or not
            function checkAddGitignoreFile() {
                if(!fs.existsSync(mongodbIgnoreFilePath)) {
                    return true;
                }

                var content = fs.readFileSync(mongodbIgnoreFilePath,'utf-8');
                mongondbRegEx = /([\n\r]+|^)+mongodb([\n\r]+|$)/;
                isNotFind = -1 == content.search(mongondbRegEx);

                return isNotFind ;
            }

        };

        var dealSvnMongodb = function() {
            var shellDel = "svn del --keep-local " + mongodbDir;
            sumeru.log(shellDel);
            exec(shellDel).on('close',function(code){
                nodeModulesDir = "node_modules";
                var shellGetIgnore = "svn propget svn:ignore " + nodeModulesDir;
                var shellSetIgnore = "svn propset svn:ignore \"{fileNames}\" " + nodeModulesDir;
                var shellHandler = exec(shellGetIgnore);
                var allData = '';
                shellHandler.stdout.on('data', function (data) {
                    allData += data;
                });
                shellHandler.stderr.on('data', function (data) {
                    sumeru.log("-----",data);
                });
                shellHandler.on('close', function (code) {
                    ignoreFileArrTemp= allData.split("\n");
                    ignoreFileArr = [];
                    for(var i=0;i < ignoreFileArrTemp.length;i++) {
                        if('' == ignoreFileArrTemp[i]) {
                            continue;
                        }
                        ignoreFileArr.push(ignoreFileArrTemp[i]);
                    }
                    if(-1 ==ignoreFileArr.indexOf("mongodb")){
                        ignoreFileArr.push("mongodb");
                    }

                    shellSetIgnore = shellSetIgnore.replace("{fileNames}",ignoreFileArr.join("\n"));
                    sumeru.log(shellSetIgnore);
                    exec(shellSetIgnore).stderr.on('data', function (data) {
                        sumeru.log("error: a svn issue can lead to build failure for bae, please fix it by manual and retry to run this script\n",data);
                        process.exit();
                    });
                });
            });
        }

        if(isUseGit()) {
            dealGitMogodb();
        } else if(isUseSvn()){
            dealSvnMongodb();
        } else {
            sumeru.log("error: Please input git or svn as the first argument of this script");
            process.exit();
        }

    }

    var startBuild = function() {
        dealDbnameAndSiteUrl();
        dealMongodb();
    }

    testEnv();

})();