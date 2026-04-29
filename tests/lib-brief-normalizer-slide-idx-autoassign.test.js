'use strict';
// tests/lib-brief-normalizer-slide-idx-autoassign.test.js — Live E2E Iter6-1.
//
// MAJOR Iter6-1: Iter5-1 mapped data_points strings → key_claims with
// `slide_idx: null`, but validateBrief requires integer slide_idx, so the
// natural shape still failed validation downstream. Fix: canonicalizeJson
// auto-assigns sequential 1-indexed slide_idx values for string data_points.
// Object data_points keep their slide_idx if present, else fall back to the
// 1-indexed position. Result: the natural orchestrator shape passes
// validateBrief without hand-canonicalization.

const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeBrief } = require('../skills/create/scripts/lib/brief-normalizer');
const { validateBrief } = require('../skills/create/scripts/lib/deck-brief');

test('Iter6-1: data_points strings get sequential 1-indexed slide_idx', async (t) => {
  await t.test('string data_points → key_claims with integer slide_idx', async () => {
    const natural = {
      title: 'Q3 Strategy Review',
      audience: 'Executive Board',
      purpose: 'Align board on Q4 priorities',
      key_messages: ['Open with wins', 'Address risks', 'Propose Q4 plan'],
      data_points: ['Revenue +18% YoY', 'Churn down 2pts', 'NPS +14'],
      tone: 'executive',
    };
    const out = await normalizeBrief(natural);
    assert.equal(out.key_claims.length, 3);
    assert.equal(out.key_claims[0].slide_idx, 1);
    assert.equal(out.key_claims[1].slide_idx, 2);
    assert.equal(out.key_claims[2].slide_idx, 3);
    assert.equal(out.key_claims[0].claim, 'Revenue +18% YoY');
    // Natural shape now passes validateBrief without further coercion.
    assert.doesNotThrow(() => validateBrief(out));
  });

  await t.test('object data_points preserve slide_idx when present', async () => {
    const mix = {
      title: 'X', audience: 'Y', tone: 'Z',
      key_messages: ['a'],
      data_points: [
        { slide_idx: 5, claim: 'pre-shaped' },
        'string-claim',
        { claim: 'no-slide' },
      ],
    };
    const out = await normalizeBrief(mix);
    assert.equal(out.key_claims[0].slide_idx, 5);
    assert.equal(out.key_claims[0].claim, 'pre-shaped');
    // String at index 1 → slide_idx 2 (1-indexed position).
    assert.equal(out.key_claims[1].slide_idx, 2);
    assert.equal(out.key_claims[1].claim, 'string-claim');
    // Object missing slide_idx falls back to 1-indexed position.
    assert.equal(out.key_claims[2].slide_idx, 3);
    assert.equal(out.key_claims[2].claim, 'no-slide');
    assert.doesNotThrow(() => validateBrief(out));
  });
});
