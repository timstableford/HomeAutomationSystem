/**
 * Created by tstableford on 30/01/17.
 */

// LED Toggle Type
const LED_TYPE_ID = 325;
const SET_LED_FID = 100;
const GET_LED_FID = 101;

exports.register = function(LObject, registry, router) {
    console.log("Registering LED device module.");
    registry.on(LED_TYPE_ID, "setLEDState", function(router, device, params, callback) {
        if (params.state == undefined) {
            return callback(false, "State not defined.");
        }
        const value = parseInt(params.state);
        if (isNaN(value)) {
            return callback(false, "State not a number.");
        }
        router.dispatch(device, SET_LED_FID, new LObject().push(LObject.TYPES.INT8, value), false, function(device, header, router, obj) {
            if (device == null) {
                return callback(false, "Message failed to send.");
            } else {
                return callback(true, { state: obj.getAt(0) });
            }
        });
    });

    registry.on(LED_TYPE_ID, "getLEDState", function(router, device, params, callback) {
        router.dispatch(device, GET_LED_FID, new LObject(), false, function(device, header, router, obj) {
            if (device == null) {
                return callback(false, "Message failed to send.");
            } else {
                return callback(true, { state: obj.getAt(0) });
            }
        });
    });
};