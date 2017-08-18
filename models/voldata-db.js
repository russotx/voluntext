const mongoose = require('mongoose')
const moment = require('moment')
mongoose.Promise = global.Promise

const Schema = mongoose.Schema

let logEntrySchema = new Schema({
  entryId: String,
  hours: Number,
  timeStamp: String
})

let volDataSchema = new Schema({
  email: String,
  id: String,
  phone: Number,
  smsOpt: Boolean,
  totalHours: Number,
  hoursLog: [logEntrySchema]
})

volDataSchema.methods.initDoc = function(email, phone, smsOpt=false, callback){
    let now = moment()
    let timeStamp = now.format('MM,D,YYYY|HH|mm|ss')
    this.set({
      'email': email,
      'id': email + ':' + timeStamp,
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
        console.log(err)
        return callback(err, null)
      } else {
        return callback(null, docs)
      }
    })
}

module.exports = function(dataMongoose) {
  return dataMongoose.model('VolDataDoc', volDataSchema)
}