This folder contains examples for Arduino and ESP8266. It also contains two necessary libraries.

# Requirements
* (PJON library)[https://github.com/gioblu/PJON]

# Libraries
Both of the libraries in the libraries sub-directory need to be added to your Arduino libraries directory.

# Examples
## ESP8266HomeAutomationNode
Runs on NodeMCU/ESP8266, acts as PJON router and switch device.
## HomeAutomationRouter
Runs on Arduino devices and uses ENC28J60 for network communcation. Acts as PJON router.
## PJONNode
Arduino sketch designed to act as a Node than communicates through a router and over PJON.
