const LObject = require('./LObject.js');
const Router = require('./Router.js');
const express = require('express');
const DeviceRegistry = require('./DeviceRegistry.js');

const app = express();
const router = new Router();
const registry = new DeviceRegistry(router);
router.listen(42237);

app.get('/devices/:uid', function(req, res) {
    res.json(router.findDevice(req.params.uid));
});

app.get('/devices/:uid/methods', function(req, res) {
    const device = router.findDevice(req.params.uid);
    if (device == null) {
        res.json({ error: "Device not found." });
    } else {
        res.send(registry.getMethods(device));
    }
});

app.get('/devices/:uid/methods/:method', function(req, res) {
    const device = router.findDevice(req.params.uid);
    if (device == null) {
        res.json({ error: "Device not found." });
    } else {
        registry.parse(device, req.params.method, req.query, function(message) {
            res.json(message);
        });
    }
});

app.get('/devices', function (req, res) {
    res.json(router.getDevices());
});

app.get('/modules', function (req, res) {
    const modules = registry.getModules();
    const smallModules = [];
    for (let i = 0; i < modules.length; i++) {
        smallModules.push({
            type: modules[i].type,
            name: modules[i].name,
            methods: registry.getTypeMethodNames(modules[i].type)
        });
    }
    res.json(smallModules);
});

app.get('/messages', function (req, res) {
    res.json(router.messageQueue);
});

app.listen(42238, function () {
    console.log('Example app listening on port 42238!')
});
