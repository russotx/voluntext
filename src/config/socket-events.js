const EventEmitter = require('events')
class MyEmitter extends EventEmitter {}

let wsEvents = new MyEmitter() 



exports.wsEvents = wsEvents

