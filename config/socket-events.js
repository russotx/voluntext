const EventEmitter = require('events')
class MyEmitter extends EventEmitter {}

//let socketEmitter = new MyEmitter()
let wsEvents = new MyEmitter() 

module.exports = {
  /* socketEmitter : socketEmitter, */
  wsEvents : wsEvents
}

