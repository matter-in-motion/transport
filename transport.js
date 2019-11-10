'use strict';
const assert = require('assert');
const EventEmitter = require('events');
const hooks = require('async-hooks');
const Tree = require('./tree');

class Transport {
  constructor() {
    this.initRequired = true;
    this.root = new Tree();
    this.handlers = new EventEmitter();
    this.transports = {};

    hooks(this, 'emit', 'start', 'stop', 'send');
  }

  init({ app, logger, 'transports?': transports }) {
    this.logger = logger.get('transport');

    if (transports && !transports.isEmpty()) {
      transports.forEach((transport, name) =>
        this.addTransport(name, transport)
      );
    }

    app.did('start', () => this.start());
    app.did('stop', () => this.stop());
  }

  addTransport(name, transport) {
    this.transports[name] = transport;

    transport.emit = (path, ...args) => this.emit(`${name}${path}`, ...args);
    transport.error = error => this.handleError(error, name);
  }

  get(name) {
    return this.transports[name];
  }

  emit(path, ...args) {
    return new Promise(resolve => {
      // TODO: what to log?
      this.logger.info({ path }, 'Event');

      const { id, params } = this.root.get(path);
      if (id) {
        this.handlers.emit(id, ...args, params);
      }

      resolve();
    });
  }

  catchEmit(error, path) {
    this.logError('Failed to emit the event', error, { path });
  }

  handleError(error, transport) {
    this.logError('Transport error', error, { transport });
    this.emit(`error/${transport}`, error);
  }

  on(prefixes, path, handler) {
    if (typeof prefixes === 'string') {
      handler = path;
      path = prefixes;
    } else {
      prefixes.forEach(prefix => this.on(`${prefix}${path}`, handler));
      return;
    }

    assert(
      typeof handler === 'function',
      `Handler should be a function but got ${handler}`
    );

    const { id } = this.root.add(path);
    this.handlers.on(id, handler);
    return this;
  }

  off(prefixes, path, handler) {
    if (typeof prefixes === 'string') {
      handler = path;
      path = prefixes;
    } else {
      prefixes.forEach(prefix => this.off(`${prefix}${path}`, handler));
      return;
    }

    assert(
      typeof handler === 'function',
      `Handler should be a function but got ${handler}`
    );

    const id = this.root.id(path);
    this.handlers.off(id, handler);

    if (!this.handlers.listenerCount(id)) {
      this.root.remove(path);
    }

    return this;
  }

  start() {
    const promises = Object.entries(this.transports).map(([name, transport]) =>
      transport.start().then(address => {
        this.logger.info(
          {
            transport: name,
            status: 'listening',
            address
          },
          `Transport ${name} is listening at: ${address}`
        );

        return address;
      })
    );

    return Promise.all(promises);
  }

  stop() {
    const promises = Object.entries(this.transports).map(([name, transport]) =>
      transport.stop().then(() => {
        this.logger.info(
          {
            transport: name,
            status: 'stopped'
          },
          `Transport ${name} has been stopped`
        );
      })
    );

    return Promise.all(promises);
  }

  send(message) {
    if (!message) {
      throw new Error('Can not send empty message');
    }

    const transport = this.get(message.transport);
    if (!transport) {
      throw new Error(`Transport '${message.transport}' not found`);
    }

    return transport.send(message);
  }

  catchSend(error, message) {
    this.logError('Failed to send message', error, {
      transport: message.transport
    });

    throw error;
  }

  logError(msg, error, data) {
    this.logger.error(
      {
        ...data,
        stack: error.stack
      },
      `${msg}: ${error}`
    );
  }
}

module.exports = Transport;
