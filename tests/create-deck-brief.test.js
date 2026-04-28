'use strict';
// create-deck-brief.test.js — DeckBrief schema validator (Phase 4 D-01 / Plan 04-01 Task 1).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { validateBrief, _internal } = require('../skills/create/scripts/lib/deck-brief');

test('validateBrief: empty object throws topic: missing', () => {
  assert.throws(() => validateBrief({}), /topic: missing/);
});

test('validateBrief: empty narrative_arc array throws non-empty error', () => {
  assert.throws(
    () => validateBrief({
      topic: 'x', audience: 'a', tone: 't',
      narrative_arc: [],
      key_claims: [], asset_hints: {}, source_files: [],
    }),
    /narrative_arc: must be non-empty array/,
  );
});

test('validateBrief: non-integer slide_idx in key_claims pinpointed', () => {
  assert.throws(
    () => validateBrief({
      topic: 'x', audience: 'a', tone: 't',
      narrative_arc: ['a'],
      key_claims: [{ slide_idx: '2', claim: 'c' }],
      asset_hints: {}, source_files: [],
    }),
    /key_claims\[0\]\.slide_idx: must be integer/,
  );
});

test('validateBrief: canonical sample-brief.json passes', () => {
  const fixturePath = path.join(__dirname, 'fixtures', 'sample-brief.json');
  const brief = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  assert.equal(validateBrief(brief), true);
});

test('validateBrief: _internal.REQUIRED_FIELDS exposes the field list', () => {
  assert.ok(Array.isArray(_internal.REQUIRED_FIELDS));
  assert.ok(_internal.REQUIRED_FIELDS.includes('topic'));
  assert.ok(_internal.REQUIRED_FIELDS.includes('narrative_arc'));
});
