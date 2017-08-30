const wsButton = document.getElementById('ws-button');
const wsMessages = document.getElementById('ws-messages');
let ws;

function showMessage(message) {
  wsMessages.textContent += message;
}

function startConnection() {
  if (ws) {
    ws.close()
  } else {
    ws = new WebSocket('ws://localhost:3000');
    ws.onerror = () => showMessage('WebSocket error');
    ws.onopen = () => showMessage('WebSocket connection established');
    ws.onclose = () => showMessage('WebSocket connection closed');
  }

}

wsButton.addEventListener('click',startConnection, false);

