// index.js

var deviceType = "tts";
console.log(deviceType);

var express = require('express');
var request = require('request');
var url = require('url');
var model = require('./model');
var tool = require("../../common/tool");
const { ttsList } = require('./tts_list');

var router = express.Router();

function getNewID(deviceType) {
    return new Promise((resolve, reject) => {
        tool.getNewID(deviceType, function (ret, newID) {
            if (ret) {
                resolve({ ret, newID });
            } else {
                reject(new Error("Failed to get new ID"));
            }
        });
    });
}

async function addVoices() {
    for (const ele of ttsList) {
        try {
            const { ret, newID } = await getNewID(deviceType);
            if (ret) {
                const userf = new model({
                    id: newID,
                    name: ele.name,
                    state: 1,
                    voice_source: ele.voice_source,
                    voice_id: ele.voice_id,
                    languages: ele.languages.toString(),
                    voice_demo: ele.voice_demo,
                    description: ""
                });

                await userf.save();
                console.log("add voice suc!");
            }
        } catch (err) {
            console.error("Error adding user:", err);
        }
    }
}

model.find({}, function(err, vals){
    if (err){
      console.log(err);
    }
    else{
      if (0 == vals.length){
        console.log("num user is null, init a admin user!");
  
        addVoices();
      }
    }
});

router.use('/list', function (req, res, next) {
    console.log(deviceType + " list");

    var arg = url.parse(req.url, true).query;
    console.log(arg);

    var pageIndex = arg.page;
    if (pageIndex < 1) {
        pageIndex = 1;
    }
    var paginate = parseInt(arg.limit);

    model.countDocuments({}, function (err, totalDocs) {
        if (!err) {
            var skipDocs = (pageIndex - 1) * paginate;
            if (skipDocs >= totalDocs) {
                skipDocs = 0;
            }

            model.findNum(skipDocs, paginate, function (err, vals) {
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
                key:arg.key,
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
            voice_source: arg.edit_voice_source,
            voice_id: arg.edit_voice_id,
            languages: arg.edit_languages,
            voice_demo: arg.edit_voice_demo,
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

require('dotenv').config({path:'./plugins/tts/.env'});

// tts
const TtsServer = require('./tts_server');
const serverTTS = new TtsServer();
serverTTS.start();

// exist
process.on('SIGINT', () => {
    console.log('接收到 SIGINT，正在关闭服务器...');
    serverTTS.stop();
    process.exit();
  });
process.on('SIGTERM', () => {
    console.log('接收到 SIGTERM，正在关闭服务器...');
    serverTTS.stop();
    process.exit();
});


module.exports = router;