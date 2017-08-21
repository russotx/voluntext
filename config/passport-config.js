
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
module.exports = (passport, authMongoose, dataMongoose) => {
  // get mongoose models and pass in mongoose connection to auth db
  // DB with user accounts for authentication
  const UserAccount = require('../models/user-account')(authMongoose)
  // DB with volunteer data corresponding to users
  const VolDataDoc = require('../models/voldata-db')(dataMongoose)

  // ---- SESSION MANAGEMENT ----

  // @params: fn | req | done
  // pushes fn onto passport.serializers stack
  // determine what data from user object to save in session store to identify
  // a user without saving all of their information in session store
  passport.serializeUser((user, done) => {
    console.log('serializing user: ',user)
    /* second done parameter gets saved as a property to 
       req.session.passport.user */
    done(null, user.local.email)
  })

  /* pushes fn parameter onto passport.deserializers stack
     deserializers grab the user object out of the session for further use.

     callback defines logic to pull user info from the user DB based on
     id from the session store
     first parameter is from req.session.passport.user */
  passport.deserializeUser((sessionUser, done) => {
    console.log('deserializeUser id = ',sessionUser)
    UserAccount.findOne({ 'local.email' : sessionUser }, (err, sessionUser) => {
      if (err) console.log('deserialize error: ',err)
      console.log('deserializing user: ',sessionUser)
      /* pass control back to authenticate, sessionUser object gets attached 
         to request as req.user */
      done(err, sessionUser)
    })
  })

  // ---- ONBOARD/SIGNUP LOGIC ----

  function createNewUser(email, password, phone, smsOpt=false, done) {
    // create a new user account in the authentication database
    let newUser = new UserAccount()
    // create a new user document in the volunteer data database
    let newVolDoc = new VolDataDoc()
    newUser.initUserAcct(email, password)
      .then(newVolDoc.initDoc(email, phone, smsOpt)
        // initDoc promise resolution
        .then(newUser.setUserId(newVolDoc.userId, (err) => {
          if (err) { 
            console.log('error setting userId: ',err)
            throw err
          } else {
            console.log('total success creating new user')
            done(null, newUser)
          }
        }))
        // initDoc promise rejection
        .catch((err) => {
          console.log('error initializing volunteer records: ',err)
          throw err
        })
      )
      // initUserAcct promise rejection
      .catch((err) => {
        console.log('error creating new user',err)
        throw err
      })
  }

  passport.use('local-onboard', new localStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true
    },
    function(req, email, password, done){
      let phone = req.body.phone
      console.log('new user:: email: ',email,' password: ',password)
      // look to see if email already exists in the DB
      UserAccount.findOne({ 'local.email' : email }, (err, user) => {
        console.log('attempting to save new user')
        if (err) {
          console.log('error with DB trying to check dupe email on signup: ', err)
          return done(err)
        }
        if (user) {
          console.log('email already exists')
          return done(null, false, req.flash('signupMessage', 
            'A user has already been created with that email.'))
        } else {
            // user doesn't exist yet, proceeding to create new user
            console.log('attempting to create and save new user')
            createNewUser(email,password,phone,false,done)
        }
      }) // -- end .findOne() looking for dupe acct 
    }) // -- end localStrategy parameters
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
        console.log('the user: ', user.local.email)
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