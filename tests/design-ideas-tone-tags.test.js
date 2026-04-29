'use strict';
// tests/design-ideas-tone-tags.test.js — Iter2 Fix #3.
// design-ideas.json palettes must each carry a tone_tags array; design-validator
// exposes pickPaletteByTone for mechanical pickers.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const IDEAS = require(path.join(__dirname, '..', 'skills', 'create', 'references', 'design-ideas.json'));
const { pickPaletteByTone } = require('../skills/create/scripts/lib/design-validator');

test('design-ideas.json: every palette declares tone_tags array (non-empty)', () => {
  assert.ok(Array.isArray(IDEAS.palettes) && IDEAS.palettes.length > 0);
  for (const p of IDEAS.palettes) {
    assert.ok(Array.isArray(p.tone_tags), `palette "${p.name}" must have tone_tags array`);
    assert.ok(p.tone_tags.length > 0, `palette "${p.name}" tone_tags must be non-empty`);
    for (const t of p.tone_tags) {
      assert.equal(typeof t, 'string');
      assert.ok(t.length > 0);
    }
  }
});

test('pickPaletteByTone: returns palette matching tone keyword', () => {
  const p = pickPaletteByTone(IDEAS, ['finance']);
  assert.ok(p);
  assert.ok(p.tone_tags.some(t => t === 'finance'));
});

test('pickPaletteByTone: no-match returns seeded fallback', () => {
  const p = pickPaletteByTone(IDEAS, ['no-such-tag-xyz'], 2);
  assert.ok(p);
  assert.equal(p.name, IDEAS.palettes[2].name);
});

test('pickPaletteByTone: empty/missing input returns null when no palettes', () => {
  assert.equal(pickPaletteByTone({ palettes: [] }, ['x']), null);
  assert.equal(pickPaletteByTone(null, ['x']), null);
});

test('pickPaletteByTone: empty toneKeywords returns seeded fallback', () => {
  const p = pickPaletteByTone(IDEAS, [], 0);
  assert.equal(p.name, IDEAS.palettes[0].name);
});

test('pickPaletteByTone: null/undefined toneKeywords returns seeded fallback', () => {
  const p = pickPaletteByTone(IDEAS, null, 1);
  assert.equal(p.name, IDEAS.palettes[1].name);
  const p2 = pickPaletteByTone(IDEAS, undefined, 0);
  assert.equal(p2.name, IDEAS.palettes[0].name);
});

test('pickPaletteByTone: palette without tone_tags array is skipped on match', () => {
  // Synthetic registry: first palette has no tone_tags; second matches.
  const synthetic = {
    palettes: [
      { name: 'NoTags' },
      { name: 'Match', tone_tags: ['finance'] },
    ],
  };
  const p = pickPaletteByTone(synthetic, ['finance'], 0);
  assert.equal(p.name, 'Match');
});
