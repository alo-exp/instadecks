'use strict';
// tests/lib-brief-normalizer-natural-shape.test.js — Live E2E Iter5-1.
//
// MAJOR Iter5-1: when caller supplies the natural orchestrator shape
// {title, audience, purpose, key_messages, data_points, tone},
// canonicalizeJson must map it to the canonical brief shape consumed by
// validateBrief without erroring on missing key_claims/asset_hints/source_files.

const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeBrief } = require('../skills/create/scripts/lib/brief-normalizer');
const { validateBrief } = require('../skills/create/scripts/lib/deck-brief');

test('Iter5-1: canonicalizeJson accepts natural orchestrator shape', async (t) => {
  const natural = {
    title: 'Q3 Strategy Review',
    audience: 'Executive Board',
    purpose: 'Align board on Q4 priorities',
    key_messages: ['Open with wins', 'Address risks', 'Propose Q4 plan'],
    data_points: ['Revenue +18% YoY', 'Churn down 2pts'],
    tone: 'executive',
  };

  await t.test('passes normalizeBrief without error', async () => {
    const out = await normalizeBrief(natural);
    assert.equal(out.topic, 'Q3 Strategy Review');
    assert.equal(out.audience, 'Executive Board');
    assert.equal(out.tone, 'executive');
    assert.deepEqual(out.narrative_arc, ['Open with wins', 'Address risks', 'Propose Q4 plan']);
    // Iter6-1: data_points strings → key_claims with auto-assigned 1-indexed slide_idx.
    assert.ok(Array.isArray(out.key_claims));
    assert.equal(out.key_claims.length, 2);
    assert.equal(out.key_claims[0].claim, 'Revenue +18% YoY');
    assert.equal(out.key_claims[0].slide_idx, 1);
    assert.equal(out.key_claims[1].slide_idx, 2);
    // defaults
    assert.deepEqual(out.asset_hints, {});
    assert.deepEqual(out.source_files, []);
    // purpose retained
    assert.equal(out.purpose, 'Align board on Q4 priorities');
    // title/key_messages/data_points removed (mapped)
    assert.equal(out.title, undefined);
    assert.equal(out.key_messages, undefined);
    assert.equal(out.data_points, undefined);
  });

  await t.test('output passes validateBrief directly (Iter6-1 auto-assign)', async () => {
    // Iter6-1: canonicalizeJson now auto-assigns integer slide_idx so the
    // natural shape passes validateBrief without further coercion.
    const out = await normalizeBrief(natural);
    assert.doesNotThrow(() => validateBrief(out));
  });

  await t.test('missing key_claims with no data_points defaults to []', async () => {
    const minimal = {
      title: 'X', audience: 'Y', tone: 'Z',
      key_messages: ['a'],
    };
    const out = await normalizeBrief(minimal);
    assert.deepEqual(out.key_claims, []);
    assert.deepEqual(out.asset_hints, {});
    assert.deepEqual(out.source_files, []);
  });

  await t.test('existing key_claims is preserved when data_points absent', async () => {
    const mix = {
      topic: 'X', audience: 'Y', tone: 'Z',
      narrative_arc: ['a'],
      key_claims: [{ slide_idx: 1, claim: 'preserved' }],
    };
    const out = await normalizeBrief(mix);
    assert.deepEqual(out.key_claims, [{ slide_idx: 1, claim: 'preserved' }]);
  });

  await t.test('data_points objects are passed through unchanged', async () => {
    const withObj = {
      title: 'X', audience: 'Y', tone: 'Z',
      key_messages: ['a'],
      data_points: [{ slide_idx: 2, claim: 'pre-shaped' }, 'string-claim'],
    };
    const out = await normalizeBrief(withObj);
    assert.equal(out.key_claims.length, 2);
    assert.deepEqual(out.key_claims[0], { slide_idx: 2, claim: 'pre-shaped' });
    assert.equal(out.key_claims[1].claim, 'string-claim');
    // Iter6-1: string at index 1 → 1-indexed slide_idx = 2.
    assert.equal(out.key_claims[1].slide_idx, 2);
  });
});
