/*
*
*       CREATE THE WEBSOCKET SERVER
*
*/
const VolDataDoc = require('./models/voldata-db')
const WebSocket = require('ws')
// import the session parser shared with Express app
const sessionParser = require('./config/sessions-config')
// import the http server
const httpServer = require('./server')

/* 
  a simple function to validate data to send over websocket 
  ensuring everything is sent as a string
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


/* 
  get the data for the user from voldata db and send it as a string
*/
WebSocket.prototype.sendUserData = function(userId) {
  getUserData(userId)
    .then((data) => {
      if (data) {
        console.log('socket: user data found')
        this.sendValidData(data)
      } else {
        console.log('socket: no user data found')
        this.sendValidData('no data found')
      }
    })
    .catch((err) => {
      console.log('socket: error finding user data \n', err)
      this.sendValidData(err)
    })
    function getUserData(userId) {
      return new Promise((res, rej) => {
        VolDataDoc.findOne( { 'userId': userId }, (err, userData) => {
          if (err) {
            console.log('error finding user data.')
            return rej(err)
          } 
          if (!userData) {
            console.log('no user data found') 
            return res('no user data found')
          }
          if (userData) {
            console.log('user data found')
            return res(userData)
          }
        })  
      })
    }
}


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
  server: httpServer,
  clientTracking: true 
}

let wsServer = new WebSocket.Server(wsOpts)

// export the websocket server
module.exports = wsServer
  


