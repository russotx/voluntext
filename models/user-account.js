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
  facebook: {
    id: String,
    token: String,
    email: String,
    name: String
  }
})

userAccountSchema.methods.generateHash = function(password) {
  console.log('creating password hash')
  return bcrypt.hashSync(password, saltRounds)
}

userAccountSchema.methods.validPassword = function(password) {
  console.log('comparing the password')
  return bcrypt.compareSync(password, this.local.password)
}

userAccountSchema.methods.setUserId = function(userId, callback){
  this.set( { 'userId': userId } )
  this.save(function(err){
    if (err) {
      if (callback) 
        return callback(err)
      return err
    }
    else {
      if (callback) 
        return callback()
      return true
    }
  })
}

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
        if (callback){
          rej(callback(err, null)) // pass the callback with err
        }
        rej(err) // pass the error code
      } else {
        console.log('success! saved new user')
        if (callback) {
          res(callback(null, doc)) // pass the callback
        }
        res(doc)
      }
    })
  })
}

// export the model for the user account for authentication purposes
module.exports = authDBconnection.model('UserAccount', userAccountSchema)