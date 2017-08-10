const express = require('express')
const session = require('express-session')
const bodyParser = require('body-parser')
const path = require('path')
const mongoClient = require('mongodb').MongoClient
require('dotenv').config()

const prodAuthURL = {
  auth: '',
  volData: '',
  sessions: ''
}
const devURL = {
  auth: process.env.DEV_AUTH,
  volData: process.env.DEV_VOLDATA,
  sessions: process.env.DEV_SESSIONS
}
mongoClient.connect(devURL.auth, (err,db) => {
  if (err) {
    console.log('there was an error: ',err)
    return false
  } else {
    console.log('mongo connected to auth db')
    db.close()
  }
})

// create Express app object
const app = express()
// create Router objects
const router = express.Router()

// assign HTTP service routes to the router object via the routes module
require('./routes/pub-routes')(router,__dirname)
require('./routes/auth-routes')(router,__dirname)

// --- assign middleware ---
// serve css, js, and images as static
app.use(express.static(path.join(__dirname,'public','css')))
app.use(express.static(path.join(__dirname,'public','javascript')))
app.use(express.static(path.join(__dirname,'public','images')))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
// all paths use router object
app.use(router)

 app.get('*', (req,res) => {
   res.redirect('/')
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



