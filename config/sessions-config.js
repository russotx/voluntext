const session = require('express-session')
const MongoStore = require('connect-mongo')(session) // MongoDB session store
const authDBconnection = require('./mongoose-config').authDBconn
const hoursConvert = require('./helpers').hoursConvert
const newSessionId = require('./helpers').newSessionId

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
      collection: 'usersessions',
      ttl: hoursConvert(48, 'sec')
    } 
  ), 
  genid: function() {
    return newSessionId()
  }
}

const sessionParser = session(sessOpts)

/* export session parser to share with Express app and Websocket server */
module.exports = sessionParser