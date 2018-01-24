const path = require('path')
const moment = require('moment')
const VolData = require('../models/voldata-db').volData
const AnnualLogs = require('../models/voldata-db').annualLogs
const wsServer = require('../wsServer')
/*const Bandwidth = require('node-bandwidth')
const client = new Bandwidth({
  userId : process.env.BANDWIDTH_USERID,
  apiToken : process.env.BANDWIDTH_API_TOKEN,
  apiSecret : process.env.BANDWIDTH_API_SECRET
})
const bwPhoneNumber = process.env.BANDWIDTH_PHONE */

// Routes available to all clients

module.exports = (router, root) => {
  
  // assign route behavior to the router object's HTTP services
  router.get('/', (req, res) => {
    res.redirect('/about')
  })

  router.get('/about', (req, res) => {
    //console.log('going to landing page')
    res.sendFile(path.join(root,'public','views','landing-page.html'))
    //res.sendFile(path.join(root,'public','views','ws-pubtest.html'))
  })
  
  router.get('/login', (req, res, next) => {
    console.log('going to login page')
    res.sendFile(path.join(root,'public','views','login2.html'))
  })

  router.get('/favicon.ico', (req, res) => {
    res.status(204)
  })
  
  /* route for receiving sms messages from Bandwidth API 
     - url+route is provided as callback url in the API
     - req.body JSON properties: 
          eventType {String} - sms
          direction {String} - in/out
          from {String} - phone number prefixed with +1
          to {String} - phone number prefixed with +1
          messageId {String}
          messageUri {String} - Bandwidth
          text {String} - the content of the sms message
          applicationId {String} - for app in Bandwidth account
          time {Date}
          state {String} - received/sent/queued/sending/error
          deliveryState {String} - waiting/delivered/not-delivered
          deliveryCode {String} - 0-999 (0 = delivered to carrier, 775 = rej, user opt out)
          deliveryDescription {String} - msg associated with the code
  */
  router.post('/report-hours', (req, res) => {
    let inputHours = req.body.text
    console.log('sms from: ', req.body.from)
    console.log('user input from sms: ', inputHours)
    /* remove '+1' prefix from phone number */
    let fromPhone = req.body.from.substring(2)
    console.log('user phone: ', fromPhone)
    let thisMonth = moment().format("MMMM")
    let thisYear = moment().year()
    let dataToLog = {
      hours : inputHours,
      year : thisYear,
      month : thisMonth 
    }
    if(validateHours(inputHours).valid) {
      VolData.getUserByPhone(fromPhone)
      .then((userId) => {
        VolData.logHours(userId, dataToLog)  
        .then(() => {
          wsServer.emit('new-hours')
        })
      }) 
      .catch((error) => {
        /* error accessing the database */
        // TODO: send an email with the data to the admin & to the user
        console.log('error finding user by phone: \n', error)
      })
    } else {
      // TODO: need to resend the sms request to user
      console.log('invalid user input from sms: ', validateHours(inputHours).reason)
    }
  })
  
} /* -- end of exports */

function validateHours(inputHours) {
  let maxMonthHours = 700
  let minMonthHours = 0
  try {
    let intHours = parseInt(inputHours, 10)
    if ((intHours <= maxMonthHours) && (intHours >= minMonthHours)) {
      return { valid: true }
    } else {
      return { valid: false, reason : 'unrealistic number' }
    }
  }
  catch(error) {
    return { valid : false, reason : 'not a number' }
  }
}