// logrec.js

var mongoose = require("../common/db");

var model = new mongoose.Schema({
    id:String,
    createtime:String,    
    system:String, // 为空表不是系统，是系统填1
    type:String, // notice, warning, error 

    fromtype:String, // 触发这类型，user，people，device
    fromid:String, // 触发者
    fromname:String, // 触发者名称
    frominfo:String,
    
    totype:String, // 
    toid:String,
    toname:String,
    toinfo:String,

    info:String,
    infochinese:String,    
});

model.statics.findNum = function (skip, num, callBack) {
    this.find().skip(skip).limit(num)
        .exec(callBack);
};

var modelexport = mongoose.model('model_logrec', model);
module.exports = modelexport;