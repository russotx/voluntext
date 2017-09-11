/* 

Authentication & protected routes 

*/

const path = require('path')
require('dotenv').config()
const UserAccount = require('../models/user-account')
const onboardUser = require('../config/newuser-config')

/* options for .allFailed() or .success()--req.login()*/
const authOptions = {
  failureRedirect: '/login',
  failureFlash: true
}
const facebookOptions = {
  successRedirect: '/user/profile',
  failureRedirect: '/login'
}

module.exports = (router, passport, root) => {

  // -- ROUTER MIDDLEWARE --
  router.use('/user',isLoggedIn)
  router.use('/admin',isAdmin)

  // -- AUTHENTICATION ROUTES --

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

  // -- User Logout Route --
  router.get('/logout', (req, res) => {
    console.log('logging out')
    req.logout()
    req.session.destroy()
    res.redirect('/about')
  })

  // -- VOLUNTEER USER ROUTES --

  // -- Volunteer Profile Page --
  router.get('/user/profile', (req,res) => {
    res.sendFile(path.join(root, 'secured', 'views', 'user-profile.html'))
    // console.log('----- INSIDE USER PROFILE ROUTE ------')
    // console.log('going to user profile...') 
    // if (req._passport) console.log('req._passport: \n',req._passport)
    //   else console.log('no req._passport')
    // if (req.session) console.log('req.session.passport: ',req.session.passport || 'no session.passport')
    //   else console.log('no session')
    // res.sendFile(path.join(root, 'secured', 'views', 'ws-privtest.html'))
    //console.log('----- END USER PROFILE ROUTE ------')
  })                                              

  // -- ADMIN ROUTES --

  const onboardOptions = {
    successRedirect: '/admin/onboard',
    failureRedirect: '/admin/onboard',
    failureFlash: true
  }
  
  // -- Admin Onboarding Volunteers Route -- 
  router.post('/admin/api/onboard', onboardUser(onboardOptions))
  
  // -- Admin Volunteer Onboarding Page --
  router.get('/admin/onboard', (req, res, next)=>{
    console.log('going to onboard page')
    res.sendFile(path.join(root,'secured','views','onboard.html'))
  })

  // -- Admin Dashboard Page --
  router.get('/admin/dashboard', (req, res) => {
    console.log('going to admin page')
    res.sendFile(path.join(root, 'secured', 'views', 'admin-page.html'))
  })

}

// -- MIDDLEWARE FUNCTIONS FOR ROUTES --

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
  if (req.isAuthenticated()) {
    console.log('auth check: user is logged in')
    return next()
  } else {
    console.log("auth check: user hasn't logged in, redirect to /about") 
    res.redirect('/about')
  }
}