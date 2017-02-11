/**
 * Created by tstableford on 30/01/17.
 */
const LObject = require.main.require('./LObject.js');
const Router = require.main.require('./Router.js');

// Switch Toggle Type
const SWITCH_TYPE_ID = 325;
const SET_STATE_FID = 100;
const GET_STATE_FID = 101;

exports.name = "Switch";
exports.type = SWITCH_TYPE_ID;

// .routes are methods to be registered to the device router.
// An example would be to router.on(TYPE, Router.MAKE_FID.....etc) as a constructor for the device.
exports.routes = [
    {
        fid: Router.MAKE_FID,
        callback: function (device, header, router, obj) {
            console.log(`Made a switch device (uid: ${device.uid})`);
        }
    }
];

function setState(router, device, params, callback, value) {
    router.dispatch(device, SET_STATE_FID, new LObject().push(LObject.TYPES.INT8, value), false, function(device, header, router, obj) {
        if (device == null) {
            return callback({ error: "Message failed to send." });
        } else {
            return callback({ state: obj.getAt(0) });
        }
    });
}

// Methods are public API functions.
exports.methods = [
    {
        name: "on",
        callback: function(router, device, params, callback) {
            setState(router, device, params, callback, 1);
        }
    },
    {
        name: "off",
        callback: function(router, device, params, callback) {
            setState(router, device, params, callback, 0);
        }
    },
    {
        name: "state",
        callback: function(router, device, params, callback) {
            router.dispatch(device, GET_STATE_FID, new LObject(), false, function(device, header, router, obj) {
                if (device == null) {
                    return callback({ error: "Message failed to send." });
                } else {
                    return callback({ state: obj.getAt(0) == 0 ? 'off' : 'on' });
                }
            });
        }
    }
];