const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const hbs  = require('express-handlebars');
var session = require('express-session');
const flash = require('connect-flash');

require('dotenv').config();

// Routes
const seriesRouter = require('./routes/series');
const moviesRouter = require('./routes/movies');
const videogamesRouter = require('./routes/videogames');
const booksRouter = require('./routes/books');
const authRouter = require('./routes/auth');
const updateDatabase = require('./routes/update_database');

// Configure passport
//In-memory storage of logged-in users
// For demo purposes only, production apps should store this in a reliable storage

const app = express();

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Add headers for the 'origin blocked' CORS policy
app.use(function (req, res, next) {

  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5000');

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);

  // Pass to next layer of middleware
  next();
});

// <SessionSnippet>
// Session middleware
// NOTE: Uses default in-memory session store, which is not
// suitable for production
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  unset: 'destroy'
}));

// Flash middleware
app.use(flash());

// Set up local vars for template layout
app.use((req, res, next) => {
  // Set the authenticated user in the
  // template locals
  if (req.session.user) {
    res.locals.user = req.session.user;
  }
  next();
});

// View engine setup
// Use `.hbs` for extensions and find partials in `views/partials`.
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
app.use('/books', booksRouter);
app.use('/auth', authRouter);

updateDatabase(); /////////

app.get('/', (req, res) => {
  res.redirect('/series');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});