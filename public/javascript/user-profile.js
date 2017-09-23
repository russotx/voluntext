
const userPageLogic = {
  
  userData : {},
  ws : null,
  smsProcessing : false,
  
  page : {
    smsRadio : document.getElementById('sms-radio'),
    smsSlider : document.getElementById('sms-slider'),
    smsYes : document.getElementById('sms-yes'),
    smsNo : document.getElementById('sms-no'),
    totalHours : document.getElementById('total-hours'),
    wsMessages : document.getElementById('ws-messages')
  },
  
  startWSConnection : function() {
    let _this = this;
    let ws = this.ws;
    if (ws) {
      ws.close();  
      return new Promise.resolve(false);
    } else {
      ws = new WebSocket('ws://localhost:3000');
      ws.onerror = () => showWSMessage('Sorry, there was an error establishing a realtime connection to the app server. \n');
      ws.onopen = () => showWSMessage('Realtime connection to app server established. \n');
      ws.onclose = () => showWSMessage('Realtime connection to app server closed. \n');
      ws.onmessage = (msg) => { 
        // data = data sent
        // origin = origin (uri) of the message emitter
        // lastEventId = unique ID for the event
        // ports = array of MessagePort objects for the channel
        new Promise((res, rej) => {
          try {
            let msgObj = JSON.parse(msg.data);
            console.log(`message object: \n ${msg.data}`);
            processData(msgObj);
          }
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
    function processData(data) {
      Object.assign(_this.userData, data);
      let userData = _this.userData;
      _this.updateDOM(userData);
    }
    function showWSMessage(message) {
      let wsMessages = _this.page.wsMessages;
      wsMessages.textContent += message+'\n';
    }
  }, // -- end startWSConnection()
  
  updateDOM : function(elements){
    if (elements.smsOpt) {
      this.page.smsRadio.checked = elements.smsOpt;
      this.page.smsNo.classList.toggle('hide');
      this.page.smsYes.classList.toggle('hide');
    }
    if (elements.totalHours !== null){
      this.page.totalHours.textContent = elements.totalHours;
    }
    this.page.smsRadio.disabled = false;
  }, // -- end updateDOM
  
  getUserData : function() {
    let _this = this;
    axios.get('/user/api/data')
    .then((data) => {
        Object.assign(_this.userData, data); 
    })
    .catch((err) => {
      _this.userData.err = err;
      console.log('error getting user data: \n', err);
    });
  }, // -- end getUserData()
  
  initUserLogic : function() { 
    let _this = this;
    this.page.smsRadio.addEventListener('click', _this.setSMSOpt);
    this.startWSConnection();
  }, // -- end initUserLogic()
  
  setSMSOpt : function(event) {
    let _this = userPageLogic;
    let smsRadio = _this.page.smsRadio;
    let smsYes = _this.page.smsYes;
    let smsNo = _this.page.smsNo;
    // pull the data from the user object not the DOM.
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
  
}

userPageLogic.initUserLogic();





/*
smsSlider.addEventListener('click', (event) => {
    event.preventDefault();
    if(!smsProcessing) {
      smsProcessing = true;
      smsRadio.checked ? smsRadio.checked = false : smsRadio.checked = true;
      smsNo.classList.toggle('hide');
      smsYes.classList.toggle('hide');
      //smsRadio.disabled = true;
      toggleSMSopt()
      .then(() => {
        smsProcessing = false;
        console.log('smsOpt success');
        //smsRadio.disabled = false;
      }) 
      .catch((err) => {
        console.log('smsOpt error: ',err);
      })
    } 
    return true;
    function toggleSMSopt() {
      let smsChange = {
        optIn : smsRadio.checked
      }
      return new Promise((res, rej) => {
        axios.post('/user/api/sms-opt', smsChange )
        .then(() => {
          console.log('sent post req');
          res();
        })
        .catch((err) => {
          console.log('post req error');
          rej(err);
        });
        // setTimeout(() => {
        //   res();
        // }, 8000);
      });
    }
  });
*/