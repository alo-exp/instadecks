// tests/lib-create-title-check-branches.test.js — Plan 08-02 Task 1 (Group B).
// Branch coverage for skills/create/scripts/lib/title-check.js.

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  validateTitle,
  _internal: { BLOCKED, VERBS },
} = require('../skills/create/scripts/lib/title-check');

test('validateTitle: action_title_override:true bypasses all checks', () => {
  const r = validateTitle('whatever', { action_title_override: true });
  assert.deepEqual(r, { ok: true });
});

test('validateTitle: action_title_override on empty title still passes', () => {
  assert.deepEqual(validateTitle('', { action_title_override: true }), { ok: true });
});

test('validateTitle: blocked phrase "Agenda" → ok:false reason includes "blocked phrase"', () => {
  const r = validateTitle('Agenda');
  assert.equal(r.ok, false);
  assert.match(r.reason, /^blocked phrase/);
});

test('validateTitle: every BLOCKED phrase rejected (case-insensitive)', () => {
  for (const phrase of BLOCKED) {
    const r = validateTitle(phrase.toUpperCase());
    assert.equal(r.ok, false, `${phrase} should be blocked`);
    assert.match(r.reason, /blocked phrase/);
  }
});

test('validateTitle: <3 words → "too short"', () => {
  const r = validateTitle('Q3 Numbers');
  assert.equal(r.ok, false);
  assert.match(r.reason, /too short/);
});

test('validateTitle: empty / null / undefined → "too short"', () => {
  for (const t of ['', null, undefined]) {
    const r = validateTitle(t);
    assert.equal(r.ok, false);
    assert.match(r.reason, /too short/);
  }
});

test('validateTitle: 3+ words but no verb → "no verb detected"', () => {
  const r = validateTitle('Q3 sales numbers report');
  assert.equal(r.ok, false);
  assert.match(r.reason, /no verb detected/);
});

test('validateTitle: 3+ words with verb → ok', () => {
  assert.deepEqual(validateTitle('Revenue grew sharply'), { ok: true });
});

test('validateTitle: present-tense verb', () => {
  assert.deepEqual(validateTitle('Revenue grows quarterly steadily'), { ok: true });
});

test('validateTitle: modal verb (will / can / must)', () => {
  assert.deepEqual(validateTitle('Team will execute plan'), { ok: true });
  assert.deepEqual(validateTitle('We must scale ops'), { ok: true });
});

test('validateTitle: percent-sign / ampersand inside token preserved', () => {
  assert.deepEqual(validateTitle('Revenue grew 40% in Q3'), { ok: true });
});

test('validateTitle: punctuation stripped during verb match', () => {
  assert.deepEqual(validateTitle('Revenue, grew, sharply.'), { ok: true });
});

test('VERBS set is non-empty and contains common forms', () => {
  for (const v of ['grew', 'grows', 'will', 'must']) {
    assert.ok(VERBS.has(v), `expected ${v} in VERBS`);
  }
});

test('BLOCKED set contains expected anti-pattern phrases', () => {
  for (const b of ['agenda', 'overview', 'q&a', 'thank you']) {
    assert.ok(BLOCKED.has(b), `expected ${b} in BLOCKED`);
  }
});
