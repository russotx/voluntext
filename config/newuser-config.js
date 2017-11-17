const UserAccount = require('../models/user-account')
const VolDataDoc = require('../models/voldata-db').volData
const AnnualLogsDoc = require('../models/voldata-db').annualLogs

 function handleNewUserErrors(err, userProps) {
  let cleanupStart = err.newUserStep
  /*
      write code to begin where creating a new user had an error 
      try again or
      back track through the DB's and either delete the data
      return a promise, if trying again fails need to call the functions
      in the catch statement after createNewUser()
  */
}

function createNewUser(props, smsOpt=false) {
  return new Promise((res, rej) => {
    // create a new user account document in the authentication database
    let newUser = new UserAccount()
    // create a new user document in the volunteer data database
    let newVolDoc = new VolDataDoc()
    let email = props.email
    let phone = props.phone
    let password = props.password
    newUser.initUserAcct(email, password) /* step 1 */
    // initUserAcct promise resolution
    .then(() => {
      return newVolDoc.initDoc(email, phone, smsOpt) /* step 2 */
    })
    // initDoc promise resolution
    .then(() => {
      return newUser.setUserId(newVolDoc.userId) /* step 3 */
    })
    .then((doc) => {
      console.log('successfully created new user')
      // three steps of user creation completed successfully
      res(doc)
    })
    .catch((err) => {
      console.log(err.stepMessage)
      console.log('error creating new user: ',err)
      // catch problem creating user 
      rej(err)
    })
  })
} // -- end createNewUser() 

// validate new user data again on server side
function validateOnboard(props) {
  function validateEmail(email) {
      let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      return re.test(email);
  }
  let email = props.email
  let pwd1 = props.password1
  let pwd2 = props.password2
  let phone = props.phone
  return new Promise ((res,rej) =>{
    if (!validateEmail(email)) {
      email = "enter a valid email";
      rej("invalid email input")
    }
    if (!((pwd1) && (pwd2)) || ((!(pwd1 === pwd2)))) {
      pwd1 = "must enter matching passwords"
      pwd2 = "must enter matching passwords"
      rej("invalid password input")
    }
    if (!(phone)) {
      phone = "phone number required"
      rej("invalid phone input")
    }
    res({
      email : email,
      password : pwd1,
      phone : phone
    })
  })  
}

// export function that takes options for how to handle success/failure
module.exports = (options) => {
  // return a function that takes req, res, next from Express app
  return (req, res, next) => {
    const successRedirect = options.successRedirect
    const failureRedirect = options.failureRedirect
    const failureFlash = options.failureFlash
    let userProps = {
      'phone': req.body.phone,
      'email': req.body.email,
      'password1': req.body.password1,
      'password2': req.body.password2
    }
    console.log('new user:: email: ', userProps.email, ' password: ', 
                userProps.password1)
    // look to see if email already exists in the DB
    UserAccount.findOne({ 'local.email' : userProps.email }, (err, user) => {
      console.log('begin save new user')
      if (err) {
        console.log('error with DB trying to check dupe email on signup: ', err)
        err.stepMessage = 'error with DB trying to check dupe email on signup'
        if (failureFlash) req.flash('onboardMessage',err.stepMessage)
        res.redirect(failureRedirect)
        next()
      }
      if (user) {
        console.log('email already exists')
        if (failureFlash) req.flash('onboardMessage','user already exists with this email: '+userProps.email)
        res.redirect(failureRedirect)
        next()
      } 
      // the user doesn't exist yet, proceeding to create new user
      console.log('attempting to create and save new user') 
      // re-validate the user data as added precaution
      validateOnboard(userProps)
      .then((validProps) => {
        // new user properties | sms opt-in
        createNewUser(validProps, false)
        .then((doc) => {
          console.log('successfully created new user: \n', doc)
          res.redirect(successRedirect)
          next()
        })
        .catch((err) => {
          console.log('error creating new user: ', err.stepMessage, '\n', err)
          /* handleNewUserErrors().then().catch() */
          if (failureFlash) req.flash('onboardMessage',err.stepMessage)
          res.redirect(failureRedirect)
          next()
        }) // -- end createNewUser .catch
      }) // -- end validateOnboard .then
      .catch((err) => {
        console.log('error with user data \n', err)
        if (failureFlash) req.flash('onboardMessage', 'error with user data')
        res.redirect(failureRedirect)
        next()
      })
    }) // -- end .findOne() looking for dupe acct 
  } // end returned middleware function
} // -- end module.exports 