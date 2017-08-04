const express = require('express')
const bodyParser = require('body-parser')
const session = require('express-session')
const path = require('path')
const mongoClient = require('mongodb').MongoClient

const prodAuthURL = {
  auth: '',
  volData: '',
  sessions: ''
}
const devURL = {
  auth: 'mongodb://localhost:27017/vtextAuth',
  volData: 'mongodb://localhost:27017/vtextVolData',
  sessions: 'mongodb://localhost:27017/vtextSessions'
}

const 



const app = express()



