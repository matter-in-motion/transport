'use strict';
const EventEmitter = require('events');

class Transport extends EventEmitter {
  constructor() {
    super()
    this.initRequired = true;
    this.transports = [];
  }

  init({ app, transports, logger }) {
    if (transports.isEmpty()) {
      throw Error('At least one transport should be defined');
    }

    this.logger = logger.child({ unit: 'transport' });
    transports.forEach((transport, name) => this.add(name, transport));
    app.did('start', () => this.start())
    app.did('stop', () => this.stop())
  }

  add(name, transport) {
    this.transports.push(name);
    this[name] = transport

    transport.connect = connection => this.emit('connect', connection);
    transport.close = connection => this.emit('close', connection);

    transport.message = message => {
      message.transport = name;
      this.logger.info({ message }, 'Message')
      this.emit('message', message);
    };

    transport.error = err => {
      this.logger.error(err);
      this.emit('error', err);
    };
  }

  start() {
    const promises = this.transports.map(name => this[name].start());
    return Promise.all(promises)
  }

  stop() {
    const promises = this.transports.map(name => this[name].stop());
    return Promise.all(promises)
  }

  response(msg) {
    this[msg.transport].response(msg);
  }
}

module.exports = Transport;
