const express = require('express')
const passport = require('passport')
//const localStrategy = require('passport-local').Strategy
const session = require('express-session')
const MongoStore = require('connect-mongo')(session)
const bodyParser = require('body-parser')
//const cookieParser = require('cookie-parser')
const path = require('path')
//const mongoClient = require('mongodb').MongoClient
const mongoose = require('mongoose')
const flash = require('connect-flash')
const morgan = require('morgan')
const cryptoRandomString = require('crypto-random-string')

// set native promises as mongoose preferred promise library
mongoose.Promise = global.Promise

// pull in environment variables
require('dotenv').config()

// const prodURL = {
//   auth: '',
//   volData: '',
//   sessions: ''
// }
// const devURL = {
//   auth: process.env.DEV_AUTH, // username/password store
//   volData: process.env.DEV_VOLDATA, // user data collection
//   sessions: process.env.DEV_SESSIONS // session store
// }
function newSessionId() {
  return cryptoRandomString(32)
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

// set up Mongoose connection to the auth database 
// dbURL.auth will pull the correct url from environment
/*let authDBconnection = mongoose.createConnection(dbURL.auth, function(error) {
  if (error) {
    console.log('mongo connection error: ',error)
  } else {
      console.log('mongo connection successful')
    }
  }) */
let authDBconnection = mongoose.createConnection(dbURL.auth)
authDBconnection.on('connected',function(){ console.log('mongoose connected: auth dB') })
authDBconnection.on('error', function(err){ console.log('auth DB connection error: ',err) })
authDBconnection.on('close', function(){ console.log('auth DB connection closed') })

const twentyFourHrsMS = 86400000 // in milliseconds
const sixHoursS = 21600 // in seconds
const proxyLevels = 1
const sessOpts = {
  cookie: {
    maxAge: twentyFourHrsMS,
    sameSite: 'lax',
    secure: false, /* should set this to true on site with HTTPS! */
  },
  secret: process.env.SESSIONSECRET, /* used to sign */
  name: 'connect.vtextSID', /* session ID cookie name in req */
  resave: false, /* don't resave session if unchanged */
  saveUninitialized: false, /* new but unmodified sessions not saved */
  /* the session store instance (default is MemoryStore) */
  store: new MongoStore( { mongooseConnection: authDBconnection, 
                         touchAfter: sixHoursS } ), 
  genid: function(req) {
    return newSessionId()
  }
}

// configure passport.js strategy and seralization functions
require('./config/passport-config')(passport, authDBconnection)

// --- SET UP EXPRESS APP ---
const app = express()
app.set('trust proxy', proxyLevels) //trust first proxy

// --- assign middleware ---
// serve css, js, and images as static
app.use(express.static(path.join(__dirname,'public','css')))
app.use(express.static(path.join(__dirname,'public','javascript')))
app.use(express.static(path.join(__dirname,'public','images')))
// parsers and loggers
app.use(morgan('dev'))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
//app.use(cookieParser())
// set up Express sessions
app.use(session(sessOpts))
// set up passport
app.use(passport.initialize())
app.use(passport.session())
app.use(flash())

// --- set up router ---
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

process.on('SIGINT', function(){
  authDBconnection.disconnecte(function(){
    console.log('disconnected mongoose')
    process.exit(0)
  })
})

// listen for connections
app.listen(process.env.PORT, (err)=>{
  if (err){
    console.log('Error starting Express')
    authDBconnection.disconnect(function(){ console.log('closing DB')})
    return false
  } else {
    console.log('Express running on port',process.env.PORT)
  }
})



