const mongoose = require('mongoose')
const Schema = mongoose.Schema
const mongoAuth = require('passport-local-mongoose')

let userAccount = new Schema({
  username: String,
  password: String
})

userAccount.plugin(mongoAuth)

module.exports = mongoose.model('userAccount', userAccount)
