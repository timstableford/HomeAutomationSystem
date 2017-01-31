# Project Description
This project is another IoT hub with some speciality. It communicates over UDP
to a micro-controller that acts as a router, node or both. In router mode it can
forward data from other communication busses such as PJON. It's designed to be simple
to add more device types and their corresponding REST API's.

# Adding a device type
To add a device create a folder under devices with an index.js in.
The index.js must define at least two exports:
 * exports.type - Which is a number describing the type. It must be greater than 0 and less than 65535.
 * exports.name - A user readable name for the type.

Now the index.js should like like:
```javascript
exports.type = 1234;
exports.name = "Example Type";
```

Optional but very useful exports to define are:
 * exports.methods - An array of callbacks for the REST API.
 * exports.routes - An array of listeners for messages from your device type.

A basic example can be found under *devices/led_device*. This shows how to set and get a property from a device.

## Exporting REST Functions
Chances are you may want to have some publicly accessible functions, such as for setting an LED state.
Each listener inside exports.methods should be structured such as:
```javascript
{
  name: "setLEDState",
  callback: function(router, device, params, callback) {}
}
```
This will make the method setLEDState available over HTTP at /devices/:uid/methods/setLEDState.

The parameters in the callback are:
* router - A router class.
* device - The device the action is aimed at.
* params - The req.query from express. (Anything in the format ?key=value).
* callback - Call this when you're method is done. It expects a JS object to be sent back.

From this function it's possible to send a message to the device.
```javascript
router.dispatch(device, FUNCTION_ID, new LObject().push(LObject.TYPES.INT8, value));
```
This call is explained in more detail in the API's section. The call above would send a message to the device
containing a single int8.

# API
## HTTP
### /devices
This will contain an array of devices. A device can be defined as having:
* bus_id - Generally a PJON bus ID, or arbitrary without PJON.
* address - A single byte address.
* uid - A combination of bus_id and address in the format bus[0].bus[1].bus[2].bus[3].address. This must be unique.
* type - The number type of the device.
* last_ping - The last time a ping or pong was received from the device in millis. (Date.now() format)
* state - Either "online" or "offline". If the device has been heard from within the last 5 seconds this is online.
* name - If a name has been set then this a a unique string.

### /devices/:uid
Returns a single device as described above. :uid can be either the device uid or the device name if set.

### /devices/:uid/methods
Returns the methods available for a device. This will be an array of strings.

### /devices/:uid/methods/:method
Calls the specified method name on a device. Parameters to the function should be supplied through ?key=value format.

## NodeJS Classes
### Router
This class provides methods to write to a device and managed connections. It's passed into callbacks with the name 'router'.

#### dispatch (device, fid, obj, noack = false, callback = undefined)
This function sends a message to a device. Only the first 3 parameters are necessary. obj is of type LObject and may be empty.
* device - The device object to send to as defined in /devices.
* fid - The function ID to call on the device. Between 0 and 65535.
* obj - LObject containing the data to pass to the function.
* **(optional)** noack - If set to true then retries will not be attempted if it fails and the server will not wait for acknowledgement.
* **(optional)** callback - If this is set then noack must be false. It's called when an acknowledgement is received and may contain data.
   The callback should accept the parameters (device, header, router, obj).

#### onState(callback)
Reigsters a listener to be called when the device state changes between offline and online. It should accept (device, router) as parameters.

### LObject
LObject is for serialising and deserialising data for network transmission. The deserialisation happens automatically and the parsed object will be passed to the callbacks.
#### Using a parsed LObject
A parsed LObject will commonly be called *obj*.

There are two main functions for retrieving data:
* getLength() - Returns the number of items in the object.
* getAt(index) - Returns the data at the index.
#### Creating an LObject
When sending a message it needs to contain an LObject to pass data to the receiving function. This needs to at least be **new LObject()**.

The easiest way to add an item to an LObject is using **.push(type, data)**. This will append the data to the end of the items list and return the LObject, allowing the calls to be chained. Available types can be found in LObject.TYPES. When choosing a data type remember that it must be large enough to fit the passed in data. (Such as 2000 won't fit in an INT8.) If the data is too big for the type than the message will fail to send.

As an example, creating a signed 32 bit integer could be done by doing **new LObject().push(LObject.TYPES.INT32, 3453453)**.