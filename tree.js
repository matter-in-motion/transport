'use strict';
const uuid5 = require('uuid5');
const assert = require('assert');

const WILDCARD = '*';
const PLACEHOLDER = ':';

function validatePath(path, strictPaths) {
  assert(path, '"path" must be provided');
  assert(typeof path === 'string', '"path" must be that of a string');

  const pathEnd = path.length - 1;

  // allow for trailing slashes to match by removing it
  if (!strictPaths && path.length > 1 && path[pathEnd] === '/') {
    return path.slice(0, pathEnd);
  }

  return path;
}

function createNode(id, section, parent, paramName) {
  return {
    id,
    section,
    parent,
    paramName,
    children: new Map()
  };
}

function getChildNode(parent, str) {
  if (str[0] === PLACEHOLDER) {
    if (parent.children.has(PLACEHOLDER)) {
      return parent.children.get(PLACEHOLDER);
    }

    const node = createNode(undefined, PLACEHOLDER, parent, str.slice(1));
    parent.children.set(PLACEHOLDER, node);
    return node;
  }

  if (str === WILDCARD) {
    if (parent.children.has(WILDCARD)) {
      return parent.children.get(WILDCARD);
    }

    const node = createNode(undefined, WILDCARD, parent);
    parent.children.set(WILDCARD, node);
    return node;
  }

  if (parent.children.has(str)) {
    return parent.children.get(str);
  }

  const node = createNode(undefined, str, parent, str);
  parent.children.set(str, node);
  return node;
}

function findNodeUp(node, path, index) {
  if (index === path.length && node.parent) {
    const placeholderNode = node.parent.children.get(PLACEHOLDER);
    if (placeholderNode && placeholderNode.id) {
      return {
        didMatch: true,
        node: placeholderNode,
        params: {
          [placeholderNode.paramName]: path[index - 1]
        }
      };
    }
  }

  let didMatch = false;
  let goUpNode = node;
  while (goUpNode) {
    goUpNode = goUpNode.parent;
    if (goUpNode) {
      const upWildcardNode = goUpNode.children.get(WILDCARD);
      if (upWildcardNode && upWildcardNode.id) {
        node = upWildcardNode;
        didMatch = true;
        goUpNode = false;
      }
    }
  }

  return {
    didMatch,
    node: didMatch ? node : undefined
  };
}

function findNodeDown(node, path) {
  const params = {};
  let didMatch = true;
  let index = 0;

  for (const l = path.length - 1; index <= l; index++) {
    const section = path[index];

    // exact matches take precedence over placeholders
    const nextNode = node.children.get(section);
    if (nextNode) {
      node = nextNode;
      continue;
    }

    const placeholderNode = node.children.get(PLACEHOLDER);
    if (placeholderNode) {
      params[placeholderNode.paramName] = section;
      node = placeholderNode;
      continue;
    }

    const wildcardNode = node.children.get(WILDCARD);
    if (wildcardNode) {
      node = wildcardNode;
      continue;
    }

    if (node.section === WILDCARD) {
      continue;
    }

    // exit the loop
    didMatch = false;
    break;
  }

  return {
    didMatch,
    node,
    params: Object.keys(params).length ? params : undefined,
    index
  };
}

function findNode(root, path) {
  const pathParts = path.split('/');
  const down = findNodeDown(root, pathParts);

  // console.log('down', down);
  if (down.didMatch && down.node.id) {
    return {
      node: down.node,
      params: down.params
    };
  }

  const up = findNodeUp(down.node, pathParts, down.index);
  if (up.didMatch) {
    return {
      node: up.node,
      params: up.params
    };
  }

  return {
    node: undefined
  };
}

function findExactNode(node, path) {
  path.split('/').some(section => {
    // wildcard matches here as well
    if (node.children.has(section)) {
      node = node.children.get(section);
      return;
    }

    if (section[0] === PLACEHOLDER && node.children.has(PLACEHOLDER)) {
      node = node.children.get(PLACEHOLDER);
      return;
    }

    node = undefined;
    return true;
  });

  return node;
}

class Tree {
  constructor(options = {}) {
    this.strict = options.strict;
    this.clear();

    if (options.routes) {
      options.routes.forEach(route => this.add(route));
    }
  }

  get(path) {
    path = validatePath(path, this.strict);

    if (this.staticRoutes.has(path)) {
      return { id: this.staticRoutes.get(path).id };
    }

    const { node, params } = findNode(this.root, path);
    return {
      id: node ? node.id : undefined,
      params
    };
  }

  add(path) {
    const id = uuid5(path);
    path = validatePath(path, this.strict);

    let isStaticRoute = true;
    let node = this.root;

    path.split('/').forEach(section => {
      node = getChildNode(node, section);

      if (node.section === PLACEHOLDER || node.section === WILDCARD) {
        isStaticRoute = false;
      }
    });

    node.id = id;

    // optimization, if a route is static and does not have any
    // variable sections, we can store it into a map for faster
    // retrievals
    if (isStaticRoute === true) {
      this.staticRoutes.set(path, node);
    }

    return node;
  }

  remove(path) {
    path = validatePath(path, this.strict);

    this.staticRoutes.delete(path);
    let node = findExactNode(this.root, path);
    if (!node) {
      return null;
    }

    const id = node.id;
    while (node) {
      if (node.children.size) {
        node.id = undefined;
        node = false;
      }

      if (node.parent) {
        node.parent.children.delete(node.section);
      }

      node = node.parent;
    }

    // id can be undefined
    return id || null;
  }

  id(path) {
    if (this.staticRoutes.has(path)) {
      return this.staticRoutes.get(path).id;
    }

    const node = findExactNode(this.root, path);
    if (node) {
      return node.id;
    }

    return null;
  }

  clear() {
    this.root = createNode('root');
    this.staticRoutes = new Map();
  }
}

module.exports = Tree;
