// users.js  

var deviceType = "users";
console.log(deviceType);

var express = require('express');
var router = express.Router();
var model = require('../model/user');
var com = require('../common/common');
var tool = require('../common/tool');
var redisClient = require('../common/redisclient');
var url = require('url');
var formidable = require('formidable');
var fs = require('fs');

var mailContent = require('../common/mailcontent'); 
var alicom = require('../common/alicommon');
var sendMail = require('../common/mail');

model.find({}, function(err, vals){
  if (err){
    console.log(err);
  }
  else{
    if (0 == vals.length){
      console.log("num user is null, init a admin user!");

      var pwd = tool.cryptPWD("admin", com.salt);
      tool.getNewID(deviceType, function (ret, newID) {
        if (ret) {
          var userf = new model({
            id: newID,
            username:"admin",
            nickname:"admin",
            realname:"admin",
            state:"1",
            password:pwd,
            adminlevel:"1"
          });

          userf.save(function(err){
            if (err){              
            }
            else{
              console.log("add new user suc!");
            }
          });
        }
      });
    }
  }
});

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.use('/add', function (req, res, next){
  console.log(deviceType + " add");

  var arg = url.parse(req.url, true).query;
  console.log(arg);

  var pwd = tool.cryptPWD("1234567890", com.salt);
  
  var data = new Date();
  var year = data.getFullYear();
  var month = data.getMonth()+1;
  var day = data.getDate();
  var hour = data.getHours();
  var minutes = data.getMinutes();
  var second = data.getSeconds();
  createtime=year+"."+month+"."+day+" "+hour+":"+minutes+":"+second;
  tool.getNewID(deviceType, function (ret, newID) {
    if (ret) {
      var userf = new model({
        id: newID,
        username:newID,
        nickname:arg.nickname,
        realname:arg.realname,
        phone:arg.phone,
        email:arg.email,
        sex:arg.sex,
        age:arg.age,
        description:arg.description,        
        state:"1",
        password:pwd,
        adminlevel:"0",
        groupids:"",
        createtime:createtime
      });

      userf.save(function(err){
        if (err){              
        }
        else{
          console.log("add new user suc!");

          res.json({
            "code": 0
            , "msg": "suc"
            , "data": {
            }
          });  
        }
      });
    }
  });
});

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

            model.findOne({ id: userid }, function (err, val) {
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
                            id: userid
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

                                console.log("totalDocs:" + totalDocs);
                                console.log("skipDocs:" + skipDocs);
                      
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
                                        console.log(vals);
                      
                                        var newVals = JSON.parse(JSON.stringify(vals));
                      
                                        console.log(newVals);
                      
                                        for (var i=0; i<newVals.length; i++)
                                        {
                                          var val = newVals[i];       
                                          var id = val.id;           
                                          var arr = [];
                                          var arrStr = arr.join(" ");
        
                                          val.deviceids = arrStr;
                                        }
                      
                                        var retVal = {
                                            "code": 0,
                                            "msg": "",
                                            "count": totalDocs,
                                            "data": newVals
                                        };
                                        res.json(retVal);
                                    }
                                });
                            }
                        }); 
                    }
                }
            })
        }
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
                  , "msg": "没有该用户"
                  , "data": {
                  }
              });
          }
      }
  });
});

router.use('/save', function (req, res, next) {
  console.log(deviceType + " save");

  var arg = url.parse(req.url, true).query
  console.log(arg);

  var pwdstr = arg.password;
  console.log("pwdstr:"+pwdstr);

  var jval = {
    nickname: arg.nickname,
    realname: arg.realname,
    phone: arg.phone,
    email:arg.email,  
    sex: arg.sex,
    age:arg.age,
    state: arg.state==null?null:1,
    groupids:arg.groupids, 
    description: arg.description,
    adminlevel:arg.adminlevel,
    createtime:arg.createtime,
  };

  if (pwdstr && ""!=pwdstr)
  {
    var pwd = tool.cryptPWD(pwdstr, com.salt);
    jval.password = pwd;
  }
 
  model.updateOne({ id: arg.id }, 
      jval, 
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

router.use('/regist', function (req, res, next) {
  console.log("regist");  
  var arg = url.parse(req.url, true).query
  console.log(arg);

  var vcode = arg.vercode;
  var pwd = arg.password;
  var nickn = arg.nickname;

  var cryptpwd = tool.cryptPWD(pwd, com.salt);

  var emPhone = arg.emailphone;
  console.log("emailPhone:" + emPhone);
  var isPhone = tool.isPhoneAvailable(emPhone);
  var isMail = tool.isMailAvailable(emPhone);
  console.log("isPhone:" + isPhone);
  console.log("isMail:" + isMail);

  var findVal = {};
  if (username && ""!=username)
  {
    findVal = {username:username};
  }
  else
  {
    if (isMail) {
      findVal = {email:emPhone};
    }
    else if (isPhone) {
      findVal = {phone:emPhone};
    }
    else{
      findVal = {username:emPhone};
    }
  }

  console.log("findVal:");
  console.log(findVal);

  model.find(findVal, function (err, val) {
    if (err) {
      console.log("user find error");
    }
    else{
      console.log(val);

      if (val.length >= 1)
      {
        if (0 == val[0].state) 
        {
          // check code
          console.log(val[0].vercode);

          if (vcode == val[0].vercode)
          {
            tool.getNewID(deviceType, function (ret, newID) {
              if (ret)
              {
                model.updateOne(findVal,
                  {
                    id: newID,
                    state: 1,
                    vercode: vcode,
                    password: cryptpwd,
                    nickname: nickn,
                    adminlevel: "0",

                    id_wechat: "",
                    id_qq: "",
                  },
                  { upsert: true },
                  function (err, updateVal)
                  {
                    if (err)
                    {
                    }
                    else
                    {
                      res.json({
                        "code": 0
                        , "msg": "注册成功"
                        , "data": {
                          "id": newID
                        }
                      });
                    }
                  });
              }
              else 
              {
                res.json({
                  "code": 4 // new id failed
                  , "msg": "注册id失败"
                  , "data": {
                  }
                });
              }
            });
          }
          else {
            res.json({
              "code": 2 // code not match
              , "msg": "注册失败，校验码不匹配"
              , "data": {
              }
            });
          }
        }
        else {
          res.json({
            "code": 3 // alreay registed
            , "msg": "注册失败，账号已经注册"
            , "data": {
              ret: 3
            }
          });
        }
      }
      else {
        res.json({
          "code": 1
            , "msg": "注册失败，账号未获取校验码"
            , "data": {
            }
        });
      }
    }
  });
});

router.use('/login', function (req, res, next) {
  console.log(deviceType + " login");

  var arg = url.parse(req.url, true).query
  console.log(arg);

  var mkid = arg.mkid;
  var mknickname = arg.mknickname;
  var ismkid = false;
  if (mkid && ""!=mkid)
  {
    ismkid = true;
  }

  var username = arg.username;
  var emPhone = arg.emailphone;
  var pwd = arg.password;

  console.log("emailPhone:" + emPhone);
  var isPhone = tool.isPhoneAvailable(emPhone);
  var isMail = tool.isMailAvailable(emPhone);
  console.log("isPhone:" + isPhone);
  console.log("isMail:" + isMail);

  if (ismkid)
  {
    pwd = "1234567890";
  }
  var cryptpwd = "";
  cryptpwd = tool.cryptPWD(pwd, com.salt);
  console.log("cryptpwd:"+cryptpwd);

  var findVal = {};
  if (mkid && ""!=mkid)
  {
    findVal = {mkid:mkid};
  }
  else
  {
    if (username && ""!=username)
    {
      findVal = {username:username};
    }
    else
    {
      if (isMail) {
        findVal = {email:emPhone};
      }
      else if (isPhone) {
        findVal = {phone:emPhone};
      }
      else{
        findVal = {username:emPhone};
      }
    }
  }

  console.log("findVal:");
  console.log(findVal);

  model.find(findVal, function (err, val) {
    if (err) {
      console.log("user find error");
    }
    else{
      console.log(val);

      if (val.length >= 1){
        if (1 == val[0].state) {
          console.log("---------------------------------");
          console.log(cryptpwd);

          if (cryptpwd == val[0].password){
            var id = val[0].id;
            var nickname = val[0].nickname;
            var username = val[0].username;

            var idmt = "minna_" + id;
            redisClient.get(idmt, function(err, v){
              if (err){
              }
              else
              {
                var acceToken = "";
                if (null == v){
                  acceToken = tool.randomString(20);
                  var obj = { id: id, password:cryptpwd, accesstoken:acceToken};

                  redisClient.set(acceToken, JSON.stringify(obj));
                  redisClient.set(idmt, JSON.stringify(obj));
                }
                else
                {
                  var jsonObj = JSON.parse(v);
                  acceToken = jsonObj.accesstoken;

                  redisClient.set(acceToken, v);
                }

                if (null != username)
                {
                  tool.log("0", 
                  "notice", 
                  "user", id, username, "login",
                  "", "", "", "",
                  "login from web",
                  "从网站登录");
                }
                else
                {
                  tool.log("0", 
                  "notice", 
                  "user", id, username, "login",
                  "", "", "", "",
                  "login from client",
                  "从客户端登录");
                }
  
                res.json({
                  'code': 0,
                  'msg': '登录成功',
                  'data': 
                  { 'nickname': nickname, 'access_token': acceToken, 'id': id, "username":username},
                });
              }
            });

            // 3600x24x7=604800‬
            //redisClient.expire(acceToken, 60);
          }
          else{
            res.json({
              "code": 1
                , "msg": "登入失败，密码不对"
                , "data": {
                }
            });
          }
        }
        else{
          res.json({
            "code": 1
              , "msg": "登入失败，账号已获取过校验码，但未注册"
                , "data": {
              }
          });
        }
      }
      else{
        if (ismkid)
        {
          var cryptpwd1 = tool.cryptPWD("1234567890", com.salt);
          tool.getNewID(deviceType, function (ret, newID) {
            if (ret) {
              var userf = new model({
                id: newID,
                username:newID,
                nickname:mknickname,
                realname:"",
                state:"1",
                password:cryptpwd1,
                adminlevel:"0",
                mkid:mkid,
              });
    
              userf.save(function(err){
                if (err){              
                }
                else{
                  var idmt = "minna_" + newID;

                  var acceToken = tool.randomString(20);
                  var obj = { id: newID, password:cryptpwd1, accesstoken:acceToken};
                  redisClient.set(acceToken, JSON.stringify(obj));
                  redisClient.set(idmt, JSON.stringify(obj));

                  res.json({
                    'code': 0,
                    'msg': '登录成功',
                    'data': 
                    { 'nickname': mknickname, 'access_token': acceToken, 'id': newID, "username":username},
                  });

                  console.log("add new user suc!");
                }
              });
            }
          });
        }
        else{
          res.json({
            "code": 1
              , "msg": "登入失败，账号不存在"
                , "data": {
              }
          });
        }
      }
    }
  });
});

router.use('/logout', function (req, res, next) {
  console.log(deviceType + " logout");

  var arg = url.parse(req.url, true).query
  console.log(arg);

  var omtk = decodeURIComponent(arg.MINNA_TOKEN);  
  redisClient.get(omtk, function(err, v){
    if (v)
    {
      var jsonObj = JSON.parse(v);
      var id = jsonObj.id;

      if (id)
      {
        var idmt = "minna_" + id;
        redisClient.del(idmt);
      }

      redisClient.del(omtk);

      tool.log("0", 
      "notice", 
      "user", id, "", "logout",
      "", "", "", "",
      "logout",
      "登出");

      res.json({
        "code": 0
        ,"msg": "退出成功"
        ,"data": null
      });
    }
    else
    {
      res.json({
        "code": 1
        ,"msg": "退出成功"
        ,"data": null
      });
    }
  });
});

router.use('/getme', function (req, res, next) {
  console.log(deviceType + " getme");

  var arg = url.parse(req.url, true).query
  console.log(arg);

  var omtk = decodeURIComponent(arg.MINNA_TOKEN); // assce_token
  redisClient.get(omtk, function (err, v) {
    if (err) {
      res.json({
        "code": 1
        , "msg": "请先登录"
        , "data": {
        }
      });
    }
    else {
      var vObj = JSON.parse(v);
      if (null != vObj){
        var id = vObj.id;
        model.find({id:id}, function (err, val) {
          if (err) {
          }
          else {
            if (val.length == 0) {
              res.json({
                  "code": 1
                  , "msg": "账号不存在"
                  , "data": {
                }
              });
            }
            else {
              res.json({
                "code": 0,
                "msg": "获取成功",
                data: val[0]
              });
              
            }
          }
        });
      }
    }
  });
});

router.use('/connectlogin', function (req, res, next) {
  console.log(deviceType + " connectlogin");

  var arg = url.parse(req.url, true).query
  console.log(arg);

  var token = arg.MINNA_TOKEN;
  var devid = arg.deviceid;

  var omtk = decodeURIComponent(arg.MINNA_TOKEN); // assce_token
  redisClient.get(omtk, function (err, v) {
    if (err) {
      console.log("redisClient.get( error");

      res.json({
        "code": 1
        , "msg": "请先登录"
        , "data": {
        }
      });
    }
    else {
      console.log(v);

      var vObj = JSON.parse(v);
      if (null != vObj){
        var id = vObj.id;
        model.find({id:id}, function (err, val) {
          if (err) {
            console.log(err);
          }
          else {
            if (val.length == 0) {
              console.log("connectlogin 账号不存在");

              res.json({
                  "code": 1
                  , "msg": "账号不存在"
                  , "data": {
                }
              });
            }
            else {
              // set things
              console.log("connectlogin set things-------------------------------");
              console.log(typeof(devid));
              console.log(com.things);

              var th = com.things.get(devid);
              if (null == th)
              {
                console.log("null == th");

                th = {
                  id : devid,
                  deviceid : devid,
                  token : token,
                  userid : id,
                  ip4 : "",
                  servername:"",
                }
                com.things.set(devid, th);
              }
              else
              {
                th.token = token;
                th.userid = id;
              }

              // set user token things
              var tokthingarr = com.useridthings.get(id)
              if (null == tokthingarr){
                tokthingarr = [];
              }     

              var th1 = {};
              th1.token = token;
              th1.deviceid = devid;
              th1.userid = id;
              th1.id = devid; // deviceid
              th1.ip4 = th.ip4; 
              th1.jinweiheight = "";
              th1.jin = "";
              th1.wei = "";
              th1.height = "";
              th1.ring_heart = "";
              th1.ring_tempenv = "";
              th1.ring_temptibiao = "";
              th1.ring_temp = "";
              th1.ring_step = "";
              th1.ring_dist = "";
              th1.ring_ka = "";
              th1.ringinfo = "";

              tool.arrayAddUpdate(tokthingarr, th1)
              com.useridthings.set(id, tokthingarr)

              console.log("set things over")

              res.json({
                "code": 0,
                "msg": "获取成功",
                data: val[0]
              });              
            }
          }
        });
      }
      else
      {
        console.log("var vObj = JSON.parse(v) error");

        res.json({
            "code": 1
            , "msg": "账号不存在"
            , "data": {
          }
        });
      }
    }
  });
});

router.use('/saveme', function (req, res, next) {
  console.log(deviceType + " save");
  var arg = url.parse(req.url, true).query
  console.log(arg);
  
  var omtk = decodeURIComponent(arg.MINNA_TOKEN); // assce_token
  redisClient.get(omtk, function (err, v) {
    if (err) {
      res.json({
        "code": 1
        , "msg": "请先登录"
        , "data": {
        }
      });
    }
    else {
      var vObj = JSON.parse(v);
      var id = vObj.id;

      if (id && "" != id) {
        model.updateOne({ id: id },
          {
            nickname: arg.nickname,
            head: arg.head,
            description: arg.description,
            sex: arg.sex,
            groupids:arg.groupids,         
          },
          { upsert: true },
          function (err, updateVal) {
            if (err) {
            }
            else {
              res.json({
                "code": 0
                , "msg": "更新成功"
                , "data": {
                }
              });
            }
          });
      }
      else {
        res.json({
          "code": 1
          , "msg": "请先登录"
          , "data": {
          }
        });
      }
    }
  });
});
router.use('/edit', function (req, res, next) {
  console.log(deviceType + " edit");
  var arg = url.parse(req.url, true).query
  console.log(arg);    
  model.updateOne({ id: arg.id }, 
      {
          username:arg.username,
          nickname: arg.nickname,
          realname: arg.realname,
          phone: arg.phone,
          email:arg.email, 
          sex: arg.sex,
          age:arg.age,
          state: arg.state==null?null:1,
          groupids:arg.groupids,
          description: arg.description,
          adminlevel:arg.adminlevel,
          createtime:arg.createtime,
           
                  
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
router.use('/uploadhead', function (req, res, next){
  console.log(deviceType + " uploadhead");

  var arg = url.parse(req.url, true).query;
  var omtk = arg.token;
  
  console.log("token:" + omtk);

  var form = new formidable.IncomingForm(), files = [], fields = [], docs = [];
  var savedPath = "";
  var savedPathFull = '';
  var filename = "";
  var extName = "";
  var urlPath = "";

  form.uploadDir = "public/uploads/head/";

  form.on('field', function (field, value) {
    fields.push([field, value]);
  }).on('file', function (field, file) {
    files.push([field, file]);
    docs.push(file);

    var types = file.name.split('.');
    var date = new Date();
    var ms = Date.parse(date);

    extName = types;
    filename = file.name;

    savedPath = ms + '_' + file.name;
    savedPathFull = "public/uploads/head/" + savedPath;
    urlPath = "uploads/head/" + savedPath;

    fs.renameSync(file.path, savedPathFull);
  }).on('end', function () {
    redisClient.get(omtk, function (err, v) {
      if (err) {
        res.json({
          "code": 1
          , "msg": "请先登录"
          , "data": {
          }
        });
      }
      else {
        var vObj = JSON.parse(v);
        var id = vObj.id;

        model.updateOne(
          { id: id },
          {
            head: urlPath,
          },
          { upsert: true },
          function (err, updateVal) {
            if (err) {
            }
            else {
              res.json({
                "code": 0
                , "msg": "上传成功"
                , "url": urlPath
                , "data": {
                }
              });
            }
        });
      }
    });
  });
  form.parse(req, function (err, fields, files) {
    err && console.log('formidabel error : ' + err);
    console.log('parsing done');
  });

});

router.use('/setpassword', function (req, res, next) {
  console.log(deviceType + " setpassword");

  var arg = url.parse(req.url, true).query
  console.log(arg);

  var omtk = decodeURIComponent(arg.MINNA_TOKEN);
  if (omtk && ""!=omtk)
  {
    console.log("omtk");
    console.log(omtk);

    var cryptpwdold = tool.cryptPWD(arg.oldpassword, com.salt);
    var cryptpwd = tool.cryptPWD(arg.password, com.salt);
  
    redisClient.get(omtk, function(err, v){
      if (err)
      {
      }
      else{
        var obj = JSON.parse(v);
        var id = obj.id;

        model.find({ id: id }, function (err, val) {
          if (err) {
            console.log("model find error");
          }
          else {
            if (val.length >= 1) {
              if (val[0].password == cryptpwdold) {
                model.updateOne({ id: id },
                  {
                    password: cryptpwd
                  },
                  { upsert: true },
                  function (err, updateVal) {
                    if (err) {
                    }
                    else {
                      res.json({
                        "code": 0
                        , "msg": "更新成功"
                        , "data": {
                        }
                      });
                    }
                });
              }
              else {
                res.json({
                  "code": 1
                  , "msg": "密码不对"
                  , "data": {
                  }
                });
              }
            }
          }
        });
      }
    });
  }
  else
  {
    console.log("请先登录");

    res.json({
      "code": 2
      , "msg": "请先登录"
      , "data": {
      }
    });
  }
});

router.use('/checkpassword', function(req, res, next) {
  console.log(deviceType + " checkpassword");

  var arg = url.parse(req.url, true).query;
  var pwd = arg.password;
  var cryptpwd = tool.cryptPWD(pwd, com.salt);

  var omtk = decodeURIComponent(arg.MINNA_TOKEN); // assce_token
  redisClient.get(omtk, function (err, v) {
    if (err) {
      res.json({
        "code": 1
        , "msg": "请先登录"
        , "data": {
        }
      });
    }
    else {
      var vObj = JSON.parse(v);
      var id = vObj.id;

      model.find({id:id}, function (err, val) {
        if (err) {
        }
        else {
          if (val.length == 0) {
            res.json(
              {
                "code": 1
                , "msg": "账号不存在"
                , "data": {
                }
              });
          }
          else {
            if (cryptpwd == val[0].password){
                res.json({
                  'code': 0,
                  'msg': '验证成功',
                  'data': 
                    {},
                });
            }
            else{
              res.json({
                "code": 1
                  , "msg": "验证失败，密码不对"
                  , "data": {
                  }
              });
            }
          }
        }
      });
    }
  });
});

var registSend = 0;
var registAlready = 10;
router.use('/sendEmailPhoneCode', function (req, res, next) {
  console.log("sendEmailPhoneCode");
  var arg = url.parse(req.url, true).query
  console.log(arg);

  var emPhone = arg.emailphone;
  console.log("emailPhone:" + emPhone);
  var isPhone = tool.isPhoneAvailable(emPhone);
  var isMail = tool.isMailAvailable(emPhone);
  console.log("isPhone:" + isPhone);
  console.log("isMail:" + isMail);

  var findVal = {};
  if (isMail) {
    findVal = { email: emPhone }
  }
  else if (isPhone) {
    findVal = { phone: emPhone }
  }

  console.log("findVal:");
  console.log(findVal);

  model.find(findVal, function (err, val) {
    if (err) {
      console.log("user find error");
    }
    else {
      let code = tool.randomString(6, '0123456789');
      console.log(code);

      if (val.length >= 1) 
      {
        var usr = val[0];
        if (0 == usr.state) {
          // updateOne for new code
          model.updateOne(findVal,
            {
              vercode: code,
            },
            { upsert: true },
            function (err, updateVal) {
              if (err) {
              }
              else {
                if (isMail){
                  mailContent.codeEmail(code, (mailCnt) => {
                    sendMail(emPhone, 'Welcome!', mailCnt);
                    
                    console.log("send new mail code");

                    res.json({
                      "code": 0
                      , "msg": "发送成功"
                      , "data": {
                        "value": registSend
                      }
                    });
                  });
                }
                else if (isPhone){
                  alicom.requestPhoneCode(emPhone, "SMS_179905215", code, function (err, result) {
                    if (err) {
                      res.json({
                        "code": 0
                        , "msg": "发送失败"
                        , "data": {
                          "value": registSend
                        }
                      });

                    } 
                    else
                    {
                      console.log("send new phone code");

                      res.json({
                        "code": 0
                        , "msg": "发送成功"
                        , "data": {
                          "value": registSend
                        }
                      });
                    }
                  });
                };
              }
            });
        }
        else {
          res.json({
            "code": 0
            , "msg": "已注册"
            , "data": {
              "value": registAlready
            }
          });
        }
      }
      else 
      {
        console.log("not has user:" + emPhone);

        var usr = null;        
        if (isMail)
        {
          usr = new model({
            email: emPhone,
            state: 0,
            vercode: code,
            createdtime:tool.localtimeStr(),
            createtimedate:tool.localDate(),
          });
        }
        else if (isPhone)
        {
          usr = new model({
            phone: emPhone,
            state: 0,
            vercode: code,
            createdtime:tool.localtimeStr(),
            createtimedate:tool.localDate(),
          })
        }
        
        usr.save(function (err) 
        {
          if (err) {
          } else {
            if (isMail) {
              mailContent.codeEmail(code, (mailCnt) => {
                sendMail(emPhone, 'Welcome!', mailCnt);

                console.log("send new mail code");

                res.json({
                  "code": 0
                  , "msg": "发送成功"
                  , "data": {
                    "value": registSend
                  }
                });
              });
            }
            else if (isPhone) {
              alicom.requestPhoneCode(emPhone, "SMS_179905215", code, function (err, result) {
                if (err) {
                  res.json({
                    "code": 0
                    , "msg": "发送失败"
                    , "data": {
                      "value": registSend
                    }
                  });

                } else {
                  console.log("send new phone code");

                  res.json({
                    "code": 0
                    , "msg": "发送成功"
                    , "data": {
                      "value": registSend
                    }
                  });
                }
              });
            };
          }
        });
      }
    }
  });
});

router.use('/sendEmailPhoneCodeForget', function (req, res, next) {
  console.log("sendEmailPhoneCodeForget");

  var arg = url.parse(req.url, true).query
  console.log(arg);

  var emPhone = arg.emailphone;
  console.log("emailPhone:" + emPhone);
  var isPhone = tool.isPhoneAvailable(emPhone);
  var isMail = tool.isMailAvailable(emPhone);
  console.log("isPhone:" + isPhone);
  console.log("isMail:" + isMail);

  var findVal = {};
  if (isMail) {
    findVal = { email: emPhone }
  }
  else if (isPhone) {
    findVal = { phone: emPhone }
  }

  console.log("findVal:");
  console.log(findVal);

  model.find(findVal, function (err, val) {
    if (err) {
      console.log("sendEmailPhoneCodeForget error");
    }
    else {
      let code = tool.randomString(6, '0123456789');
      console.log(code);

      if (val.length >= 1)
      {
        var usr = val[0];
        if (0 != usr.state) 
        {
          // updateOne for new code
          model.updateOne(findVal,
            {
              vercode: code,
            },
            { upsert: true },
            function (err, updateVal) {
              if (err) {
              }
              else {
                if (isMail) {
                  mailContent.codeEmail(code, (mailCnt) => {
                    sendMail(emPhone, 'Your code', mailCnt);

                    console.log("send new mail code");

                    res.json({
                      "code": 0
                      , "msg": "发送成功"
                      , "data": {
                        "value": registSend
                      }
                    });
                  });
                }
                else if (isPhone) {
                  alicom.requestPhoneCode(emPhone, "SMS_179905218", code, function (err, result) {
                    if (err) {
                      res.json({
                        "code": 0
                        , "msg": "发送失败"
                        , "data": {
                          "value": registSend
                        }
                      });

                    } else {
                      console.log("send new phone code");

                      res.json({
                        "code": 0
                        , "msg": "发送成功"
                        , "data": {
                          "value": registSend
                        }
                      });
                    }
                  });
                };
              }
            });
        }
        else {
          res.json({
            "code": 0
            , "msg": "该用户未注册成功"
            , "data": {
              "value": registAlready
            }
          });
        }
      }
      else {
        res.json({
          "code": 0
          , "msg": "该用户还未注册"
          , "data": {
            "value": registSend
          }
        });
      }
    }
  });
});

module.exports = router;
