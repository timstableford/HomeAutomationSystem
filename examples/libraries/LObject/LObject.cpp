#include <stdlib.h>
#include <stdarg.h>
#include <string.h>

#include "NetworkUtil.h"
#include "LObject.h"

#define INT_GETSET(x, y, ct, cf) x LObject::y(uint8_t index) { \
	if (this->indexOf(index) == 0) { \
		return false; \
	} \
	x data; \
	memcpy(&data, this->dataTable + this->indexOf(index), sizeof(x)); \
	return cf(data); \
} \
bool LObject::y(uint8_t index, x data) { \
	if (this->indexOf(index) == 0) { \
		return false; \
	} \
	data = ct(data); \
	memcpy(this->dataTable + this->indexOf(index), &data, sizeof(x)); \
	return true; \
}

#define SIMPLE_FUNC(x) x

INT_GETSET(int8_t, int8At, SIMPLE_FUNC, SIMPLE_FUNC)
INT_GETSET(int16_t, int16At, htons, ntohs)
INT_GETSET(int32_t, int32At, htonl, ntohl)
INT_GETSET(int64_t, int64At, htonll, ntohll)
INT_GETSET(uint8_t, uint8At, SIMPLE_FUNC, SIMPLE_FUNC)
INT_GETSET(uint16_t, uint16At, htons, ntohs)
INT_GETSET(uint32_t, uint32At, htonl, ntohl)
INT_GETSET(uint64_t, uint64At, htonll, ntohll)
INT_GETSET(float, floatAt, SIMPLE_FUNC, SIMPLE_FUNC)

static LObject::ObjectType typesArray[] = {
	{ LObject::T_STRING, STR_SIZE }, //string - number of bytes to use for strlen
	{ LObject::T_INT8, sizeof(int8_t) }, //int8_t
	{ LObject::T_UINT8, sizeof(uint8_t) }, //uint8_t
	{ LObject::T_INT16, sizeof(int16_t) }, //int16_t
	{ LObject::T_UINT16, sizeof(uint16_t) }, //uint16_t
	{ LObject::T_INT32, sizeof(int32_t) }, //int32_t
	{ LObject::T_UINT32, sizeof(uint32_t) }, //uint32_t
	{ LObject::T_INT64, sizeof(int64_t) }, //int64_t
	{ LObject::T_UINT64, sizeof(uint64_t) }, //uint64_t
	{ LObject::T_FLOAT, sizeof(float) } //float
};

typedef struct {
	LObject::TYPES type;
	union TypeData {
		char *str;
		uint8_t uint8;
		int8_t int8;
		uint16_t uint16;
		int16_t int16;
		uint32_t uint32;
		int32_t int32;
		uint64_t uint64;
		int64_t int64;
		float flt;
	} data;
} Argument;

LObject::LObject(uint8_t *buffer) {
	this->dataTable = buffer;
}

LObject::~LObject() {
}

uint16_t LObject::getDataOffset() {
	uint8_t stringCount = this->strNum(this->getNumObjects());
	return this->getNumObjects() + (stringCount * this->typeSize(T_STRING)) + 1;
}

uint8_t LObject::strNum(uint8_t index) {
	uint8_t count = 0;
	for(uint8_t i = 0; i < index && i < this->getNumObjects(); i++) {
		if(this->dataTable[i + INDEX_TABLE_OFFSET] == T_STRING) {
			count++;
		}
	}

	return count;
}

uint16_t LObject::indexOf(uint8_t index) {
	uint16_t dataIndex = this->getDataOffset();

	if(index >= this->getNumObjects()) {
		return 0;
	}

	for(uint16_t i = 0; i < index; i++) {
		switch(this->dataTable[i + INDEX_TABLE_OFFSET]) {
			case T_STRING:
			{
				dataIndex += this->strlenAt(i);
				break;
			}
			default:
				dataIndex += this->typeSize(this->dataTable[i + INDEX_TABLE_OFFSET]);
				break;
		}
	}

	return dataIndex;
}

uint8_t LObject::strlenAt(uint8_t index) {
	if (typeAt(index) != T_STRING) {
		return 0;
	}
	uint8_t sizeIndex = this->getNumObjects() + this->strNum(index);
	return this->dataTable[sizeIndex + INDEX_TABLE_OFFSET];
}

uint16_t LObject::strAt(uint8_t index, uint8_t *buffer) {
	uint8_t len = strlenAt(index);
	if (buffer != nullptr && len > 0) {
		memcpy(buffer, this->dataTable + this->indexOf(index), len);
	}
	return len;
}

uint8_t LObject::getNumObjects() {
	if (this->dataTable == nullptr) {
		return 0;
	}
	return this->dataTable[NUM_OBJ_OFFSET];
}

uint8_t LObject::typeAt(uint8_t index) {
	if(this->getNumObjects() <= 0 || index >= this->getNumObjects()) {
		return T_NONE;
	}
	return this->dataTable[index + INDEX_TABLE_OFFSET];
}

bool LObject::strAt(uint8_t index, char *str, uint16_t stringLen) {
	if(stringLen > this->strlenAt(index)) {
		return false;
	}
	memcpy(this->dataTable + this->indexOf(index), str, stringLen);

	return true;
}

void LObject::setDataBuffer(uint8_t *buffer) {
	this->dataTable = buffer;
}

uint16_t LObject::getSize() {
	return this->indexOf(this->getNumObjects() - 1);
}

uint16_t LObject::writeTo(PacketWriter writer) {
	if(this->getNumObjects() == 0) {
		return 0;
	}

	return writer(this->dataTable, this->getSize());
}

uint8_t LObject::typeSize(uint8_t type) {
	for(uint8_t i = 0; i < NUM_TYPES; i++) {
		if(typesArray[i].type == type) {
			return typesArray[i].size;
		}
	}

	return 0;
}

LObject::TYPES LObject::getType(char c) {
	switch(c) {
		case 's':
			return LObject::T_STRING;
		case 'c':
			return LObject::T_INT8;
		case 'C':
			return LObject::T_UINT8;
		case 'd':
			return LObject::T_INT16;
		case 'D':
			return LObject::T_UINT16;
		case 'l':
			return LObject::T_INT32;
		case 'L':
			return LObject::T_UINT32;
		case 'm':
			return LObject::T_INT64;
		case 'M':
			return LObject::T_UINT64;
		case 'f':
			return LObject::T_FLOAT;
		default:
			return LObject::T_NONE;
	}
}

uint16_t LObject::make(uint8_t *buffer, const char *fmt, ...) {
	va_list argp;
	va_start(argp, fmt);
	uint16_t return_value = LObject::makeImpl(buffer, fmt, argp);
	va_end(argp);
	return return_value;
}
uint16_t LObject::makeImpl(uint8_t *buffer, const char *fmt, va_list argp) {
	uint16_t numArgs = strlen(fmt);
	Argument args[numArgs];

	// Temporarily store the arguments in a list
	for(uint16_t i = 0; i < numArgs; i++) {
		args[i].type = LObject::getType(fmt[i]);
		switch(args[i].type) {
			case LObject::T_STRING:
				args[i].data.str = va_arg(argp, char *);
				break;
			case LObject::T_INT8:
				args[i].data.int8 = (int8_t)va_arg(argp, int);
				break;
			case LObject::T_UINT8:
				args[i].data.uint8 = (uint8_t)va_arg(argp, int);
				break;
			case LObject::T_INT16:
				args[i].data.int16 = (int16_t)va_arg(argp, int);
				break;
			case LObject::T_UINT16:
				args[i].data.uint16 = (uint16_t)va_arg(argp, int);
				break;
			case LObject::T_INT32:
				args[i].data.int32 = (int32_t)va_arg(argp, long);
				break;
			case LObject::T_UINT32:
				args[i].data.uint32 = (uint32_t)va_arg(argp, long);
				break;
			case LObject::T_INT64:
				args[i].data.int64 = (int64_t)va_arg(argp, long long);
				break;
			case LObject::T_UINT64:
				args[i].data.uint64 = (uint64_t)va_arg(argp, long long);
				break;
			case LObject::T_FLOAT:
				args[i].data.flt = (float)va_arg(argp, double);
				break;
			case LObject::T_NONE:
				return 0;
		}
	}

	// Calculate the length needed for the object buffers before including string lengths
	uint16_t length = 0, indexSize = 0, numStr = 0; //index size start as 1 for function call id
	for(uint8_t i = 0; i < numArgs; i++) {
		if(args[i].type == LObject::T_STRING) {
			length += strlen(args[i].data.str);
			numStr++;
		} else {
			length += LObject::typeSize(args[i].type);
		}
		indexSize++;
	}

	// First byte for num objects, then 1 byte to indicate type for each object,
	// additional bytes to represent string length.
	uint16_t indexTableSize = NUM_ITEMS_OFFSET + indexSize + numStr * LObject::typeSize(LObject::T_STRING);

	if (buffer == NULL) {
		return indexTableSize + length;
	}

	//Propogate the buffer index table with all the types and the string lengths
	uint16_t stringIndex = 0;
	buffer[0] = (uint8_t)numArgs;
	for(uint8_t i = 0; i < numArgs; i++) {
		buffer[NUM_ITEMS_OFFSET + i] = args[i].type;
		if(buffer[NUM_ITEMS_OFFSET + i] == LObject::T_STRING) {
			buffer[NUM_ITEMS_OFFSET + indexSize + stringIndex] = strlen(args[i].data.str);
			stringIndex++;
		}
	}

	// Put the buffer and index table into and object
	LObject o(buffer);

	// For each item in the object, assign it's data from the temporary buffer
	for(uint8_t i = 0; i < o.getNumObjects(); i++) {
		if(o.typeAt(i) != args[i].type) {
			return 0;
		}
		switch(args[i].type) {
			case LObject::T_STRING:
				o.strAt(i, args[i].data.str, (uint8_t)(strlen(args[i].data.str)));
				break;
			case LObject::T_INT8:
				o.int8At(i, args[i].data.int8);
				break;
			case LObject::T_UINT8:
				o.uint8At(i, args[i].data.uint8);
				break;
			case LObject::T_INT16:
				o.int16At(i, args[i].data.int16);
				break;
			case LObject::T_UINT16:
				o.uint16At(i, args[i].data.uint16);
				break;
			case LObject::T_INT32:
				o.int32At(i, args[i].data.int32);
				break;
			case LObject::T_UINT32:
				o.uint32At(i, args[i].data.uint32);
				break;
			case LObject::T_INT64:
				o.int64At(i, args[i].data.int64);
				break;
			case LObject::T_UINT64:
				o.uint64At(i, args[i].data.uint64);
				break;
			case LObject::T_FLOAT:
				o.floatAt(i, args[i].data.flt);
				break;
			case LObject::T_NONE:
				return 0;
		}
	}

	return indexTableSize + length;
}

void makeHeader(uint8_t *buffer, uint16_t type, uint16_t id, uint16_t fid) {
	type = htons(type);
	id = htons(id);
	fid = htons(fid);
	memcpy(buffer, &type, sizeof(uint16_t));
	memcpy(buffer + sizeof(uint16_t), &fid, sizeof(uint16_t));
	memcpy(buffer + sizeof(uint16_t) * 2, &id, sizeof(uint16_t));
}

RPCHeader parseHeader(uint8_t *buffer) {
	RPCHeader header;
	memcpy(&header.type, buffer, sizeof(uint16_t));
	header.type = ntohs(header.type);
	memcpy(&header.fid, buffer + sizeof(uint16_t), sizeof(uint16_t));
	header.fid = ntohs(header.fid);
	memcpy(&header.id, buffer + sizeof(uint16_t) * 2, sizeof(uint16_t));
	header.id = ntohs(header.id);
	return header;
}

#ifdef SANITY_CHECK
int main() {
	uint16_t size = LObject::make(nullptr, "ls", 23434535, "hello world!");
	uint8_t buffer[size];
	LObject::make(buffer, "ls", 23434535, "hello world!");

	for (int i = 0; i < size; i++) {
		printf("0x%x, ", buffer[i]);
	}
	printf("\n");

	uint8_t buffer_cp[size];
	memcpy(buffer_cp, buffer, size);
	LObject obj(buffer_cp);
	int32_t i = obj.int32At(0);
	printf("%d\n", i);

	uint8_t strBuf[obj.strlenAt(1) + 1];
	obj.strAt(1, strBuf);
	strBuf[obj.strlenAt(1)] = '\0';
	printf("%s\n", strBuf);

	printf("num objs: %d\n", obj.getNumObjects());


	return 0;
}
#endif // SANITY_CHECK
