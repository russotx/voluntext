const cryptoRandomString = require('crypto-random-string') // random strings
const moment = require('moment')

// helper functions
exports.newSessionId = () => {
  return cryptoRandomString(32)
}

exports.newTimeStamp = () => {
  let now = moment()
  return now.format('MM,D,YYYY|HH|mm|ss')
}


exports.hoursConvert = (hrs, unit='ms') => {
  let converted = hrs*3600
  if (unit === 'ms') {
    return converted*1000
  }
  return converted
} 



