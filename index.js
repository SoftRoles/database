#!/usr/bin/node

//=============================================================================
// modules
//=============================================================================
const express = require('express');
const assert = require('assert');
const argparse = require('argparse').ArgumentParser
const session = require('express-session');
const mongodbSessionStore = require('connect-mongodb-session')(session);
const passport = require('passport');
const { noCache } = require('helmet');

//-------------------------------------
// arguments
//-------------------------------------
const argParser = new argparse({
  addHelp: true,
  description: 'Database service'
})
argParser.addArgument(['-p', '--port'], { help: 'Listening port', defaultValue: '3005' })
const args = argParser.parseArgs()

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
app.use(require('morgan')('tiny'));
app.use(require('body-parser').json())
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require("cors")())

//=============================================================================
// api v1
//=============================================================================
app.get("/old/database/api/v1", function (req, res) {
  var adminDb = mongodb.db("test").admin();
  if (true/*req.user && req.user.username == 'admin'*/) {
    adminDb.listDatabases(function (err, dbs) {
      if (err) { console.err(err); res.send({ error: err }) }
      else res.send(dbs.databases)
    })
  }
  else res.sendStatus(401)
})

app.get("/old/database/api/v1/:db", function (req, res) {
  if (true/*req.user && req.user.username == 'admin'*/) {
    mongodb.db(req.params.db).listCollections().toArray(function (err, colls) {
      if (err) { console.err(err); res.send({ error: err }) }
      else res.send(colls)
    })
  }
  else res.sendStatus(401)
})

app.get("/old/database/api/v1/:db/:col", function (req, res) {
  //req.query.users = req.user.username
  //console.log(req.query)
  mongodb.db(req.params.db).collection(req.params.col).find(req.query).toArray(function (err, docs) {
    if (err) res.send({ error: err })
    else res.send(docs)
  });
})

app.post("/old/database/api/v1/:db/:col", function (req, res) {
  //if (req.body.users) { req.body.users.push(req.user.username) }
  //else { req.body.users = [req.user.username] }
  //if (req.body.owners) { req.body.owners.push(req.user.username) }
  //else { req.body.owners = [req.user.username] }
  //if (req.body.users.indexOf("admin") === -1) { req.body.users.push("admin") }
  //if (req.body.owners.indexOf("admin") === -1) { req.body.owners.push("admin") }
  mongodb.db(req.params.db).collection(req.params.col).insertOne(req.body, function (err, r) {
    if (err) res.send({ error: err })
    else res.send(Object.assign({}, r.result, { insertedId: r.insertedId }))
  });
})

app.get("/old/database/api/v1/:db/:col/:id", function (req, res) {
  var query = {}//{ users: req.user.username }
  query._id = mongoObjectId(req.params.id)
  mongodb.db(req.params.db).collection(req.params.col).findOne(query, function (err, doc) {
    if (err) res.send({ error: err })
    else res.send(doc)
  });
})

app.put("/old/database/api/v1/:db/:col/:id", function (req, res) {
  var query = {}//{ owners: req.user.username }
  query._id = mongoObjectId(req.params.id)
  delete req.body._id
  mongodb.db(req.params.db).collection(req.params.col).updateOne(query, { "$set": req.body }, function (err, r) {
    if (err) res.send({ error: err })
    else res.send(Object.assign({}, r.result))
  })
})

app.delete("/old/database/api/v1/:db/:col/:id", function (req, res) {
  var query = {}//{ owners: req.user.username }
  query._id = mongoObjectId(req.params.id)
  mongodb.db(req.params.db).collection(req.params.col).deleteOne(query, function (err, r) {
    if (err) res.send({ error: err })
    else res.send(Object.assign({}, r.result))
  })
})


//=============================================================================
// start service
//=============================================================================
app.listen(Number(args.port), function () {
  console.log(`Service running on http://127.0.0.1:${args.port}`)
})
