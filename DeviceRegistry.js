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
    this.modules = [];

    this.on(Router.TYPE_GENERIC, "setName", function(router, device, params, callback) {
        if (params.name == undefined) {
            return callback({ error: "Name not defined." });
        }
        if (router.findDevice(params.name) != null) {
            return callback({ error: "Could not find device." });
        }
        device.name = params.name;
        return callback(device);
    });

    const $this = this;
    const normalizedPath = path.join(__dirname, "devices");
    fs.readdir(normalizedPath, function(err, files) {
        files.forEach(function(file) {
            if (fs.lstatSync(path.join(normalizedPath, file)).isDirectory()) {
                const module = require("./devices/" + file);
                module.register($this.router);
                for (let i = 0; i < module.methods.length; i++) {
                    $this.on(module.type, module.methods[i].name, module.methods[i].callback);
                }
                $this.modules.push(module);
            }
        });
    });
}

DeviceRegistry.prototype.getModules = function() {
    return this.modules;
};

DeviceRegistry.prototype.getTypeMethodNames = function(type) {
    const methods = [];
    for (let i = 0; i < this.listeners.length; i++) {
        if (this.listeners[i].type == Router.TYPE_GENERIC ||
            this.listeners[i].type == type) {
            methods.push(this.listeners[i].name);
        }
    }
    return methods;
};

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
            return this.listeners[i].callback(this.router, device, params, callback);
        }
    }
    callback({ error: "Listener not found." });
};

DeviceRegistry.prototype.getMethods = function(device) {
    return this.getTypeMethodNames(device.type);
};

module.exports = DeviceRegistry;