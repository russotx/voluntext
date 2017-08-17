
/*-------------------------------------------------- 
Flow:
___ passport.authenticate()___
1. * calls passport.authenticate()
  @params: STRATEGY"" | OPTIONS {} | CALLBACK() --options & callback are optional
  --strategy is a string or array of strings
  - returns function authenticate() 
    @params: REQ{} | RES{} | NEXT()
      -> invokes the strategy or strategies until one succeeds or all fail
      * calls attempt(i) --an IIFE inside the authenticate function
        - [if all failed] : returns allFailed() --no new params
          - [if there's a callback for passport.authenticate()] : allFailed() returns CALLBACK(null, false, and failure info)
          - otherwise flashes messages and/or calls RES.redirect(options.failureRedirect)
        - creates STRATEGY{} --a new passport instance prototyped off the strategy (depending on the string)
          - the new instance contains the following action functions bound to the strategy: 
            .success() 
              @params: USER{} | INFO{} --info is optional data provided by the strategy's verify callback 
                - if there's a callback for authenticate : returns callback(null, user, info)
                - otherwise flashes any provided messages, adds messages to req.session.messages array
                [if options has an assignProperty] : assigns USER object to REQ[assignProperty] and calls NEXT
                * calls REQ.logIn()
                  @params: USER{} | OPTIONS{} | CALLBACK(err)
                    * CALLBACK calls complete() - no new params
                      - [if success] : 
                        * calls RES.redirect with a variable url depending on existance of session
                      - otherwise calls NEXT()
            .fail()
              @params: CHALLENGE"" | STATUS# --challenge is optional
              - add failure to array and iterate to the next strategy
              * calls attempt(i+1)
            .redirect()
              @params: URL"" | STATUS#
                --this redirect func created because Express' res.redirect() changed parameter order between 2.x, 3.x, & 4.x
                * calls res.setHeader() & res.end() 
            .pass() -- no params
              * calls NEXT()
            .error()
              @params ERROR{Error}
                - if there's a callback: returns CALLBACK(err)
                * otherwise calls NEXT(err)
        * calls STRATEGY.authenticate(REQ, OPTIONS) 
          - authenticates based on session state [if there's a session] : authenticated
            - attaches req.passport.session.user to REQ

___ Strategy ___
2. user input (name/pwd) passed to strategy's verification function
3. verification function checks DB for match
    * calls done() --params depend on verification status
      @params ERROR{Error} | USER{} | INFO{}
    - done(err) = error
    - done(null, false) = no match
    - done(null, user) = matched
    ** calling done() passes control flow back into passport.authenticate() **
4. control passed back to passport.authenticate()
___ passport.authenticate() ___
5. * ^ calls serializeUser() --which has access to user object
      @params FN() | REQ{} | DONE()
      i) determines what user data to store in the session
      ii) attaches result to session as req.session.passport.user
      iii) attaches result to request as req.user
      iv) returns done() function which passes control back to passport.authenticate()
6. invoke requestHandler
    - passport methods available to request handlers:
        - req.login()
        - req.logout()
        - req.isAuthenticated()
        - req.isUnAuthenticated()
___ Subsequent Requests ___
  1. Express loads session data and attaches it to req
  2. invoke passport.initialize() middleware
  3. invoke passport.session() :: 
    [if serialized user object found : request authenticated]
      4. call to passport.deserializeUser(fn, req, done) 
        i) attaches user object to req.user
        ii) returns done() function and passes flow back to passport.authenticate


--------------------------------------------------*/

const localStrategy = require('passport-local').Strategy

// configure passport 
module.exports = (passport, authMongoose) => {
  
  const UserAccount = require('../models/user-account')(authMongoose)
  const UserSession = require('../models/sessions-db')(authMongoose)

  // ---- SESSION MANAGEMENT ----

  // @params: fn | req | done
  // pushes fn onto passport.serializers stack
  passport.serializeUser((user, done) => {
    //let id = UserSession.newSessionId()
    // second done parameter gets saved to req.session.passport.user["id"]
    // express-session provides the logic of establishing the id at login, passport only accesses the data
    done(null, user.id)
  })

  /* pushes fn parameter onto passport.deserializers stack
     deserializers grab the user object out of the session for further use.
     callback defines logic to pull user info from session store
     first parameter is from req.session.passport.user */
  passport.deserializeUser((id, done) => {
    UserSession.findOne({ 'sessionId' : id }, (err, user) => {
      if (err) console.log('deserialize error: ',err)
      // pass control back to authenticate, user object gets attached to request as req.user
      done(err, user)
    })
  })

  // ---- ONBOARD/SIGNUP LOGIC ----
  passport.use('local-onboard', new localStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true
    },
    function(req, email, password, done){
      console.log('new user:: email: ',email,' password: ',password)
      UserAccount.find(function(err, docs){
        if (err) console.log('find err: ',err)
        console.log('user docs: ',docs)
      })
      UserAccount.findOne({ 'local.email' : email }, (err, user) => {
        console.log('attempting to save new user')
        if (err) {
          console.log('error with DB trying to check dupe email on signup: ',err)
          return done(err)
        }
        if (user) {
          console.log('email already exists')
          return done(null, false, req.flash('signupMessage', 
            'A user has already been created with that email.'))
        } else {
            console.log('attempting to save new user')
            let newUser = new UserAccount()
            newUser.local.email = email
            newUser.local.password = newUser.generateHash(password)

            newUser.save(function(err){
              if (err) {
                console.log('error saving new user: ',err)
                throw err
              }
              console.log('success! saved new user')
              return done(null, newUser)
            })
        }

      })
    })
  ) // -- end onboard strategy


  // ---- AUTHENTICATION STRATEGIES ----
  // define local login authentication strategy using passport-local module
  // new strategy overrides the passport.Strategy.authenticate method
  // strategy name: "local-login"
  passport.use('local-login', new localStrategy(
    /* strategy options parameter */
    {
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true /* pass the whole request object to the callback below (needed for sessions) */
    }, 
    /* non-optional strategy callback parameter (in passport-local source code- @param: verify)
        Strategy.authenticate method calls the verify callback with 
        @params: req, username, password, verified() || username, password, verified()
        verified is defined by passport-local: returns error, fail, or calls .success(user,info) */
    (req, email, password, done) => { 
      console.log('looking for user email account in DB')
      /* mongoose findOne method to locate the email entered by user */
      UserAccount.findOne({ 'local.email' : email }, (err, user) => {
        console.log('the user: ',user)
        /* error with the database */
        if (err){ 
          console.log('error when trying to locate user email in DB.')
          return done(err)
        }
        /* can't locate the user email or the password doesn't match */
        if ((!user) || (!user.validPassword(password))) {
          console.log("no user found, or pwd didn't match")
          return done(null, false, req.flash('loginMessage', 
                                          'Invalid username/password'))
        }
        /* found the user email and password matches
            done() calls strategy.success(user, info)
            passport-local doesn't provide a callback to .authenticate() so .success() calls req.login() */
        console.log('success! found user account and password matched')
        return done(null, user)
      }) // -- end findOne callback
    }) // -- end 'passport-local' constructor
  )// -- end middleware

} // end of module.exports