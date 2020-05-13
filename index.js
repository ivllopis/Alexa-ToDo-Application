const express = require('express');
const path = require('path');
const axios = require('axios');
const qs = require('qs');
require('dotenv').config();


//In-memory storage of logged-in users
// For demo purposes only, production apps should store this in a reliable storage

var users = {};

const app = express();

app.use(express.static('public')); //serves automatically index.html

app.get('/', (req, res) => {
  //res.sendFile(path.join(__dirname, 'index.html'));
  //res.send("Hello World.")
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`);
});