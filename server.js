const http = require('http')  // Node http library
const root = __dirname // server as root to pass to modules for single point of reference
require('dotenv').config() // pull in environment variables
const express = require('express') // request listener
const app = express() // create Express app instance

// --- CREATE HTTP SERVER ---
// use the express.js app as the requestListener
const httpServer = http.createServer(app)
// export httpServer needed for use in the Websocket server
module.exports = httpServer

// -- CREATE WEBSOCKET SERVER --
const wsServer = require('./wsServer')
// -- CONFIGURE WEBSOCKET SERVER
require('./config/websocket-config')(wsServer)
// -- CONFIGURE EXPRESS APP
require('./config/express-config')(app, root)

// -- LISTEN FOR CONNECTIONS --
httpServer.listen(process.env.PORT, (err) => {
  if (err) {
    console.log('error starting http server')
    return false
  } else {
    console.log('Express app running on port ', httpServer.address().port)
  }
})


