#include <ESP8266WiFi.h>
#include <WiFiUdp.h>
#include <LObject.h>
#include <PJONUDP.h>

const char* ssid = "droctogonapus-bg";
const char* password = "alkesh56";

static IPAddress server_ip(192,168,2,62);
static uint16_t server_port = 42237;

static uint8_t local_bus[] = { 0x0, 0x1, 0x0, 0x0 };
static uint8_t local_address = ROUTER_ADDRESS;

int32_t time_offset = 0;
int32_t last_ping = 0;

WiFiUDP Udp;
void packetWriter(uint8_t *data, uint16_t data_len) {
  Udp.beginPacket(server_ip, server_port);
  Udp.write((const char *)data, data_len);
  Udp.endPacket();
}
UdpWrapper wrapper(packetWriter);
unsigned int localUdpPort = 4210;  // local port to listen on
char incomingPacket[255];  // buffer for incoming packets

#define PING_INTERVAL (2000)

void packetCallback(RPCHeader &header, uint8_t *bus_id, uint8_t address, uint8_t *data, uint16_t length) {
  if (header.fid != ACK_FID) {
    if (header.id != NO_ACK_ID) {
      wrapper.sendAck(bus_id, address, header.type, header.id);
    }
    if(memcmp(bus_id, local_bus, 4) == 0 && address == local_address) {
      LObject obj(&(data[RPC_HEADER_SIZE]));
      switch(header.fid) {
        case PONG_FID:
          time_offset = (int32_t)obj.uint32At(0) - (int32_t)(millis() / 1000);
          Serial.print("Received pong: ");
          Serial.println(obj.uint32At(0), DEC);
          break;
        default: break;
      }
    }
  }
}


void setup() {
  Serial.begin(115200);
  Serial.println();

  Serial.printf("Connecting to %s ", ssid);
  WiFi.persistent(false);
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.begin(ssid, password);
  }
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" connected");

  Udp.begin(localUdpPort);
  Serial.printf("Now listening at IP %s, UDP port %d\n", WiFi.localIP().toString().c_str(), localUdpPort);
}


void loop()
{
  int packetSize = Udp.parsePacket();
  if (packetSize) {
    // receive incoming UDP packets
    Serial.printf("Received %d bytes from %s, port %d\n", packetSize, Udp.remoteIP().toString().c_str(), Udp.remotePort());
    int len = Udp.read(incomingPacket, 255);
    if (len > 0) {
      int16_t parse_result = ParseUDPPacket((uint8_t *)incomingPacket, len, packetCallback);
      if (parse_result) {
        Serial.print("Failed to parse packet: ");
        Serial.println(parse_result);
      }
    }
  }
  if (millis() - last_ping > PING_INTERVAL) {
    Serial.println("Sending ping.");
    wrapper.sendPJONUDP(local_bus, local_address, TYPE_ROUTER, PING_FID, (char *)"L", (millis() / 1000) + time_offset);
    last_ping = millis();
  }
}
