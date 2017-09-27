/* ---------------------------------------------------------------- 
*
*       Mongoose Schema & related methods for user accounts
*       used in authentication & session management
*
----------------------------------------------------------------*/

const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const saltRounds = 5
// set native promises as mongoose preferred promise library
mongoose.Promise = global.Promise
// import mongoose connection to authentication & session database
const authDBconnection = require('../config/mongoose-config').authDBconn
const Schema = mongoose.Schema


let userAccountSchema = new Schema({
  userId: String,
  local: {  
    email: String,
    password: String
  },
  /* optional facebook user account info */
  facebook: {
    /* facebook user Id */
    id: String,  
    /* the user's facebook access token for possibility of more functionality  */
    token: String,  
    /* email associated with facebook account, Passport returns an array of emails in the standardized profile object */
    email: String,  
    /* the user's name as it appears on facebook, Passport returns an object that consists of family given and middle name strings */
    name: String 
  }
})

/*   
    -- Password hashing and checking --
    
*/

userAccountSchema.methods.generateHash = function(password) {
  console.log('creating password hash')
  return bcrypt.hashSync(password, saltRounds)
}

userAccountSchema.methods.validPassword = function(password) {
  console.log('comparing the password')
  return bcrypt.compareSync(password, this.local.password)
}

/* 
      -- Setters and Initializers -- 
      
*/

/* 
    Automated initialization of a new user account for onboarding new volunteers
*/
userAccountSchema.methods.initUserAcct = function(email, password, callback) {
  return new Promise((res,rej) => {
    this.set({
      'local': {
        'email': email,
        'password': this.generateHash(password)
      }
    })
    this.save(function(err, doc){
      if (err) {
        console.log('error saving new user: ', err)
        err.newUserStep = 2
        err.stepMessage = 'Error when saving new user to authentication DB.'
        if (callback){
          rej(callback(err, null)) // pass the callback with err
        }
        rej(err) // pass the error code
      } else {
        console.log('success! saved new user')
        if (callback) {
          res(callback(null, doc)) // pass the callback
        }
        res(doc) // pass the doc
      }
    })
  })
}

/* 
  Give the user's unique ID created by the Voldata schema when 
  initializing the user's entry in the volunteer data DB
*/
userAccountSchema.methods.setUserId = function(userId, callback){
  this.set( { 'userId': userId } )
  this.save(function(err, doc){
    if (err) {
      err.newUserStep = 3
      err.stepMessage = 'Error creating user ID for user in the authentication DB.'
      if (callback) 
        return callback(err) // pass the callback with err
      return Promise.reject(err) // let newuser-config handle the error 
    }
    else {
      if (callback) 
        return callback(doc) // pass the callback with err
      return Promise.resolve( doc )
    }
  })

} 


// export the model for the user account for authentication purposes
module.exports = authDBconnection.model('UserAccount', userAccountSchema)