/* 

Authentication & protected routes 

*/

const path = require('path')
require('dotenv').config()

/* options for .allFailed() or .success()--req.login()*/
const authOptions = {
  //successRedirect: '/admin',
  failureRedirect: '/login',
  failureFlash: true
}
const onboardOptions = {
  successRedirect: '/admin/onboard',
  failureRedirect: '/admin/onboard',
  failureFlash: true
}

module.exports = (router, passport, root) => {

  router.use('/user',isLoggedIn)
  router.use('/admin',isAdmin)

  // User Authentication Route
  router.post('/api/auth', passport.authenticate('local-login', authOptions), 
             (req, res) => {
    if (req.user.userId === process.env.ADMINID) {
      res.redirect('/admin/dashboard')
    } else {
      res.redirect('/user/profile')
    }
  })

  router.get('/logout', (req, res) => {
    console.log('logging out')
    req.logout()
    req.session.destroy()
    res.redirect('/about')
  })

  router.post('/admin/api/onboard', 
             passport.authenticate('local-onboard', onboardOptions))

  router.get('/user/profile', (req,res) => {
    //res.sendFile(path.join(root, 'secured', 'views', 'user-profile.html'))
    console.log('----- INSIDE USER PROFILE ROUTE ------')
    console.log('going to user profile...') 
    console.log('req._passport: \n',req._passport)
    console.log('req.session.passport: ',req.session.passport)
    res.sendFile(path.join(root, 'secured', 'views', 'ws-privtest.html'))
    console.log('----- END USER PROFILE ROUTE ------')
  })                                              

  router.get('/admin/onboard', (req, res, next)=>{
    console.log('going to onboard page')
    res.sendFile(path.join(root,'secured','views','onboard.html'))
  })

  router.get('/admin/dashboard', (req, res) => {
    console.log('going to admin page')
    res.sendFile(path.join(root, 'secured', 'views', 'admin-page.html'))
  })

}

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
  if (req.isAuthenticated()) {
    console.log('auth check: user is logged in')
    return next()
  } else {
    console.log("auth check: user hasn't logged in, redirect to /about") 
    res.redirect('/about')
  }
}