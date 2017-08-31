/*
*
*       CREATE THE WEBSOCKET SERVER
*
*/

const WebSocket = require('ws')
// import the session parser shared with Express app
const sessionParser = require('./config/sessions-config')
// import the http server
const httpServer = require('./server')

let wsOpts = {
  /* validate incoming connections */
  verifyClient: (info, done) => {
    // info.origin: value in origin header
    // info.req: the http get request
    // info.secure:  bool- req.connection.authorized or req.connection.encrypted
    // call session parser - returns fn session(req,res,next)
    sessionParser(info.req, {}, () => {
      console.log('session parsed for websocket')
      let handshakeRes = false
      let code = 401
      let httpReason = 'user must be logged in'
      // check to see if session exists and user was added to session via
      // passport login (ie- user is authenticated)
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
            // code and http reason only needed when handshake response is false
            code = null
            httpReason = null
          } 
        } 
      } 
      if (handshakeRes === false) console.log('CANNOT CREATE SOCKET: user not logged in')
      // give callback a handshake response, http code, and reason
      done(handshakeRes, code, httpReason)
    })
  },
  server: httpServer 
}

let wsServer = new WebSocket.Server(wsOpts)

// export the websocket server
module.exports = wsServer
  


