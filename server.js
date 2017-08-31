const http = require('http')  // Node http library
const path = require('path') // Node path library
const root = __dirname
require('dotenv').config() // pull in environment variables
const express = require('express') // request listener

// --- SET UP EXPRESS APP TO HANDLE REQUESTS ---
const app = express()
require('./config/express-config')(app, root)

// --- CREATE AN HTTP SERVER ---
// use the express.js app as the requestListener
const httpServer = http.createServer(app)
// export httpServer for use in the Websocket server
module.exports = httpServer

// -- CREATE WEBSOCKET SERVER --
const wsServer = require('./wsServer')
require('./config/websocket-config')(wsServer)

// -- LISTEN FOR CONNECTIONS --
httpServer.listen(process.env.PORT, (err) => {
  if (err) {
    console.log('error starting http server')
    return false
  } else {
    console.log('Express app running on port ', httpServer.address().port)
  }
})


