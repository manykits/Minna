// model.js

var mongoose = require("../../common/db");

var model = new mongoose.Schema({
    id:String,
    name: String,
    state: String,
    type:String, // ali, kouzi 
    key: String,
    user:String, // userid
    description: String,
});

model.statics.findNum = function (skip, num, callBack) {
    this.find().skip(skip).limit(num)
        .exec(callBack);
};

var modelexport = mongoose.model('model_airobot', model);
module.exports = modelexport;