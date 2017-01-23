/**
 * Created by tstableford on 21/01/17.
 */
/**
 * Created by tstableford on 27/11/15.
 */

exports.crc16 = function(data, offset, length) {
    var crc = exports.crcInit();

    if(offset == undefined) {
        offset = 0;
    }
    if(length == undefined) {
        length = data.length;
    } else if((offset + length) > data.length) {
        length = data.length;
    }

    for(var i = offset; i < length; i++) {
        crc = exports.crcAppend(crc, data[i]);
    }
    return crc;
};

exports.crcInit = function() {
    return 0xFFFF;
};

exports.crcAppend = function(crc, data) {
    var x = crc >> 8 ^ data;
    x ^= x >> 4;
    return ((crc << 8) ^ (x << 12) ^ (x << 5) ^ x) & 0xFFFF;
};

exports.getHeader = function(data) {
    return {
        type: data.readUInt16BE(0),
        fid: data.readUInt16BE(2),
        data: data.slice(4)
    };
};

exports.makeHeader = function(type, fid, data) {
    var output = Buffer.alloc(data.length + 4);
    output.writeUInt16BE(type, 0);
    output.writeUInt16BE(fid, 2);
    data.copy(output, 4);

    return output;
};

exports.compareBus = function(bus_a, bus_b) {
    return bus_a[0] == bus_b[0] &&
        bus_a[1] == bus_b[1] &&
        bus_a[2] == bus_b[2] &&
        bus_a[3] == bus_b[3];
};

exports.makePacket = function(bus_id, address, data) {
    var output = Buffer.alloc(data.length + 9);
    output.writeUInt16BE(data.length + 7, 0);
    if (Array.isArray(bus_id)) {
        bus_id = Buffer.from(bus_id);
    }
    bus_id.copy(output, 2, 0, 4);
    output.writeUInt8(address, 6);
    data.copy(output, 7);
    var crc = exports.crc16(output, 0, data.length + 7);
    output.writeUInt16BE(crc, data.length + 7);

    return output;
};

exports.parsePacket = function(data) {
    try {
        var length = data.readUInt16BE(0);
        if (length != data.length - 2) {
            return null;
        }
        var bus_id = [ data[2], data[3], data[4], data[5]];
        var address = data.readUInt8(6);
        var payload = data.slice(7);
        return {
            bus_id: bus_id,
            address: address,
            data: payload
        };
    } catch (err) {
        console.log(err);
    }
    return null;
};