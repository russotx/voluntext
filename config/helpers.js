const cryptoRandomString = require('crypto-random-string') // random strings
const request = require('request')

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

exports.makeFBloginHelper = function(){
  const FBloginFlow = {
    checkTokenURIbase : `https://graph.facebook.com/debug_token?`,
    getTokenURIbase : `https://graph.facebook.com/v2.10/oauth/access_token?`,
    getToken : function(appId, redirect, secret, code) {
      let FBcodeExchangeUri = `${this.getTokenURIbase}`+
                              `client_id=${appId}`+
                              `&redirect_uri=${redirect}`+
                              `&client_secret=${secret}`+
                              `&code=${code}`
      return new Promise((resolve, reject) => {
        request(FBcodeExchangeUri, {json : true}, (err, res, body) => {
          if (err) {
            console.log('error with code exchange: \n', err)
            return reject(err)
          } else if (body.err) {
              console.log('FB code exchange error: \n', body.err)
              return reject(body.err)
          } else {
            console.log('code exchange body: \n', body)
            if (body.access_token) {
              let accessToken = body.access_token
              return resolve(accessToken)
            } 
            return reject(body)
          }
        })
      })
    },
    checkToken : function(token, appId, secret){
      let FBtokenCheckUri = `${this.checkTokenURIbase}`+
                            `input_token=${token}`+
                            `&access_token=${appId}|${secret}`
      return new Promise((resolve, reject) => { 
        request(FBtokenCheckUri, {json: true}, (err, res, body) => {
          console.log(body)
          console.log('Facebook user Id: ', body.data.user_id)
          if (err) {
            return reject(err)
          }
          if(body.data.user_id) {
            return resolve(body.data)
          }
          // if for some reason no user id was included in the data
          return reject(body.data)
        })
      })
    }
  }
  return FBloginFlow
}()

