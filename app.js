const LObject = require('./LObject.js');
const Router = require('./Router.js');
const express = require('express');

const app = express();
const router = new Router();
router.listen(42237);

const methods = {
    listeners: []
};

methods.on = function(type, name, callback) {
    methods.listeners.push({
        type: type,
        name: name,
        callback: callback
    });
};

methods.parse = function(device, name, params) {
    for (let i = 0; i < methods.listeners.length; i++) {
        if ((device.type == methods.listeners[i].type ||
            methods.listeners[i].type == Router.TYPE_GENERIC) &&
                name == methods.listeners[i].name) {
            return methods.listeners[i].callback(router, device, params);
        }
    }
    return false;
};

methods.getMethods = function(device) {
    const output = [];
    for (let i = 0; i < methods.listeners.length; i++) {
        if (device.type == methods.listeners[i].type ||
            methods.listeners[i].type == Router.TYPE_GENERIC) {
            output.push(methods.listeners[i].name);
        }
    }
    return output;
};

methods.on(Router.TYPE_GENERIC, "setName", function(router, device, params) {
    if (params.name == undefined) {
        return false;
    }
    if (router.findDevice(params.name) != null) {
        return false;
    }
    device.name = params.name;
    return true;
});

app.get('/led/:state', function(req, res) {
    res.send("LED State Set To: " + req.params.state);
    const device = {
        bus_id: [0,0,0,0],
        address: 2
    };
    router.send(device, 200, new LObject().push(LObject.TYPES.UINT8, Number(req.params.state)));
});

app.get('/devices/:uid', function(req, res) {
    res.send(router.findDevice(req.params.uid));
});

app.get('/devices/:uid/methods', function(req, res) {
    const device = router.findDevice(req.params.uid);
    if (device == null) {
        res.status(404).send("Device not found.");
    } else {
        res.send(methods.getMethods(device));
    }
});

app.get('/devices/:uid/methods/:method', function(req, res) {
    const device = router.findDevice(req.params.uid);
    if (device == null) {
        res.status(404).send("Device not found.");
    } else {
        if(methods.parse(device, req.params.method, req.query)) {
            res.send("Done");
        } else {
            res.status("403").send("Failed to run method.");
        }
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