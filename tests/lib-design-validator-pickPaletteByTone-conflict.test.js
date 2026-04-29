'use strict';
// tests/lib-design-validator-pickPaletteByTone-conflict.test.js — Iter4-3.
// When the diversity-audit excludes ALL tone-matching palettes, the picker
// MUST relax the diversity audit (not the tone-fit) and signal `relaxed:'diversity'`.
// Tone-fit > diversity-audit. Backwards-compat: 3-arg legacy signature still works.

const test = require('node:test');
const assert = require('node:assert/strict');

const { pickPaletteByTone } = require('../skills/create/scripts/lib/design-validator');

const IDEAS = {
  palettes: [
    { name: 'Indigo Dawn',   tone_tags: ['executive', 'finance', 'corporate'] },
    { name: 'Slate Forest',  tone_tags: ['sustainability', 'esg'] },
    { name: 'Cobalt Plex',   tone_tags: ['executive', 'finance', 'consulting'] },
    { name: 'Cerulean Plex', tone_tags: ['saas', 'startup'] },
    { name: 'Glacier Ridge', tone_tags: ['executive', 'finance', 'b2b-enterprise'] },
    { name: 'Saffron Brief', tone_tags: ['hospitality', 'travel'] },
  ],
};

test('legacy 3-arg signature still picks tone-matching palette', () => {
  const p = pickPaletteByTone(IDEAS, ['finance'], 0);
  assert.ok(p);
  assert.ok(p.tone_tags.includes('finance'), `expected finance-tagged, got ${p.name}`);
});

test('excludeNames option: skip recently-used tone-matching palette', () => {
  // Indigo Dawn matches but is excluded → picker should land on next match (Cobalt Plex).
  const p = pickPaletteByTone(IDEAS, ['finance'], 0, { excludeNames: ['Indigo Dawn'] });
  assert.ok(p);
  assert.notEqual(p.name, 'Indigo Dawn');
  assert.ok(p.tone_tags.includes('finance'));
});

test('returnMeta: relaxed flag is null when both tone-fit and diversity satisfied', () => {
  const r = pickPaletteByTone(IDEAS, ['finance'], 0, { returnMeta: true });
  assert.ok(r.palette);
  assert.equal(r.relaxed, null);
});

test('CONFLICT: all tone-matching palettes excluded → relax diversity, keep tone-fit', () => {
  // All three finance palettes excluded. Picker must pick a tone-matching
  // palette (relaxing diversity) rather than a tone-mismatched non-excluded
  // one (which would relax tone-fit — the wrong direction).
  const exclude = ['Indigo Dawn', 'Cobalt Plex', 'Glacier Ridge'];
  const r = pickPaletteByTone(IDEAS, ['finance'], 0, { excludeNames: exclude, returnMeta: true });
  assert.ok(r.palette);
  assert.ok(r.palette.tone_tags.includes('finance'),
    `tone-fit must win over diversity; got ${r.palette.name} with tags ${r.palette.tone_tags.join(',')}`);
  assert.equal(r.relaxed, 'diversity',
    'must signal that diversity audit was relaxed');
  // Non-meta call returns just the palette (which is still tone-matched).
  const p = pickPaletteByTone(IDEAS, ['finance'], 0, { excludeNames: exclude });
  assert.ok(p.tone_tags.includes('finance'));
});

test('object-form opts: { seed, excludeNames, returnMeta }', () => {
  const r = pickPaletteByTone(IDEAS, ['finance'], { seed: 1, excludeNames: ['Indigo Dawn'], returnMeta: true });
  assert.ok(r.palette);
  assert.notEqual(r.palette.name, 'Indigo Dawn');
});

test('no tone match anywhere: seeded fallback honors excludeNames', () => {
  const r = pickPaletteByTone(IDEAS, ['no-such-tone'], 0, { excludeNames: ['Indigo Dawn'], returnMeta: true });
  assert.ok(r.palette);
  assert.notEqual(r.palette.name, 'Indigo Dawn');
  assert.equal(r.relaxed, null);
});

test('ALL palettes excluded with no tone match: returns seeded fallback with relaxed flag', () => {
  const allNames = IDEAS.palettes.map(p => p.name);
  const r = pickPaletteByTone(IDEAS, ['no-match'], 0, { excludeNames: allNames, returnMeta: true });
  assert.ok(r.palette);
  assert.equal(r.relaxed, 'diversity');
});

test('empty palettes returns null (returnMeta: { palette: null })', () => {
  assert.equal(pickPaletteByTone({ palettes: [] }, ['x']), null);
  const r = pickPaletteByTone({ palettes: [] }, ['x'], 0, { returnMeta: true });
  assert.equal(r.palette, null);
});
