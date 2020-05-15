const express = require('express');
const router = express.Router();
const path = require('path');
const axios = require('axios');
const hbs  = require('express-handlebars');
//const qs = require('qs');
require('dotenv').config();

const seriesRouter = require('./routes/series');
const moviesRouter = require('./routes/movies');
const videogamesRouter = require('./routes/videogames');


//In-memory storage of logged-in users
// For demo purposes only, production apps should store this in a reliable storage

//var users = {};

const app = express();

app.use(express.static('public')); //serves automatically index.html

// View engine setup
// Use `.hbs` for extensions and find partials in `views/partials`.
console.log(path.join(__dirname, 'views/layouts'));
app.engine('hbs', hbs({
  extname: '.hbs',
  defaultLayout: 'layout',
  partialsDir:  path.join(__dirname, 'views/partials'),
  layoutsDir:  path.join(__dirname, 'views/layouts')
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.use('/series', seriesRouter);
app.use('/movies', moviesRouter);
app.use('/videogames', videogamesRouter);

app.get('/', (req, res) => {
  // res.render('index');
  res.redirect('/series');
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`);
});