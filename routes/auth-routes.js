module.exports = (router, root) => {
  
  router.post('/api/auth',(req,res,next)=>{
    console.log('posting to /api/auth')
    console.log(req.body.username," ",req.body.password)
    res.redirect('/login')
  })

}