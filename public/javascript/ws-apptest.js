const wsButton = document.getElementById('ws-button');
const wsMessages = document.getElementById('ws-messages');
let ws;

function showMessage(message) {
  wsMessages.textContent = message;
}

function startConnection() {
  if (ws) {
    ws.close()
  } else {
    ws = new WebSocket('ws://localhost:3000');

  }

}

wsButton.addEventListener('click',startConnection, false);

