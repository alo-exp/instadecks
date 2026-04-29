'use strict';
// Plan 09-05 Task 2 — palette-aware validateRenderSource.
// Carbon Neon hex values must NOT trigger saturated-primary / non-default-blue flags.
// Calibri default + Office-blue-only renders STILL flag.
// asymmetric-layout flag is REMOVED entirely.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  validateRenderSource,
  _internal: { RECOGNIZED_HEX, RECOGNIZED_PALETTES },
} = require('../skills/create/scripts/lib/design-validator');

const PALETTES_MD = fs.readFileSync(
  path.join(__dirname, '..', 'skills', 'create', 'references', 'palettes.md'),
  'utf8',
);

test('palette registry: parsed from palettes.md at module-init', () => {
  // ≥14 palettes recognized
  assert.ok(RECOGNIZED_PALETTES.size >= 14, `expected ≥14 palettes, got ${RECOGNIZED_PALETTES.size}`);
  assert.ok(RECOGNIZED_PALETTES.has('Carbon Neon'));
  assert.ok(RECOGNIZED_PALETTES.has('Editorial Mono'));
  // Carbon Neon hex values populated
  const carbon = RECOGNIZED_PALETTES.get('Carbon Neon');
  assert.equal(carbon.bg, '0F0F0F');
  assert.equal(carbon.accent, '39FF14');
  // RECOGNIZED_HEX set is non-empty
  assert.ok(RECOGNIZED_HEX.has('39FF14'));
  assert.ok(RECOGNIZED_HEX.has('0F0F0F'));
});

test('palette-aware: Carbon Neon render is NOT flagged for saturated-primary / non-default-blue', () => {
  const src = `
    const PALETTE = { bg: '#0F0F0F', primary: '#F5F5F5', accent: '#39FF14' };
    pres.addSlide().addText('Hello', { color: '39FF14', fontFace: 'IBM Plex Mono' });
  `;
  const r = validateRenderSource(src);
  assert.ok(!r.findings.some(f => f.id === 'saturated-primary'));
  assert.ok(!r.findings.some(f => f.id === 'non-default-blue'));
});

test('palette-aware: Calibri default-font render STILL fires default-calibri', () => {
  const src = `
    pres.addSlide().addText('Hello', { fontFace: 'Calibri' });
  `;
  const r = validateRenderSource(src);
  assert.ok(r.findings.some(f => f.id === 'default-calibri'));
});

test('palette-aware: Office-blue-only render STILL fires office-blue', () => {
  const src = `
    pres.addSlide().addText('Hello', { color: '0070C0', fontFace: 'IBM Plex Sans' });
  `;
  const r = validateRenderSource(src);
  assert.ok(r.findings.some(f => f.id === 'office-blue'));
});

test('palette-aware: Office-blue alongside other recognized hex does NOT fire office-blue', () => {
  // If render also uses a recognized palette accent, Office-blue is just one of multiple
  // accents — not the "only" accent. The naive check is "0070C0 is the only non-bg/ink hex
  // and no other recognized-hex are present." When a recognized hex is present too, no fire.
  const src = `
    const PALETTE = { primary: '#0070C0', accent: '#39FF14' };
    pres.addSlide().addText('Hello', { color: '39FF14', fontFace: 'IBM Plex Sans' });
  `;
  const r = validateRenderSource(src);
  assert.ok(!r.findings.some(f => f.id === 'office-blue'));
});

test('asymmetric-layout rule REMOVED — no such finding ever fires', () => {
  const src = `
    pres.addSlide().addText('Hello', { x: 0.2, y: 3.8, w: 9, h: 1, fontFace: 'IBM Plex Sans' });
  `;
  const r = validateRenderSource(src);
  assert.ok(!r.findings.some(f => f.id === 'asymmetric-layout'));
});

test('stock-photo placeholder filename STILL fires', () => {
  const src = `
    pres.addSlide().addImage({ path: 'stock_photo_1.jpg', fontFace: 'IBM Plex Sans' });
  `;
  const r = validateRenderSource(src);
  assert.ok(r.findings.some(f => f.id === 'stock-placeholder'));
});

test('buildPaletteRegistry: sections without an H2 name line are skipped', () => {
  const { _internal: { buildPaletteRegistry } } = require('../skills/create/scripts/lib/design-validator');
  // Section text starts with `## ` boundary stripped — empty content (no name line) must skip.
  const synthetic = '## \n## Real Palette\n| bg | `#FFFFFF` |\n';
  const { palettes } = buildPaletteRegistry(synthetic);
  // Only "Real Palette" should land; the empty-name section is skipped.
  assert.ok(palettes.has('Real Palette'));
  assert.equal(palettes.size, 1);
});

test('palettes.md content informs the registry (data-driven)', () => {
  // Confirm RECOGNIZED_HEX contains all hex from palettes.md (sample check)
  const hexMatches = PALETTES_MD.match(/#([0-9A-F]{6})/gi) || [];
  assert.ok(hexMatches.length >= 14 * 4, 'palettes.md should contain ≥56 hex values');
  // sample: red accent from Editorial Mono
  assert.ok(RECOGNIZED_HEX.has('E5322D'));
});
