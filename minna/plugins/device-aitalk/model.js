// model.js

var mongoose = require("../../common/db");

var model = new mongoose.Schema({
    id:String,
    name: String,
    state: String,
    key: String,
    keygen:String,
    user:String, // userid
    airobotid:String, // airobotid
    ttsid:String, // ttsid
    workstate: String,//
    description: String,
});

model.statics.findNum = function (skip, num, callBack) {
    this.find().skip(skip).limit(num)
        .exec(callBack);
};

model.statics.findNumWithCondition = function (cond, skip, num, callBack) {
    this.find(cond).skip(skip).limit(num)
        .exec(callBack);
};

var modelexport = mongoose.model('model_device-aitalk', model);
module.exports = modelexport;