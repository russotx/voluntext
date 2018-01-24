/*
*
*   CONFIGURE THE WEBSOCKET SERVER & WEBSOCKETS BEHAVIOR
*
*/

require('dotenv').config()
/* the admin user's userId */
const adminId = process.env.ADMINID
const AnnualLogs = require('../models/voldata-db').annualLogs
const VolData = require('../models/voldata-db').volData

module.exports = (wsServer) => {
  
  /* property to contain socket instances in an object (accessing object properties is fast) */
  wsServer.userSockets = {}
  
  /**
   * Callback:
   * @param {Object} socket - the WebSocket instance
   * @param {Object} req - the request object (not the same as the req to the 
   *                       http server)
   */
  wsServer.on('connection', (socket, req) => {
    /* uses the sesssion parser in ws Server for access to session data */
    let userId = req.session.passport.user
    socket.userId = userId
    /* add reference to the socket on the Server with userId as key */
    wsServer.userSockets[userId] = socket
    
    console.log(`ws user: \n ${userId}`)
    console.log('SOCKET CONNECTION CREATED.')
    
    /* send admin data or user data over the socket */ 
    if (userId === adminId) {
      AnnualLogs.getAdminDashboardData()
      .then((data) => {
        socket.sendValidData(data) 
      })
    } else {
      /* call getter to retrieve the user's relevent data from the database 
         to display on their dashboard page */
      VolData.getUserData(userId)
      .then((userData) => {
        socket.sendValidData(userData) 
      })
    }
    
    /* incoming message from client received */
    socket.on('message', (message) => {
      console.log(`WS message: ${message} \n  - from user: ${userId}`)
    }) 

    /* socket instance closed */
    socket.on('close', (code, reason) => {
      /* remove the socket id (by userID) from the object of active sockets */
      delete wsServer.userSockets[userId]
      console.log(`Socket closed: ${code} for: ${reason}`)
    })
    
  }) /* -- end of 'connection' event */
  
  /* Custom 'new-hours' event triggered when a user updates their hours, calls 
     function to update the admin dashboard data if admin is logged in */
  wsServer.on('new-hours', () => {
    if (wsServer.userSockets[adminId]) {
      AnnualLogs.getAdminDashboardData()
      .then((data) => {
        wsServer.userSockets[adminId].sendValidData(data)
      })  
    }
  })
  
  /* WebSocket Server error */
  wsServer.on('error',(err) => {
    console.log('error with websocket server: ', err)
  })

  /* WebSocket Server is running and listening for connections */
  wsServer.on('listening', () => {
    console.log('ws server: underlying server bound')
  })
  
} /* -- end of exports */

