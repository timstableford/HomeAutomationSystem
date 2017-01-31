const LObject = require('./LObject.js');
const Router = require('./Router.js');
const express = require('express');
const DeviceRegistry = require('./DeviceRegistry.js');

const app = express();
const router = new Router();
const registry = new DeviceRegistry(router);
router.listen(42237);

app.get('/devices/:uid', function(req, res) {
    res.send(router.findDevice(req.params.uid));
});

app.get('/devices/:uid/methods', function(req, res) {
    const device = router.findDevice(req.params.uid);
    if (device == null) {
        res.status(404).send("Device not found.");
    } else {
        res.send(registry.getMethods(device));
    }
});

app.get('/devices/:uid/methods/:method', function(req, res) {
    const device = router.findDevice(req.params.uid);
    if (device == null) {
        res.status(404).send("Device not found.");
    } else {
        registry.parse(device, req.params.method, req.query, function(result, message) {
            if (result) {
                res.send(message);
            } else {
                res.status(503).send(message);
            }
            return result;
        });
    }
});

app.get('/devices', function (req, res) {
    res.send(JSON.stringify(router.getDevices()));
});

app.get('/messages', function (req, res) {
    res.send(JSON.stringify(router.messageQueue));
});

app.listen(42238, function () {
    console.log('Example app listening on port 42238!')
});
