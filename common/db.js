// db.js

var mongoose = require('mongoose');
var url = "mongodb://mthing:minna1314@localhost:27017/mthing?authSource=admin"
mongoose.connect(url,{ useNewUrlParser: true , useUnifiedTopology: true}, function(err, db) {
    if (err){
        console.log("mongodb connect failed!");
    }
    else{
        console.log("mongodb connect suc");
    }
});
module.exports = mongoose;