const request = require('request')

const api = 'http://127.0.0.1:3000/database/api/v1'

// List databases
request.get(api, function (err, res, body) {
  console.log('- List databases')
  if (err) console.error(err)
  else {
    console.log(res.statusCode)
    console.log(body)
  }
})

// List collections
request.get(api + '/auth', function (err, res, body) {
  console.log('- List collections')
  if (err) console.error(err)
  else {
    console.log(res.statusCode)
    console.log(body)
  }
})

// List items
request.get(api + '/test/test1', function (err, res, body) {
  console.log('- List items')
  if (err) console.error(err)
  else {
    console.log(res.statusCode)
    console.log(body)
  }
})

// Insert item
request.post({
  url: api + '/test/test1',
  headers: {'content-type' : 'application/json'},
  form: { name: 'newItem' }
}, function (err, res, body) {
  console.log('- Insert item')
  if (err) console.error(err)
  else {
    console.log(res.statusCode)
    console.log(body)
  }
})

// Get item by id
request.get(api + '/test/test1/5c49c5efd460012d34400321', function (err, res, body) {
  console.log('- Get item by id')
  if (err) console.error(err)
  else {
    console.log(res.statusCode)
    console.log(body)
  }
})

// Update item by id
request.put({
  url: api + '/test/test1/5c49c5efd460012d34400321',
  headers: {'content-type' : 'application/json'},
  form: { name: 'newItemUpdate' }
}, function (err, res, body) {
  console.log('- Update item by id')
  if (err) console.error(err)
  else {
    console.log(res.statusCode)
    console.log(body)
  }
})

// Delete item by id
request.delete(api + '/test/test1/5c49c5efd460012d34400321', function (err, res, body) {
  console.log('- Delete item by id')
  if (err) console.error(err)
  else {
    console.log(res.statusCode)
    console.log(body)
  }
})