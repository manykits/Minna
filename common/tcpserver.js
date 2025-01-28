// tcpserver.js

var net = require("net");
require("date-utils");
var tool = require("./tool")
var com = require("./common")

TCPServer = module.exports = function () {
    var self = this;

    self.name = "TCPServer";
    self.server = null;
    self.clients = null;
    self.heartDisconnectTime = 5.0;
    self.updateHeartRemoveTime = 0.0;
    self.statusMap = new Map();
    self.heartMap = new Map();
    self.callbacks = new Array();

    TCPServer.prototype.initialize = function (port, na) {
        var self = this;
        self.name = na;
        self.server = net.createServer();
        self.clients = new Map();
        
        com.tcpservers.set(na, this);

        self.server.on('connection', function (socket) {
            console.log('new connection');

            var localTimeSeconds = tool.getSecondsFrom1970();

            var ip4 = tool.ip4(socket.remoteAddress);

            const buf = Buffer.allocUnsafe(2048);
            buf.fill(0);
            var cnt = {
                skt: socket,
                tagToRemove:false,
                recvLength: 0,
                recvBuf: buf,
                time: localTimeSeconds,
                deviceType: 0, //0 none, 1device, 2phone
                useruin:"",
                key: "",
                ip4:ip4
            };
            self.clients.set(socket, cnt);
            console.log("clients size:");
            console.log(self.clients.size);

            console.log("socket.remoteAddress:"+socket.remoteAddress);
            console.log("socket.remoteAddress:"+ip4);

            socket.on('close', function () {
                console.log('connection closed');

                var client = self.clients.get(socket);
                if (client){
                    client.tagToRemove = true;
                }
            });
            socket.on('data', function (data) {
                var dtLength = data.length;

                var client = self.clients.get(socket);
                if (client && dtLength > 0) {
                    data.copy(client.recvBuf, client.recvLength);
                    client.recvLength += dtLength;

                    // process
                    const buf = Buffer.allocUnsafe(2048);
                    buf.fill(0);
                    var cmdBufStr = buf;
                    var cmdIndex = 0;
                    var allProcLength = 0;
                    for (var i = 0; i < client.recvLength; i++) {
                        var char = client.recvBuf[i];
                        if (10 == char) { // '\n'
                            cmdIndex++;
                            allProcLength += cmdIndex;

                            var msgStr = cmdBufStr.toString("ascii", 0, cmdIndex - 1);
                            var msgStr1 = msgStr;
                            cmdIndex = 0;

                            var cmds = msgStr.split("&");
                            var cmdStr = "";
                            var paramStr = "";
                            var paramStr1 = "";
                            var paramStr2 = "";
                            var paramStr3 = "";
                            var paramStr4 = "";
                            var paramStr5 = "";

                            if (cmds.length > 0)
                                cmdStr = cmds[0];
                            if (cmds.length > 1)
                                paramStr = cmds[1];
                            if (cmds.length > 2)
                                paramStr1 = cmds[2];
                            if (cmds.length > 3)
                                paramStr2 = cmds[3];
                            if (cmds.length > 4)
                                paramStr3 = cmds[4];
                            if (cmds.length > 5)
                                paramStr4 = cmds[5];
                            if (cmds.length > 6)
                                paramStr5 = cmds[6];

                            if ("h" == cmdStr) { // heart   
                                //console.log("recved heart");
                                
                                var localTimeSeconds = tool.getSecondsFrom1970();
                                var diff = localTimeSeconds - client.time;
                                if (diff > self.heartDisconnectTime) {
                                    // is lost
                                    console.log("heart lost");
                                }
                                else {
                                    var ky = client.key;
                                    var val = {
                                        "key": ky,
                                        "heart": "h"
                                    };
                                    self.heartMap.set(ky, val);

                                    client.time = localTimeSeconds;
                                    socket.write("h\n", function () {
                                    });

                                    //console.log("send back heart");
                                }
                            }
                            else if ("m" == cmdStr) {
                                    if (client.deviceType == 1) {  
                                    }
                                    else if (client.deviceType == 2) {
                                        var dCs = self.findClientsWithKey(paramStr1, 1);
                                        if (dCs) {
                                            self.serverWriteToClients(dCs, msgStr + "\n");
                                        }
                                    }
                            }
                            else if ("t" == cmdStr) {
                                console.log("t:"+msgStr)
                                
                                var key = paramStr1;
                                var useruin = paramStr2;

                                client.key = key
                                client.useruin = useruin
                                
                                var th = com.things.get(key);
                                if (null == th)
                                {
                                    th = {
                                        id : key,
                                        deviceid : key,
                                        token : "",
                                        userid : useruin,
                                        ip4 : client.ip4,
                                        servername:self.name,
                                    }
                                    com.things.set(key, th);
                                }
                                else
                                {
                                    th.userid = useruin;
                                    th.ip4 = client.ip4;
                                    th.servername = self.name;
                                }

                                console.log("client.ip4------------------------");
                                console.log(client.ip4);

                                // connected device type
                                if ("1" == paramStr) {
                                    // device
                                    client.deviceType = 1;          
                                    
                                    self.resetDeviceConnect(client);

                                    console.log("setdevice 1 connected");
                                    console.log("key:" + paramStr1);
                                }
                                else if ("2" == paramStr) {
                                    // phone
                                    client.deviceType = 2;

                                    self.resetDeviceConnect(client);

                                    console.log("setdevice 2 connected");
                                    console.log("key:" + paramStr1);
                                }
                            }
                            else if ("d" == cmdStr)
                            {
                                msgStr1 = msgStr1.substr(2, msgStr1.length - 2);
                                self.runCallbacks(client, "d", msgStr1);
                            }
                            else if ("ar" == cmdStr){
                                self.setDeviceState(client, paramStr, paramStr1);
                            }
                        }
                        else {
                            cmdBufStr[cmdIndex] = char;
                            cmdIndex++;
                        }
                    }
                    client.recvLength -= allProcLength;
                }
            });
        });
        self.server.on('error', function (err) {
            console.log('Server error:', err.message);
        });
        self.server.on('close', function () {
            console.log('Server closed');
            self.clients = null;
        });

        self.server.listen(port);

        console.log("TCPServer initialized");
    }

    TCPServer.prototype.doClientDisconnect = function (client) {
        console.log("doClientDisconnect");
        var self = this;

        if (client) {
            self.statusMap.delete(client.key);
            self.heartMap.delete(client.key);

            // remove global objs
            var deviceid = client.key;
            com.things.delete(deviceid);        
            
            var usrid = client.useruin;
            if (null!=usrid && ""!=usrid)
            {
                var tokthingarr = com.useridthings.get(usrid);
                if (null != tokthingarr)
                {
                    var newArr = tool.arrayRemove(tokthingarr, deviceid)
                    com.useridthings.set(usrid, newArr)
                }
            }

            if (client.skt)
                client.skt.destroy();
 
            self.resetDeviceDisconnect(client);
        }
    }

    TCPServer.prototype.findClientsWithKey = function (key, type) {
        var self = this;

        var k = key;

        var clients = [];
        self.clients.forEach(function (e) {
            if (e.key === k && e.deviceType == type) {
                clients.push(e);
            }
        });

        return clients;
    }

    TCPServer.prototype.serverWriteToClients = function (cls, dataStr) {
        cls.forEach(function (e) {
            var socket = e.skt;
            socket.write(dataStr, function () {
            });
        });
    }

    TCPServer.prototype.serverWriteToAll = function (dataStr) {
        var self = this;

        self.clients.forEach(function (e) {
            var socket = e.skt;
            socket.write(dataStr, function () {
            });
        });
    }

    // type 0 none, 1device, 2phone
    TCPServer.prototype.serverWriteToKey = function (key, type, dataStr) {
        var self = this;
        var dCs = self.findClientsWithKey(key, type);
        if (dCs) {
            self.serverWriteToClients(dCs, dataStr);
        }
    }

    TCPServer.prototype.update = function (elapsedSeconds) {
        var self = this;

        self.updateHeartRemoveTime += elapsedSeconds;
        if (self.updateHeartRemoveTime > 1.0) {
            var localTimeSeconds = tool.getSecondsFrom1970();

            var newClientsMap = new Map();
            self.clients.forEach(function (client) {
                var diff = localTimeSeconds - client.time;
                if (diff > self.heartDisconnectTime || client.tagToRemove ) {
                    self.doClientDisconnect(client);
                }
                else {
                    newClientsMap.set(client.skt, client)
                }
            });
            self.clients = newClientsMap;
            self.updateHeartRemoveTime = 0.0;
        }
    }

    TCPServer.prototype.setDeviceState = function (client, index, state) {
        var self = this;

        if (client.key && 1 == client.deviceType) {
            self.runCallbacks(client, "setdevicestate", "");
        }
    };

    TCPServer.prototype.resetDeviceConnect = function(client){
        var self = this;

        if (client.key) {
            // set client state
            self.runCallbacks(client, "resetdeviceconnect", "");
        }        
    };

    TCPServer.prototype.resetDeviceDisconnect = function(client){
        var self = this;

        if (client.key) {
            self.runCallbacks(client, "resetdevicedisconnect", "");
        }   
    };

    TCPServer.prototype.addCallback = function(callback)
    {
        var self = this;
        self.callbacks.push(callback);
    };

    TCPServer.prototype.runCallbacks = function(client, msg, msg1)
    {
        var self = this;
        for (var i=0; i<self.callbacks.length; i++){
            var cb = self.callbacks[i];
            cb(client, msg, msg1);
        }
    }
}
