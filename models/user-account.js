const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const saltRounds = 5
// set native promises as mongoose preferred promise library
mongoose.Promise = global.Promise

const Schema = mongoose.Schema

let userAccountSchema = new Schema({
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

module.exports = function(authMongoose) {

  return authMongoose.model('UserAccount', userAccountSchema)

}
