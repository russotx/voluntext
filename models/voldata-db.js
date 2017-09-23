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

volDataSchema.methods.logHours = function(hours) {
  // TODO: need to return a promise from this method
  return new Promise((res, rej) => {
    let timeStamp = newTimeStamp()
    this.hoursLog.push({
      'entryId': this.email + ':' + timeStamp,
      'hours': hours,
      'timeStamp': timeStamp
    })
    this.totalHours = this.totalHours + hours
    let totalHours = this.totalHours
    this.save(function(err){
      if (err) {
        console.log('error saving hours')
        rej(err)
      } else {
        res(totalHours)
      }
    })  
  })
}

volDataSchema.methods.setSMSopt = function(option) {
  return new Promise((res,rej) => {
    this.set({ 'smsOpt': option })
    this.save(function(err, doc){
      if (err){
        console.log('sms opt in error: ',err)
        rej(err)
      } else {
        res(doc)
      }
    })
  })
}

// export the model for storing volunteer related data
module.exports = dataDBconnection.model('VolDataDoc', volDataSchema)