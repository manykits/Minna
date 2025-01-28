// index.js

var deviceType = "device-aitalk";
console.log(deviceType);

var express = require('express');
var request = require('request');
var url = require('url');
var model = require('./model');
var tool = require("../../common/tool");
var redisClient = require('../../common/redisclient');
var modelUser = require('../../model/user');

var router = express.Router();

router.use('/list', function (req, res, next) {
    console.log(deviceType + " list");

    var arg = url.parse(req.url, true).query;
    console.log(arg);

    var omtk = req.body.access_token;
    if (!omtk) {
        console.log("body omtk empty");
        var arg = url.parse(req.url, true).query;
        omtk = arg.MINNA_TOKEN;
    }
    if (!omtk || ""==omtk){
        omtk = arg.token;
        console.log("token:" + omtk);
    }   

    console.log("omtk:" + omtk);

    redisClient.get(omtk, function (err, v) {
        if (err) {
        }
        else {
            var vObj = JSON.parse(v);
            if (null == vObj) {
              res.json({
                  "code": 1
                  , "msg": "没有登录"
                  , "data": {
                  }
              });
            }
            else {
                var userid = vObj.id;

                modelUser.findOne({ id: userid }, function (err, val) {
                    if (err) {
                        res.json({
                            "code": 1
                        , "msg": "请先登录"
                        , "data": {
                            }
                        });
                    }
                    else{
                        if (val) {
                            var adminlevel = val.adminlevel;

                            console.log("adminlevelllllllllllllllllllllllllll:" + adminlevel);
                        
                            var findVal = {};
                            if (adminlevel == 1) {
                              findVal = {};
                            }
                            else {
                              findVal = {
                                user: userid
                              };
                            }

                            var pageIndex = arg.page;
                            if (pageIndex < 1) {
                                pageIndex = 1;
                            }
                            var paginate = parseInt(arg.limit);

                            model.countDocuments(findVal, function (err, totalDocs) {
                                if (!err) {
                                    var skipDocs = (pageIndex - 1) * paginate;
                                    if (skipDocs >= totalDocs) {
                                        skipDocs = 0;
                                    }
                        
                                    model.findNumWithCondition(findVal, skipDocs, paginate, function (err, vals) {
                                        if (err) {
                                            console.log(deviceType + " list error:" + err);
                                            res.json({
                                                errorNo: 1,
                                                results:
                                                {
                                                    data: {}
                                                }
                                            });
                                        }
                                        else {
                                            console.log(deviceType + " list suc");
                        
                                            var retVal = {
                                                "code": 0,
                                                "msg": "",
                                                "count": totalDocs,
                                                "data": vals
                                            };
                                            res.json(retVal);
                                        }
                                    });
                                }
                            });
                        }
                    }
                });
            }
        }
    });
});

router.use('/regist', function (req, res, next){
    console.log(deviceType + " regist");
    
    var arg = url.parse(req.url, true).query;
    console.log(arg);

    var omtk = req.body.access_token;
    if (!omtk) {
        console.log("body omtk empty");
        var arg = url.parse(req.url, true).query;
        omtk = arg.MINNA_TOKEN;
    }
    if (!omtk || ""==omtk){
        omtk = arg.token;
        console.log("token:" + omtk);
    }    

    redisClient.get(omtk, function (err, v) {
        if (err) {
        }
        else {
            var vObj = JSON.parse(v);
            if (null == vObj) {
              res.json({
                  "code": 1
                  , "msg": "没有登录"
                  , "data": {
                  }
              });
            }
            else {
                var userid = vObj.id;

                model.findOne({keygen:arg.keygen}, function (err, val) {
                    if (err) {
                        res.json({
                            "code": 1
                          , "msg": "regist failed!"
                          , "data": {
                            }
                        });
                    }
                    else{
                        if (val){
                            model.updateOne({keygen:arg.keygen},
                            {
                                name:arg.name,
                                user: userid,
                            },
                            function (err, newVal) {
                                if (err) {
                                    res.json({
                                        "code": 1
                                        , "msg": "regist failed!"
                                        , "data": {
                                        }
                                    });
                                }
                                else{
                                    res.json({
                                        "code": 0
                                        , "msg": "regist suc!"
                                        , "data": {
                                        }
                                    });
                                }
                            });
                        }
                        else{
                            res.json({
                                "code": 1
                                , "msg": deviceType + " 没有发现设备"
                                , "data": {
                                }
                            });
                        }
                    } 
                });
            }
        }
    });
});

router.use('/add', function (req, res, next){
    console.log(deviceType + " add");
    
    var arg = url.parse(req.url, true).query;
    console.log(arg);

    tool.getNewID(deviceType, function (ret, newID) {
        if (ret) {
            var dev = new model({
                id: newID,
                name:arg.name,
                state: arg.state==null?null:1,
                description:arg.description
            });
            dev.save(function (err) {
               if (err){                                       
               } 
               else{
                   res.json({
                       "code": 0
                       , "msg": "suc"
                       , "data": {
                       }
                   });        
               }
            });
        }
        else{
            res.json({
                "code": 1
                , "msg": deviceType + " newid failed"
                , "data": {
                }
            });
        }
    });
});

router.use('/save', function (req, res, next) {
    console.log(deviceType + " save");
    var arg = url.parse(req.url, true).query
    console.log(arg);

    model.updateOne({ id: arg.edit_id }, 
        {
            name: arg.edit_name,
            state: arg.edit_state==null?null:1,
            key: arg.edit_key,
            user:arg.edit_user,
            airobotid:arg.edit_airobotid,
            ttsid:arg.edit_ttsid,
            description: arg.edit_description
        }, 
        function (err, newVal) {
            if (err) {
                res.json({
                    "code": 1
                    , "msg": "update failed!"
                    , "data": {
                    }
                });
            }
            else {
                res.json({
                    "code": 0
                    , "msg": "update suc!"
                    , "data": newVal
                });
        }
    });

});

router.use('/delete', function (req, res, next) {
    console.log(deviceType + " delete");
    var arg = url.parse(req.url, true).query
    console.log(arg);

    var idsArrayStr = arg.ids;
    console.log("idsArrayStr");
    console.log(idsArrayStr);
    var idsArrayStr1 = idsArrayStr.substr(1, idsArrayStr.length-2);
    var idsArrayStr2 = idsArrayStr1.replace(/"/g, "");
    console.log("idsArrayStr2");
    console.log(idsArrayStr2);
    var idsArray0 = idsArrayStr2.split(",");
    console.log(idsArray0);
    var idsArray1 = [];
    for (var i=0; i<idsArray0.length; i++){
        var idsStr = idsArray0[i];
        idsArray1.push(parseInt(idsStr));
    }
    console.log(idsArray1);

    model.remove({ id: { $in: idsArray1 } }, function (err, newVal) {
        if (err){
            res.json({
                "code": 1
                , "msg": "delete failed!"
                , "data": {
                }
            });
        }
        else{
            res.json({
                "code": 0
                , "msg": "delete suc!"
                , "data": {
                }
            });
        }                            
    });
});

router.use('/get', function (req, res, next) {
    console.log(deviceType + " get");
    var arg = url.parse(req.url, true).query
    console.log(arg);

    var id = arg.id;
    model.findOne({ id: id }, function (err, val) {
        if (err) {
            res.json({
                "code": 1
                , "msg": "请先登录"
                , "data": {
                }
            });
        }
        else {
            if (val) {
                res.json({
                    "code": 0
                    , "msg": "suc"
                    , "data": val
                });
            }
            else {
                res.json({
                    "code": 1
                    , "msg": "没有该设备"
                    , "data": {
                    }
                });
            }
        }
    });
});

require('dotenv').config({path:'./plugins/device-aitalk/.env'});

// asr
const AsrServer = require('./asr_server');
const serverAsr = new AsrServer();
serverAsr.start();

// exist
process.on('SIGINT', () => {
    console.log('接收到 SIGINT，正在关闭服务器...');
    serverAsr.stop();
    process.exit();
  });
process.on('SIGTERM', () => {
    console.log('接收到 SIGTERM，正在关闭服务器...');
    serverAsr.stop();
    process.exit();
});

module.exports = router;