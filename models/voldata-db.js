const mongoose = require('mongoose')
const moment = require('moment')
const bcrypt = require('bcrypt')
mongoose.Promise = global.Promise
// import mongoose connection to volunteer data database 
const dataDBconnection = require('../config/mongoose-config').dataDBconn
const Schema = mongoose.Schema

let logEntrySchema = new Schema({
  entryId: String,
  hours: Number,
  timeStamp: String
})

let volDataSchema = new Schema({
  email: String,
  userId: String,
  phone: Number,
  smsOpt: Boolean,
  totalHours: Number,
  hoursLog: [logEntrySchema]
})

function newTimeStamp(){
  let now = moment()
  return now.format('MM,D,YYYY|HH|mm|ss')
}

const volDataModel = dataDBconnection.model('VolDataDoc', volDataSchema)

volDataSchema.methods.initDoc = function(email, phone, smsOpt=false){
    let timeStamp = newTimeStamp()
    return new Promise((res,rej) => {
      this.set({
        'email': email,
        'userId': email + ':' + bcrypt.hashSync(timeStamp,2),
        'phone': phone,
        'smsOpt': smsOpt,
        'totalHours': 0
      })
      this.hoursLog.push({
        'entryId': email + ':' + timeStamp,
        'hours': 0, 
        'timeStamp': timeStamp
      })
      this.save(function(err, docs) {
        if (err) {
          err.newUserStep = 2
          err.stepMessage = 'Error initializing the volunteer doc in vol data DB.'
          console.log(err)
          rej(err)
        } else {
          res(docs)
        }
      })
    })
}

volDataModel.logHours = function(userId, hours) {
  return new Promise((res, rej) => {
    volDataModel.findOne( {'userId' : userId }, (err, user) => {
      if (err) {
        console.log('error finding user data.')
        rej(err)
      }
      let timeStamp = newTimeStamp()
      user.hoursLog.push({
        'entryId': this.email + ':' + timeStamp,
        'hours': hours,
        'timeStamp': timeStamp
      })
      user.totalHours = user.totalHours + hours
      let totalHours = user.totalHours
      user.save(function(err){
        if (err) {
          console.log('error saving hours')
          rej(err)
        } else {
          res(totalHours)
        }
      })  
    })
  })
}

volDataModel.setSMSopt = function(userId, option) {
  return new Promise((res,rej) => {
    volDataModel.findOne( { 'userId': userId }, (err, userData) => {
      if (err) {
        console.log('error finding user data.')
        rej(err)
      }
      console.log('user data found, attempting to save user data...')
      userData.set({ 'smsOpt': option })
      userData.save(function(err, doc){
        if (err){
          console.log('sms opt in error: ',err)
          rej(err)
        } else {
          res(doc)
        }
      })
    })
  })
}

// export the model for storing volunteer related data
module.exports = volDataModel