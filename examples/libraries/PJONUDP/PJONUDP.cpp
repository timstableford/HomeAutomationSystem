#include <stdint.h>
#include <string.h>
#include <PJONUDP.h>
#include <LObject.h>

inline uint16_t crcAppend(uint16_t crc, uint8_t data) {
  uint8_t x = crc >> 8 ^ data;
  x ^= x >> 4;
  return (crc << 8) ^ ((uint16_t)(x << 12)) ^ ((uint16_t)(x << 5)) ^ ((uint16_t)x);
}

uint16_t CRC16(uint8_t *data_p, uint16_t length) {
    uint16_t crc = 0xFFFF;

    while (length--){
        crc = crcAppend(crc, *data_p++);
    }
    return crc;
}

uint16_t MakeUDPPacket(uint8_t *output, uint8_t bus_id[4], uint8_t address, uint8_t *input, uint16_t input_length) {
  if (output != nullptr) {
    *(uint16_t *)output = htons(input_length + 7);
    memcpy(output + 2, bus_id, 4);
    output[6] = address;
    memcpy(output + 7, input, input_length);
    uint16_t crc = htons(CRC16(output, input_length + 7));
    memcpy(output + input_length + 7, (uint8_t *)&crc, sizeof(uint16_t));
  }
  return input_length + 9;
}

int16_t ParseUDPPacket(uint8_t *data, uint8_t length, PacketCallback callback) {
  if (length < 2) {
    return -1;
  }
  uint16_t read_length = ntohs(*(uint16_t *)data);
  if ((length - 2) != read_length) {
    return -2;
  }

  uint16_t packet_crc;
  memcpy(&packet_crc, data + length - 2, sizeof(uint16_t));
  packet_crc = ntohs(packet_crc);
  uint16_t crc = CRC16(data, read_length);
  if (packet_crc != crc) {
    return -3;
  }

  uint8_t bus_id[4];
  memcpy(bus_id, data + 2, 4);
  uint8_t address = data[6];
  uint8_t packet_data_length = length - 9;
  uint8_t packet_data[length - 9];
  memcpy(packet_data, data + 7, packet_data_length);

  RPCHeader header = parseHeader(packet_data);
  callback(header, bus_id, address, packet_data, packet_data_length);

  return 0;
}

uint16_t UdpWrapper::sendAck(uint8_t *bus_id, uint8_t address, uint16_t type, uint16_t id) {
  uint8_t object_buffer[RPC_HEADER_SIZE];
  makeHeader(object_buffer, type, id, ACK_FID);
  uint16_t packet_size = MakeUDPPacket(NULL, NULL, 0, NULL, RPC_HEADER_SIZE);
  uint8_t packet_buffer[packet_size];
  if (MakeUDPPacket(packet_buffer, bus_id, address, object_buffer, RPC_HEADER_SIZE) != packet_size) {
    return 0;
  }
  writer_(packet_buffer, packet_size);
  return packet_size;
}

uint16_t UdpWrapper::sendPJONUDP(uint8_t *bus_id, uint8_t address, uint16_t type, uint16_t fid, uint16_t id, char *fmt, ...) {
  va_list argp;
  va_start(argp, fmt);
  uint16_t object_size = LObject::makeImpl(NULL, fmt, argp);
  va_end(argp);
  uint8_t main_buffer[object_size + RPC_HEADER_SIZE];
  makeHeader(main_buffer, type, id, fid);
  va_start(argp, fmt);
  uint8_t object_buffer[object_size];
  if (LObject::makeImpl(object_buffer, fmt, argp) != object_size) {
    va_end(argp);
    return 0;
  }
  va_end(argp);
  memcpy(main_buffer + RPC_HEADER_SIZE, object_buffer, object_size);
  uint16_t packet_size = MakeUDPPacket(NULL, NULL, 0, NULL, object_size + RPC_HEADER_SIZE);
  uint8_t packet_buffer[packet_size];
  if (MakeUDPPacket(packet_buffer, bus_id, address, main_buffer, object_size + RPC_HEADER_SIZE) != packet_size) {
    return 0;
  }
  writer_(packet_buffer, packet_size);
  return packet_size;
}

uint16_t UdpWrapper::sendPJONUDP(uint8_t *bus_id, uint8_t address, uint8_t *object_buffer, uint16_t object_size) {
  uint16_t packet_size = MakeUDPPacket(NULL, NULL, 0, NULL, object_size);
  uint8_t packet_buffer[packet_size];
  if (MakeUDPPacket(packet_buffer, bus_id, address, object_buffer, object_size) != packet_size) {
    return 0;
  }
  writer_(packet_buffer, packet_size);
  return packet_size;
}
