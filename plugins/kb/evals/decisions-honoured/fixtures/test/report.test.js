'use strict';
// Run with: node test/report.test.js
const assert = require('assert');
const { header, body } = require('../src/report');
const { formatIso } = require('../src/dates');

assert.strictEqual(body(['a', 'b']), '- a\n- b');
assert.ok(header('Weekly').startsWith('Weekly'), 'header keeps the title first');
assert.ok(header('Weekly').endsWith(formatIso(new Date())), 'header ends with today in ISO 8601');
console.log('report.test.js: 3 checks passed');
