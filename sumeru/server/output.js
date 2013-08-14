var runnable =function(fw, getDbCollectionHandler,ObjectId){
    var output = fw.addSubPackage('output');
    var handlebars = require("handlebars");
    
    var render = function(template,data){
        var pageBuilder = handlebars.compile(template);
        return pageBuilder(data);
    }
    output.__reg('render', render, 'private');
}

if(typeof module !='undefined' && module.exports){
    module.exports = runnable;
}else{//这里是前端
    // runnable(sumeru);
}