const wsButton = document.getElementById('ws-button');
const wsMessages = document.getElementById('ws-messages');
let ws;

const config = {
  WEBSOCKET_URL : location.origin.replace(/^http/, 'ws'),
  ORG_URL : 'http://casatravis.org',
  ORG_HASH : 'casatravis'
}

function showMessage(message) {
  wsMessages.textContent += message+'\n';
}

function startConnection() {
  if (ws) {
    ws.close()
  } else {
    ws = new WebSocket(config.WEBSOCKET_URL);
    ws.onerror = () => showMessage('WebSocket error');
    ws.onopen = () => showMessage('WebSocket connection established');
    ws.onclose = () => showMessage('WebSocket connection closed');
    ws.onmessage = (msg) => { 
      // data = data sent
      // origin = origin (uri) of the message emitter
      // lastEventId = unique ID for the event
      // ports = array of MessagePort objects for the channel
      new Promise((res,rej) => {
        let message = msg.data + ' \n ' + msg.origin;
        res(showMessage(message));
      })
      .then(ws.send('client: message received!'))
    }
  }

}

wsButton.addEventListener('click',startConnection, false);

