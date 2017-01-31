/**
 * Created by tstableford on 30/01/17.
 */
const LObject = require.main.require('./LObject.js');

// LED Toggle Type
const LED_TYPE_ID = 325;
const SET_LED_FID = 100;
const GET_LED_FID = 101;

exports.name = "LED Switch";
exports.type = LED_TYPE_ID;

exports.methods = [
    {
        name: "setLEDState",
        callback: function(router, device, params, callback) {
            if (params.state == undefined) {
                return callback({ error: "State not defined." });
            }
            const value = parseInt(params.state);
            if (isNaN(value)) {
                return callback({ error: "State not a number." });
            }
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

// This is where any callbacks from the device would be registered. Any other initialization would be done here too.
// An example would be to router.on(TYPE, Router.MAKE_FID.....etc) as a constructor for the device.
exports.register = function(router) {
    console.log("Registering LED device module.");
};