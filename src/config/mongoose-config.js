/*--------------------------------------------------
*
*     Create MongoDB connections that can be used 
*     by the rest of the app
*
--------------------------------------------------*/

const mongoose = require('mongoose')
require('dotenv').config()
/*
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
*/
const dbURL = {} 
dbURL.auth = process.env.DB_AUTH
dbURL.volData = process.env.DB_VOLDATA

mongoose.Promise = global.Promise
   
let authDBconnection = mongoose.createConnection(dbURL.auth)
authDBconnection.on('connected',function(){ console.log('mongoose connected: auth dB') })
authDBconnection.on('error', function(err){ console.log('auth DB connection error: ',err) })
authDBconnection.on('close', function(){ console.log('auth DB connection closed') })

let dataDBconnection = mongoose.createConnection(dbURL.volData)
dataDBconnection.on('connected',function(){ console.log('mongoose connected: voldata dB') })
dataDBconnection.on('error', function(err){ console.log('voldata DB connection error: ',err) })
dataDBconnection.on('close', function(){ console.log('voldata DB connection closed') })

exports.authDBconn = authDBconnection

exports.dataDBconn = dataDBconnection
  
