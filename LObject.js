/**
 * Created by tstableford on 25/11/15.
 */

LObject.TYPES = {
    STRING: 1,
    INT8: 2,
    UINT8: 3,
    INT16: 4,
    UINT16: 5,
    INT32: 6,
    UINT32: 7,
    FLOAT: 12
};

var typesArray = [
    // String
    {
        id: LObject.TYPES.STRING,
        toBuffer: function(that, value, offset, length) { return that.write(value, offset, length); },
        fromBuffer: function(that, offset, length) { return that.slice(offset, offset + length); },
        size: 1
    },
    // int8
    {
        id: LObject.TYPES.INT8,
        toBuffer: function(that, value, offset, length) { return that.writeInt8(value, offset); },
        fromBuffer: function(that, offset, length) { return that.readInt8(offset); },
        size: 1
    },
    // uint8
    {
        id: LObject.TYPES.UINT8,
        toBuffer: function(that, value, offset, length) { return that.writeUInt8(value, offset); },
        fromBuffer: function(that, offset, length) { return that.readUInt8(offset); },
        size: 1
    },
    // int16
    {
        id: LObject.TYPES.INT16,
        toBuffer: function(that, value, offset, length) { return that.writeInt16BE(value, offset); },
        fromBuffer: function(that, offset, length) { return that.readInt16BE(offset); },
        size: 2
    },
    // uint16
    {
        id: LObject.TYPES.UINT16,
        toBuffer: function(that, value, offset, length) { return that.writeUInt16BE(value, offset); },
        fromBuffer: function(that, offset, length) { return that.readUInt16BE(offset); },
        size: 2
    },
    // int32
    {
        id: LObject.TYPES.INT32,
        toBuffer: function(that, value, offset, length) { return that.writeUInt32BE(value, offset); },
        fromBuffer: function(that, offset, length) { return that.readUInt32BE(offset); },
        size: 4
    },
    // uint32
    {
        id: LObject.TYPES.UINT32,
        toBuffer: function(that, value, offset, length) { return that.writeUInt32BE(value, offset); },
        fromBuffer: function(that, offset, length) { return that.readUInt32BE(offset); },
        size: 4
    },
    // float
    {
        id: LObject.TYPES.FLOAT,
        toBuffer: function(that, value, offset, length) { return that.writeFloatBE(value, offset); },
        fromBuffer: function(that, offset, length) { return that.readFloatBE(offset); },
        size: 4
    }
];

function LObject() {
    this.items = [];
}

function findById(arr, id) {
    for(var i = 0; i < arr.length; i++) {
        if(arr[i].id == id) {
            return arr[i];
        }
    }
    return null;
}

function numStrings(obj) {
    var numStrings = 0;
    for(var i = 0; i < obj.items.length; i++) {
        if(obj.items[i].type == LObject.TYPES.STRING) {
            numStrings++;
        }
    }
    return numStrings;
}

function offsetOf(obj, id) {
    var offset = 0;
    for(var i = 0; i < obj.items.length && i < id; i++) {
        offset += obj.items[i].size;
    }

    return offset + obj.items.length + numStrings(obj) + 1;
}

function stringAt(obj, num) {
    if(num >= numStrings(obj)) {
        return null;
    }
    var strIndex = 0;
    for(var i = 0; i < obj.items.length; i++) {
        if(obj.items[i].type == LObject.TYPES.STRING) {
            if(strIndex == num) {
                return obj.items[i];
            }
            strIndex++;
        }
    }

    return null;
}

LObject.prototype.parse = function(buffer) {
    try {
        var numItems = buffer.readUInt8(0);
        this.items = [];
        for (var i = 0; i < numItems; i++) {
            this.items[i] = {};
            this.items[i].type = buffer.readUInt8(i + 1);
        }

        var strNum = 0;
        for (var i = 0; i < numItems; i++) {
            if (this.items[i].type == LObject.TYPES.STRING) {
                this.items[i].size = buffer.readUInt8(numItems + 1 + strNum);
                strNum++;
            } else {
                this.items[i].size = findById(typesArray, this.items[i].type).size;
            }
            this.items[i].data = findById(typesArray, this.items[i].type).fromBuffer(buffer, offsetOf(this, i), this.items[i].size);
        }

        return this;
    } catch (err) {
        console.log("Parse error:\n" + err);
    }
    return null;
};

LObject.prototype.toString = function() {
    var str = "";
    for (var i = 0; i < this.items.length; i++) {
        str += i + ": " + this.getAt(i).toString() + "\n";
    }
    return str;
};

LObject.prototype.setAt = function(index, type, value) {
    if(index > this.items.length) {
        return null;
    }
    var t = findById(typesArray, type);
    if(t == null) {
        return null;
    }
    this.items[index] = {};
    this.items[index].type = type;
    this.items[index].data = value;
    if(type == LObject.TYPES.STRING) {
        this.items[index].size = value.length;
    } else {
        this.items[index].size = t.size;
    }

    return this;
};

LObject.prototype.push = function(type, value) {
    return this.setAt(this.items.length, type, value);
};

LObject.prototype.insertAt = function(index, type, value) {
    if(index > this.items.length) {
        return null;
    }
    var t = findById(typesArray, type);
    if(t == null) {
        return null;
    }

    var item = {};
    item.type = type;
    item.data = value;
    if(type == LObject.TYPES.STRING) {
        item.size = value.length;
    } else {
        item.size = t.size;
    }

    this.items.unshift(item);

    return this;
};

LObject.prototype.removeAt = function(index) {
    if(index >= this.items.length) {
        return false;
    }

    this.items.splice(index, 1);
};

LObject.prototype.getAt = function(index) {
    if(index >= this.items.length) {
        return null;
    }
    return this.items[index].data;
};

LObject.prototype.toJSON = function() {
    return JSON.stringify(this.items);
};

LObject.prototype.getSize = function() {
    var size = this.items.length + numStrings(this) + 1;
    for(var i = 0; i < this.items.length; i++) {
        size += this.items[i].size;
    }

    return size;
};

LObject.prototype.getBuffer = function() {
    var buffer = new Buffer(this.getSize());
    buffer.writeUInt8(this.items.length, 0);
    for(var i = 0; i < this.items.length; i++) {
        buffer.writeUInt8(this.items[i].type, i + 1);
    }
    for(var i = 0; i < numStrings(this); i++) {
        buffer.writeUInt8(stringAt(this, i).size, 1 + this.items.length + i);
    }

    var offset = 1 + this.items.length + numStrings(this);
    for(var i = 0; i < this.items.length; i++) {
        var type = findById(typesArray, this.items[i].type);
        type.toBuffer(buffer, this.items[i].data, offset, this.items[i].size);
        offset += this.items[i].size;
    }

    return buffer;
};

module.exports = LObject;
