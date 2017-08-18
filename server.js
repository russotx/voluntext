const express = require('express')
const passport = require('passport')

const session = require('express-session')
const MongoStore = require('connect-mongo')(session)
const bodyParser = require('body-parser')
const path = require('path')

const mongoose = require('mongoose')
const flash = require('connect-flash')
const morgan = require('morgan')
const cryptoRandomString = require('crypto-random-string')

// set native promises as mongoose preferred promise library
mongoose.Promise = global.Promise

// pull in environment variables
require('dotenv').config()

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

// create a mongoose connection object and connect
let authDBconnection = mongoose.createConnection(dbURL.auth)
  // mongoose event listeners
  authDBconnection.on('connected',function(){ console.log('mongoose connected: auth dB') })
  authDBconnection.on('error', function(err){ console.log('auth DB connection error: ',err) })
  authDBconnection.on('close', function(){ console.log('auth DB connection closed') })

let dataDBconnection = mongoose.createConnection(dbURL.volData)
  // mongoose event listeners
  dataDBconnection.on('connected',function(){ console.log('mongoose connected: voldata dB') })
  dataDBconnection.on('error', function(err){ console.log('voldata DB connection error: ',err) })
  dataDBconnection.on('close', function(){ console.log('voldata DB connection closed') })

function hoursConvert(hrs, unit='ms') {
  let converted = hrs*3600
  if (unit === 'ms') {
    return converted*1000
  }
  return converted
} 

const proxyLevels = 1
const sessOpts = {
  cookie: {
    maxAge: hoursConvert(24, 'ms'),
    sameSite: 'lax',
    secure: false, /* should set this to true on site with HTTPS! */
  },
  secret: process.env.SESSIONSECRET, /* used to sign */
  name: 'connect.vtextSID', /* session ID cookie name in req */
  resave: false, /* don't resave session if unchanged */
  saveUninitialized: false, /* new but unmodified sessions not saved */
  /* the session store instance (default is MemoryStore) */
  store: new MongoStore( 
    { 
      mongooseConnection: authDBconnection, 
      touchAfter: hoursConvert(6, 'sec'),
      collection: 'usersessions',
      ttl: hoursConvert(48, 'sec')
    } 
  ), 
  genid: function() {
    return newSessionId()
  }
}

// configure passport.js strategy and seralization functions
require('./config/passport-config')(passport, authDBconnection, dataDBconnection)

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
// set up Express sessions
app.use(session(sessOpts))
// set up passport
app.use(passport.initialize())
app.use(passport.session())
app.use(flash())
app.use((req, res, next) => {
  console.log('mw | req.session = \n', req.session)
  console.log('------------')
  console.log('mw | req.user = \n', req.user)
  next()
})

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



