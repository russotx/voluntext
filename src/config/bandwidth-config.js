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

bwClient.sendSingleSMS = function(bodyOptions, callback) {
  /* dupe the http req properties with bandwidth api specifics */
  let requestOptions = Object.create(this.smsOptions) 
  /* give it the body properties from the client */ 
  Object.assign(requestOptions.body, bodyOptions)
  /* call the request with our options */
  return new Promise((res, rej) => {
    request(requestOptions, (err, response, resBody) => {
      /* error trying to send the request - won't receive an error as a result
      of bandwidth trying to send the message, only if there's a problem communicating
      with the bandwidth endpoint */
      if(err) {
        /* if the sendSingleSMS caller provided a callback */
        if (callback) {
          callback(err)
        }
        /* no callback, return a rejected Promise */ 
        rej(err)
      }
      /* successful message. If sendSingleSMS caller provided a callback */
      if(callback) {
        callback(null, res, resBody)
      }
      /* successful messge. No callback provided, return a resolved Promise */
      res(resBody)
    })
  })
}

bwClient.sendSeqMessages = function(options, numbers) {
  let count = 0
  let messageResults = { reqErrors : 0, msgErrors : 0, failedNumbers : [] }
  return new Promise((res, rej) => {
    numbers.forEach((number) => {
      options.to = number
      this.sendSingleSMS(options)
      .then((receipt) => {
        count++
        messageResults[number] = receipt
        if (receipt.fieldErrors) {
          messageResults.msgErrors += 1
          messageResults.failedNumbers.push(number)
        }
        console.log(messageResults)
        if (count == numbers.length) {
          res(messageResults)
        }
      })
      .catch((err) => {
        count++
        messageResults[number] = err
        messageResults.reqErrors+= 1
        messageResults.failedNumbers.push(number)
        console.log(messageResults)
        if (count == numbers.length) {
          res(messageResults)
        }
      })
    })
  })
}

/**
 * send an sms message to one or many numbers via Bandwidth api endpoint
 * @param {Object} bodyOptions
 *  - text {String} : the message to send
 *  - to {Array} : the phone numbers to send the message to
 *  - tag {String} : a tag to identify the message 
 * @param {Function} callback - optional callback
 */
bwClient.sendGroupSMS = function(bodyOptions, callback) {
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