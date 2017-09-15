var express = require('express')
var path = require("path")
var bodyParser = require("body-parser")
var cors = require("cors")
var MongoClient = require("mongodb").MongoClient
var MongoObjectID = require('mongodb').ObjectID;

const app = express();
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors())
app.use(express.static(process.cwd() + "/www"))
app.listen(5001, function () {
  console.log('REST-MongoDB server side is running at port 5001')
})
app.get("/", function (req, res) {
  res.sendFile("index.html")
})

var mongodb_url = "mongodb://localhost:27017"
app.get("/mongodb", function (req, res) {
  MongoClient.connect(mongodb_url + "/test", function (err, db) {
    var adminDb = db.admin();
    adminDb.listDatabases(function (err, dbs) {
      res.send(dbs)
      db.close()
    })
  })
})

app.get("/mongodb/:db", function (req, res) {
  MongoClient.connect(mongodb_url + "/" + req.params.db, function (err, db) {
    db.listCollections().toArray(function (err, items) {
      res.send(items)
      db.close()
    })
  })
})

app.post("/mongodb/:db/:col", function (req, res) {
  MongoClient.connect(mongodb_url + "/" + req.params.db, function (err, db) {
    db.collection(req.params.col).insertOne(req.body, function (err, r) {
      if (err) res.send({ error: err })
      else res.send(r)
      db.close()
    })
  });
})

app.get("/mongodb/:db/:col", function (req, res) {
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

app.put("/mongodb/:db/:col/:id", function (req, res) {
  console.log(req)
  MongoClient.connect(mongodb_url + "/" + req.params.db, function (err, db) {
    db.collection(req.params.col).updateOne({ _id: MongoObjectID(req.params.id) }, req.body, function (err, item) {
      if (err) res.send({ error: err })
      else res.send(item)
      db.close()
    })
  });
})

app.delete("/mongodb/:db/:col/:id", function (req, res) {
  MongoClient.connect(mongodb_url + "/" + req.params.db, function (err, db) {
    db.collection(req.params.col).deleteOne({ _id: MongoObjectID(req.params.id) }, function (err, r) {
      if (err) res.send({ error: err })
      else res.send(r)
      db.close()
    })
  });
})