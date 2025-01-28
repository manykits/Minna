// log.js  

var deviceType = "log";
console.log(deviceType);

var express = require('express');
var router = express.Router();
var model = require('../model/logrec');
var url = require('url');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
  console.log("-----------------------------");
});

router.use('/list', function (req, res, next) {
  console.log(deviceType + " list");

  //console.log("-----------------------------");
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

router.use('/get', function (req, res, next) {
    console.log(deviceType + " get");
    var arg = url.parse(req.url, true).query
    console.log(arg);
  
    var id = arg.id;
    model.findOne({ id: id }, function (err, val) {
        if (err) {
            res.json({
                "code": 1
                , "msg": "查找失败"
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

router.use('/edit', function (req, res, next) {
    console.log(deviceType + " edit");
    var arg = url.parse(req.url, true).query
    console.log(arg);    
    model.updateOne({ id: arg.id }, 
        {
        
        createtime:createtime,
        system:arg.system,
        type:arg.type,
        fromtype:arg.fromtype,
        fromid:arg.fromid,
        fromname:arg.fromname,
        frominfo:arg.frominfo,
        totype:arg.totype,
        toname:arg.toname,        
        toid:arg.toid,
        toinfo:arg.toinfo,
        info:arg.info,
        infochinesearg:arg.infochinesearg     
             
                    
        }, 
        function (err, newVal)
        {
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
                    , "data": {
                    }
                });
            }
        });
  
});

module.exports = router;
