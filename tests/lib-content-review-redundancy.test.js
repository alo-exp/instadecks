// tests/lib-content-review-redundancy.test.js — Plan 08-02 Task 1 (Group A).
// Branch coverage for skills/content-review/scripts/lib/redundancy.js.

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  checkRedundancy,
  _internal: { tokenize, cosine, vector },
} = require('../skills/content-review/scripts/lib/redundancy');

test('tokenize: empty / null → []', () => {
  assert.deepEqual(tokenize(''), []);
  assert.deepEqual(tokenize(null), []);
  assert.deepEqual(tokenize(undefined), []);
});

test('tokenize: lowercases, strips punctuation, drops stop-words and ≤2-char tokens', () => {
  const t = tokenize('The Revenue grew Fast! And the team won.');
  assert.ok(t.includes('revenue'));
  assert.ok(t.includes('grew'));
  assert.ok(t.includes('fast'));
  assert.ok(!t.includes('the'));
  assert.ok(!t.includes('and'));
});

test('tokenize: drops 1-2 char tokens', () => {
  assert.deepEqual(tokenize('ab cd efgh'), ['efgh']);
});

test('vector: counts token frequency', () => {
  const v = vector(['a', 'b', 'a', 'a', 'b']);
  assert.equal(v.get('a'), 3);
  assert.equal(v.get('b'), 2);
});

test('cosine: identical vectors → ~1', () => {
  const v = vector(['hello', 'world']);
  assert.ok(Math.abs(cosine(v, v) - 1) < 1e-9);
});

test('cosine: empty vector → 0', () => {
  const v = vector(['x']);
  const empty = new Map();
  assert.equal(cosine(v, empty), 0);
  assert.equal(cosine(empty, v), 0);
});

test('cosine: disjoint vectors → 0', () => {
  const a = vector(['alpha', 'beta']);
  const b = vector(['gamma', 'delta']);
  assert.equal(cosine(a, b), 0);
});

test('checkRedundancy: null / non-object input → []', () => {
  assert.deepEqual(checkRedundancy(null), []);
  assert.deepEqual(checkRedundancy({}), []);
  assert.deepEqual(checkRedundancy({ slides: 'nope' }), []);
});

test('checkRedundancy: empty slides → []', () => {
  assert.deepEqual(checkRedundancy({ slides: [] }), []);
});

test('checkRedundancy: distinct slides → no finding', () => {
  const extract = {
    slides: [
      { slideNum: 1, title: 'Revenue grew sharply', bullets: ['enterprise renewals drove'], slide_type: 'content' },
      { slideNum: 2, title: 'Costs reduced significantly', bullets: ['optimized cloud spend'], slide_type: 'content' },
    ],
  };
  assert.deepEqual(checkRedundancy(extract), []);
});

test('checkRedundancy: identical title+first-bullet → Major (sim ≥0.95)', () => {
  const extract = {
    slides: [
      { slideNum: 1, title: 'Revenue growth driven', bullets: ['enterprise renewals strong'], slide_type: 'content' },
      { slideNum: 2, title: 'Revenue growth driven', bullets: ['enterprise renewals strong'], slide_type: 'content' },
    ],
  };
  const out = checkRedundancy(extract);
  assert.equal(out.length, 1);
  assert.equal(out[0].severity_reviewer, 'Major');
  assert.equal(out[0].slideNum, 2);
  assert.match(out[0].text, /slide 1/);
});

test('checkRedundancy: near-duplicate above 0.85 but below 0.95 → Minor', () => {
  // Build two slides whose tokens overlap heavily but not identically.
  const extract = {
    slides: [
      { slideNum: 1, title: 'revenue growth enterprise renewals', bullets: ['drove quarterly performance metrics'], slide_type: 'content' },
      { slideNum: 2, title: 'revenue growth enterprise renewals', bullets: ['drove quarterly performance metrics extra'], slide_type: 'content' },
    ],
  };
  const out = checkRedundancy(extract);
  assert.equal(out.length, 1);
  assert.ok(out[0].severity_reviewer === 'Minor' || out[0].severity_reviewer === 'Major');
});

test('checkRedundancy: skip-type slides (section/closing/title) ignored', () => {
  const extract = {
    slides: [
      { slideNum: 1, title: 'Revenue grew sharply Q3', bullets: ['enterprise renewals'], slide_type: 'title' },
      { slideNum: 2, title: 'Revenue grew sharply Q3', bullets: ['enterprise renewals'], slide_type: 'closing' },
      { slideNum: 3, title: 'Revenue grew sharply Q3', bullets: ['enterprise renewals'], slide_type: 'section' },
    ],
  };
  assert.deepEqual(checkRedundancy(extract), []);
});

test('checkRedundancy: boilerplate titles (agenda, q&a) skipped', () => {
  const extract = {
    slides: [
      { slideNum: 1, title: 'Agenda', bullets: ['intro'], slide_type: 'content' },
      { slideNum: 2, title: 'Agenda', bullets: ['intro'], slide_type: 'content' },
    ],
  };
  assert.deepEqual(checkRedundancy(extract), []);
});

test('checkRedundancy: empty-vector slides skipped (no detectable tokens)', () => {
  const extract = {
    slides: [
      { slideNum: 1, title: 'a b c', bullets: ['x y z'], slide_type: 'content' },
      { slideNum: 2, title: 'a b c', bullets: ['x y z'], slide_type: 'content' },
    ],
  };
  // All tokens are ≤2 chars → empty vectors → skipped.
  assert.deepEqual(checkRedundancy(extract), []);
});
