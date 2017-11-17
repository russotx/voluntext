/*
*
*   CONFIGURE THE WEBSOCKET SERVER BEHAVIOR
*
*/

module.exports = (wsServer) => {
  // add property to contain socket instances in an object (accessing object properties is fast)
  wsServer.userSockets = {}
  
  wsServer.on('connection', (socket, req) => {
    /*
        socket = the WebSocket instance
        req = the request object (not the same as the req to http server)  
    */
    /* uses the sesssion parser in ws Server for access to session data */
    let userId = req.session.passport.user
    socket.userId = userId
    /* add reference to the socket on the Server with userId as key */
    wsServer.userSockets[userId] = socket
    
    console.log(`ws user: \n ${userId}`)
    console.log('SOCKET CONNECTION CREATED.')
    
    //console.log('socket: attempting to get user data...')
    socket.sendUserData(userId)
    socket.emit('tester')
    
    // incoming message from client received
    socket.on('message', (message) => {
      console.log(`WS message: ${message} \n  - from user: ${userId}`)
    }) 

    // socket instance closed
    socket.on('close', (code, reason) => {
      delete wsServer.userSockets[userId]
      console.log(`Socket closed: ${code} for: ${reason}`)
    })
    
  })
  
  // WebSocket Server error
  wsServer.on('error',(err) => {
    console.log('error with websocket server: ', err)
  })

  // WebSocket Server is running and listening for connections
  wsServer.on('listening', () => {
    console.log('ws server: underlying server bound')
  })
  
}

