/**
 * Created by tstableford on 30/01/17.
 */
const LObject = require.main.require('./LObject.js');
const Router = require.main.require('./Router.js');

// LED Toggle Type
const LED_TYPE_ID = 325;
const SET_LED_FID = 100;
const GET_LED_FID = 101;

exports.name = "LED Switch";
exports.type = LED_TYPE_ID;

// .routes are methods to be registered to the device router.
// An example would be to router.on(TYPE, Router.MAKE_FID.....etc) as a constructor for the device.
exports.routes = [
    {
        fid: Router.MAKE_FID,
        callback: function (device, header, router, obj) {
            console.log("Made an LED device.");
        }
    }
];
// Methods are public API functions.
exports.methods = [
    {
        name: "setLEDState",
        callback: function(router, device, params, callback) {
            if (isNaN(params.state)) {
                return callback({ error: "State not a number." });
            }
            const value = parseInt(params.state);
            router.dispatch(device, SET_LED_FID, new LObject().push(LObject.TYPES.INT8, value), false, function(device, header, router, obj) {
                if (device == null) {
                    return callback({ error: "Message failed to send." });
                } else {
                    return callback({ state: obj.getAt(0) });
                }
            });
        }
    },
    {
        name: "getLEDState",
        callback: function(router, device, params, callback) {
            router.dispatch(device, GET_LED_FID, new LObject(), false, function(device, header, router, obj) {
                if (device == null) {
                    return callback({ error: "Message failed to send." });
                } else {
                    return callback({ state: obj.getAt(0) });
                }
            });
        }
    }
];