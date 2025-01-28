var express = require('express');
var router = express.Router();
var url = require('url');
var com = require('../common/common');
var formidable = require('formidable');
var fs = require('fs');
var path = require('path')

module.exports = router;

router.use('/getplugins', function (req, res, next){
    console.log("index getplugins");

    var arg = url.parse(req.url, true).query
    console.log(arg);
    console.log(req.url);
    console.log(req.body);

    var retVal = {
        "code": 0,
        "msg": "",
        "data": com.plugins
    };
    res.json(retVal);
});

router.use('/getcatas', function (req, res, next){
    console.log("index getcatas");

    var arg = url.parse(req.url, true).query
    console.log(arg);
    console.log(req.url);

    var retVal = {
        "code": 0,
        "msg": "",
        "data": com.catas
    };
    res.json(retVal);
});

router.use('/getsystem', function (req, res, next){
    console.log("index getsystem");

    var arg = url.parse(req.url, true).query
    console.log(arg);
    console.log(req.url);

    var retVal = {
        "code": 0,
        "msg": "",
        "data": com.system
    };
    res.json(retVal);
});