'use strict';
// tests/lib-review-schema-validator-synonyms.test.js — Iter2 Fix #2.
// schema-validator must accept nitpick synonyms polish/nit/cosmetic at the
// producer side, normalizing to canonical 'style' before validating.

const test = require('node:test');
const assert = require('node:assert/strict');
const { validate, normalizeCategoryForValidation } =
  require('../skills/review/scripts/lib/schema-validator');

const BASE_FINDING = {
  severity_reviewer: 'Nitpick',
  genuine: false,
  nx: 0.5, ny: 0.5,
  text: 't', rationale: 'r', location: 'l', standard: 's', fix: 'f',
};

function doc(category) {
  return {
    schema_version: '1.1',
    deck: 'd.pptx',
    generated_at: '2026-04-29T00:00:00Z',
    slides: [
      { slideNum: 1, title: 'x',
        findings: [{ ...BASE_FINDING, category }] },
    ],
  };
}

test('normalizeCategoryForValidation maps polish/nit/cosmetic → style', () => {
  assert.equal(normalizeCategoryForValidation('polish'), 'style');
  assert.equal(normalizeCategoryForValidation('nit'), 'style');
  assert.equal(normalizeCategoryForValidation('cosmetic'), 'style');
  assert.equal(normalizeCategoryForValidation('style'), 'style');
  assert.equal(normalizeCategoryForValidation('defect'), 'defect');
  assert.equal(normalizeCategoryForValidation(undefined), undefined);
});

test('validator accepts polish synonym', () => {
  assert.equal(validate(doc('polish')), true);
});
test('validator accepts nit synonym', () => {
  assert.equal(validate(doc('nit')), true);
});
test('validator accepts cosmetic synonym', () => {
  assert.equal(validate(doc('cosmetic')), true);
});
test('validator still rejects unknown category', () => {
  assert.throws(() => validate(doc('bogus')), /category/);
});
