'use strict';
// tests/annotate-adapter-category-synonym.test.js — Live E2E Iteration 1 Fix #4.
//
// Reviewers may emit category:"polish" (Nitpick-tier cosmetic preference) or
// other near-synonyms; the adapter normalizes these to the canonical
// 4-category vocabulary before validation. Mirrors the SEV_MAP 4→3 collapse.

const test = require('node:test');
const assert = require('node:assert/strict');

const { adaptFindings, normalizeCategory, CATEGORY_SYNONYMS } =
  require('../skills/annotate/scripts/adapter');

function mkFinding(overrides) {
  return Object.assign({
    severity_reviewer: 'Nitpick',
    category: 'polish',
    genuine: true,
    nx: 0.5, ny: 0.5,
    text: 't', rationale: 'r', location: 'l', standard: 's', fix: 'f',
  }, overrides || {});
}

test('normalizeCategory: polish → style', () => {
  assert.equal(normalizeCategory('polish'), 'style');
});

test('normalizeCategory: case-insensitive (POLISH → style)', () => {
  assert.equal(normalizeCategory('POLISH'), 'style');
});

test('normalizeCategory: nit → style', () => {
  assert.equal(normalizeCategory('nit'), 'style');
});

test('normalizeCategory: cosmetic → style', () => {
  assert.equal(normalizeCategory('cosmetic'), 'style');
});

test('normalizeCategory: canonical passthrough', () => {
  assert.equal(normalizeCategory('defect'), 'defect');
  assert.equal(normalizeCategory('improvement'), 'improvement');
  assert.equal(normalizeCategory('style'), 'style');
  assert.equal(normalizeCategory('content'), 'content');
});

test('normalizeCategory: non-string passthrough', () => {
  assert.equal(normalizeCategory(undefined), undefined);
  assert.equal(normalizeCategory(null), null);
  assert.equal(normalizeCategory(42), 42);
});

test('CATEGORY_SYNONYMS export shape', () => {
  assert.equal(CATEGORY_SYNONYMS.polish, 'style');
  assert.equal(CATEGORY_SYNONYMS.nit, 'style');
  assert.equal(CATEGORY_SYNONYMS.cosmetic, 'style');
});

test('adaptFindings accepts category:"polish" and normalizes to style', () => {
  const doc = {
    schema_version: '1.1',
    slides: [
      { slideNum: 1, title: 'S', findings: [mkFinding({ category: 'polish' })] },
    ],
  };
  const samples = adaptFindings(doc);
  assert.equal(samples.length, 1);
  // The mutation also normalizes the input doc — re-serialized findings see canonical form.
  assert.equal(doc.slides[0].findings[0].category, 'style');
});

test('adaptFindings still rejects non-canonical, non-synonym category', () => {
  const doc = {
    schema_version: '1.1',
    slides: [
      { slideNum: 1, title: 'S', findings: [mkFinding({ category: 'totally-bogus' })] },
    ],
  };
  assert.throws(() => adaptFindings(doc),
    /category: totally-bogus not in \{defect,improvement,style,content\}/);
});

test('adaptFindings: non-string category still throws (early guard)', () => {
  const doc = {
    schema_version: '1.1',
    slides: [
      { slideNum: 1, title: 'S', findings: [mkFinding({ category: 42 })] },
    ],
  };
  assert.throws(() => adaptFindings(doc),
    /category: 42 not in \{defect,improvement,style,content\}/);
});
