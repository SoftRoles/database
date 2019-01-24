//=============================================================================
// modules
//=============================================================================
const express = require('express');
const assert = require('assert');
const path = require('path')
const findFreePort = require('find-free-port')
const userEnvVariable = require('@softroles/user-env-variable')

//-------------------------------------
// mongodb
//-------------------------------------
var mongodb;
const mongoClient = require("mongodb").MongoClient
const mongoObjectId = require('mongodb').ObjectID;
const mongodbUrl = "mongodb://127.0.0.1:27017"
mongoClient.connect(mongodbUrl, { poolSize: 10, useNewUrlParser: true }, function (err, client) {
  assert.equal(null, err);
  mongodb = client;
});

//=============================================================================
// http server
//=============================================================================
const app = express();

//-------------------------------------
// common middlewares
//-------------------------------------
app.use(require("@softroles/authorize-local-user")())
app.use(require('morgan')('tiny'));
app.use(require('body-parser').json())
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require("cors")())

//=============================================================================
// api v1
//=============================================================================
app.get("/database/api/v1", function (req, res) {
  var adminDb = mongodb.db("test").admin();
  if (req.user && req.user.username == 'admin') {
    adminDb.listDatabases(function (err, dbs) {
      if (err) { console.err(err); res.send({ error: err }) }
      else res.send(dbs.databases)
    })
  }
  else res.sendStatus(401)
})

app.get("/database/api/v1/:db", function (req, res) {
  if (req.user && req.user.username == 'admin') {
    mongodb.db(req.params.db).listCollections().toArray(function (err, colls) {
      if (err) { console.err(err); res.send({ error: err }) }
      else res.send(colls)
    })
  }
  else res.sendStatus(401)
})

app.get("/database/api/v1/:db/:col", function (req, res) {
  req.query.users = req.user.username
  mongodb.db(req.params.db).collection(req.params.col).find(req.query).toArray(function (err, docs) {
    if (err) res.send({ error: err })
    else res.send(docs)
  });
})

app.post("/database/api/v1/:db/:col", function (req, res) {
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

app.get("/database/api/v1/:db/:col/:id", function (req, res) {
  var query = { users: req.user.username }
  query._id = mongoObjectId(req.params.id)
  mongodb.db(req.params.db).collection(req.params.col).findOne(query, function (err, doc) {
    if (err) res.send({ error: err })
    else res.send(doc)
  });
})

app.put("/database/api/v1/:db/:col/:id", function (req, res) {
  var query = { owners: req.user.username }
  query._id = mongoObjectId(req.params.id)
  delete req.body._id
  mongodb.db(req.params.db).collection(req.params.col).updateOne(query, { "$set": req.body }, function (err, r) {
    if (err) res.send({ error: err })
    else res.send(Object.assign({}, r.result))
  })
})

app.delete("/database/api/v1/:db/:col/:id", function (req, res) {
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
const serviceName = path.basename(__dirname).toUpperCase()
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