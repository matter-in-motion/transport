# Matter In Motion

[![NPM Version](https://img.shields.io/npm/v/matter-in-motion/transport.svg?style=flat-square)](https://www.npmjs.com/package/matter-in-motion/transport)
[![NPM Downloads](https://img.shields.io/npm/dt/matter-in-motion/transport.svg?style=flat-square)](https://www.npmjs.com/package/matter-in-motion/transport)

**Node.js framework for building applications (cli, server, etc...).**

## Transport

Matter In Motion extension abstraction over transport protocols such as http, websockets, etc.

### Installation

`npm i @matter-in-motion/trasnport`

### Usage

1. Add it to your extensions in the settings.
2. Add at least one trasnport extension
  - [http](https://github.com/matter-in-motion/transports.http)
  - [websockets](https://github.com/matter-in-motion/transports.websockets)
3. Add listener to the transport events

```js


```

### Events

* connect <connection> – emited with incoming connection
* close <connection> – emited when connection is closed
* error <error> – emited when transport error has ocured
* message <message> – emited with incoming message

### Message

Message is simple object that get passed through app. By coming out of transport it has this properties:

* **connection** – the connection where message came from.
* **meta** – metadata that was passed with the message.
* **body** – raw body of the message.


### Settings

No settings

License: MIT.
