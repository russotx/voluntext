/*  CONFIGURE EXPRESS APP  */

const path = require('path') // Node path library

const bodyParser = require('body-parser') // HTTP body parser
const flash = require('connect-flash') // session messages
const morgan = require('morgan') // auto logger
const express = require('express')
const passport = require('passport')

/* CONFIGURE PASSPORT FOR SESSIONS AND AUTHENTICATION */
require('./passport-config')(passport)
/* Import the session parsers for use in the Express App */
const sessionParser = require('./sessions-config')

const proxyLevels = 1 // number of proxy levels to trust

/************************************************************************
*
*   app - Express app instance from server.js
*   root - path of server.js as single point of reference for paths
*
************************************************************************/
module.exports = (app, root) => {
 
  app.set('trust proxy', proxyLevels) //trust first proxy
/*    --- assign middleware to express app ---
        - serve css, js, and images as static                                 */
  app.use(express.static(path.join(root,'public','css')))
  app.use(express.static(path.join(root,'public','javascript')))
  app.use(express.static(path.join(root,'public','images')))
/*    -- parsers and loggers --                                               */
  app.use(morgan('dev'))
  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(bodyParser.json())
  app.use(sessionParser)
/*    -- authentication middleware --                                         */
  app.use(passport.initialize())
  app.use(passport.session())
/*    -- attach flash messages to session --                                  */
  app.use(flash())
/*    --- create Router instance ---                                          */
  const router = express.Router()
/*    -- configure public routes with services --                             */
  require('../routes/pub-routes')(router, root)
/*    -- configure private routes that require authentication --              */
  require('../routes/auth-routes')(router, passport, root)
/*    -- all paths use router object --                                       */
  app.use(router)

/*  -- redirect any non existant routes to about page --                      */
  app.get('*', (req,res) => {
    res.redirect('/about')
  })

}