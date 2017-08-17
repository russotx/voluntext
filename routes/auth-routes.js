/* 

Authentication & protected routes 

*/

const path = require('path')

/* options for .allFailed() or .success()--req.login()*/
const authOptions = {
  successRedirect: '/admin',
  failureRedirect: '/about',
  failureFlash: true
}
const onboardOptions = {
  successRedirect: '/about',
  failureRedirect: '/onboard',
  failureFlash: true
}


module.exports = (router, passport, root) => {
  
  // User Authentication Route
  router.post('/api/auth', passport.authenticate('local-login', authOptions))

  router.get('/logout', (req, res) => {
    console.log('logging out')
    req.logout()
    res.redirect('/about')
  })

  router.post('/api/onboard', passport.authenticate('local-onboard', 
                                                onboardOptions))

  router.get('/admin', isLoggedIn, (req, res) => {
    console.log('going to admin page')
    res.sendFile(path.join(root, 'secured', 'views', 'admin-page.html'))
  })

}

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    console.log('user is logged in')
    return next()
  }
  console.log("user hasn't logged in")
  res.redirect('/about')
}