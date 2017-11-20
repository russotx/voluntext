/*
*
*       CREATE THE WEBSOCKET SERVER & FUNCTIONS
*
*/
const WebSocket = require('ws')
/* import the session parser shared with the Express app */
const sessionParser = require('./config/sessions-config')
/* import the Node http server */
const httpServer = require('./server')

/**
 * a function to validate data to send over websocket 
 * ensuring everything is sent as a string  
 * @param {Object} data - data to send to client via websocket
 * 
*/
WebSocket.prototype.sendValidData = function(data) {
  if (typeof data === 'function') {
    return false
  }
  if (typeof data === 'string') {
    return this.send(data)  
  } else {
      let dataString = JSON.stringify(data)
      return this.send(dataString) 
  }
}

/* options to pass to the 'ws' API for the WebSocket Server */
let wsOpts = {
  /**
   *  logic to validate incoming websocket connection requests 
   *  @param {Object} info 
   *    - info.origin: value in origin header
   *    - info.req: the http get request
   *    - info.secure:  bool- req.connection.authorized or req.connection.encrypted 
   * @param {Function} done 
   *  
   * 
   * */
  verifyClient: (info, done) => {
    /* sessionParser imported from session-config returns fn session(req, res, next) */
    sessionParser(info.req, {}, () => { 
      /* values to pass to done default to denied connection request */
      let handshakeRes = false
      let code = 401
      let httpReason = 'user must be logged in'
      /* check to see if session exists and user was added to session via
         passport login (ie- user is authenticated) */
      if (info.req.session) {
        if (info.req.session.passport) {
          if (info.req.session.passport.user) {
            console.log('USER AUTHENTICATED: ok to create socket')
            /* session parser found the user on a session = authenticated
              done(true) calls completeUpgrade which 
                - creates and emits headers
                - creates a WebSocket object client
                - adds the client to a collection of clients (if one exists)
                - calls a callback with the ws client as a parameter
            */
            handshakeRes = true
            /* code and httpReason params only needed when handshake response is false */
            code = null
            httpReason = null
          } 
        } 
      } 
      if (handshakeRes === false) console.log('CANNOT CREATE SOCKET: user not logged in')
      /* call done() with handshake response, and optional http code & reason */
      done(handshakeRes, code, httpReason)
    })
  },
  /* the server to handle the handshake, using the Node http server */
  server: httpServer,
  /* whether to track connected clients */
  clientTracking: true 
}

/* creates a websocket server instance with the above defined options */
let wsServer = new WebSocket.Server(wsOpts)

/* exporting the websocket server */
module.exports = wsServer
  


