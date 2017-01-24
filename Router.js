/**
 * Created by tstableford on 23/01/17.
 */
const dgram = require('dgram');
const packet  = require('./Packet');
const LObject = require('./LObject.js');

function Router() {
    this.listeners = [];
    this.deviceList = [];

    var $this = this;
    // Parse ping.
    this.on(Router.TYPE_GENERIC, Router.PING_FID, function (device, router, obj) {
        router.send(device, Router.PONG_FID, new LObject().push(LObject.TYPES.UINT32, Math.floor(Date.now() / 1000)));
        // Get the time at element 0.
        device.last_ping = obj.getAt(0) * 1000;
    });
    // Parse Pong.
    this.on(Router.TYPE_GENERIC, Router.PONG_FID, function (device, router, obj) {
        // Get the time at element 0.
        device.last_ping = obj.getAt(0) * 1000;
    });
}

Router.TYPE_GENERIC = 0;
Router.TYPE_ROUTER = 1;
Router.PING_FID = 10;
Router.PONG_FID = 11;
Router.MAKE_FID = 0;

Router.prototype.listen = function(port) {
    if (this.client != null) {
        this.client.close();
        this.client = null;
    }

    this.client = dgram.createSocket('udp4');

    var $this  = this;
    this.client.on('listening', function () {
        var address = $this.client.address();
        console.log('UDP Server listening on ' + address.address + ":" + address.port);
    });
    this.client.on('message', function (message, remote) {
        var parsed = packet.parsePacket(message);
        if (parsed != null) {
            var header = packet.getHeader(parsed.data);
            var obj = new LObject().parse(header.data);
            if (obj != null && obj != undefined) {
                $this.route(remote, parsed.bus_id, parsed.address, header.type, header.fid, obj);
            }
        }
    });
    this.client.bind(port);
};

Router.prototype.send = function(device, fid, obj) {
    if (this.router == null) {
        console.log("Router has not yet connected.");
        return false;
    }
    var header = packet.makeHeader(device.type, fid, obj.getBuffer());
    var data = packet.makePacket(device.bus_id, device.address, header);
    this.client.send(data, device.router.port, device.router.address);
    return true;
};

Router.prototype.makeDevice = function(bus_id, address, type) {
    var device = {
        bus_id: bus_id,
        address: address,
        type: type,
        last_ping: 0
    };
    var listener = null;
    for (var i = 0; i < this.listeners.length; i++) {
        if (this.listeners[i].type == type && this.listeners[i].fid == 0) {
            listener = this.listeners[i];
            break;
        }
    }
    if (listener != null) {
        listener.callback(device);
    }

    return device;
};

Router.prototype.getDevice = function(bus_id, address) {
    for (var i = 0; i < this.deviceList.length; i++) {
        if (Router.compareBusId(bus_id, this.deviceList[i].bus_id) &&
            address == this.deviceList[i].address)
        {
            return this.deviceList[i];
        }
    }

    return null;
};

Router.prototype.getDevices = function() {
    return this.deviceList;
};

Router.prototype.on = function(type, fid, callback) {
    this.listeners.push({
        type: type,
        fid: fid,
        callback: callback
    });
};

Router.prototype.route = function(remote, bus_id, address, type, fid, obj) {
    var device = this.getDevice(bus_id, address);
    // If the device is new then create it.
    if (device == null) {
        device = this.makeDevice(bus_id, address, type);
        this.deviceList.push(device);
    }
    if (device != null) {
        device.router = {
            address: remote.address,
            port: remote.port
        };
        for (var i = 0; i < this.listeners.length; i++) {
            if ((this.listeners[i].type == type || this.listeners[i].type == 0) && this.listeners[i].fid == fid) {
                this.listeners[i].callback(device, this, obj);
            }
        }
    }
};

Router.compareBusId = function(bus_a, bus_b) {
    if (bus_a.length >= 4 && bus_b.length >= 4) {
        for (var i = 0; i < 4; i++) {
            if (bus_a[i] != bus_b[i]) {
                return false;
            }
        }
        return true;
    } else {
        return false;
    }
};

module.exports = Router;