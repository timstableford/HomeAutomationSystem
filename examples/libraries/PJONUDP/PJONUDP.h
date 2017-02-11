#ifndef __PJON_UDP_H__
#define __PJON_UDP_H__

#include <stdint.h>
#include <LObject.h>

uint16_t MakeUDPPacket(uint8_t *output, uint8_t bus_id[4], uint8_t address, uint8_t *input, uint16_t input_length);
int16_t ParseUDPPacket(uint8_t *data, uint8_t length, PacketCallback callback);

class UdpWrapper {
public:
  UdpWrapper(PacketWriter writer) {
	  writer_ = writer;
  }
  uint16_t sendAck(uint8_t *bus_id, uint8_t address, uint16_t type, uint16_t id);
  uint16_t sendPJONUDP(uint8_t *bus_id, uint8_t address, uint16_t type, uint16_t fid, uint16_t id, char *fmt, ...);
  uint16_t sendPJONUDP(uint8_t *bus_id, uint8_t address, uint8_t *object_buffer, uint16_t object_size);
private:
  PacketWriter writer_;
};

#endif
