// lastid.js

var mongoose = require('./db');

var model = new mongoose.Schema({
    id:String, // default "1000"
    lastid:Number // init 1000
});

var lastid = mongoose.model('model_lastid', model);
module.exports = lastid;