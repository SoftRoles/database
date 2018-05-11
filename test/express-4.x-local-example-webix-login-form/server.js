var express = require('express');
var passport = require('passport');
var Strategy = require('passport-local').Strategy;
// var db = require('./db');

// Module related packages
var MongoClient = require("mongodb").MongoClient
var MongoObjectID = require('mongodb').ObjectID;


// Create a new Express application.
var app = express();

app.use("/bower_components", express.static(__dirname + "/public/bower_components"))


//==================================================================================================
// Local Passport
//==================================================================================================
// Configure the local strategy for use by Passport.
//
// The local strategy require a `verify` function which receives the credentials
// (`username` and `password`) submitted by the user.  The function must verify
// that the password is correct and then invoke `cb` with a user object, which
// will be set at `req.user` in route handlers after authentication.
passport.use(new Strategy(
  function (username, password, cb) {
    MongoClient.connect(mongodb_url + "/auth", function (err, db) {
      db.collection("local").findOne({ username: username }, function (err, user) {
        if (err) return cb(err)
        if (!user) { return cb(null, false); }
        if (user.password != password) { return cb(null, false); }
        return cb(null, user);
        db.close();
      });
    });
  }));
  
  
  // Configure Passport authenticated session persistence.
  //
  // In order to restore authentication state across HTTP requests, Passport needs
  // to serialize users into and deserialize users out of the session.  The
  // typical implementation of this is as simple as supplying the user ID when
  // serializing, and querying the user record by ID from the database when
  // deserializing.
  passport.serializeUser(function (user, cb) {
    cb(null, user.username);
  });
  
  passport.deserializeUser(function (username, cb) {
    MongoClient.connect(mongodb_url + "/auth", function (err, db) {
      db.collection("local").findOne({ username: username }, function (err, user) {
        if (err) return cb(err)
        if (!user) { return cb(null, false); }
        return cb(null, user);
        db.close();
      });
    });
  });
  
  
  // Configure view engine to render EJS templates.
  // app.set('views', __dirname + '/views');
  // app.set('view engine', 'ejs');
  
  // Use application-level middleware for common functionality, including
  // logging, parsing, and session handling.
  app.use(require('morgan')('combined'));
  app.use(require('cookie-parser')());
  app.use(require('body-parser').urlencoded({ extended: true }));
  app.use(require('express-session')({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));
  
  // Initialize Passport and restore authentication state, if any, from the
  // session.
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Define routes.
  app.get('/', function (req, res) {
    res.redirect("/admin")
    // res.render('home', { user: req.user });
    // res.sendFile(__dirname + '/public/index.html');
  });
  
  app.get('/login',
  function (req, res) {
    res.sendFile(__dirname + '/public/login.html');
    // res.render('login');
  });
  
  app.post('/login',
  passport.authenticate('local', { failureRedirect: '/login', successRedirect: '/admin' }),
  function (req, res) {
    res.redirect('/');
  });
  
  app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
  });
  
  
  app.get('/admin', require('connect-ensure-login').ensureLoggedIn(), function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
    // res.render('profile', { user: req.user });
  });
  
  app.get('/bearer', require('connect-ensure-login').ensureLoggedIn(), function (req, res) {
    MongoClient.connect(mongodb_url + "/auth", function (err, db) {
      db.collection("bearer").findOne({}, function (err, user) {
        console.log(user)
        if (err) res.send(err)
      else res.send(user)
      db.close();
    });
  });
});

//==================================================================================================
// MongoDB
//==================================================================================================
var mongodb_url = "mongodb://localhost:27017"

app.get("/mongodb", passport.authenticate('bearer', { session: false }), function (req, res) {
  MongoClient.connect(mongodb_url + "/test", function (err, db) {
    var adminDb = db.admin();
    adminDb.listDatabases(function (err, dbs) {
      res.send(dbs)
      db.close()
    })
  })
})

app.get("/mongodb/:db", passport.authenticate('bearer', { session: false }), function (req, res) {
  MongoClient.connect(mongodb_url + "/" + req.params.db, function (err, db) {
    db.listCollections().toArray(function (err, items) {
      res.send(items)
      db.close()
    })
  })
})

app.post("/mongodb/:db/:col", passport.authenticate('bearer', { session: false }), function (req, res) {
  MongoClient.connect(mongodb_url + "/" + req.params.db, function (err, db) {
    db.collection(req.params.col).insertOne(req.body, function (err, r) {
      if (err) res.send({ error: err })
      else res.send(r)
      db.close()
    })
  });
})

app.get("/mongodb/:db/:col", passport.authenticate('bearer', { session: false }), function (req, res) {
  MongoClient.connect(mongodb_url + "/" + req.params.db, function (err, db) {
    db.collection(req.params.col).find(req.query).toArray(function (err, docs) {
      if (err) res.send({ error: err })
      else {
        docs.forEach(function (item) { item.id = item._id; delete item._id }, this);
        res.send(docs)
      }
      db.close();
    });
  });
})

app.put("/mongodb/:db/:col/:id", passport.authenticate('bearer', { session: false }), function (req, res) {
  console.log(req)
  MongoClient.connect(mongodb_url + "/" + req.params.db, function (err, db) {
    db.collection(req.params.col).updateOne({ _id: MongoObjectID(req.params.id) }, req.body, function (err, item) {
      if (err) res.send({ error: err })
      else res.send(item)
      db.close()
    })
  });
})

app.delete("/mongodb/:db/:col/:id", passport.authenticate('bearer', { session: false }), function (req, res) {
  MongoClient.connect(mongodb_url + "/" + req.params.db, function (err, db) {
    db.collection(req.params.col).deleteOne({ _id: MongoObjectID(req.params.id) }, function (err, r) {
      if (err) res.send({ error: err })
      else res.send(r)
      db.close()
    })
  });
})

app.listen(8888);
