const config = {
  ORG_URL : 'http://casatravis.org',
  ORG_HASH : 'casatravis',
  FACEBOOK_APP_ID : '2360172457541198',
  APP_DOMAIN : 'https://voluntext.herokuapp.com',
  WEBSOCKET_URL : location.origin.replace(/^http/, 'ws')
}
config.FACEBOOK_CALLBACK_URL_OB = `${config.APP_DOMAIN}/api/auth/facebook/proceed`

const userPageLogic = {
  userData : {},
  ws : null,
  smsProcessing : false,
  fbLoginUrl : 'https://www.facebook.com/v2.10/dialog/oauth',
  fbAppId : config.FACEBOOK_APP_ID,
  fbRedirect : config.FACEBOOK_CALLBACK_URL_OB,
  orgURL : config.ORG_URL,
  orgHashtag : `#${config.ORG_HASHTAG}`,
  FBhrsQuote : '',
  page : {
    smsRadio : document.getElementById('sms-radio'),
    smsSlider : document.getElementById('sms-slider'),
    smsYes : document.getElementById('sms-yes'),
    smsNo : document.getElementById('sms-no'),
    totalHours : document.getElementById('total-hours'),
    wsMessages : document.getElementById('ws-messages'),
    latestHrs : document.getElementById('latest-hrs'),
    newVolHrs : document.getElementById('new-vol-hours'),
    username : document.getElementById('username'),
    connFbBtn : document.getElementById('conn-fb-btn'),
    fbQuote : document.getElementById('fb-quote'),
    fbPubBtn : document.getElementById('fb-pub-btn'),
    reportHrsBtn : document.getElementById('report-hrs')
  }
}
 
/**
 * setter to update the userData property with user input, will only override
 * userData properties that are specified in the data object
 * 
 * @param {Object} data - properties to change or add
 * 
 */
userPageLogic.setUserData = function(data) {
  let userData = this.userData;
  return Promise.resolve(Object.assign(userData, data));
}

/**
 * setter to update the quote volunteers will be able to share on their Facebook
 * page. 
 * @param {Number} hours
 * @param {String} reportPeriod
 */
userPageLogic.updateFBhrsQuote = function(reportPeriod = 'month') {
  let hours = this.userData.thisMonthHours || 0
  this.FBhrsQuote = `I had the pleasure of volunteering ${hours} hours this ${reportPeriod}`;
  return Promise.resolve()
}
  
/*
  Initiate The Websocket Connection
    Start a WS connection and define behavior for WS events: 
      open, close, messages, and errors
    Internal functions:
      - processData()
      - showWSMessage()
 */
userPageLogic.startWSConnection = function() {
  let _this = this;
  let ws = this.ws;
  if (ws) {
    ws.close();  
    return new Promise.resolve(false);
  } else {
    ws = new WebSocket(config.WEBSOCKET_URL);
    ws.onerror = () => showWSMessage('Sorry, there was an error establishing a realtime connection to the app server. \n');
    ws.onopen = () => showWSMessage('Realtime connection to app server established. \n');
    ws.onclose = () => showWSMessage('Realtime connection to app server closed. \n');
    /** 
      event handler for ws messages received from ws server
      if the message data is a parsable object it will update the DOM data
      if the message data isn't parsable it will be displayed as a system message
      @param {Object} msg
        -data = data sent (as a string)
        -origin = origin (uri) of the message emitter
        -lastEventId = unique ID for the event
        -ports = array of MessagePort objects for the channel 
    */
    ws.onmessage = (msg) => { 
      new Promise((res, rej) => {
        /* attempt parse msg to JSON */
        try {
          let msgData = JSON.parse(msg.data);
          console.log(`message object: \n ${msg.data}`);
          _this.setUserData(msgData)
          .then(_this.updateDOM(msgData))
          .then(_this.updateFBhrsQuote())
          res(true) 
        }
        /* handle msg if parse to JSON failed */
        catch(err) {
          let message = msg.data + ' \n ' + msg.origin;
          console.log(`message wasn't JSON: \n ${msg.data}`);
          res(showWSMessage(message));
        }
      })
      .then(ws.send('from client: message received!'))
    }
    
    return Promise.resolve(true);
  }
  /* display websocket messages in the system messages section of the webpage */ 
  function showWSMessage(message) {
    let wsMessages = _this.page.wsMessages;
    wsMessages.textContent += message+'\n';
  }
} // -- end startWSConnection()

// TODO -- initiate a modal that briefly displays a success or fail message 
// when user tries to update data through the server
userPageLogic.resultNotify = function(result) {
  console.log(result);
  // create a modal that briefly displays the success/fail message for the action
  // and then disappears on its own
}

/** 
 * Updates the app display to reflect current data sent via websocket
 * 
 * @param {Object} elements
 *  - object reflecting elements of the DOM to update
 *  
 */  
userPageLogic.updateDOM = function(elements) {
  if (elements.result) {
    if (elements.result === "success") {
      this.resultNotify("success")
    } else {
      this.resultNotify("fail")
    }
  }
  if (elements.smsOpt) {
    this.page.smsRadio.checked = elements.smsOpt;
    this.page.smsNo.classList.toggle('hide');
    this.page.smsYes.classList.toggle('hide');
    this.page.smsRadio.disabled = false;
  }
  if (elements.totalHours) {
    this.page.totalHours.textContent = elements.totalHours;
  }
  if (elements.thisMonthHours) {
    this.page.latestHrs.textContent = elements.thisMonthHours;
  }
  if (elements.email) {
    this.page.username.textContent = elements.email;
  }
} // -- end updateDOM
  
userPageLogic.connectFacebook = function() {
  let fbLogin = userPageLogic.fbLoginUrl;
  let appId = userPageLogic.fbAppId;
  let redirect = userPageLogic.fbRedirect;
  location.href=`${fbLogin}?client_id=${appId}&redirect_uri=${redirect}`
}
  
userPageLogic.reportHours = function(event) {
  let _this = this;
  event.preventDefault();
  let userData = {};
  let monthList = document.getElementById('month-list');
  let hoursInput = document.getElementById('new-hrs');
  let yearInput = document.getElementById('hrs-year');
  userData.month = monthList.selectedOptions[0].innerHTML;
  userData.hours = parseInt(hoursInput.value, 10);
  userData.year = parseInt(yearInput.value, 10);
  axios.post('/user/api/hours-update', userData)
  .then((response) => {
    if (response) console.log('res to axios post: ', response);
  })
  .catch((err) => {
    _this.userData.err = err;
    console.log('error submitting new hours: \n', err);
  });
}
  
userPageLogic.getUserData = function() {
  let _this = this;
  axios.get('/user/api/data')
  .then((data) => {
      Object.assign(_this.userData, data); 
  })
  .catch((err) => {
    _this.userData.err = err;
    console.log('error getting user data: \n', err);
  });
} // -- end getUserData()
  
userPageLogic.initUserLogic = function() { 
  let _this = this;
  this.startWSConnection();
  window.fbAsyncInit = function() {
    FB.init({
      appId            : config.FACEBOOK_APP_ID,
      autoLogAppEvents : true,
      xfbml            : true,
      version          : 'v2.10'
    });
    FB.AppEvents.logPageView();
    _this.page.smsRadio.addEventListener('click', _this.setSMSOpt);
    _this.page.connFbBtn.addEventListener('click', _this.connectFacebook);
    _this.page.fbPubBtn.addEventListener('click', _this.shareDialog);
    _this.page.reportHrsBtn.addEventListener('click', _this.reportHours);
  };
  (function(d, s, id){
    let js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) {return;}
    js = d.createElement(s); js.id = id;
    js.src = "//connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'facebook-jssdk'));
} // -- end initUserLogic()
  
userPageLogic.setSMSOpt = function(event) {
  let _this = userPageLogic;
  let smsRadio = _this.page.smsRadio;
  let smsYes = _this.page.smsYes;
  let smsNo = _this.page.smsNo;
  /* pull the data from the user object not the DOM. */
  let smsBefore = _this.userData.smsOpt;
  if(!_this.smsProcessing) {
    _this.smsProcessing = true;
    smsRadio.disabled = true;
    if (smsBefore === true){ 
      console.log('smsRadio checked now false')
      smsRadio.checked = false
      } else { 
        console.log('smsRadio checked now true')
        smsRadio.checked = true;
      }
    smsNo.classList.toggle('hide');
    smsYes.classList.toggle('hide');
    let choice = !smsBefore;
    console.log('sms choice: ', choice);
    axios.post('/user/api/sms-opt', { smsOpt : choice} )
    .then(() => {
      _this.smsProcessing = false;
      console.log('smsOpt success');
      _this.userData.smsOpt = choice;
      smsRadio.disabled = false;
    })
    .catch((err) => {
      _this.smsProcessing = false;
      smsRadio.disabled = false;
      smsRadio.checked = smsBefore;
      console.log('post req error: \n', err);
      // radio button won't be changed
      //smsBefore ? smsRadio.checked = false : smsRadio.checked = true;
    });
  } 
  return true;    
} // -- end setSMSOpt()
  
userPageLogic.shareDialog = function() {
  let _this = userPageLogic; 
  FB.ui({
    method: 'share',
    display: 'popup',
    href: _this.orgURL,
    quote: _this.FBhrsQuote,
    hashtag: _this.orgHashtag
  }, function(response){});
}
  
userPageLogic.initUserLogic();
