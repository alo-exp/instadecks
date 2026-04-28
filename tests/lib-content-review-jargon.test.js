// tests/lib-content-review-jargon.test.js — Plan 08-02 Task 1 (Group A).
// Branch coverage for skills/content-review/scripts/lib/jargon.js.

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  checkJargon,
  _internal: { detectAcronyms, FILTER },
} = require('../skills/content-review/scripts/lib/jargon');

test('detectAcronyms: matches 2-5 char uppercase tokens, dedupes', () => {
  assert.deepEqual(detectAcronyms('FOO bar BAZ FOO QUUX').sort(), ['BAZ', 'FOO', 'QUUX'].sort());
});

test('detectAcronyms: filters known-safe acronyms (CEO, USA, etc.)', () => {
  assert.deepEqual(detectAcronyms('CEO USA OK CTO'), []);
});

test('detectAcronyms: handles empty / null / non-string', () => {
  assert.deepEqual(detectAcronyms(''), []);
  assert.deepEqual(detectAcronyms(null), []);
  assert.deepEqual(detectAcronyms(undefined), []);
});

test('detectAcronyms: ignores tokens >5 chars', () => {
  assert.deepEqual(detectAcronyms('SIXLET SHORTER'), []);
});

test('detectAcronyms: ignores lowercase tokens', () => {
  assert.deepEqual(detectAcronyms('foo bar baz'), []);
});

test('FILTER set contains expected default exclusions', () => {
  for (const a of ['I', 'CEO', 'CTO', 'USA', 'OK']) {
    assert.ok(FILTER.has(a), `expected ${a} in FILTER`);
  }
});

test('checkJargon: returns [] on null slide', () => {
  assert.deepEqual(checkJargon(null), []);
  assert.deepEqual(checkJargon(undefined), []);
});

test('checkJargon: returns [] when ≤5 distinct acronyms', () => {
  const slide = { slideNum: 1, body: 'API REST GRPC TLS JSON' };
  assert.deepEqual(checkJargon(slide), []);
});

test('checkJargon: returns Minor finding when 6-7 acronyms', () => {
  const slide = { slideNum: 4, body: 'API REST GRPC TLS JSON HTTP YAML' };
  const out = checkJargon(slide);
  assert.equal(out.length, 1);
  assert.equal(out[0].severity_reviewer, 'Minor');
  assert.equal(out[0].slideNum, 4);
  assert.equal(out[0].check_id, 'jargon');
  assert.equal(out[0].category, 'content');
});

test('checkJargon: returns Major finding when ≥8 acronyms', () => {
  const body = 'API REST GRPC TLS JSON HTTP YAML XML SQL';
  const out = checkJargon({ slideNum: 2, body });
  assert.equal(out.length, 1);
  assert.equal(out[0].severity_reviewer, 'Major');
  assert.match(out[0].text, /9 acronyms/);
});

test('checkJargon: appends "..." when count > 8', () => {
  const acronyms = ['AAA', 'BBB', 'CCC', 'DDD', 'EEE', 'FFF', 'GGG', 'HHH', 'III', 'JJJ'];
  const out = checkJargon({ slideNum: 5, body: acronyms.join(' ') });
  assert.equal(out.length, 1);
  assert.match(out[0].text, /\.\.\.$/);
});

test('checkJargon: combines body + bullets for detection', () => {
  const slide = {
    slideNum: 3,
    body: 'API REST',
    bullets: ['GRPC TLS', 'JSON HTTP', 'YAML XML'],
  };
  const out = checkJargon(slide);
  assert.equal(out.length, 1);
});

test('checkJargon: handles slide without bullets array', () => {
  const slide = { slideNum: 6, body: 'AAA BBB CCC DDD EEE FFF GGG' };
  const out = checkJargon(slide);
  assert.equal(out.length, 1);
});
