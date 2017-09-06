/*
*
*   CONFIGURE EXPRESS APP
*
*/

const path = require('path') // Node path library

const bodyParser = require('body-parser') // HTTP body parser
const flash = require('connect-flash') // session messages
const morgan = require('morgan') // auto logger

const express = require('express')

const passport = require('passport')
require('./passport-config')(passport)

const sessionParser = require('./sessions-config')

const proxyLevels = 1

module.exports = (app, root) => {
 
  app.set('trust proxy', proxyLevels) //trust first proxy
  // --- assign middleware to express app ---
  // -- serve css, js, and images as static
  app.use(express.static(path.join(root,'public','css')))
  app.use(express.static(path.join(root,'public','javascript')))
  app.use(express.static(path.join(root,'public','images')))
  app.use('/admin',express.static(path.join(root,'secured','javascript')))
  // -- parsers and loggers middleware
  app.use(morgan('dev'))
  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(bodyParser.json())
  app.use(sessionParser)
  // -- authentication middleware
  app.use(passport.initialize())
  app.use(passport.session())
  app.use(flash())
  // --- set up Express router ---
  const router = express.Router()
  // assign HTTP service routes to the router object via the routes modules
  require('../routes/pub-routes')(router, root)
  require('../routes/auth-routes')(router, passport, root)
  // all paths use router object
  app.use(router)

  // redirect any non existant routes to about page rather than providing 404
  app.get('*', (req,res) => {
    res.redirect('/about')
  })


}