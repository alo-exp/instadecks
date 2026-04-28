'use strict';
// create-enum-lint.test.js — generation-time ENUM guard (Phase 4 D-05 Layer 2 / CRT-15).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { lintCjs } = require('../skills/create/scripts/lib/enum-lint');

test('lintCjs: rejects string-literal addShape("oval", …) with CRT-15 + ENUM hint', () => {
  let err;
  try {
    lintCjs("slide.addShape('oval', {x:1});");
  } catch (e) {
    err = e;
  }
  assert.ok(err, 'expected throw');
  assert.match(err.message, /oval/);
  assert.match(err.message, /CRT-15/);
  assert.match(err.message, /pres\.shapes\.OVAL/);
});

test('lintCjs: bad-render-deck.cjs throws with file:line:col reference to render-deck.cjs:14', () => {
  const fixturePath = path.join(__dirname, 'fixtures', 'bad-render-deck.cjs');
  const src = fs.readFileSync(fixturePath, 'utf8');
  let err;
  try {
    lintCjs(src);
  } catch (e) {
    err = e;
  }
  assert.ok(err, 'expected throw');
  assert.match(err.message, /render-deck\.cjs:14/);
});

test('lintCjs: sample-render-deck.cjs passes (ENUM-only)', () => {
  const fixturePath = path.join(__dirname, 'fixtures', 'sample-render-deck.cjs');
  const src = fs.readFileSync(fixturePath, 'utf8');
  assert.equal(lintCjs(src), true);
});

test('lintCjs: qualified ENUM form pres.shapes.OVAL is ignored', () => {
  // Note: addShape() with a non-string-literal argument must NOT trigger.
  assert.equal(lintCjs('pres.addShape(pres.shapes.OVAL, {});'), true);
});
