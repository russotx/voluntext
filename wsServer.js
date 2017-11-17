/*
*
*       CREATE THE WEBSOCKET SERVER & FUNCTIONS
*
*/
const VolDataDoc = require('./models/voldata-db').volData
const AnnualLogs = require('./models/voldata-db').annualLogs
const WebSocket = require('ws')
/* import the session parser shared with Express app */
const sessionParser = require('./config/sessions-config')
/* import the http server */
const httpServer = require('./server')
const moment = require('moment')

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


/**
* creates an object from the data for the user from voldata db
* adds the total hours for this year as a property 
* adds the total hours for this month as a property 
* sends it as a string  via websocket
* @param {String} userId - the unique ID for the user that launched the websocket
*/
WebSocket.prototype.sendUserData = function(userId) {
  let _this = this
  getUserData(userId)
  .then((data) => {
    if (data) { 
      /* mongo findOne returns more than the user's data, ie you cannot simply
         add new properties to the object it returns. */
      let collectedData = {}
      Object.assign(collectedData, data._doc)
      console.log('collectedData: \n', collectedData)
      let userEmail = data.email
      let thisYear = moment().year()
      let thisMonth = moment().format("MMMM")
      AnnualLogs.fetchUserLogByYear(userEmail, thisYear)
      .then((thisYearLog) => {
        if (thisYearLog) {
          /* an hours log for this year exists */
          console.log(`log annualTotal: ${thisYearLog.annualTotal} & this month: ${thisYearLog[thisMonth].hours}`) 
          collectedData.totalHours = thisYearLog.annualTotal || 0
          collectedData.thisMonthHours = thisYearLog[thisMonth].hours || 0 
        } else {
          /* an hours log for this year does not exist */
          collectedData.totalHours = 0
          collectedData.thisMonthHours = 0
        }
        console.log('sending valid data: \n', collectedData)
        _this.sendValidData(collectedData)
      })
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
          // console.log('user data found')
          return res(userData)
        }
      })  
    })
  }
}


let wsOpts = {
  /**
   *  validate incoming connections 
   *  @param {Object} info 
   *    - info.origin: value in origin header
   *    - info.req: the http get request
   *    - info.secure:  bool- req.connection.authorized or req.connection.encrypted 
   * 
   * */
  verifyClient: (info, done) => {
    /* sessionParser imported from session-config returns fn session(req, res, next) */
    sessionParser(info.req, {}, () => { 
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
            /* code and http reason only needed when handshake response is false */
            code = null
            httpReason = null
          } 
        } 
      } 
      if (handshakeRes === false) console.log('CANNOT CREATE SOCKET: user not logged in')
      /* give callback a handshake response, http code, and reason */
      done(handshakeRes, code, httpReason)
    })
  },
  /* the server to handle the handshake */
  server: httpServer,
  /* whether to track connected clients */
  clientTracking: true 
}

let wsServer = new WebSocket.Server(wsOpts)

/* export the websocket server */
module.exports = wsServer
  


