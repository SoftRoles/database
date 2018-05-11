// General packages
var express = require('express')
var path = require("path")
var bodyParser = require("body-parser")
var cors = require("cors")

// Module related packages
var MongoClient = require("mongodb").MongoClient
var MongoObjectID = require('mongodb').ObjectID;

// Authorization
var passport = require('passport');
var passStrategyBearer = require('passport-http-bearer').Strategy;
var passStrategyLocal = require('passport-local').Strategy;

// passport initialization 'bearer'
passport.use(new passStrategyBearer(
  function (token, cb) {
    MongoClient.connect(mongodb_url + "/auth", function (err, db) {
      db.collection("bearer").findOne({ token: token }, function (err, user) {
        if (err) return cb(err)
        if (!user) { return cb(null, false); }
        return cb(null, user);
        db.close();
      });
    });
  }));

// passport initialization 'local'
passport.use(new passStrategyLocal(
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

const app = express();
app.use(passport.initialize());
app.use(passport.session());

app.set('view engine', 'ejs');


app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));


app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors())
// app.use("/test", [require('connect-ensure-login').ensureLoggedIn(), express.static(__dirname + "/test")])
app.use("/bower_components", [express.static(__dirname + "/test/bower_components")])


app.listen(3005, function () {
  console.log("Service running on http://127.0.0.1:3005")
})

app.get('/test', require('connect-ensure-login').ensureLoggedIn(), function (req, res) {
  res.sendFile(__dirname + "/test/index.html");
});



app.get('/login', function (req, res) {
  res.sendFile(__dirname + "/test/login.html");
});

app.post('/login', passport.authenticate('local', { successReturnToOrRedirect: '/', failureRedirect: '/login' }));

app.get('/bearerx', function (req, res) {
  console.log("Here")
  res.send("%Sdf1234");
});

// MongoDB routines
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