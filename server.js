const http = require('http')  // Node http library
const path = require('path') // Node path library

const bodyParser = require('body-parser') // HTTP body parser
const flash = require('connect-flash') // session messages
const morgan = require('morgan') // auto logger
const cryptoRandomString = require('crypto-random-string') // random strings

const express = require('express') // request listener
const session = require('express-session') // session parser
const passport = require('passport') // authentication strategies
const WebSocket = require('ws') // websocket requests

const mongoose = require('mongoose') // MongoDB ODM
const MongoStore = require('connect-mongo')(session) // MongoDB session store
// set native promises as mongoose preferred promise library
mongoose.Promise = global.Promise

// pull in environment variables
require('dotenv').config()

// helper functions
function newSessionId() {
  return cryptoRandomString(32)
}

function hoursConvert(hrs, unit='ms') {
  let converted = hrs*3600
  if (unit === 'ms') {
    return converted*1000
  }
  return converted
} 

// if environment is dev use dev urls, otherwise use production urls
const dbURL = (process.env.ENVIRONMENT === 'development') ? 
  {
    auth: process.env.DEV_AUTH, // username/password store
    volData: process.env.DEV_VOLDATA, // user data collection
  } :
  {
    auth: '',
    volData: '',
  }

// create a mongoose connection object and connect
let authDBconnection = mongoose.createConnection(dbURL.auth)
  // mongoose event listeners for auth DB
  authDBconnection.on('connected',function(){ console.log('mongoose connected: auth dB') })
  authDBconnection.on('error', function(err){ console.log('auth DB connection error: ',err) })
  authDBconnection.on('close', function(){ console.log('auth DB connection closed') })

let dataDBconnection = mongoose.createConnection(dbURL.volData)
  // mongoose event listeners for vol data DB
  dataDBconnection.on('connected',function(){ console.log('mongoose connected: voldata dB') })
  dataDBconnection.on('error', function(err){ console.log('voldata DB connection error: ',err) })
  dataDBconnection.on('close', function(){ console.log('voldata DB connection closed') })

const proxyLevels = 1

const sessOpts = {
  cookie: {
    maxAge: hoursConvert(24, 'ms'),
    sameSite: 'lax',
    secure: false, /* should set this to true on site with HTTPS!!! */
  },
  secret: process.env.SESSIONSECRET, /* used to sign the session cookie */
  name: 'connect.newSessID', /* session ID cookie name in req */
  resave: false, /* whether to resave session if unchanged */
  saveUninitialized: false, /* whether to save new but unmodified sessions */
  unset: 'destroy', /* what to do with session when unset */
  /* the session store instance (default is MemoryStore) */
  store: new MongoStore( 
    { 
      mongooseConnection: authDBconnection, 
      /*touchAfter: hoursConvert(6, 'sec'),*/
      collection: 'usersessions',
      ttl: hoursConvert(48, 'sec')
    } 
  ), 
  genid: function() {
    return newSessionId()
  }
}

// configure passport.js strategy and serialization functions
require('./config/passport-config')(passport, authDBconnection, dataDBconnection)

// create a session parser that can be used in the express app and the ws server
const sessionParser = session(sessOpts)
// username option to be used consistently between express/passport and websocket
const sessionUserprop = 'user'

// --- SET UP EXPRESS APP TO HANDLE REQUESTS ---
const app = express()
app.set('trust proxy', proxyLevels) //trust first proxy
// --- assign middleware to express app ---
// -- serve css, js, and images as static
app.use(express.static(path.join(__dirname,'public','css')))
app.use(express.static(path.join(__dirname,'public','javascript')))
app.use(express.static(path.join(__dirname,'public','images')))
// -- parsers and loggers middleware
app.use(morgan('dev'))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(sessionParser)
// -- authentication middleware
// deliberately set the name to be set in req.session.passport[userProperty]
// so as to be consistent with websocket server when checking authentication
// Passport already checks this property || 'user' in req.isAuthenticated()
app.use(passport.initialize( { userProperty: sessionUserprop, key: 'passport2'  } ))
app.use(passport.session())
app.use(flash())
// --- set up Express router ---
const router = express.Router()
// assign HTTP service routes to the router object via the routes modules
require('./routes/pub-routes')(router, __dirname)
require('./routes/auth-routes')(router, passport, __dirname)
// all paths use router object
app.use(router)

 // redirect any non existant routes to about page rather than providing 404
 app.get('*', (req,res) => {
   res.redirect('/about')
 })

// create an http server with the express.js app as the requestListener
const httpServer = http.createServer(app)
let wsOpts = {
  /* validate incoming connections */
  verifyClient: (info, done) => {
    // info.origin: value in origin header
    // info.req: the http get request
    // info.secure:  bool- req.connection.authorized or req.connection.encrypted
    console.log('--------WS SERVER MESSAGES -------')
    console.log('parsing session for websocket')
    console.log('origin header: ',info.origin)
    console.log('secure?: ',info.secure)
    console.log('userId: ',info.req.userId || 'no req.userId')
    console.log('info.req.session: ',info.req.session || 'no req.session')
    console.log('user: ',info.req.user || 'none exists')
    let infoReq = JSON.stringify(info.req.headers,null,2)
    console.log('info: \n',infoReq)

    // call session parser - returns fn session(req,res,next)
    sessionParser(info.req, {}, () => {
      console.log('------ WS SESSION PARSER MESSAGES ---------')
      console.log('session parsed for websocket')
      let handshakeRes = false
      let code = 401
      let httpReason = 'user must be logged in'
      // check to see if session exists and user was added to session via
      // passport login (ie- user is authenticated)
      if (info.req.session) {
        if (info.req.session.passport) {
          if (info.req.session.passport[sessionUserprop]) {
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
// create a WebSocket server looking for websocket handshakes on the http server
const wsServer = new WebSocket.Server( wsOpts )
// handshake accepted
wsServer.on('connection', (socket, req) => {
  console.log('SOCKET CONNECTION CREATED!!')
  socket.on('message', (message) => {
    console.log('WS message: ${message} \n from user: ${req.session.userId}')
  })
  socket.send('hello from voluntext')
})
// websocket error
wsServer.on('error',(err) => {
  console.log('error with websocket server: ',err)
})
wsServer.on('listening', () => {
  console.log('ws: underlying server bound')
})
wsServer.on('open', () => {
  console.log('websocket connection opened')
})

// listen for connections
httpServer.listen(process.env.PORT, (err) => {
  if (err) {
    console.log('error starting http server')
    return false
  } else {
    console.log('Express app running on port ', httpServer.address().port)
  }
})
/*
app.listen(process.env.PORT, (err)=>{
  if (err){
    console.log('Error starting Express')
    return false
  } else {
    console.log('Express running on port',process.env.PORT)
  }
})
*/


