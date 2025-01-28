// app.js

require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser = require('body-parser');
const os = require('os');
var path = require('path')
var fs  = require('fs')

let platform = os.platform();
console.log("current platform:" + platform)

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var logRouter = require('./routes/log');
var com = require("./common/common")
var tool = require('./common/tool');
var omtobject = require("./common/omtobject")

var app = express();

console.log("__dirname:" + __dirname);

app.use(express.urlencoded({ limit: '50mb' }));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

var allowCrossDomain = function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-type,Content-Length,Authorization,Accept,X-Requested-Width");
  res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header("X-Powered-By", ' 3.2.1'); 
  if (req.method == "OPTIONS") { return res.end(); };
  next();
}
app.use(allowCrossDomain)

var allowCrossDomain1 = function (req, res, next) {
  res.header('Access-Control-Allow-Origin', 'http://localhost:'+com.port);
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
}
app.use(allowCrossDomain1)

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

//app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("mthing"));
app.use(express.static(path.join(__dirname, 'public/')));
app.use(express.static(path.join(__dirname, 'plugins/')));
app.use(express.static(path.join(__dirname, 'homes/')));
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/log', logRouter);

// plugin routers
var boostprojpath = "";
if (fs.existsSync('./boost.json'))
{
  var bostr = fs.readFileSync('./boost.json');
  var bops = JSON.parse(bostr);
  boostprojpath = './projects/' + bops.name + '/config.json';    
}
else
{
  boostprojpath = "./config.json"
}

console.log("boostprojpath:" + boostprojpath)

if (fs.existsSync(boostprojpath))
{
  var jpstr = fs.readFileSync(boostprojpath);
  var jps = JSON.parse(jpstr);
  com.catas = jps.catas;
  com.plugins = jps.plugins;
  com.system = jps.system;
  for (var i=0; i<jps.plugins.length; i++){
    var plg = jps.plugins[i];
    var pluginname = plg.name;
    var plugindir = plg.dir;
    var index = plg.index;

    var uselocalrouter = plg.uselocalrouter;
    if ("1" == uselocalrouter)
    {
      var routername = "/" + pluginname;
      var plg = require("./plugins/" + plugindir + "/index")
      app.use(routername, plg); 
    }
  }
}

tool.log("1", 
  "notice", 
  "", "", "", "",
  "", "", "", "",
  "system start",
  "系统启动");

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

function timerFunction() {
  com.managers.forEach(function (ele) {
    ele.update(0.1);
  });
}
setInterval(timerFunction, 100);

process.on('uncaughtException', function (err) {
  console.log(err);
  console.log(err.stack);
});

module.exports = app;