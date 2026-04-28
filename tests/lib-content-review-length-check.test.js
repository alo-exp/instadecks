// tests/lib-content-review-length-check.test.js — Plan 08-02 Task 1 (Group A).
// Branch coverage for skills/content-review/scripts/lib/length-check.js.

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  checkLength,
  _internal: { wordCount, clamp },
} = require('../skills/content-review/scripts/lib/length-check');

function bullet(words) {
  return Array.from({ length: words }, (_, i) => `w${i}`).join(' ');
}

test('wordCount: counts whitespace-separated tokens', () => {
  assert.equal(wordCount('one two three'), 3);
});

test('wordCount: empty / null / undefined → 0', () => {
  assert.equal(wordCount(''), 0);
  assert.equal(wordCount(null), 0);
  assert.equal(wordCount(undefined), 0);
});

test('wordCount: collapses multiple spaces', () => {
  assert.equal(wordCount('  one    two  '), 2);
});

test('clamp: returns lo when below', () => {
  assert.equal(clamp(-1, 0, 1), 0);
});

test('clamp: returns hi when above', () => {
  assert.equal(clamp(5, 0, 1), 1);
});

test('clamp: passes through when in range', () => {
  assert.equal(clamp(0.5, 0, 1), 0.5);
});

test('checkLength: null slide → []', () => {
  assert.deepEqual(checkLength(null), []);
});

test('checkLength: slide without bullets array → []', () => {
  assert.deepEqual(checkLength({ slideNum: 1 }), []);
});

test('checkLength: bullet ≤25 words → no finding (lower boundary 25 inclusive)', () => {
  const slide = { slideNum: 1, bullets: [bullet(25)] };
  assert.deepEqual(checkLength(slide), []);
});

test('checkLength: bullet 26-35 words → Minor', () => {
  const slide = { slideNum: 2, bullets: [bullet(30)] };
  const out = checkLength(slide);
  assert.equal(out.length, 1);
  assert.equal(out[0].severity_reviewer, 'Minor');
  assert.equal(out[0].check_id, 'length');
  assert.equal(out[0].slideNum, 2);
});

test('checkLength: bullet >35 words → Major', () => {
  const slide = { slideNum: 3, bullets: [bullet(40)] };
  const out = checkLength(slide);
  assert.equal(out.length, 1);
  assert.equal(out[0].severity_reviewer, 'Major');
  assert.match(out[0].text, /40 words/);
});

test('checkLength: ny clamped to upper bound 0.85', () => {
  // 7 long bullets push ny computation past 0.85 for the last few.
  const slide = {
    slideNum: 4,
    bullets: Array.from({ length: 7 }, () => bullet(30)),
  };
  const out = checkLength(slide);
  assert.equal(out.length, 7);
  for (const f of out) assert.ok(f.ny <= 0.85, `ny=${f.ny} should be ≤0.85`);
});

test('checkLength: location string includes 1-based bullet index', () => {
  const slide = { slideNum: 5, bullets: [bullet(5), bullet(40)] };
  const out = checkLength(slide);
  assert.equal(out.length, 1);
  assert.match(out[0].location, /bullet 2/);
});

test('checkLength: text snippet truncated to 60 chars + "..."', () => {
  const long = 'word '.repeat(40).trim();
  const out = checkLength({ slideNum: 6, bullets: [long] });
  assert.equal(out.length, 1);
  assert.match(out[0].text, /\.\.\."$/);
});
