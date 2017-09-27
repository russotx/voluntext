/****  Authentication & protected routes   *****/
const path = require('path')
require('dotenv').config()
const onboardUser = require('../config/newuser-config')
const VolDataDoc = require('../models/voldata-db')
const wsServer = require('../wsServer')
const request = require('request')

/* options for .allFailed() or .success()--req.login() */
const authOptions = {
  failureRedirect: '/login',
  failureFlash: true
}
/* passport facebook strategy options */
const facebookOptions = {
  successRedirect: '/user/profile',
  failureRedirect: '/login'
}

module.exports = (router, passport, root) => {
  
  // -- ROUTER MIDDLEWARE --
  router.use('/user',isLoggedIn)
  router.use('/user',getUserData)
  router.use('/admin',isAdmin)

  /*************************************************************************
                -- AUTHENTICATION ROUTES --
  ***********************************************************************/

  // Local User/Password Authentication Route
  router.post('/api/auth', passport.authenticate('local-login', authOptions), 
    (req, res) => {
      if (req.user.userId === process.env.ADMINID) {
        res.redirect('/admin/dashboard')
      } else {
        res.redirect('/user/profile')
      }
    })

  // Facebook Authentication Route
  router.get('/api/auth/facebook', passport.authenticate('facebook'))
  /* Facebook Authentication Redirect Route
      callback for facebook strategy is called here- 
      finds user associated with fbook account                                */
  router.get('/api/auth/facebook/proceed', 
             passport.authenticate('facebook', facebookOptions))
/*
  router.get('/test/profile', (req,res) => {
    console.log('----- FACEBOOK TEST: INSIDE USER PROFILE ROUTE ------')
    console.log('going to user profile...') 
    if (req._passport) console.log('req._passport: \n', req._passport)
      else console.log('no req._passport')
    if (req.session) console.log('req.session.passport: ', 
                                  req.session.passport || 'no session.passport')
      else console.log('no session')
    res.sendFile(path.join(root, 'secured', 'views', 'user-profile.html'))
    //res.sendFile(path.join(root, 'secured', 'views', 'ws-privtest.html'))
    console.log('----- END FACEBOOK TEST USER PROFILE ROUTE ------')
  })
*/
  // -- Any User Logout Route --
  router.get('/logout', (req, res) => {
    console.log('logging out')
    req.logout()
    req.session.destroy()
    res.redirect('/about')
  })

/************************************************************************
            -- VOLUNTEER USER ROUTES --
************************************************************************/

  // -- Volunteer Profile Page 
  router.get('/user/profile', (req, res, next) => {
    /*    next up...
          if res.locals.volData.err ? send error message : res.render(template with data)
     */
/*
        The client side scripts with user-profile.html triggers 
        WebSocket connection which then triggers sending the user's data 
        to the user via WebSocket
*/
     res.sendFile(path.join(root, 'secured', 'views', 'user-profile.html'), 
      (err) => {
        if (err) {
          next(err)
        } else { 
          console.log('file sent')
        }
      })
  })
  
  /* 
      User Allow Access to their Facebook info & store in DB 
  */
  router.get('/user/api/add-fb', (req, res) => {
    let appId = process.env.FACEBOOK_APP_ID
    let redUri = process.env.FACEBOOK_CALLBACK_URL_DEV_OB
    let uri = `https://www.facebook.com/v2.10/dialog/oauth?`+
               `client_id=${appId}`+
               `&redirect_uri=${redUri}`        
    console.log('the facebook api url: \n', uri)
    // this redirect will get blocked due to CORS.
    res.redirect(uri)
  })
  
  router.get('/api/auth/facebook/onboard', (req, res) => {
    const appId = process.env.FACEBOOK_APP_ID
    const appSecret = process.env.FACEBOOK_APP_SECRET
    let FBuserId = ''
    let redirectURI = ''
    if (process.env.ENVIRONMENT === 'development') {
      redirectURI = process.env.FACEBOOK_CALLBACK_URL_DEV_OB
    } else {
      redirectURI = process.env.FACEBOOK_CALLBACK_URL_PROD_OB
    }
    let code = req.query.code
    console.log('the FB code: \n',code)
    let FBcodeExchangeUri = `https://graph.facebook.com/v2.10/oauth/access_token?`+
                `client_id=${appId}`+
                `&redirect_uri=${redirectURI}`+
                `&client_secret=${appSecret}`+
                `&code=${code}`
    // exchange the code for an access token      
    request(FBcodeExchangeUri, {json : true}, (err, res, body) => {
      if (err) {
        console.log('error with code exchange: \n', err)
        res.redirect('/user/profile')
      } else if (body.err) {
          console.log('FB code exchange error: \n', body.err)
      } else {
        console.log('code echange body: \n', body)
        if (body.access_token) {
          let accessToken = body.access_token
          let FBtokenCheckUri = `https://graph.facebook.com/debug_token?`+
                                `input_token=${accessToken}`+
                                `&access_token=${appId}|${appSecret}`
          // ensure the token is legit and get the user's FB userId
          request(FBtokenCheckUri, {json: true}, (err, res, body) => {
            console.log(body)
            console.log('Facebook user Id: ', body.data.user_id)
            FBuserId = body.data.user_id
          })
        }
      }
    })
  })
  
  // api route for client access to user data
  router.get('/user/api/data', (req, res) => {
    res.json(res.locals.volData)
  })

  router.post('/user/api/hours-update', (req, res) => {
    console.log('payload: ', req.body)
    let hours = req.body.hours
    let userId = req.user.userId
    VolDataDoc.findOne( {'userId' : userId }, (err, user) => {
      if (err) {
        console.log('error finding user data.')
        res.json( { saved: false, error: err } )
      } else {
          user.logHours(hours)
          .then((totalHours) => {
            if (wsServer.userSockets[userId]) {
              wsServer.userSockets[userId].sendValidData(totalHours)
            } else {
              console.log('no user websocket connection')
            }
            res.json({ saved : true, totalHours : totalHours })
          })
          .catch((err) => {
            console.log('error saving user hours: \n', err)
            res.json({ saved : false, error: err })
          })
      }
    })
    
  })
  
  // -- Volunteer opt in/out of sms texting 
  router.post('/user/api/sms-opt', (req, res) => {
    console.log('payload: ', req.body)
    console.log('user: ', req.user)
    let smsChoice = req.body.smsOpt
    let userId = req.user.userId
    console.log('userId: ', userId)
    /* Next up...
        toggle the smsOpt based on existing user data from res.locals.volData
    */
    VolDataDoc.findOne( { 'userId': userId }, (err, userData) => {
      if (err) {
        console.log('error finding user data.')
        res.json( { saved: false, error: err } )
      } else {
        console.log('user data found, attempting to save user data...')
        userData.setSMSopt(smsChoice)
        .then(() => { 
          console.log('saved sms option')
          res.json( { saved: true } )
        })
        .catch((err) => {
          console.log('error saving sms change: \n', err)
          res.json( { saved: false, error: err } )
        })
      }
    })
  })

/************************************************************************
                  -- ADMIN ROUTES --
************************************************************************/
  
  const onboardOptions = {
    successRedirect: '/admin/onboard',
    failureRedirect: '/admin/onboard',
    failureFlash: true
  }
  
  // -- Admin Onboarding Volunteers Route -- 
  router.post('/admin/api/onboard', onboardUser(onboardOptions))
  
  // -- Admin Volunteer Onboarding Page --
  router.get('/admin/onboard', (req, res) => {
    console.log('going to onboard page')
    res.sendFile(path.join(root,'secured','views','onboard.html'))
  })

  // -- Admin Dashboard Page --
  router.get('/admin/dashboard', (req, res) => {
    console.log('going to admin page')
    res.sendFile(path.join(root, 'secured', 'views', 'admin-page.html'))
  })

}

/*************************************************************************
      -- MIDDLEWARE FUNCTIONS FOR ROUTES --
***********************************************************************/

function isAdmin(req, res, next) {
  if (req.user) console.log('admin check: req.user = \n', req.user)
  if (req.isAuthenticated() && (req.user.userId === process.env.ADMINID)) {
    console.log('user is admin')
    return next()
  } else if (req.isAuthenticated()) {
      console.log('user is not admin, directing to user profile...')
      res.redirect('/user/profile')
  } else {
    console.log("admin check: user hasn't logged in")
    res.redirect('/about')  
  }
}

function isLoggedIn(req, res, next) {
  // checks if req.user exists
  console.log('res.locals: \n', res.locals)
  if (req.isAuthenticated()) {
    console.log('auth check: user is logged in')
    return next()
  } else {
    console.log("auth check: user hasn't logged in, redirect to /about") 
    res.redirect('/about')
  }
}

function getUserData(req, res, next) {
  // get the user data from voldata db and attach to res.locals
  let userId = req.user.userId
  console.log('middleware- userId: ', userId)
  console.log('mw begin... res.locals: \n', res.locals)
  VolDataDoc.findOne( { 'userId': userId }, (err, userData) => {
    if (err) {
      console.log('error finding user data.')
      // later test if (volData.err) to see if successfully retrieved
      res.locals.volData.err = true
      return next()
    } 
    if (!userData) {
      console.log('no user data found') 
      res.locals.volData = null
      return next()
    }
    if (userData) {
      console.log('user data found')
      res.locals.volData = userData
      console.log('mw res.locals assigned... res.locals = \n', res.locals)
      return next()
    }
  })  
}