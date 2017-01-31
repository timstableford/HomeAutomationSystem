/**
 * Created by tstableford on 23/01/17.
 */
const dgram = require('dgram');
const packet  = require('./Packet');
const LObject = require('./LObject.js');

const MESSAGE_RETRY_TIMEOUT = 500; // Milliseconds.
const MESSAGE_RETRY_COUNT = 5; // How many times to try sending a message.
const DISPATCH_LOOP_TIME = 200; // Milliseconds.
const DEVICE_TIMEOUT = 5000; // Milliseconds.
const DEVICE_STATE_LOOP_TIME = 500;  // Milliseconds.
const DEVICE_ONLINE = "online";
const DEVICE_OFFLINE = "offline";

function Router() {
    this.listeners = [];
    this.deviceList = [];
    this.stateListeners = [];
    this.messageQueue = [];
    this.messageQueueId = 0;

    const $this = this;
    // Parse ping.
    this.on(Router.TYPE_GENERIC, Router.PING_FID, function (device, header, router, obj) {
        router.dispatch(device, Router.PONG_FID, new LObject().push(LObject.TYPES.UINT32, Math.floor(Date.now() / 1000)), true);
        // Get the time at element 0.
        device.last_ping = Date.now();
    });
    // Parse Pong.
    this.on(Router.TYPE_GENERIC, Router.PONG_FID, function (device, header, router, obj) {
        // Get the time at element 0.
        device.last_ping = Date.now();
    });
    // Parse ACK.
    this.on(Router.TYPE_GENERIC, Router.ACK_FID, function (device, header, router, obj) {
        for (let i = 0; i < $this.messageQueue.length; i++) {
            const msg = $this.messageQueue[i];
            if (msg.id == header.id) {
                $this.messageQueue = $this.messageQueue.splice(i, 1);
                if (msg.callback != undefined) {
                    msg.callback(device, header, router, obj);
                }
                break;
            }
        }
    });
    // Send ACK's.
    this.on(Router.TYPE_GENERIC, Router.GENERIC_FID, function (device, header, router, obj) {
        if (header.type != Router.ACK_FID && header.id != Router.NO_ACK_ID) {
            const nheader = packet.makeHeader(device.type, Router.ACK_FID, header.id, Buffer.alloc(0));
            const data = packet.makePacket(device.bus_id, device.address, nheader);
            if ($this.client) {
                $this.client.send(data, device.router.port, device.router.address);
            }
        }
    });

    function doDispatch() {
        for (let i = 0; i < $this.messageQueue.length; i++) {
            const msg = $this.messageQueue[i];
            if (Date.now() - msg.time > MESSAGE_RETRY_TIMEOUT) {
                if (msg.retries > MESSAGE_RETRY_COUNT) {
                    console.log("Failed to send message:");
                    console.log(JSON.toString(msg));
                    $this.messageQueue = $this.messageQueue.splice(i, 1);
                    if (msg.callback != undefined) {
                        msg.callback(null, null, null, null);
                    }
                }
                $this.client.send(msg.data, msg.device.router.port, msg.device.router.address);
                msg.time = Date.now();
                msg.retries++;
            }
        }
        setTimeout(doDispatch, DISPATCH_LOOP_TIME);
    }
    doDispatch();

    function checkStates() {
        for (let i = 0; i < $this.deviceList.length; i++) {
            const device = $this.deviceList[i];
            const new_state  = (Date.now() - device.last_ping > DEVICE_TIMEOUT) ? DEVICE_OFFLINE : DEVICE_ONLINE;
            if (new_state != device.state) {
                device.state = new_state;
                console.log(`Device ${device.uid} new state: ${device.state}`);
                for (let j = 0; j < $this.stateListeners.length; j++) {
                    $this.stateListeners[i](device, $this);
                }
            }
        }
        setTimeout(checkStates, DEVICE_STATE_LOOP_TIME);
    }
    checkStates();
}

Router.TYPE_GENERIC = 0;
Router.TYPE_ROUTER = 1;
Router.PING_FID = 10;
Router.PONG_FID = 11;
Router.ACK_FID = 2;
Router.MAKE_FID = 1;
Router.GENERIC_FID = 0;
Router.NO_ACK_ID = 0;

Router.prototype.onState = function(callback) {
    this.stateListeners.push(callback);
};

Router.prototype.dispatch = function(device, fid, obj, noack = false, callback = undefined) {
    let id = 0;
    if (noack) {
        id = Router.NO_ACK_ID
    } else {
        this.messageQueueId++;
        if (this.messageQueueId > 65535) {
            this.messageQueueId = 0;
        }
        id = this.messageQueueId;
    }

    const header = packet.makeHeader(device.type, fid, this.messageQueueId, obj.getBuffer());
    const data = packet.makePacket(device.bus_id, device.address, header);
    const msg = {
        device: device,
        fid: fid,
        id: id,
        data: data,
        time: Date.now(),
        retries: 0,
        callback: callback
    };

    if (!noack) {
        this.messageQueue.push(msg);
    }
    if (this.client) {
        this.client.send(data, device.router.port, device.router.address);
    }
};

Router.prototype.listen = function(port) {
    if (this.client != null) {
        this.client.close();
        this.client = null;
    }

    this.client = dgram.createSocket('udp4');

    const $this  = this;
    this.client.on('listening', function () {
        const address = $this.client.address();
        console.log(`UDP Server listening on ${address.address}:${address.port}`);
    });
    this.client.on('message', function (message, remote) {
        const parsed = packet.parsePacket(message);
        if (parsed != null) {
            const header = packet.getHeader(parsed.data);
            let obj = null;
            if (header.data != null) {
                obj = new LObject().parse(header.data);
            }
            $this.route(remote, parsed.bus_id, parsed.address, header, obj);
        }
    });
    this.client.bind(port);
};

Router.prototype.makeDevice = function(bus_id, address, type) {
    const device = {
        bus_id: bus_id,
        address: address,
        type: type,
        last_ping: 0,
        uid: `${bus_id[0]}.${bus_id[1]}.${bus_id[2]}.${bus_id[3]}.${address}`,
        state: DEVICE_ONLINE
    };
    let listener = null;
    for (let i = 0; i < this.listeners.length; i++) {
        if (this.listeners[i].type == type && this.listeners[i].fid == Router.MAKE_FID) {
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
    for (let i = 0; i < this.deviceList.length; i++) {
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

Router.prototype.getDeviceFromUid = function(address) {
    const sp = address.split(".");
    if (sp.length != 5) {
        return null;
    }
    const bus_id = [];
    for (let i = 0; i < 4; i++) {
        bus_id.push(parseInt(sp[i]));
    }
    return this.getDevice(bus_id, parseInt(sp[4]));
};

Router.prototype.getDeviceFromName = function(name) {
    for (let i = 0; i < this.deviceList.length; i++) {
        if (this.deviceList[i].name != undefined) {
            if (this.deviceList[i].name == name) {
                return this.deviceList[i];
            }
        }
    }
    return null;
};

Router.prototype.findDevice = function(name, address = null) {
    if (address != null) {
        return this.getDevice(name, address);
    }
    let device = this.getDeviceFromUid(name);
    if (device == null) {
        device = this.getDeviceFromName(name);
    }
    return device;
};

Router.prototype.on = function(type, fid, callback) {
    this.listeners.push({
        type: type,
        fid: fid,
        callback: callback
    });
};

Router.prototype.route = function(remote, bus_id, address, header, obj) {
    let device = this.getDevice(bus_id, address);
    // If the device is new then create it.
    if (device == null) {
        device = this.makeDevice(bus_id, address, header.type);
        this.deviceList.push(device);
    }
    if (device != null) {
        device.router = {
            address: remote.address,
            port: remote.port
        };
        for (let i = 0; i < this.listeners.length; i++) {
            if ((this.listeners[i].type == header.type || this.listeners[i].type == Router.TYPE_GENERIC) &&
                (this.listeners[i].fid == header.fid || this.listeners[i].fid == Router.GENERIC_FID)) {
                this.listeners[i].callback(device, header, this, obj);
            }
        }
    }
};

Router.compareBusId = function(bus_a, bus_b) {
    if (bus_a.length >= 4 && bus_b.length >= 4) {
        for (let i = 0; i < 4; i++) {
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