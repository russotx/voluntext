/************************************************************************* 
 * 
 *              AUTHENTICATION & PROTECTED ROUTES   
 * 
 *************************************************************************/

const path = require('path')
require('dotenv').config()
const moment = require('moment')
const onboardUser = require('../config/newuser-config')
const VolDataDoc = require('../models/voldata-db').volData
const UserAccount = require('../models/user-account')
const wsServer = require('../wsServer')
const FB = require('../config/facebook-helper').makeFBloginHelper
const bwClient = require('../config/bandwidth-config')

/****************************************************
 *        Config Objects 
 ***************************************************/

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

/****************************************************
 *          -- ROUTES -- 
 ***************************************************/

module.exports = (router, passport, root) => {
  
  /* -- ROUTER MIDDLEWARE -- */
  router.use('/user', isLoggedIn)
  router.use('/admin', isAdmin)

  /*****************************************************************
                -- AUTHENTICATION ROUTES --
  ******************************************************************/

  /* Local User/Password Authentication Route  */
  router.post('/api/auth', passport.authenticate('local-login', authOptions), 
    (req, res) => {
      if (req.user.userId === process.env.ADMINID) {
        res.redirect('/admin/dashboard')
      } else {
        res.redirect('/user/profile')
      }
    })

  /* Facebook Authentication Routes */
  router.get('/api/auth/facebook', passport.authenticate('facebook'))
  /* Facebook Authentication Redirect Route
      - callback for facebook strategy is called & 
        finds user associated with fbook account                              */
  router.get('/api/auth/facebook/proceed', 
             passport.authenticate('facebook', facebookOptions))
             
/*    -- Any User Logout Route --                                             */
  router.get('/logout', (req, res) => {
    console.log('logging out')
    req.logout()
    req.session.destroy()
    res.redirect('/about')
  })

/************************************************************************
            -- VOLUNTEER USER ROUTES --
************************************************************************/

  /* -- Volunteer Profile Page  */
  router.get('/user/profile', (req, res, next) => {
/*      The client triggers a WebSocket connection which then triggers 
        sending the user's data to the user via WebSocket                     */
    res.sendFile(path.join(root, 'secured', 'views', 'user-profile.html'), 
      (err) => {
        if (err) {
          next(err)
        } else { 
          console.log('file sent')
        }
      })
  })
  
/*   User Allow Access to their Facebook info & store in DB         
        -- user links to Facebook login api from client side          
        -- this route is hit by Facebook on redirect from login api           */
  router.get('/api/auth/facebook/onboard', (req, res) => {
    const userId = req.user.userId
    const appId = process.env.FACEBOOK_APP_ID
    const appSecret = process.env.FACEBOOK_APP_SECRET
    const redirectURI = process.env.FACEBOOK_CALLBACK_URL_OB
    /*
    process.env.ENVIRONMENT === 'development' ? 
      redirectURI = process.env.FACEBOOK_CALLBACK_URL_DEV_OB :
      redirectURI = process.env.FACEBOOK_CALLBACK_URL_PROD_OB
    */  
    let code = req.query.code
    FB.getUserData(appId, redirectURI, appSecret, code)
    .then((FBuserData) => {
      UserAccount.setFBdata(userId, FBuserData)
      .then((doc) => {
        console.log('FB data saved: ', JSON.stringify(doc))
        res.redirect('/user/profile')   
      })
    })
    .catch((err) => {
      console.log('error retreiving fb data: \n', err)
      res.redirect('/user/profile')
    })
  })
  
  /** 
   * api route for volunteer to submit new hours 
   *  - updates the annual logs collection
   *  - updates the user's hoursLog
   */
  router.post('/user/api/hours-update', (req, res) => {
    let thisYear = moment().year()
    let thisMonth = moment().format('MMMM')
    let inputData = {
      'hours': req.body.hours,
      'month': req.body.month,
      'year': req.body.year
    }
    let userId = req.user.userId
    /* update the database */
    VolDataDoc.logHours(userId, inputData)
    /* respond to the client if the user profile page needs to be updated */
    .then((userLog) => { 
      let dataForClient = { result : 'success' }
      /* only send an update to the client if the user is logging data for this year */
      if (thisYear == inputData.year) {
        dataForClient.totalHours = userLog.annualTotal
        /* check if client needs to update display of hours for this month, 
          this is also important for updating the FB quote */
        if (thisMonth === inputData.month) {
          dataForClient.thisMonthHours = userLog[thisMonth].hours 
        }
      }
      /* send update via websocket if one exists */
      if (wsServer.userSockets[userId]) {
        wsServer.userSockets[userId].sendValidData(dataForClient) 
      } else {
      /* send a json response for axios to handle in case there's no 
         websocket connection */
        console.log('no user websocket connection')
        res.json({ saved : true, updatedData : dataForClient }) 
      } 
      /* emit new hours event to trigger update to admin dashboard */
      wsServer.emit('new-hours') 
      return res.end()
    })
    /* handle error trying to update hours in the log */
    .catch((err) => {
      console.log('ERROR saving user hours in hours-update route: \n', err)
      res.json({ saved : false, error: err })
    })
  })
  
/* api route for volunteer to change their associated email address */
  router.post('/user/api/email-update', (req, res) => {
    let userId = req.user.userId
    let email = req.body.email
    UserAccount.sendConfirmEmail(userId, email)
  })
  
/* api route for user confirming new email address is correct via sent email */
  router.post('/user/api/confirm-email', (req, res) => {
    let userId = req.user.userId
    let email = req.body.email
    UserAccount.setEmail(userId, email)
  })
 
 /* api route for user changing their password */ 
  router.post('/user/api/password-update', (req, res) => {
    let userId = req.user.userId
    let password1 = req.body.password1
    let password2 = req.body.password2
    if (password1 === password2) {
      UserAccount.setPassword(userId, password1)
      .then(res.json( { saved: true } ))
      .catch((err) => {
        res.json( { saved: false, error: err } )
      })
    }
  })
  
  /* -- Volunteer opt in/out of sms texting   */
  router.post('/user/api/sms-opt', (req, res) => {
    let smsChoice = req.body.smsOpt
    let userId = req.user.userId
    VolDataDoc.setSMSopt(userId, smsChoice)
    .then(() => { 
      console.log('saved sms option')
      res.json( { saved: true } )
    })
    .catch((err) => {
      console.log('error saving sms change: \n', err)
      res.json( { saved: false, error: err } )
    })
  })

/****************************************************************
                  -- ADMIN ROUTES --
*****************************************************************/
  
  const onboardOptions = {
    successRedirect: '/admin/onboard',
    failureRedirect: '/admin/onboard',
    failureFlash: true
  }
  
  /*  -- Admin Onboarding Volunteers Route -- */
  router.post('/admin/api/onboard', onboardUser(onboardOptions))
  
  /* -- Admin Send SMS Requesting Hours To All Opted-In Numbers -- */  
  /* Bandwidth sends a group message when sending bulk numbers- not a good idea */
  router.post('/admin/api/send-all-sms', (req, res) => {
    /* client req contains the message text and an optional tag to identify the message 
       req.body = { "text" : "content", "tag" : "example" } */
    let messageOpts = { 
      text : req.body.text,
      tag : req.body.tag
    }
    /* getAllSMSnumbers returns an array of phone number strings */
    VolDataDoc.getAllSMSnumbers()
    .then((optInNums) => {
      /* send the SMS messages to each number as a separate message */
      bwClient.sendSeqMessages(messageOpts, optInNums)
      .then((results) => {
        console.log('messaging attempt results: \n',results)
        /* return an object of helpful results information */
        // TODO: create a collection for storing messaging attempt sessions admin can
        // review to see if there are erroneous numbers or problems.
        return res.json(results)
      })   
    })
    .catch((err) => {
      console.log('error getting all sms optin numbers: ', err)
      return res.json(err)
    })
  })
 

  /* -- Admin Volunteer Onboarding Page -- */
  router.get('/admin/onboard', (req, res) => {
    console.log('going to onboard page')
    res.sendFile(path.join(root,'secured','views','onboard.html'))
  })

  /* -- Admin Dashboard Page -- */
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
  /* checks if req.user exists */
  if (req.isAuthenticated()) {
    console.log('auth check: user is logged in')
    return next()
  } else {
    console.log("auth check: user hasn't logged in, redirect to /about") 
    res.redirect('/about')
  }
}

