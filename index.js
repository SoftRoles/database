//=============================================================================
// http server
//=============================================================================
var express = require('express');
var app = express();

//-------------------------------------
// common middlewares
//-------------------------------------
app.use(require("@softroles/authorize-local-user")())
app.use(require('morgan')('tiny'));
app.use(require('body-parser').json())
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require("cors")())

app.get("/database/api", function (req, res) {
  console.log(req.user)
  res.send(req.user)
})


//=============================================================================
// api
//=============================================================================

//-------------------------------------
// mongodb
//-------------------------------------
var assert = require('assert');
var mongodb;
var mongoClient = require("mongodb").MongoClient
var mongodbUrl = "mongodb://127.0.0.1:27017"
mongoClient.connect(mongodbUrl, { poolSize: 10, useNewUrlParser: true }, function (err, client) {
  assert.equal(null, err);
  mongodb = client;
});


var mongoObjectId = require('mongodb').ObjectID;
app.get("/mongodb/api", function (req, res) {
  var adminDb = mongodb.db("test").admin();
  adminDb.listDatabases(function (err, dbs) {
    if (["admin", "hsyn"].indexOf(req.user.username) > -1) res.send(dbs.databases)
    else res.sendStatus(403)
  })
})

app.get("/mongodb/api/:db", function (req, res) {
  mongodb.db(req.params.db).listCollections().toArray(function (err, items) {
    if (["admin", "hsyn"].indexOf(req.user.username) > -1) res.send(items)
    else res.sendStatus(403)
  })
})

app.get("/mongodb/api/:db/:col", function (req, res) {
  req.query.users = req.user.username
  mongodb.db(req.params.db).collection(req.params.col).find(req.query).toArray(function (err, docs) {
    if (err) res.send({ error: err })
    else res.send(docs)
  });
})

app.post("/mongodb/api/:db/:col", function (req, res) {
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

app.get("/mongodb/api/:db/:col/:id", function (req, res) {
  var query = { users: req.user.username }
  query._id = mongoObjectId(req.params.id)
  mongodb.db(req.params.db).collection(req.params.col).findOne(query, function (err, doc) {
    if (err) res.send({ error: err })
    else res.send(doc)
  });
})

app.put("/mongodb/api/:db/:col/:id", function (req, res) {
  var query = { owners: req.user.username }
  query._id = mongoObjectId(req.params.id)
  delete req.body._id
  mongodb.db(req.params.db).collection(req.params.col).updateOne(query, { "$set": req.body }, function (err, r) {
    if (err) res.send({ error: err })
    else res.send(Object.assign({}, r.result))
  })
})

app.delete("/mongodb/api/:db/:col/:id", function (req, res) {
  var query = { owners: req.user.username }
  query._id = mongoObjectId(req.params.id)
  mongodb.db(req.params.db).collection(req.params.col).deleteOne(query, function (err, r) {
    if (err) res.send({ error: err })
    else res.send(Object.assign({}, r.result))
  })
})


//=============================================================================
// start and register service
//=============================================================================
var path = require('path')
var findFreePort = require('find-free-port')
var userEnvVariable = require('@softroles/user-env-variable')
var assert = require('assert')
var serviceName = path.basename(__dirname).toUpperCase()
findFreePort(3000, function (err, port) {
  assert.equal(err, null, 'Could not find a free tcp port.')
  app.listen(Number(port), function () {
    var registers = {
      ['SOFTROLES_SERVICE_' + serviceName + '_PORT']: port
    }
    console.log("Service is registered with following variables:")
    for (reg in registers) {
      console.log('\t - SOFTROLES_SERVICE_' + serviceName + '_PORT', '=', port)
      userEnvVariable.set('SOFTROLES_SERVICE_' + serviceName + '_PORT', port, function (err) {
        assert.equal(err, null, 'Could not register service.')
        console.log("Service running on http://127.0.0.1:" + port)
      })
    }
  })
})