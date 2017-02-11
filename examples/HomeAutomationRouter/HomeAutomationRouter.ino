// Demonstrates usage of the new udpServer feature.
//You can register the same function to multiple ports, and multiple functions to the same port.
//
// 2013-4-7 Brian Lee <cybexsoft@hotmail.com>

#include <EtherCard.h>
#include <IPAddress.h>
#include <LObject.h>
#include <PJONUDP.h>
#include <PJON.h>

#define PORT 1337

PJON<OverSampling> bus(ROUTER_ADDRESS);

static byte server_ip[] = { 192,168,2,62 };
static uint16_t server_port = 42237;

// ethernet mac address - must be unique on your network
static byte mymac[] = { 0x7E,0x69,0x69,0x2D,0x30,0x31 };
static uint8_t local_bus[] = { 0x0, 0x0, 0x0, 0x0 };
static uint8_t local_address = ROUTER_ADDRESS;

int32_t time_offset = 0;
int32_t last_ping = 0;

#define PING_INTERVAL (2000)

byte Ethernet::buffer[500]; // tcp/ip send and receive buffer

uint16_t sendAck(uint8_t *dst_ip, uint16_t dst_port, uint8_t *bus_id, uint8_t address, uint16_t type, uint16_t id) {
  uint8_t object_buffer[RPC_HEADER_SIZE];
  makeHeader(object_buffer, type, id, ACK_FID);
  uint16_t packet_size = MakeUDPPacket(NULL, NULL, 0, NULL, RPC_HEADER_SIZE);
  uint8_t packet_buffer[packet_size];
  if (MakeUDPPacket(packet_buffer, bus_id, address, object_buffer, RPC_HEADER_SIZE) != packet_size) {
    return 0;
  }
  ether.sendUdp((const char *)packet_buffer, packet_size, PORT, dst_ip, dst_port); 
  return packet_size;
}

uint16_t sendPJONUDP(uint8_t *dst_ip, uint16_t dst_port, uint8_t *bus_id, uint8_t address, uint16_t type, uint16_t fid, char *fmt, ...) {
  va_list argp;
  va_start(argp, fmt);
  uint16_t object_size = LObject::makeImpl(NULL, fmt, argp) + RPC_HEADER_SIZE;
  va_end(argp);
  uint8_t object_buffer[object_size];
  makeHeader(object_buffer, type, 0, fid);
  va_start(argp, fmt);
  if (LObject::makeImpl(&(object_buffer[RPC_HEADER_SIZE]), fmt, argp) != (object_size - RPC_HEADER_SIZE)) {
    va_end(argp);
    return 0;
  }
  va_end(argp);
  uint16_t packet_size = MakeUDPPacket(NULL, NULL, 0, NULL, object_size);
  uint8_t packet_buffer[packet_size];
  if (MakeUDPPacket(packet_buffer, bus_id, address, object_buffer, object_size) != packet_size) {
    return 0;
  }
  ether.sendUdp((const char *)packet_buffer, packet_size, PORT, dst_ip, dst_port); 
  return packet_size;
}

uint16_t sendPJONUDP(uint8_t *dst_ip, uint16_t dst_port, uint8_t *bus_id, uint8_t address, uint8_t *object_buffer, uint16_t object_size) {
  uint16_t packet_size = MakeUDPPacket(NULL, NULL, 0, NULL, object_size);
  uint8_t packet_buffer[packet_size];
  if (MakeUDPPacket(packet_buffer, bus_id, address, object_buffer, object_size) != packet_size) {
    return 0;
  }
  ether.sendUdp((const char *)packet_buffer, packet_size, PORT, dst_ip, dst_port); 
  return packet_size;
}

void packetCallback(uint8_t *src_ip, uint16_t src_port, uint8_t *bus_id, uint8_t address, uint8_t *data, uint16_t length) {
  RPCHeader header = parseHeader(data);
  if (header.fid != ACK_FID) {
  sendAck(src_ip, src_port, bus_id, address, header.type, header.id);
  if(memcmp(bus_id, local_bus, 4) == 0 && address == 0) {
    Serial.println("Received packet for router.");
    LObject obj(&(data[RPC_HEADER_SIZE]));
      switch(header.fid) {
        case PONG_FID:
          time_offset = (int32_t)obj.uint32At(0) - (int32_t)(millis() / 1000);
          Serial.println("Received pong.");
          Serial.println(obj.uint32At(0), DEC);
          break;
        default: break;
      }
  } else {
    // If it's not directed at the router then forward it along through PJON.
    bus.send(address, bus_id, (const char *)data, length);
  }
  }
}

//callback that prints received packets to the serial port
void udpSerialPrint(uint16_t dest_port, uint8_t src_ip[IP_LEN], uint16_t src_port, const char *data, uint16_t len){
  IPAddress src(src_ip[0],src_ip[1],src_ip[2],src_ip[3]);
  
  Serial.print("dest_port: ");
  Serial.println(dest_port);
  Serial.print("src_port: ");
  Serial.println(src_port);
  Serial.print("src_ip: ");
  ether.printIp(src_ip);
  Serial.println();

  int16_t parse_result = ParseUDPPacket(src_ip, src_port, (uint8_t *)data, len, packetCallback);
  Serial.print("ParseUDPPacket: "); Serial.println(parse_result);
}

void receiver_function(uint8_t *payload, uint16_t length, const PacketInfo &packet_info) {
  Serial.print("PJON packet received from: "); Serial.println(packet_info.sender_id);
  sendPJONUDP(server_ip, server_port, packet_info.sender_bus_id, packet_info.sender_id, (uint8_t *)payload, length);
}

void setup(){
  Serial.begin(57600);
  Serial.println(F("\n[backSoon]"));

  if (ether.begin(sizeof Ethernet::buffer, mymac) == 0)
    Serial.println(F("Failed to access Ethernet controller"));
  if (!ether.dhcpSetup())
    Serial.println(F("DHCP failed"));

  ether.printIp("IP:  ", ether.myip);
  ether.printIp("GW:  ", ether.gwip);
  ether.printIp("DNS: ", ether.dnsip);

  //register udpSerialPrint() to port 1337
  ether.udpServerListenOnPort(&udpSerialPrint, PORT);

  bus.strategy.set_pins(11, 12);
  bus.set_communication_mode(HALF_DUPLEX);
  bus.begin();
  bus.set_router(true);
  bus.set_receiver(receiver_function);
}

void loop(){
  //this must be called for ethercard functions to work.
  if (millis() - last_ping > PING_INTERVAL) {
    Serial.println(sendPJONUDP(server_ip, server_port, local_bus, local_address, TYPE_ROUTER, PING_FID, (char *)"L", (millis() / 1000) + time_offset));
    last_ping = millis();
  }
  ether.packetLoop(ether.packetReceive());
  bus.update();
  bus.receive(50);
}

