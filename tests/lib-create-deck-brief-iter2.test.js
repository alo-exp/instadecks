'use strict';
// tests/lib-create-deck-brief-iter2.test.js — Iter2 Fixes #7 & #12.
// validateBrief is now batched (collects all issues, throws one combined error)
// and accepts lenient string-form key_claims (auto-promoted to {slide_idx:0,claim}).

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateBrief } = require('../skills/create/scripts/lib/deck-brief');

test('validateBrief batches multiple issues into one error', () => {
  // missing topic, narrative_arc invalid, key_claims invalid, asset_hints invalid.
  const bad = {
    audience: 'a', tone: 't',
    narrative_arc: 'not-an-array',
    key_claims: 'not-an-array',
    asset_hints: 'not-obj',
    source_files: [],
  };
  let err;
  try { validateBrief(bad); } catch (e) { err = e; }
  assert.ok(err);
  assert.match(err.message, /brief invalid:/);
  assert.match(err.message, /topic: missing/);
  assert.match(err.message, /narrative_arc: must be non-empty array/);
  assert.match(err.message, /key_claims: must be array/);
  assert.match(err.message, /asset_hints: must be object/);
});

test('validateBrief accepts lenient string-form key_claims', () => {
  const brief = {
    topic: 'T', audience: 'A', tone: 'X',
    narrative_arc: ['One', 'Two'],
    key_claims: ['claim string A', 'claim string B'],
    asset_hints: {},
    source_files: [],
  };
  assert.equal(validateBrief(brief), true);
  // After validation, strings have been promoted to objects.
  assert.equal(brief.key_claims[0].slide_idx, 0);
  assert.equal(brief.key_claims[0].claim, 'claim string A');
});

test('validateBrief accepts lenient data_points strings (no rejection)', () => {
  const brief = {
    topic: 'T', audience: 'A', tone: 'X',
    narrative_arc: ['One'],
    key_claims: [],
    asset_hints: {},
    source_files: [],
    data_points: ['dp1', 'dp2'],
  };
  assert.equal(validateBrief(brief), true);
});

test('validateBrief: data_points non-string non-object item passes through', () => {
  // Coverage for the fallthrough branch (return dp as-is) when item is neither
  // a string nor needing coercion. The validator does not enforce data_points
  // shape, so we only verify it doesn't throw on mixed input and the coercion
  // leaves non-string items alone.
  const brief = {
    topic: 'T', audience: 'A', tone: 'X',
    narrative_arc: ['One'],
    key_claims: [],
    asset_hints: {},
    source_files: [],
    data_points: [{ slide_idx: 1, claim: 'already-obj' }, 42],
  };
  assert.equal(validateBrief(brief), true);
  assert.equal(brief.data_points[0].claim, 'already-obj');
  assert.equal(brief.data_points[1], 42);
});

test('validateBrief: empty-string in key_claims and data_points falls through coercion', () => {
  // Empty strings should NOT be coerced (length-zero guard), so they remain
  // as the original empty string and then trigger the must-be-object branch
  // for key_claims.
  const brief = {
    topic: 'T', audience: 'A', tone: 'X',
    narrative_arc: ['One'],
    key_claims: [''],
    asset_hints: {},
    source_files: [],
    data_points: [''],
  };
  let err;
  try { validateBrief(brief); } catch (e) { err = e; }
  assert.ok(err);
  assert.match(err.message, /key_claims\[0\]: must be object/);
});

test('validateBrief: single issue still throws plain message (back-compat)', () => {
  const brief = {
    audience: 'a', tone: 't',
    narrative_arc: ['x'],
    key_claims: [],
    asset_hints: {},
    source_files: [],
  };
  // Only 'topic' is missing.
  assert.throws(() => validateBrief(brief), /^Error: topic: missing$/);
});
