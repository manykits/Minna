// tool.js

var moment = require('moment');
var lastid = require('./lastid');
var fs = require('fs');
var wk = require('walk');
var http = require('http');
var crypto = require('crypto');
var fs = require('fs');
var stat = fs.stat;
var model = require('../model/logrec');
require("date-utils");
var request = require("request");
const exp = require('constants');

moment.locale('zh-cn');

function randomString(len, charSet) {
    charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var randomString = '';
    for (var i = 0; i < len; i++) {
        var randomPoz = Math.floor(Math.random() * charSet.length);
        randomString += charSet.substring(randomPoz, randomPoz + 1);
    }
    return randomString;
}

function removeEmojis(text) 
{
  // 正则表达式去除emoji字符
  // [^\u4e00-\u9fa5a-zA-Z0-9，。！？]匹配所有非中文字符、非英文字符、非数字字符和常用标点符号
  return text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9，。！？]/g, '');
}

function encryptInt(inputInt, length = 6) {
    const timestamp = Date.now();  // 加入时间戳确保不同时间生成不同结果
    const randomValue = Math.random();  // 随机数
    const inputString = inputInt.toString();

    const hash = crypto.createHash('sha256');
    hash.update(inputString + timestamp.toString() + randomValue.toString());

    // 截取更长的哈希值，减少碰撞的概率
    const encryptedValue = parseInt(hash.digest('hex').slice(0, 8), 16);

    // 如果加密后的值超过最大值 999999，则取模确保位数
    let finalValue = encryptedValue % (10 ** length);

    // 如果结果小于目标位数的最小值，则补齐前导零
    const finalString = finalValue.toString().padStart(length, '0');

    return finalString;
}


function parseDate(timeStr){
    var dt0 = Date.parse(timeStr, "yyyy-MM-dd HH:mm:ss");
    var dt00 = new Date(dt0).addSeconds(8 * 60 * 60);
    return dt00;
}

function parseDateRange(trange){
    var tArray = trange.split(" - ");
    var t0;
    var t1;
    var dt0;
    var dt00;
    var dt1;
    var dt11;
    if (tArray.length >= 2){
        t0 = tArray[0];
        t1 = tArray[1];

        var argTimeSeconds = 8 * 60 * 60;
        dt0 = Date.parse(t0, "yyyy-MM-dd HH:mm:ss");
        dt00 = new Date(dt0).addSeconds(argTimeSeconds);
        dt1 = Date.parse(t1, "yyyy-MM-dd HH:mm:ss");
        dt11 = new Date(dt1).addSeconds(argTimeSeconds);
    }

    var ret = [];
    ret.push(t0);
    ret.push(dt00);
    ret.push(t1);
    ret.push(dt11);

    return ret;
}

function localDate(){
    var lt = new Date();
    var date1 = lt.addSeconds(8 * 60 * 60);
    return date1;
}

function isOutDate(dateFrom, dateTo){
    var tFrom = dateFrom.getTime();
    var tTo = dateTo.getTime();
    var tNow = localDate().getTime();

    if (tFrom <= tNow && tNow <= tTo) {
        return false;
    }
    else{
        return true;
    }
}

function localtimeStr(fromtime, addSec) {
    var p = (s) => {
        return s < 10 ? "0" + s : s;
    }
    var date;
    if (fromtime) {
        date = new Date(fromtime);
        if (addSec) {
            date = date.addSeconds(addSec);
        }
    } else {
        date = new Date();
        if (addSec) {
            date = date.addSeconds(addSec);
        }
    }
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    var day = date.getDate();
    var hour = date.getHours();
    var minute = date.getMinutes();
    var second = date.getSeconds();
    var time = year + '-' + month + '-' + day + ' ' + p(hour) + ':' + p(minute) + ':' + p(second);
    return time;
}

function localtimeStrForFile(fromtime, addSec) {
    var p = (s) => {
        return s < 10 ? "0" + s : s;
    }
    var date;
    if (fromtime) {
        date = new Date(fromtime);
        if (addSec) {
            date = date.addSeconds(addSec);
        }
    } else {
        date = new Date();
        if (addSec) {
            date = date.addSeconds(addSec);
        }
    }
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    var day = date.getDate();
    var hour = date.getHours();
    var minute = date.getMinutes();
    var second = date.getSeconds();

    var time = year + '_' + month + '_' + day + '_' + p(hour) + '_' + p(minute) + '_' + p(second);
    return time;
}

function getUnixTime(str) {
    try {
        if (str) {
            var d = new Date(str);
        } else {
            var d = new Date();
        }
        return d.getTime();

    } catch (error) {
        var d = new Date();
        return d.getTime();
    }
}

function secondTo1970(){
    var lt = new Date();
    var localTimeSeconds = new Date(1970, 0, 1).getSecondsBetween(lt);
    localTimeSeconds = localTimeSeconds - 8 * 60 * 60;
    return localTimeSeconds;
}

function milliSecondsTo1970() {
    return getUnixTime();
}

function gensccode() {
    return randomString(10);
}

function formatDate(date, friendly) {
    date = moment(date);
    if (friendly) {
        return date.fromNow();
    } else {
        return date.format('YYYY-MM-DD HH:mm');
    }
}

function validateId(str) {
    return (/^[a-zA-Z0-9\-_]+$/i).test(str);
}

// type 0 people, 1project, 2devicegroup, 3device, 4log, 5qrcode, 6door request, 7doorsys mgr, 8 group
function getNewID(type, callBack, usrdata0, usrdata1, usrdata2, usrdata3) {
    var ud0 = usrdata0;
    var ud1 = usrdata1;
    var ud2 = usrdata2;
    var ud3 = usrdata3;

    var idStr = type;

    lastid.find({ id: idStr }, function (err, info) {
        if (err) {
            callBack(false, 0, ud0, ud1, ud2, ud3);
        }
        else {
            var idVal = 0;
            if (info.length > 0) {
                idVal = info[0].lastid;
                idVal = idVal + 1;

                lastid.updateOne({ id: idStr }, { lastid: idVal }, { upsert: true }, function (err, updateVal) {
                    if (err) {
                        callBack(false, 0, ud0, ud1, ud2, ud3);
                    }
                    else {
                        callBack(true, idVal, ud0, ud1, ud2, ud3);
                    }
                });
            }
            else {
                var lstid = 10000;
                if ("pnight_actor"==idStr)
                {
                    lstid = 20000;
                }
                var newid = new lastid({
                    id: idStr,
                    lastid: lstid
                });

                newid.save(function (err) {
                    if (err) {
                    }
                    else {
                        callBack(true, lstid, ud0, ud1, ud2, ud3);
                    }
                });
            }
        }
    });
}

function getdirlist(src) {
    var paths = fs.readdirSync(src);
    return paths;
}

function getSecondsFrom1970() {
    var lt = new Date();
    var localTimeSeconds = new Date(1970, 0, 1).getSecondsBetween(lt);
    return localTimeSeconds;
}

function isPhoneAvailable(number) {
    var phoneReg = /^1[3-578]\d{9}$/;
    if (phoneReg.test(number)) {
        return true;
    } else {
        return false;
    }
}

function isMailAvailable(mail) {
    var mailReg = /^(\w-*\.*)+@(\w-?)+(\.\w{2,})+$/;
    if (mailReg.test(mail)) {
        return true;
    } else {
        return false;
    }
}

function getFileList(path, callback) {
    var names = [];
    var files = [], dirs = [];

    var walker = wk.walk(path, { followLinks: false });

    walker.on('file', function (root, stat, next) {
        names.push(stat.name);

        var r = root.substr(7);
        var rr = r.replace("/\\", "/");
        var rrr = rr.replace("\\", "/");

        files.push(rrr + '/' + stat.name);

        next();
    });
    walker.on('directory', function (root, stat, next) {
        var r = root.substr(6);
        var rr = r.replace("/\\", "/");
        var rrr = rr.replace("\\", "/");

        dirs.push(rrr + '/' + stat.name);

        next();
    });
    walker.on('end', function () {
        if (callback) {
            callback(names, files, dirs);
        }
    });
}

function strToArrayWithChara(str, c) {
    var array = new Array();
    if (str && "" != str) {
        var idArrayTemp = str.split(c);
        for (var i = 0; i < idArrayTemp.length; i++) {
            if (idArrayTemp[i] && "" != idArrayTemp[i]) {
                array.push(parseInt(idArrayTemp[i]));
            }
        }
    }
    return array;
}

function removeid(beforeidsstr, removeid) {
    var rid = parseInt(removeid);
    var idArray = strToArrayWithChara(beforeidsstr, ',');
    var idx = idArray.indexOf(rid);
    if (-1!=idx){
        idArray.splice(idx, 1);
    }
    return arrayToStrWithChara(idArray, ',');
}
function addid(beforeidsstr, addid) {
    var iaddid = parseInt(addid);

    var idArray = [];
    if (beforeidsstr && "" != beforeidsstr)
    {
        idArray = strToArrayWithChara(beforeidsstr, ',');

        console.log(idArray)

        var idx = idArray.indexOf(iaddid);
        if (-1==idx){
            console.log("-1==idx");
            
            idArray.push(iaddid);
        }
    }
    else
    {
        idArray.push(iaddid);
    }
    return arrayToStrWithChara(idArray, ',');
}

function arrayHave(arr, id) 
{
    for (var i=0; i<arr.length; i++)
    {     
        if (id == arr[i].id){
            return true;
        }
    }

    return false;
}

function arrayHave1(arr, id) 
{
    for (var i=0; i<arr.length; i++)
    {     
        if (id == arr[i]){
            return true;
        }
    }

    return false;
}

function arrayAddUpdate(arr, item) 
{
    for (var i=0; i<arr.length; i++)
    {     
        if (item.id == arr[i].id){
            arr[i] = item;
            return;
        }
    }
    arr.push(item)
}

function arrayRemove(arr, id)
{
    var arrNew = [];
    for (var i=0; i<arr.length; i++)
    {     
        if (id == arr[i].id)
        {
        }
        else
        {
            arrNew.push(arr[i]);
        }
    }

    return arrNew;
}

function arrayToStrWithChara(array, c) {
    var lastStr = "";
    if (array.length > 0) {
        lastStr += array[0];
    }
    for (var i = 1; i < array.length; i++) {
        lastStr += c + array[i];
    }
    return lastStr;
}

function minusDiffArray(mgrids, mgridsKeep) {
    var array = [];
    for (var i = 0; i < mgrids.length; i++) {
        if (mgridsKeep.indexOf(mgrids[i]) == -1)
            array.push(mgrids[i]);
    }
    return array;
}

function httpGet(url, pt, pth, callback)
{
    var options = {  
        host: url,  
        port: pt,  
        path: pth,  
        method: 'GET'  
    };  

    var req = http.request(options, function(res) {
        //console.log("res");
        //console.log(res);

        var _data='';
        res.on('data', function(chunk){
                _data += chunk;
        });
        res.on('end', function(){
            if (callback)
            {
                callback(null, _data);
            }
        });
    });
    req.on('error', function (e) {  
        console.log('problem with request: ' + e.message);  

        callback(e, "");
    });
    req.end();
}

function httpRequestForm(url, formdata, callback)
{
    var options = {
        method: 'POST',
        url: url,
        headers:
        {
            'cache-control': 'no-cache',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        form:formdata
    };

    request(options, function (error, response, body) {
        if (error) {
            if (callback)
                callback(error);
        }
        else {
            //console.log(response);
            //console.log("body");
            //console.log(body);

            if (callback)
                callback(null, body);
        }
    });
}

const Bytes2HexString = (b)=> {
    var hexs = "";
    for (var i = 0; i < b.length; i++) {
        var hex = (b[i]).toString(16);
        if (hex.length === 1) {
            hex = '0' + hex;
        }
        hexs += hex.toUpperCase();
    }
    return hexs;
}

const HexString2btye = (str)=> {
    var pos = 0;
    var len = str.length;
    if (len % 2 != 0) {
        return null;
    }
    len /= 2;
    var hexA = new Array();
    for (var i = 0; i < len; i++) {
        var s = str.substr(pos, 2);
        var v = parseInt(s, 16);
        hexA.push(v);
        pos += 2;
    }
    return hexA;
}

var retStr = "";
function getAddress(jsons, id, parentName) {
    for(var key in jsons) {
        var num = jsons[key];
        if (id == parseInt(num))
        {
            // console.log(parentName);
            // console.log(key);
            // console.log(id);

            if ("items" != parentName)
            {
                console.log(parentName);
                retStr = parentName;
                return parentName;
            }
            else
            {
                console.log(key);
                retStr = key;
                return key;
            }
        }
        else{
            if(jsons[key] instanceof Object)
            {
                getAddress(jsons[key], id, key); 
            }
        }
    }
}

function getRetStr(){
    return retStr;
}

function copy(src, dst){
    fs.readdir( src, function( err, paths ){
        if( err ){
            throw err;
        }
  
        paths.forEach(function( path ){
            var _src = src + '/' + path,
                _dst = dst + '/' + path,
                readable, writable;      
  
            stat( _src, function( err, st ){
                if( err ){
                    throw err;
                }
  
                // 判断是否为文件
                if( st.isFile() ){
                    // 创建读取流
                    readable = fs.createReadStream( _src );
                    // 创建写入流
                    writable = fs.createWriteStream( _dst ); 
                    // 通过管道来传输流
                    readable.pipe( writable );
                }
                // 如果是目录则递归调用自身
                else if( st.isDirectory() ){
                    exists( _src, _dst, copy );
                }
            });
        });
    });
};

function exists( src, dst, callback ){
    fs.access( dst, function( ex ){
        if( ex ){
            callback( src, dst );
        }
        else{
            fs.mkdir( dst, function(){
                callback( src, dst );
            });
        }
    });
};

function cryptPWD(password, salt) {
    var saltPassword = password + ':' + salt;
  
    var md5 = crypto.createHash('md5');
    var result = md5.update(saltPassword).digest('hex');
    return result;
};
function getitem (ele, sbid){
   
    if (!ele)
        return null;
    if (ele.id == sbid)
        return ele;
    if(!ele.children)
       return null;  
    for (var i=0; i<ele.children.length; i++)
    {
        var e = ele.children[i];        
        var ret = getitem(e, sbid);
        if (null != ret)
            return ret;       
    }
    return null;
};

function getitembyname (ele, name){
   
    if (!ele)
        return null;

    if (ele.title == name)
        return ele;

    if(!ele.children)
       return null;  
    for (var i=0; i<ele.children.length; i++)
    {
        var e = ele.children[i];        
        var ret = getitembyname(e, name);
        if (null != ret)
            return ret;       
    }
    return null;
};

function isSub(ele, sbid)
{
    if (!ele)
        return false;
    
    if (ele.id == sbid)
        return true;
    if(!ele.children)
        return false;  
    for (var i=0; i<ele.children.length; i++)
    {
        var e = ele.children[i];
        var ret = isSub(e, sbid);
        if (ret)
            return true;
    }
    return false;
};

function md5Crypto(buffer)
{
    var md5 = crypto.createHash('md5');
    var result = md5.update(buffer).digest('hex');
    
    return result;
};

function log(system,
    type,
    fromtype,fromid,fromname,frominfo,
    totype,toid,toname,toinfo,
    info,infochinese){
  var data = new Date();
  var year = data.getFullYear();
  var month = data.getMonth()+1;
  var day = data.getDate();
  var hour = data.getHours();
  var minutes = data.getMinutes();
  var second = data.getSeconds();
  var deviceType="log";
  createtime=year+"-"+month+"-"+day+" "+hour+":"+minutes+":"+second;
  getNewID(deviceType, function (ret, newID) {
    if (ret) {
      var userf = new model({
        id: newID,
        createtime:createtime,
        system:system,
        type:type,
        fromtype:fromtype,
        fromid:fromid,
        fromname:fromname,
        frominfo:frominfo,
        totype:totype,
        toid:toid,
        toname:toname,
        toinfo:toinfo,
        info:info,
        infochinese:infochinese
      });

      userf.save(function(err){
        if (err){              
        }
        else{
          console.log("add new log suc!");
        }
      });
    }
  });
};

function ip4(ipStr)
{
    if (ipStr.substr(0, 7) == "::ffff:") {
        ipStr = ipStr.substr(7)
    }

    return ipStr
};

var EARTH_RADIUS = 6378.137; //地球半径  
//将用角度表示的角转换为近似相等的用弧度表示的角 java Math.toRadians  
function rad(d) {
    return d * Math.PI / 180.0;
}
/** 
 * 谷歌地图计算两个坐标点的距离 
 * @param lng1  经度1 
 * @param lat1  纬度1 
 * @param lng2  经度2 
 * @param lat2  纬度2 
 * @return 距离（千米） 
 */
function lngLatDistance(lng1, lat1, lng2, lat2) {
    var radLat1 = rad(lat1);
    var radLat2 = rad(lat2);
    var a = radLat1 - radLat2;
    var b = rad(lng1) - rad(lng2);
    var s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2)
        + Math.cos(radLat1) * Math.cos(radLat2)
        * Math.pow(Math.sin(b / 2), 2)));
    s = s * EARTH_RADIUS;
    s = Math.round(s * 10000) / 10000;
    return s;
}

function loadImageBase64(filePath) {
    var self = this;
    var allPath = filePath;

    var data = fs.readFileSync(allPath);
    var base64str = Buffer.from(data, 'binary').toString('base64'); 
    return base64str;
}

exports.removeEmojis = removeEmojis;
exports.randomString = randomString;
exports.encryptInt = encryptInt;
exports.gensccode = gensccode;
exports.parseDateRange = parseDateRange;
exports.localtimeStr = localtimeStr;
exports.localtimeStrForFile = localtimeStrForFile;
exports.localDate = localDate;
exports.isOutDate = isOutDate;
exports.parseDate = parseDate;
exports.formatDate = formatDate;
exports.validateId = validateId;
exports.getNewID = getNewID;
exports.getdirlist = getdirlist;
exports.getSecondsFrom1970 = getSecondsFrom1970;
exports.isPhoneAvailable = isPhoneAvailable;
exports.isMailAvailable = isMailAvailable;
exports.getFileList = getFileList;
exports.strToArrayWithChara = strToArrayWithChara;
exports.arrayToStrWithChara = arrayToStrWithChara;
exports.minusDiffArray = minusDiffArray;
exports.removeid = removeid;
exports.addid = addid;
exports.httpGet = httpGet;
exports.httpRequestForm = httpRequestForm;
exports.Bytes2HexString = Bytes2HexString;
exports.HexString2btye = HexString2btye;
exports.getAddress = getAddress;
exports.getRetStr = getRetStr;
exports.getUnixTime = getUnixTime;
exports.secondTo1970 = secondTo1970;
exports.milliSecondsTo1970 = milliSecondsTo1970;
exports.copy = copy;
exports.cryptPWD = cryptPWD;
exports.getitem = getitem;
exports.getitembyname = getitembyname;
exports.isSub = isSub;
exports.log = log;
exports.ip4 = ip4;
exports.arrayHave = arrayHave;
exports.arrayHave1 = arrayHave1;
exports.arrayAddUpdate = arrayAddUpdate;
exports.arrayRemove = arrayRemove;
exports.lngLatDistance = lngLatDistance;
exports.md5Crypto = md5Crypto;
exports.loadImageBase64 = loadImageBase64;