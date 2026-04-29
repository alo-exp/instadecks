'use strict';
// tests/cookbook-palette-library.test.js — Plan 9-01 (DV-02).
//
// Asserts skills/create/references/palettes.md library shape:
//   - ≥14 H2 palette blocks
//   - All 9 D-02 named palettes + Monochrome High-Contrast present
//   - Every H2 section has ≥4 hex #RRGGBB codes
//   - "AI-tells exemption" appears ≥14 times (one per palette)

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PALETTES = path.join(
  __dirname, '..', 'skills', 'create', 'references', 'palettes.md');

const REQUIRED_NAMES = [
  'Editorial Mono',
  'Magazine Bold',
  'Tech Noir',
  'Pastel Tech',
  'Silicon Valley',
  'Editorial Serif',
  'Carbon Neon',
  'Cobalt Edge',
  'Terracotta Editorial',
  'Monochrome High-Contrast',
];

test('palettes.md exists at the documented path', () => {
  assert.ok(fs.existsSync(PALETTES), 'palettes.md must exist');
});

test('palettes.md has ≥ 14 H2 palette blocks', () => {
  const md = fs.readFileSync(PALETTES, 'utf8');
  const h2 = md.match(/^## /gm) || [];
  assert.ok(h2.length >= 14,
    `expected ≥ 14 H2 palette blocks, got ${h2.length}`);
});

test('palettes.md contains every required palette name as an H2 heading', () => {
  const md = fs.readFileSync(PALETTES, 'utf8');
  for (const name of REQUIRED_NAMES) {
    assert.ok(md.includes('## ' + name),
      `missing required palette H2: "## ${name}"`);
  }
});

test('every palette section contains ≥ 4 hex #RRGGBB codes', () => {
  const md = fs.readFileSync(PALETTES, 'utf8');
  // Split on H2 headings, drop the first chunk (frontmatter / H1 prelude).
  const sections = md.split(/^## /gm).slice(1);
  assert.ok(sections.length >= 14, 'should have ≥ 14 sections');
  for (const s of sections) {
    const name = s.split('\n', 1)[0].trim();
    const hex = s.match(/#[0-9A-F]{6}/g) || [];
    assert.ok(hex.length >= 4,
      `palette "${name}" must declare ≥ 4 hex codes, got ${hex.length}`);
  }
});

test('palettes.md contains "AI-tells exemption" at least 14 times', () => {
  const md = fs.readFileSync(PALETTES, 'utf8');
  const count = (md.match(/AI-tells exemption/g) || []).length;
  assert.ok(count >= 14,
    `expected ≥ 14 "AI-tells exemption" occurrences (one per palette), got ${count}`);
});
