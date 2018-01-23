// TODO: replace node-bandwidth with custom configuration to allow tags

//const Bandwidth = require("node-bandwidth");
const request = require('request')
const bwUserId = process.env.BANDWIDTH_USERID
const bwReqURL = `https://api.catapult.inetwork.com/v2/users/${bwUserId}/messages`

const bwClient = {
  userId    : process.env.BANDWIDTH_USERID,
  apiToken  : process.env.BANDWIDTH_API_TOKEN,
  apiSecret : process.env.BANDWIDTH_API_SECRET,
  appId : process.env.BANDWIDTH_APPID
}

bwClient.smsOptions = {
  'url' : bwReqURL,
  'method' : 'POST',
  'headers' : { 'content-type' : 'application/json' },
  'auth' : { 'user' : bwClient.apiToken, 'pass' : bwClient.apiSecret },
  'body' : {
    'from' : `+1${process.env.BANDWIDTH_PHONE}`,
    'to' : [],
    'text' : '',
    /*'applicationId' : bwClient.appId,*/
    'tag' : ''
  },
  'json' : true
}

/**
 * send an sms message to one or many numbers via Bandwidth api endpoint
 * @param {Object} bodyOptions
 *  - text {String} : the message to send
 *  - to {Array} : the phone numbers to send the message to
 *  - tag {String} : a tag to identify the message 
 * @param {Function} callback - optional callback
 */
bwClient.sendSMS = function(bodyOptions, callback) {
  let baseOptions = this.smsOptions
  let reqOptions = {}
  Object.assign(reqOptions, baseOptions)
  Object.assign(reqOptions.body, bodyOptions)
  console.log('*** bwClient - bodyOptions: \n', bodyOptions)
  console.log('**** bw req options: **** \n', reqOptions)
  /* send an http request to the Bandwidth api endpoint */
  return request(reqOptions, (error, res, resBody) => {
    if (error) {
      if (callback) {
        return callback(error)
      }
      return Promise.reject(error)
    }  
    /* res = large JSON data 
       resBody = timestamp, status, error, message, path 
       id, time, to, from, text, applicationId, tag, 
       owner, media, and direction */
    //console.log('bw internal - response: \n', res)
    console.log('**** bw internal - body: **** \n', resBody)
    if (callback) {
      return callback(null, res, resBody)    
    }
    return Promise.resolve( { response: res, body: resBody } )  
  })
}

module.exports = bwClient 