var redis = require('redis');

var portRedist = process.env.MINNA_REDIS_PORT
var client = redis.createClient(portRedist, 'localhost', {auth_pass:""});
client.on('ready', function(res){
    console.log("redis ready.");

    client.set('redis_minna','HELLO_MINNA');
    client.get('redis_minna',function (err,v) {
        if (err){
            console.log("redis get testredis err:" + err);
        }
        else{
            console.log("redis get testredis suc, value:" + v);
        }
    });
});
module.exports = client;