var express = require('express');
var assert = require('assert');

var app = express();

var mongodb;
var mongoClient = require("mongodb").MongoClient
var mongoObjectId = require('mongodb').ObjectID;
var mongodbUrl = "mongodb://127.0.0.1:27017"
mongoClient.connect(mongodbUrl, { poolSize: 10 }, function (err, client) {
  assert.equal(null, err);
  mongodb = client;
});

var passport = require('passport')
var customStrategy = require('passport-custom').Strategy
passport.use(new customStrategy(function (req, cb) {
  const isLocalUser = req.ip.indexOf("127.0.0.1") > -1
  if (req.headers &&
    req.headers.authorization &&
    req.headers.authorization.split(" ").length == 2 &&
    /^Bearer$/i.test(req.headers.authorization.split(" ")[0])) {
    mongodb.db("auth").collection("users").findOne({ token: req.headers.authorization.split(" ")[1] }, function (err, user) {
      if (err) return cb(err)
      if (!user) { return cb(null, false); }
      return cb(null, user);
    });
  }
  else {
    return cb(null, isLocalUser ? { username: "guest" } : false)
  }
}));

app.get('/mongodb', passport.authenticate("custom", { session: false, failureRedirect:"/login?source=mongodb" }), function (req, res) {
  console.log(req.user)
  if (req.user.username == "admin") res.sendFile(__dirname + '/public/index.html')
  else { res.sendStatus(404); }
});
//==================================================================================================
// API
//==================================================================================================
app.get("/mongodb/api", passport.authenticate("custom", { session: false, failureRedirect:"/403" }), function (req, res) {
  var adminDb = mongodb.db("test").admin();
  adminDb.listDatabases(function (err, dbs) {
    if (req.user.username == "admin" || req.user.username == "hsyn") res.send(dbs.databases)
    else res.send([])
  })
})

app.get("/mongodb/api/:db", passport.authenticate("custom", { session: false, failureRedirect:"/403" }), function (req, res) {
  mongodb.db(req.params.db).listCollections().toArray(function (err, items) {
    if (req.user.username == "admin" || req.user.username == "hsyn") res.send(items)
    else res.send([])
  })
})

app.get("/mongodb/api/:db/:col", passport.authenticate("custom", { session: false, failureRedirect:"/403" }), function (req, res) {
  req.query.users = req.user.username
  mongodb.db(req.params.db).collection(req.params.col).find(req.query).toArray(function (err, docs) {
    if (err) res.send({ error: err })
    else res.send(docs)
  });
})

app.post("/mongodb/api/:db/:col", passport.authenticate("custom", { session: false, failureRedirect:"/403" }), function (req, res) {
  if (req.body.users) { req.body.users.push(req.user.username) }
  else { req.body.users = [req.user.username] }
  if (req.body.owners) { req.body.owners.push(req.user.username) }
  else { req.body.owners = [req.user.username] }
  if (req.body.users.indexOf("admin") === -1) { req.body.users.push("admin") }
  if (req.body.owners.indexOf("admin") === -1) { req.body.owners.push("admin") }
  mongodb.db(req.params.db).collection(req.params.col).insertOne(req.body, function (err, r) {
    if (err) res.send({ error: err })
    else res.send(Object.assign({}, r.result, { insertedId: r.insertedId }))
  });
})

app.get("/mongodb/api/:db/:col/:id", passport.authenticate("custom", { session: false, failureRedirect:"/403" }), function (req, res) {
  var query = { users: req.user.username }
  query._id = mongoObjectId(req.params.id)
  mongodb.db(req.params.db).collection(req.params.col).findOne(query, function (err, doc) {
    if (err) res.send({ error: err })
    else res.send(doc)
  });
})

app.put("/mongodb/api/:db/:col/:id", passport.authenticate("custom", { session: false, failureRedirect:"/403" }), function (req, res) {
  var query = { owners: req.user.username }
  query._id = mongoObjectId(req.params.id)
  delete req.body._id
  mongodb.db(req.params.db).collection(req.params.col).updateOne(query, { "$set": req.body }, function (err, r) {
    if (err) res.send({ error: err })
    else res.send(Object.assign({}, r.result))
  })
})

app.delete("/mongodb/api/:db/:col/:id", passport.authenticate("custom", { session: false, failureRedirect:"/403" }), function (req, res) {
  var query = { owners: req.user.username }
  query._id = mongoObjectId(req.params.id)
  mongodb.db(req.params.db).collection(req.params.col).deleteOne(query, function (err, r) {
    if (err) res.send({ error: err })
    else res.send(Object.assign({}, r.result))
  })
})

app.use(require('body-parser').json())
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require("cors")())
app.use(require('morgan')('tiny'));
app.use("/mongodb/bower_components", express.static(__dirname + "/public/bower_components"))
app.listen(3005, function () {
  console.log("Service 3005-mongodb running on http://127.0.0.1:3005")
})