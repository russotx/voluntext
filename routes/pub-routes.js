const path = require('path')

/* Route handling for the app */

// export a function which receives a router object as paramter
module.exports = (router, root) => {
  
  // assign route behavior to the router object's HTTP services

  router.get('/', (req,res) => {
    console.log('goingt to landing page')
    res.sendFile(path.join(root,'public','views','landing-page.html'))
  })
  
  router.get('/login', (req,res,next)=>{
    console.log('going to login page')
    res.sendFile(path.join(root,'public','views','login2.html'))
  })
  
}

