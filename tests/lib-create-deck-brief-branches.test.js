// tests/lib-create-deck-brief-branches.test.js — Plan 08-02 Task 1 (Group B).
// Branch coverage for skills/create/scripts/lib/deck-brief.js::validateBrief.

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  validateBrief,
  _internal: { REQUIRED_FIELDS, NON_EMPTY_STRING_FIELDS },
} = require('../skills/create/scripts/lib/deck-brief');

function goodBrief(overrides = {}) {
  return Object.assign({
    topic: 'Q3 sales review',
    audience: 'exec team',
    tone: 'data-driven',
    narrative_arc: ['intro', 'middle', 'close'],
    key_claims: [{ slide_idx: 1, claim: 'Revenue grew 40%' }],
    asset_hints: { palette: 'corporate' },
    source_files: ['/tmp/notes.md'],
  }, overrides);
}

test('validateBrief: full valid brief returns true', () => {
  assert.equal(validateBrief(goodBrief()), true);
});

test('validateBrief: rejects non-object inputs', () => {
  assert.throws(() => validateBrief(null), /must be object/);
  assert.throws(() => validateBrief('str'), /must be object/);
  assert.throws(() => validateBrief(123), /must be object/);
  assert.throws(() => validateBrief([]), /must be object/);
});

test('validateBrief: every REQUIRED_FIELDS missing → throws with field name', () => {
  for (const field of REQUIRED_FIELDS) {
    const b = goodBrief();
    delete b[field];
    assert.throws(() => validateBrief(b), new RegExp(`${field}: missing`));
  }
});

test('validateBrief: NON_EMPTY_STRING_FIELDS empty/non-string → throws', () => {
  for (const field of NON_EMPTY_STRING_FIELDS) {
    const empty = goodBrief({ [field]: '' });
    assert.throws(() => validateBrief(empty), new RegExp(`${field}: must be non-empty string`));
    const num = goodBrief({ [field]: 42 });
    assert.throws(() => validateBrief(num), new RegExp(`${field}: must be non-empty string`));
  }
});

test('validateBrief: narrative_arc must be non-empty array', () => {
  assert.throws(() => validateBrief(goodBrief({ narrative_arc: [] })), /narrative_arc: must be non-empty array/);
  assert.throws(() => validateBrief(goodBrief({ narrative_arc: 'no' })), /narrative_arc: must be non-empty array/);
});

test('validateBrief: narrative_arc element non-string → throws with index', () => {
  assert.throws(
    () => validateBrief(goodBrief({ narrative_arc: ['ok', 42] })),
    /narrative_arc\[1\]: must be non-empty string/,
  );
  assert.throws(
    () => validateBrief(goodBrief({ narrative_arc: [''] })),
    /narrative_arc\[0\]: must be non-empty string/,
  );
});

test('validateBrief: key_claims must be array', () => {
  assert.throws(() => validateBrief(goodBrief({ key_claims: 'no' })), /key_claims: must be array/);
});

test('validateBrief: key_claims[i] must be object', () => {
  assert.throws(
    () => validateBrief(goodBrief({ key_claims: ['notobj'] })),
    /key_claims\[0\]: must be object/,
  );
});

test('validateBrief: key_claims[i].slide_idx must be non-negative integer', () => {
  assert.throws(
    () => validateBrief(goodBrief({ key_claims: [{ slide_idx: -1, claim: 'x' }] })),
    /slide_idx: must be integer/,
  );
  assert.throws(
    () => validateBrief(goodBrief({ key_claims: [{ slide_idx: 1.5, claim: 'x' }] })),
    /slide_idx: must be integer/,
  );
});

test('validateBrief: key_claims[i].claim must be non-empty string', () => {
  assert.throws(
    () => validateBrief(goodBrief({ key_claims: [{ slide_idx: 0, claim: '' }] })),
    /claim: must be non-empty string/,
  );
});

test('validateBrief: key_claims[i].evidence rejects non-string when present', () => {
  assert.throws(
    () => validateBrief(goodBrief({ key_claims: [{ slide_idx: 0, claim: 'c', evidence: 42 }] })),
    /evidence: must be string when present/,
  );
});

test('validateBrief: key_claims[i].source rejects non-string when present', () => {
  assert.throws(
    () => validateBrief(goodBrief({ key_claims: [{ slide_idx: 0, claim: 'c', source: {} }] })),
    /source: must be string when present/,
  );
});

test('validateBrief: key_claims[i] accepts evidence/source when string or absent', () => {
  assert.equal(validateBrief(goodBrief({
    key_claims: [{ slide_idx: 0, claim: 'c', evidence: 'e', source: 's' }],
  })), true);
});

test('validateBrief: asset_hints must be object', () => {
  assert.throws(() => validateBrief(goodBrief({ asset_hints: [] })), /asset_hints: must be object/);
  assert.throws(() => validateBrief(goodBrief({ asset_hints: 'no' })), /asset_hints: must be object/);
});

test('validateBrief: source_files must be array of strings', () => {
  assert.throws(() => validateBrief(goodBrief({ source_files: 'no' })), /source_files: must be array/);
  assert.throws(
    () => validateBrief(goodBrief({ source_files: [42] })),
    /source_files\[0\]: must be string/,
  );
});

test('REQUIRED_FIELDS and NON_EMPTY_STRING_FIELDS exposed for downstream test reuse', () => {
  assert.ok(REQUIRED_FIELDS.includes('topic'));
  assert.ok(NON_EMPTY_STRING_FIELDS.includes('tone'));
});
