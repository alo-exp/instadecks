'use strict';
// tests/cookbook-variant-coverage.test.js — Phase 9 Plan 9-02 (DV-01).
//
// Asserts that each of the 9 cookbook recipes documents ≥3 variants under the
// D-01 ID convention `{recipe}-[A-E]-{shorthand}`. stat-callout must carry ≥5.
// Total distinct variant IDs across all 9 recipes must be ≥30 (9 A's +
// ≥21 new B/C/D/E IDs = ≥30 per CONTEXT D-01 / plan must_haves).
//
// Also pins enum-lint hygiene at the cookbook surface: no `fontFace: 'Calibri'`
// literal and no bare `align: 'middle'` (horizontal-axis misuse — `valign` is
// the correct vertical-alignment property).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RECIPES = [
  'title', 'section', '2col', 'comparison',
  'data-chart', 'data-table', 'quote', 'closing', 'stat-callout',
];

const COOKBOOK_DIR = path.join(
  __dirname, '..', 'skills', 'create', 'references', 'cookbook');

function variantIdsFor(recipe, md) {
  const re = new RegExp('\\b' + recipe + '-[A-E]-[a-z0-9-]+', 'g');
  return new Set(md.match(re) || []);
}

test('each cookbook recipe documents ≥3 variants under D-01 ID convention', () => {
  const counts = {};
  for (const r of RECIPES) {
    const md = fs.readFileSync(path.join(COOKBOOK_DIR, r + '.md'), 'utf8');
    const ids = variantIdsFor(r, md);
    counts[r] = ids.size;
    assert.ok(
      ids.size >= 3,
      `${r}.md must have ≥3 distinct variant IDs (got ${ids.size}: ${[...ids].join(', ') || 'none'})`,
    );
  }
});

test('stat-callout recipe documents ≥5 variants (D-01 example list)', () => {
  const md = fs.readFileSync(
    path.join(COOKBOOK_DIR, 'stat-callout.md'), 'utf8');
  const ids = variantIdsFor('stat-callout', md);
  assert.ok(
    ids.size >= 5,
    `stat-callout.md must have ≥5 distinct variant IDs (got ${ids.size}: ${[...ids].join(', ')})`,
  );
});

test('total distinct cookbook variant IDs ≥30 across all 9 recipes', () => {
  let total = 0;
  for (const r of RECIPES) {
    const md = fs.readFileSync(path.join(COOKBOOK_DIR, r + '.md'), 'utf8');
    total += variantIdsFor(r, md).size;
  }
  assert.ok(
    total >= 30,
    `cookbook must document ≥30 total distinct variant IDs across 9 recipes (got ${total})`,
  );
});

test('no cookbook recipe contains fontFace: \'Calibri\' literal', () => {
  for (const r of RECIPES) {
    const md = fs.readFileSync(path.join(COOKBOOK_DIR, r + '.md'), 'utf8');
    assert.ok(
      !/fontFace:\s*'Calibri'/.test(md),
      `${r}.md must not embed Calibri default — use TYPE.body/TYPE.heading tokens`,
    );
  }
});

test('no cookbook recipe contains bare align: \'middle\' (use valign)', () => {
  // The valid vertical-alignment property is `valign` (e.g. `valign: 'middle'`).
  // A bare `align: 'middle'` is a misuse of the horizontal-axis property and
  // pptxgenjs ignores it. We use a negative lookbehind so `valign: 'middle'`
  // does not match.
  const re = /(?<![a-z])align:\s*'middle'/;
  for (const r of RECIPES) {
    const md = fs.readFileSync(path.join(COOKBOOK_DIR, r + '.md'), 'utf8');
    assert.ok(
      !re.test(md),
      `${r}.md must not use bare align: 'middle' (use valign: 'middle' instead)`,
    );
  }
});
