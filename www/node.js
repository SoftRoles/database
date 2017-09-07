var express = require('express')
var path = require("path")
var bodyParser = require("body-parser")
var cors = require("cors")

const app = express();
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors())
app.use(express.static(process.cwd() + "/public"))

app.listen(5000, function () {
    console.log('REST-Visa server side is running at port 5000')
})
app.get("/", function (req, res) {
  res.send("Hello world!")
})