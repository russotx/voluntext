/*
*
*   CONFIGURE A WEBSOCKET SERVER
*
*/
  
module.exports = (wsServer) => {

  wsServer.on('connection', (socket, req) => {
    let user = req.session.passport.user
    console.log('SOCKET CONNECTION CREATED!!')

    socket.on('message', (message) => {
      console.log(`WS message: ${message} \n from user: ${user}`)
    })

    socket.on('close', (code, reason) => {
      console.log(`Socket closed: ${code} for: ${reason}`)
    })

    socket.send('hello from voluntext')

  })

  // websocket error
  wsServer.on('error',(err) => {
    console.log('error with websocket server: ',err)
  })

  wsServer.on('listening', () => {
    console.log('ws: underlying server bound')
  })

  wsServer.on('open', () => {
    console.log('websocket connection opened')
  })

  wsServer.on('close', () => {
    console.log('websocket connection closed')
  })

}

