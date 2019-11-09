'use strict';
const test = require('ava');
const App = require('@matter-in-motion/app');
const extension = require('../index');

class GoodTransport {
  constructor(response) {
    this.initRequired = true;
    this.mockResponse = response;
  }

  init() {}

  async onConnect(connection) {
    this.connection = connection;
    await this.emit('/connection', connection);
  }

  async onMessage(body) {
    await this.emit('/message/test/path', {
      body,
      transport: 'good',
      url: new URL('http://example.com/good/test/path?foo=bar'),
      connection: this.connection,
      mime: 'application/fake'
    });
  }

  onClose(connection) {
    this.connection = undefined;
    this.close(connection);
  }

  start() {
    this.state = 'started';
    return Promise.resolve();
  }

  stop() {
    this.state = 'stopped';
    return Promise.resolve();
  }
}

class BadTransport {
  constructor() {
    this.initRequired = true;
  }

  init() {}

  start() {
    return Promise.reject();
  }

  stop() {
    return Promise.reject();
  }
}

function createApp(transports) {
  transports = transports ? { transports } : undefined;

  return new App({
    extensions: ['loggers.pino', extension, transports],

    pino: {
      options: {
        level: 'silent',
        prettyPrint: true
      }
    },

    defaults: {
      logger: 'loggers.pino'
    }
  });
}

test('start without transports', async t => {
  const app = createApp();
  await app.start();
  const transport = app.require('transport');
  t.is(typeof transport.on, 'function');
  t.is(typeof transport.off, 'function');
  t.is(typeof transport.emit, 'function');
});

test('starts and stops transports', async t => {
  const app = createApp({
    good: new GoodTransport({})
  });

  await app.start();
  const transport = app.require('transport');
  const goodT = transport.transports.good;
  t.truthy(goodT);
  t.is(goodT.state, 'started');
  const good = app.require('transports.good');
  t.is(good, goodT);
  t.is(good.state, 'started');

  t.is(typeof good.emit, 'function');
  t.is(typeof good.error, 'function');

  await app.stop();
  t.is(good.state, 'stopped');
});

test('fails to start/stop bad transport', async t => {
  const app = createApp({
    bad: new BadTransport({})
  });

  try {
    await app.start();
    t.fail();
  } catch (e) {
    t.pass();
  }

  try {
    await app.stop();
    t.fail();
  } catch (e) {
    t.pass();
  }
});

test('on and off from routes', async t => {
  t.plan(1);
  const message = 'test';
  const handler = msg => t.is(msg, message);

  const app = createApp();
  await app.start();
  const transport = app.require('transport');
  transport.on('good/message', handler);
  await transport.emit('good/message', message);
  transport.off('good/message', handler);
  await app.stop();
});

test('on and off with prefixes', async t => {
  const message = 'test';

  const app = createApp({
    good: new GoodTransport({})
  });
  await app.start();
  const transport = app.require('transport');

  const handler1 = msg => t.is(msg, message);
  const handler2 = msg => t.is(msg, message);

  transport.on(['good'], '/message', handler1);
  transport.on(['good'], '/message', handler2);
  await transport.emit('good/message', message);

  transport.off(['good'], '/message', handler1);
  transport.off(['good'], '/message', handler2);
  await app.stop();
});

test('on and off faling pathes', async t => {
  const app = createApp({
    good: new GoodTransport({})
  });
  await app.start();

  const transport = app.require('transport');
  const err1 = t.throws(() => {
    transport.on('/message');
  });
  t.is(err1.message, 'Handler should be a function but got undefined');

  const err2 = t.throws(() => {
    transport.off('/message');
  });
  t.is(err2.message, 'Handler should be a function but got undefined');

  await app.stop();
});

test('checks the events', async t => {
  t.plan(8);
  const app = createApp({
    good: new GoodTransport(response => t.is(response, 'response'))
  });

  const fakeConnection = {};

  await app.start();
  const transport = app.require('transport');
  transport
    .on('good/connection', connection => t.is(connection, fakeConnection))
    .on('good/message/test/path', msg => {
      t.truthy(msg);
      t.is(msg.connection, fakeConnection);
      t.is(msg.transport, 'good');
      t.is(msg.body, 'message');
      t.is(typeof msg.url, 'object');
      t.is(msg.url.searchParams.get('foo'), 'bar');
    })
    .on('error/good', e => t.is(e.message, 'error'));

  const goodTransport = app.require('transports.good');
  await goodTransport.onConnect(fakeConnection);
  await goodTransport.onMessage('message');
  await goodTransport.error(new Error('error'));

  await app.stop();
});
