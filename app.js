var express = require('express');

var passport = require('passport');
var passStrategyLocal = require('passport-local').Strategy;
var passStrategyBearer = require('passport-http-bearer').Strategy;

var session = require('express-session');
var mongodbSessionStore = require('connect-mongodb-session')(session);


// Module related packages
var MongoClient = require("mongodb").MongoClient
var MongoObjectID = require('mongodb').ObjectID;
var mongodb_url = "mongodb://127.0.0.1:27017"

// Create a new Express application.
var app = express();

var store = new mongodbSessionStore(
  {
    uri: 'mongodb://127.0.0.1:27017/auth',
    databaseName: 'auth',
    collection: 'sessions'
  });

// Catch errors
store.on('error', function (error) {
  assert.ifError(error);
  assert.ok(false);
});

app.use(require('express-session')({
  secret: 'This is a secret',
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  },
  store: store,
  // Boilerplate options, see:
  // * https://www.npmjs.com/package/express-session#resave
  // * https://www.npmjs.com/package/express-session#saveuninitialized
  resave: true,
  saveUninitialized: true
}));

app.use(require('morgan')('tiny'));
app.use(require('body-parser').json())
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require("cors")())
app.use("/bower_components", express.static(__dirname + "/public/bower_components"))
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


// serializing, and querying the user record by ID from the database when
// deserializing.
passport.serializeUser(function (user, cb) {
  // console.log("[3005-mongodb]: passport.serializeUser", user)
  cb(null, user.username);
});

passport.deserializeUser(function (username, cb) {
  MongoClient.connect(mongodb_url + "/auth", function (err, db) {
    db.collection("users").findOne({ username: username }, function (err, user) {
      if (err) return cb(err)
      if (!user) { return cb(null, false); }
      return cb(null, user);
      db.close();
    });
  });
});

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());

app.get('/mongodb', require('connect-ensure-login').ensureLoggedIn({ redirectTo: "/login?source=mongodb" }), function (req, res) {
  if (req.user.username == "admin") res.sendFile(__dirname + '/public/index.html')
  else { req.logout(); res.send(403); }
});

app.get('/mongodb/user', require('connect-ensure-login').ensureLoggedIn(), function (req, res) {
  MongoClient.connect(mongodb_url + "/auth", function (err, db) {
    db.collection("users").findOne({ token: req.user.token }, function (err, user) {
      if (err) res.send(err)
      else res.send(user)
      db.close();
    });
  });
});

//==================================================================================================
// MongoDB
//==================================================================================================


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
      if (req.user.username == "admin")  res.send(items)
      else res.send([])
      db.close()
    })
  })
})

app.post("/mongodb/api/:db/:col", passport.authenticate('bearer', { session: false }), function (req, res) {
  MongoClient.connect(mongodb_url + "/" + req.params.db, function (err, db) {
    req.body.username = req.user.username
    db.collection(req.params.col).insertOne(req.body, function (err, r) {
      if (err) res.send({ error: err })
      else res.send(r)
      db.close()
    })
  });
})

app.get("/mongodb/api/:db/:col", passport.authenticate('bearer', { session: false }), function (req, res) {
  if(req.user.username != "admin") req.query.username = req.user.username
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
