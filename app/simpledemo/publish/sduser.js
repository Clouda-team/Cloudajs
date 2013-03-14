module.exports = function(fw){
    fw.publish('sduser', 'pub-sduser', function(callback){
    	console.log(1111111);
    	console.log(collection);
        var collection = this;
        collection.find({}, {sort : {'age' : -1}}, function(err, items){
            callback(items);
        });
    }, function(){
        console.log('publish end');
    });
}