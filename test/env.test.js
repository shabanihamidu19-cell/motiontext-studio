'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
process.env.PORT = '0';
const { parseEnv } = require('../server');

test('parseEnv strips inline comments and handles quotes', () => {
  const e = parseEnv('HOST=127.0.0.1          # maoni\nA="x # y"\nB=\n# C=1\nexport D=\'z\'\nKEY=gsk_abc123');
  assert.equal(e.HOST, '127.0.0.1');
  assert.equal(e.A, 'x # y');
  assert.equal(e.B, '');
  assert.equal(e.C, undefined);
  assert.equal(e.D, 'z');
  assert.equal(e.KEY, 'gsk_abc123');
});
