const express = require('express')
const passport = require('passport')
const localStrategy = require('passport-local').Strategy
const session = require('express-session')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const path = require('path')
//const mongoClient = require('mongodb').MongoClient
const mongoose = require('mongoose')


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

const dbURL = (process.env.ENVIRONMENT === 'development') ? 
  {
    auth: process.env.DEV_AUTH, // username/password store
    volData: process.env.DEV_VOLDATA, // user data collection
    sessions: process.env.DEV_SESSIONS // session store
  } :
  {
    auth: '',
    volData: '',
    sessions: ''
  }


// mongoClient.connect(devURL.auth, (err,db) => {
//   if (err) {
//     console.log('there was an error: ',err)
//     return false
//   } else {
//     console.log('mongo connected to auth db')
//     db.close()
//   }
// })

// create Express app object
const app = express()
// create Router objects
const router = express.Router()

// assign HTTP service routes to the router object via the routes module
require('./routes/pub-routes')(router,__dirname)
require('./routes/auth-routes')(router,__dirname)

// --- assign middleware ---
// serve css, js, and images as static

let userAccount = require('./models/user-account')
passport.use(new localStrategy(userAccount.authenticate()))
passport.serializeUser(userAccount.serializeUser())
passport.deserializeUser(userAccount.deserializeUser())

let authDBconnect = mongoose.createConnection(dbURL.auth,(error) => {
  if (error) {
    console.log('mongo connection error: ',error)
  } else {
      console.log('mongo connection successful')
  }
})
//let dataDBconnect = mongoose.createConnection(devURL.volData)
//let sessionDBconnect = mongoose.createConnection(devURL.sessions)


app.use(passport.initialize())
app.use(passport.session())
app.use(cookieParser())
app.use(express.static(path.join(__dirname,'public','css')))
app.use(express.static(path.join(__dirname,'public','javascript')))
app.use(express.static(path.join(__dirname,'public','images')))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
// all paths use router object
app.use(router)

 app.get('*', (req,res) => {
   res.redirect('/about')
 })

// listen for connections
app.listen(process.env.PORT,(err)=>{
  if (err){
    console.log('Error starting Express')
    return false
  } else {
    console.log('Express running on port',process.env.PORT)
  }
})



