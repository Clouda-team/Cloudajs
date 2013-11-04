var Crypto = require('crypto');

var encodeAes192 = function(data,secretKey,input_encoding,output_encoding){
    var encoder = Crypto.createCipher('aes192',secretKey);
    input_encoding = input_encoding || "utf8";
    output_encoding = output_encoding || "hex";
    var rs = encoder.update(data,input_encoding,output_encoding);
        rs += encoder.final(output_encoding);
    return rs;
};

var decodeAes192 = function(data,secretKey,input_encoding,output_encoding){
    var decoder = Crypto.createDecipher('aes192',secretKey);
    input_encoding = input_encoding || "hex";
    output_encoding = output_encoding || "utf8";
    var rs = decoder.update(data,input_encoding,output_encoding);
    rs += decoder.final(output_encoding);
    return rs;
};

var md5 = function(data){
    var encoder = Crypto.createHash('md5');
    encoder.update(data);
    return encoder.digest('hex');
};


var sha1 = function(){
    var sha1 = Crypto.createHash('sha1');
    var item = null;
    for(var i=0,len = arguments.length;i<len;i++){
        item = arguments[i] || "";
        // 统统转为字符串处理,如果没有toString方法,则认为是空字符串;
        sha1.update(item.toString?item.toString():"");
    }
    
    return  sha1.digest('hex');
};

module.exports = {
    encodeAes192:encodeAes192,
    decodeAes192:decodeAes192,
    md5:md5,
    sha1:sha1
};

//
//var secretKey = "qweryuxioq";
//
//rs = encoder('51f21378da2306cb41da1de0|abcdef|HUDEX729',secretKey);
//
//console.log(rs, decoder(rs,secretKey));

//try{
//    var key  = Date.now() + "";
//    var val = null;
//    console.log(val = encodeAes192('admin',key));
//    console.log(decodeAes192(val,key));
//}catch(e){
//    console.dir(e);
//}

console.log(sha1('asdf','asdf',1));