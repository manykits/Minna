// model.js

var mongoose = require("../../common/db");

var model = new mongoose.Schema({
    id:String,
    name: String,
    state: String,
    voice_source: String,
    voice_id:String,
    languages:String,
    voice_demo:String,
    description: String,
});

model.statics.findNum = function (skip, num, callBack) {
    this.find().skip(skip).limit(num)
        .exec(callBack);
};

var modelexport = mongoose.model('model_tts', model);
module.exports = modelexport;