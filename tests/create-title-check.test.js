'use strict';
// create-title-check.test.js — D-06 action-title heuristic (Plan 04-01 Task 2).

const test = require('node:test');
const assert = require('node:assert/strict');

const { validateTitle } = require('../skills/create/scripts/lib/title-check');

test('validateTitle: blocked phrase "Overview" rejected', () => {
  const r = validateTitle('Overview');
  assert.equal(r.ok, false);
  assert.match(r.reason, /blocked phrase/);
});

test('validateTitle: <3 words rejected', () => {
  const r = validateTitle('Q3');
  assert.equal(r.ok, false);
  assert.match(r.reason, /too short/);
});

test('validateTitle: no verb rejected', () => {
  const r = validateTitle('Q3 Revenue Numbers');
  assert.equal(r.ok, false);
  assert.match(r.reason, /no verb/);
});

test('validateTitle: action title with verb accepted', () => {
  const r = validateTitle('Q3 revenue grew 23% on enterprise expansion');
  assert.equal(r.ok, true);
});

test('validateTitle: action_title_override bypasses checks', () => {
  const r = validateTitle('Thank You', { action_title_override: true });
  assert.equal(r.ok, true);
});

test('validateTitle: blocked-word check is case-insensitive', () => {
  const r = validateTitle('OVERVIEW');
  assert.equal(r.ok, false);
  assert.match(r.reason, /blocked phrase/);
});
