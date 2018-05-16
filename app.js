var express = require('express');
var bodyParser = require("body-parser")
var cors = require("cors")

var passport = require('passport');
var passStrategyLocal = require('passport-local').Strategy;
var passStrategyBearer = require('passport-http-bearer').Strategy;


// Module related packages
var MongoClient = require("mongodb").MongoClient
var MongoObjectID = require('mongodb').ObjectID;


// Create a new Express application.
var app = express();

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors())
// app.use("/bower_components", express.static(__dirname + "/public/bower_components"))
app.use("/mongodb/bower_components", express.static(__dirname + "/public/bower_components"))

//==================================================================================================
// Bearer Passport
//==================================================================================================
passport.use(new passStrategyBearer(function (token, cb) {
  MongoClient.connect(mongodb_url + "/auth", function (err, db) {
    db.collection("users").findOne({ token: token }, function (err, user) {
      if (err) return cb(err)
      if (!user) { return cb(null, false); }
      return cb(null, user);
      db.close();
    });
  });
}));


//==================================================================================================
// Local Passport
//==================================================================================================
// Configure the local strategy for use by Passport.
//
// The local strategy require a `verify` function which receives the credentials
// (`username` and `password`) submitted by the user.  The function must verify
// that the password is correct and then invoke `cb` with a user object, which
// will be set at `req.user` in route handlers after authentication.
passport.use(new passStrategyLocal(function (username, password, cb) {
  // console.log("[3005-mongodb]: passport.use", username, password)
  MongoClient.connect(mongodb_url + "/auth", function (err, db) {
    db.collection("users").findOne({ username: username }, function (err, user) {
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
  // console.log("[3005-mongodb]: passport.serializeUser", user)
  cb(null, user.username);
});

passport.deserializeUser(function (username, cb) {
  // console.log("[3005-mongodb]: passport.deserializeUser", username)
  MongoClient.connect(mongodb_url + "/auth", function (err, db) {
    db.collection("users").findOne({ username: username }, function (err, user) {
      if (err) return cb(err)
      if (!user) { return cb(null, false); }
      return cb(null, user);
      db.close();
    });
  });
});


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

app.get('/mongodb/login', function (req, res) {
  res.sendFile(__dirname + '/public/login.html');
});

app.post('/mongodb/login', passport.authenticate('local', { failureRedirect: '/mongodb/login', successRedirect: '/mongodb/admin' }), function (req, res) {
    res.redirect('/mongodb/admin');
  });

app.get('/mongodb/logout', function (req, res) {
  req.logout();
  res.redirect('/mongodb/admin');
});


app.get('/mongodb/admin', require('connect-ensure-login').ensureLoggedIn({ redirectTo: "/mongodb/login" }), function (req, res) {
  // console.log(req.headers)
  if (req.user.username == "admin") res.sendFile(__dirname + '/public/index.html')
  else res.send(403);
});

app.get('/mongodb/bearer', require('connect-ensure-login').ensureLoggedIn(), function (req, res) {
  // console.log("[3005-mongodb]: /bearer", req.user)
  MongoClient.connect(mongodb_url + "/auth", function (err, db) {
    db.collection("users").findOne({ token: req.user.token }, function (err, user) {
      // console.log(user)
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

app.get("/mongodb/api", passport.authenticate('bearer', { session: false }), function (req, res) {
  // console.log(req.user)
  MongoClient.connect(mongodb_url + "/test", function (err, db) {
    var adminDb = db.admin();
    adminDb.listDatabases(function (err, dbs) {
      // console.log(dbs)
      if (req.user.username == "admin") res.send(dbs.databases)
      else res.send([])
      db.close()
    })
  })
})

app.get("/mongodb/api/:db", passport.authenticate('bearer', { session: false }), function (req, res) {
  MongoClient.connect(mongodb_url + "/" + req.params.db, function (err, db) {
    db.listCollections().toArray(function (err, items) {
      res.send(items)
      db.close()
    })
  })
})

app.post("/mongodb/api/:db/:col", passport.authenticate('bearer', { session: false }), function (req, res) {
  MongoClient.connect(mongodb_url + "/" + req.params.db, function (err, db) {
    db.collection(req.params.col).insertOne(req.body, function (err, r) {
      if (err) res.send({ error: err })
      else res.send(r)
      db.close()
    })
  });
})

app.get("/mongodb/api/:db/:col", passport.authenticate('bearer', { session: false }), function (req, res) {
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

app.put("/mongodb/api/:db/:col/:id", passport.authenticate('bearer', { session: false }), function (req, res) {
  console.log(req)
  MongoClient.connect(mongodb_url + "/" + req.params.db, function (err, db) {
    db.collection(req.params.col).updateOne({ _id: MongoObjectID(req.params.id) }, req.body, function (err, item) {
      if (err) res.send({ error: err })
      else res.send(item)
      db.close()
    })
  });
})

app.delete("/mongodb/api/:db/:col/:id", passport.authenticate('bearer', { session: false }), function (req, res) {
  MongoClient.connect(mongodb_url + "/" + req.params.db, function (err, db) {
    db.collection(req.params.col).deleteOne({ _id: MongoObjectID(req.params.id) }, function (err, r) {
      if (err) res.send({ error: err })
      else res.send(r)
      db.close()
    })
  });
})


app.listen(3005, function () {
  console.log("Service 3005-mongodb running on http://127.0.0.1:3005")
})
