const Bandwidth = require("node-bandwidth");
const client = new Bandwidth({
  userId    : process.env.BANDWIDTH_USERID,
  apiToken  : process.env.BANDWIDTH_API_TOKEN,
  apiSecret : process.env.BANDWIDTH_API_SECRET
});

client.sendSMS = function (toPhone,smsContent) {
  let message = {
    from: `+1${process.env.BANDWIDTH_PHONE}`, // <-- This must be a Bandwidth number on your account
    to: `+1${toPhone}`,
    text: smsContent
  };
  client.Message.send(message)
  .then(function(message) {
    // console.log("Im sending");
    // report status, change sendSMS flag back to false and revert to default message
    /*let dbSMSreset = {};
    let smsSentKey = database.ref('/smsAction/smsSentLog/').push(); 
    let smsSentStatus = "Message sent with ID " + message.id;
    dbSMSreset['/smsAction/smsSentLog/'+smsSentKey+'/'] = smsSentStatus;
    dbSMSreset['/smsAction/sendSMS/'] = false;
    dbSMSreset['/smsAction/smsContent/'] = "Attn Awesome Volunteers, please report your hours!";
    database.ref().update(dbSMSreset); */
  })
  .catch(function(err) {
    /*let smsSentKey = database.ref('/smsAction/smsSentLog/').push(); */
    let smsSentStatus = "Message error " + err.message;
  });
}


module.exports = client;