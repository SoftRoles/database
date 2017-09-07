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

var serial = require('serialport');

var serialPorts = {}
var serialBuffs = {}
// serial.list(function (err, ports) {
//   ports.forEach(function (port) {
//     serialPorts[port.comName] = new serial(port.comName, {
//       parser: serial.parsers.readline('\r\n'),
//       autoOpen: false
//     })
//     serialBuffs[port.comName] = ["", "", "", ""]
//   })
// })

console.log(serialPorts)

app.put("/serialport/:port", function (req, res) {
  if (serialPorts[req.params.port]) {
    serialPorts[req.params.port].close(function (err) {
      if (err) res.send({ error: err })
      else {
        serialPorts[req.params.port] = new serial(req.params.port, {
          parser: serial.parsers.readline('-->'),
          baudRate: parseInt(req.body.baud)
        }, function (err) {
          if (err) {
            res.send({ 'Error: ': err.message });
          }
          else {
            serialBuffs[req.params.port] = ["", "", "", ""]
            serialPorts[req.params.port].on('data', function (data) {
              serialBuffs[req.params.port].push(data); serialBuffs[req.params.port].shift();
            });
            res.send({ success: "OK" })
          }
        })
      }
    })
  }
  else {
    serialPorts[req.params.port] = new serial(req.params.port, {
      parser: serial.parsers.readline('-->'),
      baudRate: parseInt(req.body.baud)
      , function(err) {
        if (err) {
          res.send({ 'Error: ': err.message });
        }
        else {
          serialBuffs[req.params.port] = ["", "", "", ""]
          serialPorts[req.params.port].on('data', function (data) {
            serialBuffs[req.params.port].push(data); serialBuffs[req.params.port].shift();
          });
          res.send({ success: "OK" })
        }
      }
    })
  }
})

// temp = [{ title: "1" }, { title: "2" }]
// temp.findIndex()

// serialport = new serial("COM1", { parser: serial.parsers.readline('\r\n'), baudRate: 38400 })
// serialport.on('data', function (data) {
//   console.log(data)
// });
// setTimeout(function () {
//   serialport.write("MH" + "\r", function (err) {
//     console.log(err)
//     serialport.drain(function (err) {
//       console.log(err)

//     })
//   })
//   serialport.write("PFB" + "\r", function (err) {
//     console.log(err)
//     serialport.drain(function (err) {
//       console.log(err)

//     })
//   })
//   serialport.write("PV" + "\r", function (err) {
//     console.log(err)
//     serialport.drain(function (err) {
//       console.log(err)

//     })
//   })
// }, 1000)

app.post("/serialport/:port", function (req, res) {
  serialPorts[req.params.port].write(req.body.buff + "\r", function (err) {
    serialPorts[req.params.port].drain(function (err) {
      if (err) { res.send({ error: "Error: POST: /serialport: " + err }) }
      else res.send({ res: serialBuffs[req.params.port] })
    })
  })
})

app.get("/serialport/:port", function (req, res) {
  res.send({ res: serialBuffs[req.params.port] })
})

// app.delete("/serialport/:port", function (req, res) {
//   serialPorts[req.params.port].close(function (err) {
//     if (err) res.send({ error: "Error: DEL: /serialport: " + err })
//     else res.send({})
//   })
// })