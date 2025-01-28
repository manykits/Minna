// user.js

var mongoose = require("../common/db");

var model = new mongoose.Schema({
    id:String,
    username:String,
    nickname:String,
    realname:String,
    phone:String,
    email:String,
    vercode:String,
    password:String,
    sex:String,
    age:String,
    state:String, //0 emailcode, 1 registed 2 realpersoned 3 forbideen
    description:String,
    head:String,
    facepath0:String,
    facepath1:String,
    facepath2:String,
    carnums:String,
    groupids:String,
    adminlevel: String, //"0"noraml, "1"admin,

    id_wechat:String,
    id_wechat_manykits:String, //manykits openid
    id_qq:String,

    createtime:String,
    createtimedate: { type: Date },

    mkid:String,
});

model.statics.findNum = function (skip, num, callBack) {
    this.find().skip(skip).limit(num)
        .exec(callBack);
};

model.statics.findNumWithCondition = function (cond, skip, num, callBack) {
    this.find(cond).skip(skip).limit(num)
        .exec(callBack);
};

var modelexport = mongoose.model('model_user', model);
module.exports = modelexport;