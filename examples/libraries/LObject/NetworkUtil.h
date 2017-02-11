#ifndef __NETWORK_UTIL_H__
#define __NETWORK_UTIL_H__

#include <stdint.h>
#ifndef ARDUINO
#include <stdio.h>
#endif

#ifdef ARDUINO
# define __LITTLE_ENDIAN 1234
# define BYTE_ORDER LITTLE_ENDIAN
#else
#include <arpa/inet.h>
#endif

#ifdef ARDUINO
//Define ntohs and htons (2 byte)
#if !defined(ntohs) && (BYTE_ORDER == LITTLE_ENDIAN)
# define ntohs(n) ((((int16_t)(n)) & 0xff00) >> 8 | (((int16_t)(n)) & 0xff) << 8)
# define htons(n) ntohs(n)
#elif !defined(ntohs)
# define ntohs(n) ((int16_t)(n))
# define htons(n) ntohs(n)
#endif

//Define ntohl and htonl (4 byte)
#if !defined(ntohl) && (BYTE_ORDER == LITTLE_ENDIAN)
# define ntohl(x) ((((x)&0xff000000)>>24) \
									|(((x)&0x00ff0000)>>8)	\
									|(((x)&0x0000ff00)<<8)	\
									|(((x)&0x000000ff)<<24))
# define htonl(n) ntohl(n)
#elif !defined(ntohl)
# define ntohl(n) ((int32_t)(n))
# define htonl(n) ntohl(n)
#endif

#endif // ARDUINO

//Define ntohll and htonll (8 byte)
#if !defined(ntohll)
#define htonll(x) ((1==htonl(1)) ? (x) : ((uint64_t)htonl((x) & 0xFFFFFFFF) << 32) | htonl((x) >> 32))
#define ntohll(x) ((1==ntohl(1)) ? (x) : ((uint64_t)ntohl((x) & 0xFFFFFFFF) << 32) | ntohl((x) >> 32))
#endif

// These are defines to do a basic RPC over a reliable transmission medium.
typedef struct {
	uint16_t type;
	uint16_t fid;
	uint16_t id;
} RPCHeader;

typedef uint16_t (*PacketWriter)(uint8_t *data, uint16_t data_len);
typedef void (*PacketCallback)(RPCHeader &header, uint8_t *bus_id, uint8_t address, uint8_t *data, uint16_t length);

void makeHeader(uint8_t *buffer, uint16_t type, uint16_t id, uint16_t fid);
RPCHeader parseHeader(uint8_t *buffer);

#define RPC_HEADER_SIZE (6)
#define PING_FID (10)
#define PONG_FID (11)
#define ACK_FID (2)
#define TYPE_GENERIC (0)
#define TYPE_ROUTER (1)
#define NO_ACK_ID (0)

#define ROUTER_ADDRESS (1)

#endif
