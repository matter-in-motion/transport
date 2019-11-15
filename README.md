# Matter In Motion

[![NPM Version](https://img.shields.io/npm/v/@matter-in-motion/transport.svg?style=flat-square)](https://www.npmjs.com/package/@matter-in-motion/transport)
[![NPM Downloads](https://img.shields.io/npm/dt/@matter-in-motion/transport.svg?style=flat-square)](https://www.npmjs.com/package/@matter-in-motion/transport)

**Node.js framework for building applications (cli, server, etc...).**

## Transport

Matter In Motion transport extension.

### Installation

`npm i @matter-in-motion/transport`

### Usage

1. Add `transport` to your extensions in the settings.
1. Add at least one transport extension

```js
app.on('transport/http/get/user/:id', (msg, params) =>
  console.log('user', params.id)
);
```

### Transports

You can add other transports:

- [http](https://github.com/matter-in-motion/transports.http)
- [websockets](https://github.com/matter-in-motion/transports.websockets) - wip

All transports will start with application `await app.start()`

### Methods

#### send(message)

Sends the response set for the message. For the message structure look into individual transport extension documentation.

### Hooks

There are [async hooks](https://www.npmjs.com/package/async-hooks) available for `emit`, `send`, `start`, and `stop` methods.

### Settings

No settings

License: MIT.
