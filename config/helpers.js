const cryptoRandomString = require('crypto-random-string') // random strings

// helper functions
exports.newSessionId = () => {
  return cryptoRandomString(32)
}

exports.hoursConvert = (hrs, unit='ms') => {
  let converted = hrs*3600
  if (unit === 'ms') {
    return converted*1000
  }
  return converted
} 



