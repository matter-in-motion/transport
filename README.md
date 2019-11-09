# Matter In Motion

[![NPM Version](https://img.shields.io/npm/v/matter-in-motion/transport.svg?style=flat-square)](https://www.npmjs.com/package/matter-in-motion/transport)
[![NPM Downloads](https://img.shields.io/npm/dt/matter-in-motion/transport.svg?style=flat-square)](https://www.npmjs.com/package/matter-in-motion/transport)

**Node.js framework for building applications (cli, server, etc...).**

## Transport

Matter In Motion events transport extension.

### Installation

`npm i @matter-in-motion/trasnport`

### Usage

1. Add it to your extensions in the settings.
2. That's it.

```js
const transport = app.reuire('transport');
transport.on('event/:id', (msg, params) => console.log(params.id, msg));
```

To emit event just:

```js
transport.emit('event/1');
```

_Caution the `emit` method is anyc and returns a Promise, but it never throws. check the [Hooks](#hooks) part_

### Transports

You can add other transports:

- [http](https://github.com/matter-in-motion/transports.http)
- [websockets](https://github.com/matter-in-motion/transports.websockets)

All transports will start with application `await app.start()`

### Events

The Transport uses Radix Tree for events look up so it is very fast. You can subscribe many handlers to one route. You can use `*` and `:placeholder` patterns. The last parameter in the handler will be all `placeholders` found in the path.

#### on([prefixes], path, handler)

Subscribe for the path. Prefixes can be omited.

#### off([prefixes], path, handler)

Unsubscribe from the path. Prefixes can be omited.

### Hooks

There are async hooks available for `emit`, `start`, and `stop` methods.

### Settings

No settings

License: MIT.
