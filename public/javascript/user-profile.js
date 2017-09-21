
const userPageLogic = {
  userData : {},
  ws : null,
  smsProcessing : false,
  userPageElements : {
    smsRadio : document.getElementById('sms-radio'),
    smsSlider : document.getElementById('sms-slider'),
    smsYes : document.getElementById('sms-yes'),
    smsNo : document.getElementById('sms-no'),
    wsMessages : document.getElementById('ws-messages')
  },
  startWSConnection : function() {
    let _this = this;
    if (this.ws) {
      this.ws.close();  
    } else {
      this.ws = new WebSocket('ws://localhost:3000');
      this.ws.onerror = () => showWSMessage('Sorry, there was an error establishing a realtime connection to the app server.');
      this.ws.onopen = () => showWSMessage('Realtime connection to app server established.');
      this.ws.onclose = () => showWSMessage('Realtime connection to app server closed.');
      this.ws.onmessage = (msg) => { 
        // data = data sent
        // origin = origin (uri) of the message emitter
        // lastEventId = unique ID for the event
        // ports = array of MessagePort objects for the channel
        new Promise((res, rej) => {
          let message = msg.data + ' \n ' + msg.origin;
          res(showWSMessage(message));
        })
        .then(this.ws.send('client: message received!'))
      }
    }
    function showWSMessage(message) {
      let wsMessages = _this.userPageElements.wsMessages;
      wsMessages.textContent += message+'/n';
    }
  },
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
  },
  initUserLogic : function() {
    let pageElems = this.userPageElements;
    pageElems.smsRadio.addEventListener('click', this.setSMSOpt);
    this.startWSConnection();
  },
  setSMSOpt : function(event) {
    let _this = this;
    let pgElems = this.userPageElements;
    let smsRadio = pgElems.smsRadio;
    let smsYes = pgElems.smsYes;
    let smsNo = pgElems.smsNo;
    let smsChoice = smsRadio.checked;
    event.preventDefault();
    if(!this.smsProcessing) {
      this.smsProcessing = true;
      smsRadio.checked ? smsRadio.checked = false : smsRadio.checked = true;
      smsNo.classList.toggle('hide');
      smsYes.classList.toggle('hide');
      axios.post('/user/api/sms-opt', smsChoice )
      .then(() => {
        _this.smsProcessing = false;
        console.log('smsOpt success');
      })
      .catch((err) => {
        _this.smsProcessing = false;
        console.log('post req error: \n', err);
        // revert the radio button if option change failed to save
        smsRadio.checked ? smsRadio.checked = false : smsRadio.checked = true;
      });
    } 
    return true;    
  }
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