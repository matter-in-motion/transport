const test = require('ava');
const deepEqual = require('deep-equal');
const uuid5 = require('uuid5');
const Tree = require('../tree');

function testPath(tree, path, id, params) {
  const res = tree.get(path);

  if (!(id === undefined || id === null)) {
    id = uuid5(id);
  }

  return res.id === id && deepEqual(res.params, params);
}

test('it should add routes correctly', t => {
  const tree = new Tree();

  tree.add('test1');
  tree.add('test2');
  tree.add('test3');
  tree.add('/test4');
  tree.add('//test4');

  const rootNode = tree.root;
  t.true(rootNode.children.has('test1'));
  t.true(rootNode.children.has('test2'));
  t.true(rootNode.children.has('test3'));
  t.true(rootNode.children.has(''));

  t.truthy(rootNode.children.get('').children.has('test4'));
  t.truthy(
    rootNode.children
      .get('')
      .children.get('')
      .children.has('test4')
  );
});

test('checks the static route map', t => {
  const tree = new Tree();
  const routeA = '/api/route';
  const routeB = '/api/v2/*';
  const routeC = '/api/v3/:placeholder';
  tree.add(routeA);
  tree.add(routeB);
  tree.add(routeC);

  t.truthy(tree.staticRoutes.has(routeA));
  t.falsy(tree.staticRoutes.has(routeB));
  t.falsy(tree.staticRoutes.has(routeC));
});

test('should insert placeholder and wildcard nodes correctly into the tree', t => {
  const tree = new Tree({
    routes: ['test1/:placeholder/tree', 'test2/test/*']
  });

  t.is(tree.root.children.get('test1').children.get(':').section, ':');

  t.is(
    tree.root.children
      .get('test2')
      .children.get('test')
      .children.get('*').section,
    '*'
  );
});

test('strict mode', t => {
  const tree = new Tree({
    routes: ['/root/test/something/'],
    strict: true
  });

  t.true(testPath(tree, '/root/test/something', undefined));
  t.true(testPath(tree, '/root/test/something/', '/root/test/something/'));
});

test('fail lookups', t => {
  const tree = new Tree({
    routes: ['/root/test/something/']
  });

  t.true(testPath(tree, '  ', undefined));
  t.true(testPath(tree, 'root', undefined));
  t.true(testPath(tree, '/root', undefined));
  t.true(testPath(tree, '/root/test', undefined));
  t.true(testPath(tree, '/root/test/something', '/root/test/something/'));
  t.true(testPath(tree, '/root/test/something/', '/root/test/something/'));
  t.true(testPath(tree, '/root/test/something/else', undefined));
});

test('wildcard lookups', t => {
  const tree = new Tree({ routes: ['/root/*', '/root/*/something'] });

  t.true(testPath(tree, '/root', undefined));
  t.true(testPath(tree, '/root/test1', '/root/*'));
  t.true(testPath(tree, '/root/test2', '/root/*'));
  t.true(testPath(tree, '/root/test1/something', '/root/*/something'));
  t.true(testPath(tree, '/root/test2/something', '/root/*/something'));
  t.true(testPath(tree, '/root/test1/something/else', '/root/*'));
  t.true(testPath(tree, '/root/test1/else/something', '/root/*/something'));
});

test('static lookups', t => {
  const tree = new Tree({ routes: ['/root', '*'] });
  t.true(testPath(tree, '/root', '/root'));
  t.true(testPath(tree, 'root', '*'));
});

test('placeholder lookups', t => {
  const tree = new Tree({
    routes: ['/root/:placeholder', '/root/:placeholder/next']
  });

  t.true(testPath(tree, '/root', undefined));
  t.true(testPath(tree, '/root/heyho/something', undefined));
  t.true(
    testPath(tree, '/root/heyho', '/root/:placeholder', {
      placeholder: 'heyho'
    })
  );
  t.true(
    testPath(tree, '/root/another/next', '/root/:placeholder/next', {
      placeholder: 'another'
    })
  );
});

test('placeholder and wildcards', t => {
  const tree = new Tree({ routes: ['/root/:placeholder', '/*/:placeholder'] });

  t.true(
    testPath(tree, '/root/heyho', '/root/:placeholder', {
      placeholder: 'heyho'
    })
  );
  t.true(
    testPath(tree, '/some/heyho', '/*/:placeholder', { placeholder: 'heyho' })
  );
});

test('placeholder and wildcards priorities', t => {
  const tree = new Tree({ routes: ['/:placeholder', '/*'] });

  t.true(testPath(tree, '/', '/:placeholder', { placeholder: '' }));
  t.true(testPath(tree, '/test1', '/:placeholder', { placeholder: 'test1' }));
  t.true(testPath(tree, '/test1/test2', '/*'));
});

test('remove path', t => {
  const tree = new Tree({
    routes: [
      '/test1', //
      '/test1/test2',
      '/test1/:placeholder',
      '/:placeholder',
      '/some-*',
      '/*'
    ]
  });

  t.true(testPath(tree, '/', '/:placeholder', { placeholder: '' }));
  t.true(testPath(tree, '/test1', '/test1'));
  t.true(testPath(tree, '/test1/test2', '/test1/test2'));
  t.true(testPath(tree, '/test3', '/:placeholder', { placeholder: 'test3' }));
  t.true(testPath(tree, '/test4/test4', '/*'));

  t.is(tree.remove('/test1'), uuid5('/test1'));
  t.false(tree.staticRoutes.has('/test1'));

  t.true(testPath(tree, '/', '/:placeholder', { placeholder: '' }));
  t.true(testPath(tree, '/test1', '/:placeholder', { placeholder: 'test1' }));
  t.true(
    testPath(tree, '/test1/some', '/test1/:placeholder', {
      placeholder: 'some'
    })
  );
  t.true(testPath(tree, '/test1/test2', '/test1/test2'));
  t.true(testPath(tree, '/test3', '/:placeholder', { placeholder: 'test3' }));
  t.true(testPath(tree, '/test4/test4', '/*'));

  t.is(tree.remove('/test1/test2'), uuid5('/test1/test2'));

  t.true(testPath(tree, '/', '/:placeholder', { placeholder: '' }));
  t.true(testPath(tree, '/test1', '/:placeholder', { placeholder: 'test1' }));
  t.true(
    testPath(tree, '/test1/test2', '/test1/:placeholder', {
      placeholder: 'test2'
    })
  );
  t.true(testPath(tree, '/test3', '/:placeholder', { placeholder: 'test3' }));
  t.true(testPath(tree, '/test4/test4', '/*'));

  t.is(tree.remove('/test1'), null);
  t.is(tree.remove(':placeholder'), null);
  t.is(tree.remove('/:placeholder'), uuid5('/:placeholder'));
  t.is(tree.remove('/test1/:placeholder'), uuid5('/test1/:placeholder'));
  t.is(tree.remove('/*'), uuid5('/*'));
  t.is(tree.remove('/*'), null);
  t.is(tree.remove('/some-*'), uuid5('/some-*'));
  t.is(tree.root.children.size, 0);
  t.is(tree.staticRoutes.size, 0);
});

test('gets ids', t => {
  const tree = new Tree({
    routes: [
      '/test1',
      '/test1/test2',
      '/test1/:placeholder',
      '/:placeholder',
      '/*'
    ]
  });

  t.is(tree.id('/test1'), uuid5('/test1'));
  t.is(tree.id('/test1/:placeholder'), uuid5('/test1/:placeholder'));
  t.is(tree.id('/*'), uuid5('/*'));
  t.is(tree.id('none'), null);
});
