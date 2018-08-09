var express = require('express');
var assert = require('assert');

var passport = require('passport');
var connectEnsureLogin = require('connect-ensure-login')

var session = require('express-session');
var mongodbSessionStore = require('connect-mongodb-session')(session);

// Module related packages
var mongoClient = require("mongodb").MongoClient
var mongoObjectId = require('mongodb').ObjectID;
var mongodbUrl = "mongodb://127.0.0.1:27017"

// Create a new Express application.
var app = express();

var store = new mongodbSessionStore({
  uri: mongodbUrl,
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
app.use("/mongodb/bower_components", express.static(__dirname + "/public/bower_components"))

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
  mongoClient.connect(mongodbUrl + "/auth", function (err, db) {
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

app.get('/mongodb', connectEnsureLogin.ensureLoggedIn({ redirectTo: "/login?source=mongodb" }), function (req, res) {
  if (req.user.username == "admin") res.sendFile(__dirname + '/public/index.html')
  else { req.logout(); res.send(403); }
});


//==================================================================================================
// API
//==================================================================================================
app.get("/mongodb/api", connectEnsureLogin.ensureLoggedIn(), function (req, res) {
  mongoClient.connect(mongodbUrl + "/test", function (err, db) {
    var adminDb = db.admin();
    adminDb.listDatabases(function (err, dbs) {
      if (req.user.username == "admin" || req.user.username == "hsyn") res.send(dbs.databases)
      else res.send([])
      db.close()
    })
  })
})

app.get("/mongodb/api/:db", connectEnsureLogin.ensureLoggedIn(), function (req, res) {
  mongoClient.connect(mongodbUrl + "/" + req.params.db, function (err, db) {
    db.listCollections().toArray(function (err, items) {
      if (req.user.username == "admin" || req.user.username == "hsyn") res.send(items)
      else res.send([])
      db.close()
    })
  })
})

app.get("/mongodb/api/:db/:col", connectEnsureLogin.ensureLoggedIn(), function (req, res) {
  req.query.users = req.user.username
  mongoClient.connect(mongodbUrl + "/" + req.params.db, function (err, db) {
    db.collection(req.params.col).find(req.query).toArray(function (err, docs) {
      if (err) res.send({ error: err })
      else res.send(docs)
      db.close();
    });
  });
})

app.post("/mongodb/api/:db/:col", connectEnsureLogin.ensureLoggedIn(), function (req, res) {
  if (req.body.users) { req.body.users.push(req.user.username) }
  else { req.body.users = [req.user.username] }
  if (req.body.owners) { req.body.owners.push(req.user.username) }
  else { req.body.owners = [req.user.username] }
  if (req.body.users.indexOf("admin") === -1) { req.body.users.push("admin") }
  if (req.body.owners.indexOf("admin") === -1) { req.body.owners.push("admin") }
  mongoClient.connect(mongodbUrl + "/" + req.params.db, function (err, db) {
    db.collection(req.params.col).insertOne(req.body, function (err, r) {
      if (err) res.send({ error: err })
      else res.send(Object.assign({}, r.result, { insertedId: r.insertedId }))
      db.close()
    })
  });
})

app.get("/mongodb/api/:db/:col/:id", connectEnsureLogin.ensureLoggedIn(), function (req, res) {
  var query = { users: req.user.username }
  query._id = mongoObjectId(req.params.id)
  mongoClient.connect(mongodbUrl + "/" + req.params.db, function (err, db) {
    db.collection(req.params.col).findOne(query, function (err, doc) {
      if (err) res.send({ error: err })
      else res.send(doc)
      db.close();
    });
  });
})

app.put("/mongodb/api/:db/:col/:id", connectEnsureLogin.ensureLoggedIn(), function (req, res) {
  var query = { users: req.user.username }
  query._id = mongoObjectId(req.params.id)
  delete req.body._id
  mongoClient.connect(mongodbUrl + "/" + req.params.db, function (err, db) {
    db.collection(req.params.col).updateOne(query, { "$set": req.body }, function (err, r) {
      if (err) res.send({ error: err })
      else res.send(Object.assign({}, r.result))
      db.close()
    })
  })
})

app.delete("/mongodb/api/:db/:col/:id", connectEnsureLogin.ensureLoggedIn(), function (req, res) {
  var query = { users: req.user.username }
  query._id = mongoObjectId(req.params.id)
  mongoClient.connect(mongodbUrl + "/" + req.params.db, function (err, db) {
    db.collection(req.params.col).deleteOne(query, function (err, r) {
      if (err) res.send({ error: err })
      else res.send(Object.assign({}, r.result))
      db.close()
    })
  })
})


app.listen(3005, function () {
  console.log("Service 3005-mongodb running on http://127.0.0.1:3005")
})
