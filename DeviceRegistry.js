/**
 * Created by tstableford on 31/01/17.
 */
const Router = require('./Router.js');
const LObject = require('./LObject.js');
const fs = require("fs");
const path = require("path");

function DeviceRegistry(router) {
    this.listeners = [];
    this.router = router;

    this.on(Router.TYPE_GENERIC, "setName", function(router, device, params, callback) {
        if (params.name == undefined) {
            return callback(false, "Name not defined.");
        }
        if (router.findDevice(params.name) != null) {
            return callback(false, "Could not find device.");
        }
        device.name = params.name;
        return callback(true, "Device name set.");
    });

    const $this = this;
    const normalizedPath = path.join(__dirname, "devices");
    fs.readdir(normalizedPath, function(err, files) {
        files.forEach(function(file) {
            if (fs.lstatSync(path.join(normalizedPath, file)).isDirectory()) {
                const module = require("./devices/" + file);
                module.register(LObject, $this, $this.router);
            }
        });
    });

    //const LEDDevice = require('./devices/LEDDevice.js');
    //LEDDevice.register(LObject, this, router);
}

DeviceRegistry.prototype.on = function(type, name, callback) {
    this.listeners.push({
        type: type,
        name: name,
        callback: callback
    });
};

DeviceRegistry.prototype.parse = function(device, name, params, callback) {
    for (let i = 0; i < this.listeners.length; i++) {
        if ((device.type == this.listeners[i].type ||
            this.listeners[i].type == Router.TYPE_GENERIC) &&
            name == this.listeners[i].name) {
            this.listeners[i].callback(this.router, device, params, callback);
            return true;
        }
    }
    callback(false, "Listener not found.");
    return false;
};

DeviceRegistry.prototype.getMethods = function(device) {
    const output = [];
    for (let i = 0; i < this.listeners.length; i++) {
        if (device.type == this.listeners[i].type ||
            this.listeners[i].type == Router.TYPE_GENERIC) {
            output.push(this.listeners[i].name);
        }
    }
    return output;
};

module.exports = DeviceRegistry;