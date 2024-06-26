// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

const express = require('express'); // To build an application server or API
const app = express();
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcrypt'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part B.

// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************

// database configuration
const dbConfig = {
  host: 'db', // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// test your database
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

// *****************************************************
// <!-- Section 3 : App Settings -->
// *****************************************************

app.set('view engine', 'ejs'); // set the view engine to EJS
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.

// initialize session variables
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************

app.get('/', (req, res) => {
    res.redirect('/login');
});

// Register
app.get('/register', (req, res) => {
  res.render('pages/register', {message: req.query.error})
});

// Register
app.post('/register', async (req, res) => {
  try {
    //hash the password using bcrypt library
    const hash = await bcrypt.hash(req.body.password, 10);
  
    // To-DO: Insert username and hashed password into the 'users' table
    const query = `INSERT INTO users (username, password) VALUES ('${req.body.username}', '${hash}');`;
    const name = await db.any(query);
    res.redirect('/login');

  } catch (error) {
    console.log(error);
    res.redirect('/register');
  }
});

// Login
app.get('/login', (req, res) => {
  res.render('pages/login')
});

// Login
app.post('/login', async (req, res) => {
  try {
    const username = req.body.username;
    const password = req.body.password;
    const query = `select * from users where users.username = $1;`;
  
    const user = await db.one(query, username)
    // check if password from request matches with password in DB
    const match = await bcrypt.compare(req.body.password, user.password);
    if(match) {
      user.username = username;
      user.password = password;

      req.session.user = user;
      req.session.save();
      res.redirect("/discover");
      }
      else {
        console.log(error);
        res.redirect("/login");
      }
  } catch (error) {
    console.log(error);
    const errorMessage = "Incorrect username or password.";
    res.redirect(`/register?error=${encodeURIComponent(errorMessage)}`)
  }
});

// Authentication Middleware.
const auth = (req, res, next) => {
  if (!req.session.user) {
    // Default to login page.
    return res.redirect('/login');
  }
  next();
};
// Authentication Required
app.use(auth);

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.render("pages/login");
});

// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
app.listen(3000);
console.log('Server is listening on port 3000');