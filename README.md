![Static Badge](https://img.shields.io/badge/Pi-Network-violet)
[![CI](https://github.com/KOSASIH/pi-node/actions/workflows/blank.yml/badge.svg)](https://github.com/KOSASIH/pi-node/actions/workflows/blank.yml)

![ISO 9001:2015](https://img.shields.io/badge/ISO-9001:2015-Blue)
![ISO 27001:2013](https://img.shields.io/badge/ISO-27001:2013-Green)
![ISO 14001:2015](https://img.shields.io/badge/ISO-14001:2015-Green)
![CMMI Level 3](https://img.shields.io/badge/CMMI-Level%203-Orange)
![ITIL](https://img.shields.io/badge/ITIL-Certified-Blue)
![COBIT](https://img.shields.io/badge/COBIT-Certified-Red)
![HIPAA](https://img.shields.io/badge/HIPAA-Compliant-Blue)
![PCI-DSS](https://img.shields.io/badge/PCI--DSS-Compliant-Red)

<p xmlns:cc="http://creativecommons.org/ns#" xmlns:dct="http://purl.org/dc/terms/"><a property="dct:title" rel="cc:attributionURL" href="https://github.com/KOSASIH/pi-supernode">pi-supernode</a> by <a rel="cc:attributionURL dct:creator" property="cc:attributionName" href="https://www.linkedin.com/in/kosasih-81b46b5a">KOSASIH</a> is licensed under <a href="https://creativecommons.org/licenses/by/4.0/?ref=chooser-v1" target="_blank" rel="license noopener noreferrer" style="display:inline-block;">Creative Commons Attribution 4.0 International<img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/cc.svg?ref=chooser-v1" alt=""><img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/by.svg?ref=chooser-v1" alt=""></a></p>

# pi-supernode

This repository contains the source code for a simple Node.js application that runs on a Raspberry Pi. The application listens for incoming HTTP requests and responds with a message indicating the current temperature and uptime of the Raspberry Pi.

# Prerequisites

To run this application, you will need the following:

1. A Raspberry Pi with Node.js installed
2. A temperature sensor (such as a DS18B20) connected to the Raspberry Pi

# Getting Started

1. Clone this repository to your Raspberry Pi:

```
1. https://github.com/KOSASIH/pi-supernode
```

2. Install the required dependencies:

```
1. cd pi-node
2. npm install
```

3. Edit the config.js file to specify the temperature sensor's device file path. For example, if you're using a DS18B20 connected to GPIO pin 4, the device file path will be /sys/bus/w1/devices/28-000005f8b8ff/w1_slave.

4. Start the application:

```
1. npm start
```

5. Use a web browser or a tool like curl to send an HTTP request to the Raspberry Pi and view the response:

```
1. curl http://<RASPBERRY_PI_IP_ADDRESS>:3000
```

The response will look something like this:

```
1. Temperature: 23.5°C, Uptime: 1 day, 2 hours, 34 minutes, 56 seconds
```

# License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
