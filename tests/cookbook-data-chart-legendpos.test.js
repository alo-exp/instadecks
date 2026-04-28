'use strict';
// tests/cookbook-data-chart-legendpos.test.js — Live E2E Round 3 NITPICK N4.
//
// data-chart cookbook recipe must mention legendPos so authors know the
// allowed values ('b' | 'r' | 'l' | 't') and default placement guidance.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RECIPE = path.join(
  __dirname, '..', 'skills', 'create', 'references',
  'cookbook', 'data-chart.md');

test('data-chart recipe documents legendPos option with allowed values', () => {
  const md = fs.readFileSync(RECIPE, 'utf8');
  assert.match(md, /legendPos/, 'data-chart.md must mention legendPos');
  // At least one of the allowed value letters should appear near legendPos.
  assert.match(md, /legendPos[\s\S]{0,200}['"`][brlt]['"`]/,
    'data-chart.md must show at least one allowed legendPos value (b/r/l/t)');
});
