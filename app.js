/**
 * Created by tstableford on 21/01/17.
 */
const dgram = require('dgram');
const message = Buffer.from('Some bytes');
const client = dgram.createSocket('udp4');
const LObject = require('./LObject.js');
const packet  = require('./Packet');

var obj = new LObject().push(LObject.TYPES.STRING, "Hello world!");
var bus_id = Buffer.from([0x0, 0x0, 0x0, 0x0]);
var PING_ID = [ 0x01, 0x0 ];
var PONG_ID = [ 0x02, 0x0 ];

client.on('listening', function () {
    var address = client.address();
    console.log('UDP Server listening on ' + address.address + ":" + address.port);
});

client.on('message', function (message, remote) {
    console.log(remote.address + ':' + remote.port);
    var parsed = packet.parsePacket(message);
    if (parsed != null) {
        var header = packet.getHeader(parsed.data);
        console.log("ID: " + header.id);
        console.log("From: " + parsed.bus_id + ":" + parsed.address);
        console.log(new LObject().parse(header.data).toString());

        // Check if it's a packet from the router.
        if (packet.compareBus(bus_id, parsed.bus_id) && parsed.address == 0) {
            switch(header.id[0]) {
                case PONG_ID[0]:
                    console.log("Received pong from router.");
                    break;
                default: break;
            }
        }
    }
});

function send() {
    setTimeout(function () {
        client.send(packet.makePacket(bus_id, 0, packet.makeHeader(PING_ID, obj.getBuffer())), 1337, '192.168.2.173', function(err) {
            if (err != null) {
                console.log(err);
            }
        });
        send();
    }, 1000);
}

send();
