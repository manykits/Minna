// common.js
 
var events = require('events');
const { env } = require('process');

module.exports = {
    managers:new Map(),
    tcpservers:new Map(),
    catas:new Array(),
    plugins:new Array(),
    system:{},
    ip:process.env.MINNA_URL,
	port:process.env.MINNA_PORT,
    salt:process.env.MINNA_SALT,
    groupjsons:new Map(),
    things:new Map(),
    useridthings:new Map(),
    globals:new Map(),
    config:new Map(),
    eventEmitter : new events.EventEmitter(),
}