const mongoose = require('mongoose')
mongoose.Promise = global.Promise

const Schema = mongoose.Schema

let sessionSchema = new Schema({
  sessionId : String,
  email : String
})

// receive mongoose auth db connection and export model
module.exports = function(authMongoose) {
  return authMongoose.model('UserSession', sessionSchema)
}