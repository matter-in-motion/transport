'use strict';
const test = require('ava');
const App = require('@matter-in-motion/app');
const extension = require('../index');

class GoodTransport {
  constructor(send) {
    this.send = send;
  }

  init() {}

  onConnect(connection) {
    this.connection = connection;
    this.emit('connection', connection);
  }

  onMessage(body) {
    this.emit('message/test/path', {
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

test('starts and stops transports', async t => {
  const app = createApp({
    good: new GoodTransport()
  });

  await app.start();
  const transport = app.require('transport');
  const good = app.require('transports.good');
  t.is(good, transport.get('good'));
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

  const app = createApp({
    good: new GoodTransport()
  });

  await app.start();
  app.on('transport/message', handler);
  const transport = app.require('transport');
  await transport.emit('message', message);
  app.off('transport/message', handler);
  await app.stop();
});

test('checks the events', async t => {
  t.plan(8);
  const app = createApp({
    good: new GoodTransport()
  });

  const fakeConnection = {};

  await app.start();
  app
    .on('transport/good/connection', connection => {
      t.is(connection, fakeConnection);
    })
    .on('transport/good/message/test/path', msg => {
      t.truthy(msg);
      t.is(msg.connection, fakeConnection);
      t.is(msg.transport, 'good');
      t.is(msg.body, 'message');
      t.is(typeof msg.url, 'object');
      t.is(msg.url.searchParams.get('foo'), 'bar');
    })
    .on('error/transport/good', e => t.is(e.message, 'error'));

  const transport = app.require('transport');
  const goodTransport = transport.get('good');
  goodTransport.onConnect(fakeConnection);
  goodTransport.onMessage('message');
  goodTransport.error(new Error('error'));

  await app.stop();
});

test('not fails to emit with a throw in the handler', async t => {
  const app = createApp({
    good: new GoodTransport()
  });

  await app.start();
  app.on('transport/test', () => {
    throw Error();
  });

  const transport = app.require('transport');
  await transport.emit('test');
  t.pass();
  await app.stop();
});

test('not fails to emit with no handler', async t => {
  const app = createApp({
    good: new GoodTransport()
  });

  await app.start();
  const transport = app.require('transport');
  await transport.emit('test');
  t.pass();
});

test('checks the send', async t => {
  t.plan(1);
  const app = createApp({
    good: new GoodTransport(msg => {
      t.is(msg.response, 'RESPONSE');
    })
  });

  await app.start();
  const transport = app.require('transport');
  app.on('transport/test', msg => {
    msg.response = 'RESPONSE';
    transport.send(msg);
  });

  await transport.emit('test', { transport: 'good' });
  await app.stop();
});

test('the emit hooks', async t => {
  const app = createApp({
    good: new GoodTransport()
  });

  await app.start();
  const transport = app.require('transport');

  app.on('transport/test', msg => {
    t.is(msg.test, 'test');
  });

  transport.will('emit', (path, msg) => {
    t.is(path, 'test');
    t.is(msg.transport, 'good');
    msg.test = 'test';
  });

  await transport.emit('test', { transport: 'good' });
  await app.stop();
});

test('fails the send', async t => {
  t.plan(3);
  const app = createApp({
    good: new GoodTransport(() => Promise.reject(new Error('TEST')))
  });

  await app.start();
  const transport = app.require('transport');
  app.on('transport/test', msg => {
    transport.send(msg).catch(() => t.pass());
  });

  transport.emit('test');
  transport.emit('test', {});
  transport.emit('test', { transport: 'good' });
  await app.stop();
});
