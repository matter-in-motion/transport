'use strict';
const Transport = require('./transport');

module.exports = () => ({
  transport: new Transport()
})
