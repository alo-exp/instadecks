'use strict';
// tests/lib-brief-normalizer-narrative-arc-objects.test.js — Live E2E Iter6-2.
//
// MINOR Iter6-2: LLMs emit narrative_arc as an array of beat objects
// ({slide, purpose, key_messages}) rather than strings. validateBrief expects
// strings, so canonicalizeJson must coerce object beats into strings. Priority:
// `purpose` → `key_messages.join(' — ')` → `claim` → String(beat) fallback.

const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeBrief } = require('../skills/create/scripts/lib/brief-normalizer');
const { validateBrief } = require('../skills/create/scripts/lib/deck-brief');

test('Iter6-2: narrative_arc object items coerced to strings', async (t) => {
  await t.test('beats with purpose use purpose as the string', async () => {
    const input = {
      topic: 'Roadmap',
      audience: 'Eng team',
      tone: 'engineering',
      narrative_arc: [
        { slide: 1, purpose: 'Frame the problem', key_messages: ['m1', 'm2'] },
        { slide: 2, purpose: 'Show the solution' },
      ],
      key_claims: [],
      asset_hints: {},
      source_files: [],
    };
    const out = await normalizeBrief(input);
    assert.deepEqual(out.narrative_arc, ['Frame the problem', 'Show the solution']);
    assert.doesNotThrow(() => validateBrief(out));
  });

  await t.test('beats without purpose fall back to key_messages joined', async () => {
    const input = {
      topic: 'X', audience: 'Y', tone: 'Z',
      narrative_arc: [
        { slide: 1, key_messages: ['alpha', 'beta'] },
      ],
      key_claims: [], asset_hints: {}, source_files: [],
    };
    const out = await normalizeBrief(input);
    assert.deepEqual(out.narrative_arc, ['alpha — beta']);
    assert.doesNotThrow(() => validateBrief(out));
  });

  await t.test('beats fall back to claim then String(beat)', async () => {
    const input = {
      topic: 'X', audience: 'Y', tone: 'Z',
      narrative_arc: [
        { claim: 'fallback-claim' },
      ],
      key_claims: [], asset_hints: {}, source_files: [],
    };
    const out = await normalizeBrief(input);
    assert.deepEqual(out.narrative_arc, ['fallback-claim']);
    assert.doesNotThrow(() => validateBrief(out));
  });

  await t.test('non-object non-string beats fall through to String(beat)', async () => {
    const input = {
      topic: 'X', audience: 'Y', tone: 'Z',
      narrative_arc: [42, 'real beat'],
      key_claims: [], asset_hints: {}, source_files: [],
    };
    const out = await normalizeBrief(input);
    assert.deepEqual(out.narrative_arc, ['42', 'real beat']);
  });

  await t.test('non-object non-string data_points pass through unchanged', async () => {
    // Exercises the final `return dp` branch when dp is neither string nor object.
    const input = {
      topic: 'X', audience: 'Y', tone: 'Z',
      narrative_arc: ['a'],
      data_points: [123],
    };
    const out = await normalizeBrief(input);
    // Non-string/non-object pass through; validateBrief would later flag it,
    // but canonicalizeJson does not invent shape for it.
    assert.equal(out.key_claims[0], 123);
  });

  await t.test('mixed string + object beats coerce uniformly', async () => {
    const input = {
      topic: 'X', audience: 'Y', tone: 'Z',
      narrative_arc: [
        'plain string beat',
        { slide: 2, purpose: 'object beat' },
      ],
      key_claims: [], asset_hints: {}, source_files: [],
    };
    const out = await normalizeBrief(input);
    assert.deepEqual(out.narrative_arc, ['plain string beat', 'object beat']);
    assert.doesNotThrow(() => validateBrief(out));
  });
});
