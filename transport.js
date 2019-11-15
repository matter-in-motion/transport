'use strict';
const hooks = require('async-hooks');

class Transport {
  constructor() {
    this.initRequired = true;
    this.transports = {};

    hooks(this, 'emit', 'start', 'stop', 'send');
  }

  init({ app, logger, transports }) {
    this.app = app;
    this.logger = logger.get('transport');

    transports.forEach((transport, name) => this.addTransport(name, transport));

    app.did('start', () => this.start());
    app.did('stop', () => this.stop());
  }

  addTransport(name, transport) {
    this.transports[name] = transport;
    transport.emit = (path, ...args) =>
      this.handleEvent(`${name}/${path}`, ...args);
    transport.error = error => this.handleError(error, name);
  }

  get(name) {
    return this.transports[name];
  }

  async handleEvent(path, ...args) {
    this.logger.info({ path }, 'Transport Event');
    await this.emit(path, ...args);
  }

  // !! >> this is async hooks method
  emit(path, ...args) {
    this.app.emit(`transport/${path}`, ...args);
  }

  catchEmit(error, path) {
    this.logError('Failed to emit event', error, { path });
  }

  handleError(error, transport) {
    this.logError('Transport failed', error, { transport });
    this.app.emit(`error/transport/${transport}`, error);
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
