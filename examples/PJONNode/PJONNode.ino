#include <LObject.h>
#include <PJON.h>

#define TYPE_ID (325)
#define SET_LED_FID (100)
#define GET_LED_FID (101)
#define LED_PIN 13 // GPIO5

static uint8_t local_bus[] = { 0x0, 0x1, 0x0, 0x0 };
static uint8_t local_address = 30;

int32_t time_offset = 0;
int32_t last_ping = 0;

#define PING_INTERVAL (2000)

// <Strategy name> bus(selected device id)
PJON<OverSampling> bus(local_bus, local_address);

void sendPacket(uint16_t id, uint16_t fid, char *fmt, ...) {
  va_list argp;
  va_start(argp, fmt);
  uint16_t obj_size = LObject::makeImpl(NULL, fmt, argp);
  va_end(argp);
  uint8_t buffer[obj_size + RPC_HEADER_SIZE];
  makeHeader(buffer, TYPE_ID, id, fid);
  va_start(argp, fmt);
  LObject::makeImpl(buffer + RPC_HEADER_SIZE, fmt, argp);
  va_end(argp);
  bus.send(ROUTER_ID, local_bus, (const char *)buffer, obj_size + RPC_HEADER_SIZE);
}

void receiver_function(uint8_t *payload, uint16_t length, const PacketInfo &packet_info) {
  RPCHeader header = parseHeader(payload);
  Serial.println("Received packet header:");
  Serial.println(header.id);
  Serial.println(header.fid);
  Serial.println(header.type);
    LObject obj(NULL);
    // Copy to a new array to avoid unaligned errors.
    if (length - RPC_HEADER_SIZE > 0) {
      obj.setDataBuffer(payload + RPC_HEADER_SIZE);
    }
    switch(header.fid) {
      case PONG_FID:
        time_offset = (int32_t)obj.uint32At(0) - (int32_t)(millis() / 1000);
        Serial.print("Received pong: ");
        Serial.println(obj.uint32At(0), DEC);
        break;
      case SET_LED_FID:
        Serial.print("Setting led state to: "); Serial.println(obj.int8At(0));
        digitalWrite(LED_PIN, (obj.int8At(0) != 0) ? HIGH : LOW);
        // Send an ACK back containing the LED state.
        sendPacket(header.id, ACK_FID, (char *)"c", obj.int8At(0));
        break;
      case GET_LED_FID:
        // Send an ACK back containing the LED state.
        sendPacket(header.id, ACK_FID, (char *)"c", (digitalRead(LED_PIN) == HIGH) ? 1 : 0);
        break;
      default: break;
    }
}

void setup() {
  pinModeFast(LED_PIN, OUTPUT);
  digitalWriteFast(LED_PIN, LOW); // Initialize LED 13 to be off

  bus.strategy.set_pin(7);
  bus.begin();
  bus.set_receiver(receiver_function);

  Serial.begin(115200);
  Serial.println("Node is alive.");
};

void loop() {
  if (millis() - last_ping > PING_INTERVAL) {
    Serial.println("Sending ping.");
    sendPacket(NO_ACK_ID, PING_FID, (char *)"L", (millis() / 1000) + time_offset);
    last_ping = millis();
  }
  bus.update();
  bus.receive(100);
};
