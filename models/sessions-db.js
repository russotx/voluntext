const mongoose = require('mongoose')
mongoose.Promise = global.Promise
const cryptoRandomString = require('crypto-random-string')

const Schema = mongoose.Schema

let sessionSchema = new Schema({
  sessionId : String,
  email : String
})

sessionSchema.methods.newSessionId = function() {
  return cryptoRandomString(32)
}

// receive mongoose auth db connection and export model
module.exports = function(authMongoose) {
  return authMongoose.model('UserSession', sessionSchema)
}