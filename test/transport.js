'use strict';
const test = require('ava');
const Units = require('units');
const App = require('@matter-in-motion/app');
const extension = require('../index');

class GoodTransport {
  constructor(response) {
    this.mockResponse = response;
  }

  initRequired = true
  init() {}

  onConnect(connection) {
    this.connection = connection;
    this.connect(connection);
  }

  onMessage(body) {
    this.message({
      body,
      connection: this.connection,
      mime: 'application/fake'
    })
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

  response(msg) {
    this.mockResponse(msg.response);
  }
}

class BadTransport {
  initRequired = true
  init() {}

  start() {
    return Promise.reject()
  }

  stop() {
    return Promise.reject()
  }
}

function createApp(transports) {
  return new App({
    extensions: [
      'loggers.pino',
      extension,
      transports ? {
        transports
      } : undefined
    ],

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

test('fails to start without transports', async t => {
  const app = createApp();
  try {
    await app.start();
    t.fail();
  } catch (e) {
    t.pass();
  }
});

test('fails to start with empty transports', async t => {
  const app = createApp();
  const transports = new Units();
  app.units.add({ transports });
  try {
    await app.start();
    t.fail();
  } catch (e) {
    t.pass();
  }
});

test('starts and stops transports', async t => {
  const app = createApp({
    good: new GoodTransport({})
  });

  await app.start();
  const transport = app.require('transport');
  t.truthy(transport.good);
  t.is(transport.good.state, 'started');
  const good = app.require('transports.good');
  t.is(transport.good, good)
  t.is(good.state, 'started');
  t.is(typeof good.connect, 'function');
  t.is(typeof good.close, 'function');
  t.is(typeof good.message, 'function');
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

test('checks the connect', async t => {
  t.plan(7);
  const app = createApp({
    good: new GoodTransport(response => {
      t.is(response, 'response');
    })
  });

  const fakeConnection = {};

  await app.start();
  const transport = app.require('transport');
  transport.on('connect', connection => t.is(connection, fakeConnection));
  transport.on('message', msg => {
    t.truthy(msg);
    t.is(msg.connection, fakeConnection);
    t.is(msg.transport, 'good');
    t.is(msg.body, 'message');
  });

  const goodTransport = app.require('transports.good');
  goodTransport.onConnect(fakeConnection);
  goodTransport.onMessage('message');
  transport.response({
    transport: 'good',
    response: 'response'
  });

  transport.on('error', e => t.is(e.message, 'error'));
  goodTransport.error(new Error('error'));

  transport.on('close', () => t.pass());
  await app.stop();
});
