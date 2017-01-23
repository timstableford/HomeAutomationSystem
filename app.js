const Router = require('./Router.js');
var express = require('express');

var app = express();
var router = new Router();
router.listen(42237);

app.get('/devices', function (req, res) {
    res.send(JSON.stringify(router.getDevices()));
});

app.get('/', function (req, res) {
    res.send(JSON.stringify(router.getRouter()));
});

app.listen(42238, function () {
    console.log('Example app listening on port 42238!')
});