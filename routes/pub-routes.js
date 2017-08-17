const path = require('path')

// Routes available to all clients

module.exports = (router, root) => {
  
  // assign route behavior to the router object's HTTP services
  router.get('/', (req, res) => {
    res.redirect('/about')
  })

  router.get('/about', (req, res) => {
    console.log('going to landing page')
    res.sendFile(path.join(root,'public','views','landing-page.html'))
  })
  
  router.get('/login', (req, res, next)=>{
    console.log('going to login page')
    res.sendFile(path.join(root,'public','views','login2.html'))
  })

  router.get('/onboard', (req, res, next)=>{
    console.log('going to onboard page')
    res.sendFile(path.join(root,'secured','views','onboard.html'))
  })

  router.get('/favicon.ico', (req, res) => {
    res.status(204)
  })
  
}

