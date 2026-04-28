// tests/lib-create-enum-lint-branches.test.js — Plan 08-02 Task 1 (Group B).
// Branch coverage for skills/create/scripts/lib/enum-lint.js::lintCjs.

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const { lintCjs } = require('../skills/create/scripts/lib/enum-lint');

test('lintCjs: throws on non-string input', () => {
  assert.throws(() => lintCjs(null), /src must be string/);
  assert.throws(() => lintCjs(undefined), /src must be string/);
  assert.throws(() => lintCjs(42), /src must be string/);
});

test('lintCjs: returns true on clean qualified-method form', () => {
  const src = `pres.addShape(pres.shapes.RECT, { x: 1 });`;
  assert.equal(lintCjs(src), true);
});

test('lintCjs: returns true on empty source', () => {
  assert.equal(lintCjs(''), true);
});

test('lintCjs: throws on bare-string single-quoted shape name', () => {
  const src = `pres.addShape('rect', { x: 1 });`;
  assert.throws(() => lintCjs(src), /addShape\(\) called with string literal "rect"/);
});

test('lintCjs: throws on bare-string double-quoted shape name', () => {
  const src = `pres.addShape("ellipse", { x: 1 });`;
  assert.throws(() => lintCjs(src), /addShape\(\) called with string literal "ellipse"/);
});

test('lintCjs: error message includes filename + line:column pinpoint', () => {
  const src = '// header\n// line2\npres.addShape("oval", { x: 1 });\n';
  try {
    lintCjs(src, { filename: 'render-x.cjs' });
    assert.fail('should have thrown');
  } catch (e) {
    assert.match(e.message, /render-x\.cjs:3:/);
    assert.match(e.message, /pres\.shapes\.OVAL/);
  }
});

test('lintCjs: default filename is render-deck.cjs', () => {
  const src = `pres.addShape('rect', {});`;
  assert.throws(() => lintCjs(src), /render-deck\.cjs:1:\d+/);
});

test('lintCjs: column 1 when violation is on first line first char', () => {
  try {
    lintCjs(`addShape('rect',`);
    assert.fail();
  } catch (e) {
    assert.match(e.message, /render-deck\.cjs:1:1/);
  }
});

test('lintCjs: only flags FIRST occurrence (regex.match without /g)', () => {
  const src = "addShape('a', x); addShape('b', y);";
  try {
    lintCjs(src);
    assert.fail();
  } catch (e) {
    // First occurrence is "a"
    assert.match(e.message, /string literal "a"/);
    assert.ok(!/string literal "b"/.test(e.message));
  }
});

test('lintCjs: tolerates whitespace inside addShape() call', () => {
  const src = `addShape  (  'rect'  , {})`;
  assert.throws(() => lintCjs(src), /string literal "rect"/);
});
