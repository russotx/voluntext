const adminPageLogic = {
  page : {
    wsMessages : document.getElementById('messages')
  }
}

adminPageLogic.startWSConnection = function() {
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
            /* TODO -- implement loading data to the screen via a DOM updater function */
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

adminPageLogic.init = function() {
  this.startWSConnection();
}

adminPageLogic.init();