const express = require('express');
const session = require('express-session');
const path = require('path');

const indexRouter = require('./routes/index');
const convertRouter = require('./routes/convert');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Body parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'j2e-dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 60 * 1000 } // 30 minutes
}));

// Routes
app.use('/', indexRouter);
app.use('/', convertRouter);

// 404
app.use((req, res) => {
  res.status(404).render('index', { error: 'Page not found.' });
});

// 500
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('index', { error: 'Internal server error: ' + err.message });
});

app.listen(PORT, () => {
  console.log(`Json2excel running at http://localhost:${PORT}`);
});
