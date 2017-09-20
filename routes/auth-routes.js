/****  Authentication & protected routes   *****/

const path = require('path')
require('dotenv').config()
//const UserAccount = require('../models/user-account')
const onboardUser = require('../config/newuser-config')
const VolDataDoc = require('../models/voldata-db')

/* options for .allFailed() or .success()--req.login()*/
const authOptions = {
  failureRedirect: '/login',
  failureFlash: true
}
const facebookOptions = {
  successRedirect: '/user/profile',
  failureRedirect: '/login'
}

/*--------------------------------------------------
                -- EXPORTS --
--------------------------------------------------*/
module.exports = (router, passport, root) => {

  // -- ROUTER MIDDLEWARE --
  router.use('/user',isLoggedIn)
  router.use('/user',getUserData)
  router.use('/admin',isAdmin)

  /*-------------------------------------------------- 
                -- AUTHENTICATION ROUTES --
  --------------------------------------------------*/

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
  // Facebook Authentication Redirect Route
  // callback for facebook strategy is called here- finds user associated with fbook account
  router.get('/api/auth/facebook/proceed', 
             passport.authenticate('facebook', facebookOptions))

  router.get('/test/profile', (req,res) => {
    //res.sendFile(path.join(root, 'secured', 'views', 'user-profile.html'))
    console.log('----- FACEBOOK TEST: INSIDE USER PROFILE ROUTE ------')
    console.log('going to user profile...') 
    if (req._passport) console.log('req._passport: \n',req._passport)
      else console.log('no req._passport')
    if (req.session) console.log('req.session.passport: ',req.session.passport || 'no session.passport')
      else console.log('no session')
    res.sendFile(path.join(root, 'secured', 'views', 'ws-privtest.html'))
    console.log('----- END FACEBOOK TEST USER PROFILE ROUTE ------')
  })

  // -- Any User Logout Route --
  router.get('/logout', (req, res) => {
    console.log('logging out')
    req.logout()
    req.session.destroy()
    res.redirect('/about')
  })

  /*-------------------------------------------------- 
            -- VOLUNTEER USER ROUTES --
  --------------------------------------------------*/

  // -- Volunteer Profile Page 
  router.get('/user/profile', (req, res) => {
    console.log('the user: ', req.user)
    /*    next up...
          if res.locals.volData.err ? send error message : res.render(template with data)
     */
    res.sendFile(path.join(root, 'secured', 'views', 'user-profile.html'))
  })                                              

  // -- Volunteer opt in/out of sms texting 
  router.post('/user/api/sms-opt', (req, res) => {
    console.log('payload: ', req.body)
    console.log('user: ', req.user)
    let userId = req.user.userId
    console.log('userId: ', userId)
    /* Next up...
        toggle the smsOpt based on existing user data from res.locals.volData
    */
    //let smsOption = req.body.smsChange.optIn
    //console.log('smsOption: ', smsOption)
    VolDataDoc.findOne( { 'userId': userId }, (err, userData) => {
      if (err) {
        console.log('error finding user data.')
        res.json( { saved: false, error: err } )
      } else {
        console.log('user data found, attempting to save user data...')
        userData.setSMSopt(true)
        .then(() => { 
          console.log('saved sms option')
          res.json( { saved: true } )
        })
        .catch((err) => {
          console.log('error saving sms change: \n', err)
        })
      }
    })
  })

  /*-------------------------------------------------- 
                  -- ADMIN ROUTES --
  --------------------------------------------------*/
  
  const onboardOptions = {
    successRedirect: '/admin/onboard',
    failureRedirect: '/admin/onboard',
    failureFlash: true
  }
  
  // -- Admin Onboarding Volunteers Route -- 
  router.post('/admin/api/onboard', onboardUser(onboardOptions))
  
  // -- Admin Volunteer Onboarding Page --
  router.get('/admin/onboard', (req, res, next) => {
    console.log('going to onboard page')
    res.sendFile(path.join(root,'secured','views','onboard.html'))
  })

  // -- Admin Dashboard Page --
  router.get('/admin/dashboard', (req, res) => {
    console.log('going to admin page')
    res.sendFile(path.join(root, 'secured', 'views', 'admin-page.html'))
  })

}

/*-------------------------------------------------- 
      -- MIDDLEWARE FUNCTIONS FOR ROUTES --
--------------------------------------------------*/

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