const mongoose = require('mongoose')
const moment = require('moment')
const bcrypt = require('bcrypt')
const newTimeStamp = require('../config/helpers').newTimeStamp
mongoose.Promise = global.Promise
/* import mongoose connection to volunteer data database */
const dataDBconnection = require('../config/mongoose-config').dataDBconn
const Schema = mongoose.Schema

/*****************************************************************************
                    -- Annual Logs Schema --
                    
      - for a collection which holds the logged data for all volunteers
      - each log in the collection holds a year of data for a volunteer
      - each log is referenced by id in an array in the Vol Data Schema 
        for said volunteer.
****************************************************************************/
/* for a nested schema within annualLogSchema */
let logEntrySchema = new Schema({
  hours: { type: Number, default: 0 },
  timeStamp: { type: String, default: newTimeStamp() }
})

/* collection representing annual logs */
let annualLogsSchema = new Schema({
  year: { type: Number, index: true, default: moment().year() }, /* index this field */
  January: { type: logEntrySchema },
  February: { type: logEntrySchema },
  March: { type: logEntrySchema },
  April: { type: logEntrySchema },
  May: { type: logEntrySchema },
  June: { type: logEntrySchema },
  July: { type: logEntrySchema },
  August: { type: logEntrySchema },
  September: { type: logEntrySchema },
  October: { type: logEntrySchema },
  November: { type: logEntrySchema },
  December: { type: logEntrySchema },
  user: { type: String, index: true }, /* index this field */
  annualTotal: { type: Number, default: 0 }  
})

/*------------------------------------------------------------------------------
            -- Methods for Annual Log Schema --
------------------------------------------------------------------------------*/
/* initialize a new log entry for a user in the Annual Hours Logs collection */
annualLogsSchema.methods.initLog = function(email, userInput){
  /* set defaults for hours, year, month */
  let hours = 0
  let year = moment().year()
  /* month will defalt to Jan with 0 hours, the rest will default based on the schema */
  let month = 'January'
  let dataObject = {}
  dataObject.user = email 
  if (userInput) {
    let inputMonth = userInput.month || month
    let inputHours = parseInt(userInput.hours, 10) || hours
    dataObject.year = parseInt(userInput.year, 10) || year
    dataObject[inputMonth] = {}
    dataObject[inputMonth].hours = inputHours
    dataObject[inputMonth].timestamp = newTimeStamp()
    dataObject.annualTotal = inputHours || hours
  }
  return new Promise((res, rej) => {
    this.set(dataObject)
    this.save(function(err, doc){
      if (err) {
        console.log('error initializing new log: \n', err)
        rej(err)
      } else {
        console.log('new log initialized with id: ',doc._id)
        res(doc._id)
      }
    })
  })
}

/* setter for updating the hours of a given month, used by the logHours setter 
   of the Vol Data Model */
annualLogsSchema.methods.updateMonthHours = function(month, hours){
  /* update the total hours for the year */
  let oldMonthHours = this[month].hours
  let monthHoursDiff = hours - oldMonthHours
  let newAnnualTotal = this.annualTotal + monthHoursDiff
  let dataObject = {}
  dataObject[month] = {}
  dataObject[month].hours = hours
  dataObject[month].timeStamp = newTimeStamp()
  dataObject.annualTotal = newAnnualTotal
  return new Promise((res, rej) => {
    this.set(dataObject)
    this.save(function(err, doc){
      if (err) {
        rej(err)
      } else {
        res( { 'docId': doc._id, 'newTotal': newAnnualTotal } )
      }
    })    
  })
}

/*------------------------------------------------------------------------------
                       -- Model for Annual Logs --
------------------------------------------------------------------------------*/
let annualLogsModel = dataDBconnection.model('AnnualHoursLogs', 
                                                annualLogsSchema)

annualLogsModel.fetchUserLogByYear = function(email, year) {
  console.log('attempting fetchUserLogByYear')
  return new Promise((res, rej) => {
    annualLogsModel.findOne({'user': email, 'year': year}, (err, data) => {
      if (err) return rej(err)    
      console.log(`fetchUserLogByYear user ${email}, year ${year} ${typeof year}`)
     // console.log('fetchUserLogByYear data: \n', data)
      return res(data)
    })
  })
}
/*******************************************************************************
                           -- Vol Data Schema --
                           
    - holds the activity data for specific volunteers
    - not used for authentication, this is the data an organization would want
      to query for operational purposes.
*******************************************************************************/

let volDataSchema = new Schema({
  email: String,
  userId: String,
  phone: String,
  smsOpt: Boolean,
  // totalHours: Number,
  hoursLog: [String] /* holds reference _ids from AnnualHoursLogs */
})

/*------------------------------------------------------------------------------
                      -- Methods for Vol Data Schema --
------------------------------------------------------------------------------*/

volDataSchema.methods.initDoc = function(email, phone, smsOpt=false){
    let timeStamp = newTimeStamp()
    let _this = this
    console.log('.initDoc _this : \n',_this)
    return new Promise((res,rej) => {
      _this.set( {
        'email': email,
        'userId': email + ':' + bcrypt.hashSync(timeStamp, 2),
        'phone': phone,
        'smsOpt': smsOpt,
        'totalHours': 0
      } )
      /* create an initial log entry for the user in annual logs collection */
      let annualLogEntry = new annualLogsModel()
      /* .init resolves with the id for the created log entry */
      annualLogEntry.initLog(email)
      .then((logEntryRef) => {
        console.log('initial log entry saved with id: ', logEntryRef)
        console.log('logEntryRef is a ', typeof logEntryRef)
        /* push the log entry _id into the user's array of logs */
        _this.hoursLog.push(logEntryRef)
        console.log('hoursLog: \n', _this.hoursLog)
        /* save the user's document in the voldatadocs collection */
        _this.save(function(err, docs) {
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
      /* handle error from adding user log entry to annual logs collection */
      .catch((err) => {
        rej(err)
      })       
    })
}

/*------------------------------------------------------------------------------
                       -- Model for Vol Data --
------------------------------------------------------------------------------*/
let volDataModel = dataDBconnection.model('VolDataDoc', volDataSchema)

/*------------------------------------------------------------------------------
                  -- Functions for the Volunteer Data Model --
------------------------------------------------------------------------------*/
/** 
*  setter to log hours for the volunteer 
*  @param {String} userId - for the volunteer (an email address)
*  @param {Object} volData - the month/year/hours for the log
*    - updates the hours in a log or creates a new log if needed 
*/
volDataModel.logHours = function(userId, volData) {
  let month = volData.month
  let year = parseInt(volData.year, 10)
  let hours = parseInt(volData.hours, 10)
  return new Promise((res, rej) => {
    /* ensure a document for the volunteer exists in Vol Data collection */
    volDataModel.findOne( { 'userId' : userId }, (err, user) => {
      if (err) {
        console.log('error finding user data.')
        rej(err)
      } else if (!user) {
        rej('invalid user')
      } else {
          let userEmail = user.email
          console.log('user email: ', userEmail)
          /* check Annual Logs collection for existing user log entry document 
            for the year being logged. Update existing or create new log as needed */
          annualLogsModel.findOne( { 'user': userEmail, 'year': year }, (err, userLog) => {
            if (userLog) {
              /* an entry exists, update the month field in the existing entry */
              console.log(`A user log for ${year} exists.`)
              /* updateMonthHours performs a save of the model after changing data */
              userLog.updateMonthHours(month, hours)
            } else {
              /* no entry exists, need to initialize a new log document in the 
                Annual Logs collection */
              console.log(`user log for ${year} DOES NOT EXIST, initializing new log...`)
              userLog = new annualLogsModel()
              /* .init resolves with the id for the new log document */
              userLog.initLog(userEmail, volData)
              .then((docId) => {
                /* add the _id for the new log to the user's array of log ids in 
                  the Vol Data collection */
                console.log('the docId being saved via logHours: ', docId)
                user.hoursLog.push(docId)
                user.save(function(err) {
                  if (err) {
                    console.log('error saving user hoursLog array in logHours function: \n', err)
                    rej(err)
                  }
                })
              })
            }
            /* hours were successfully saved pass the userLog */
            console.log('successful update of the user log in logHours: \n', userLog)
            res(userLog)
          })
        }
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

// export the models for storing volunteer related data
exports.volData = volDataModel
exports.annualLogs = annualLogsModel