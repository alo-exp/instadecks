// tests/lib-review-schema-validator-branches.test.js — Plan 08-02 Task 1 (Group C).
// EXTENDS tests/findings-schema.test.js + tests/findings-schema-v11.test.js with
// per-required-field error-path branches that the existing fixture-based tests
// don't exercise (every REQUIRED_FINDING_FIELDS missing, every enum violation,
// number-range checks, NON_EMPTY_STRING_FIELDS, schema_version variants).

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  validate,
  _internal: { SEVERITIES, CATEGORIES, VALID_CHECK_IDS, REQUIRED_FINDING_FIELDS },
} = require('../skills/review/scripts/lib/schema-validator');

function baseFinding(overrides = {}) {
  return Object.assign({
    severity_reviewer: 'Major',
    category: 'defect',
    genuine: true,
    nx: 0.5,
    ny: 0.5,
    text: 'sample',
    rationale: 'r',
    location: 'l',
    standard: 's',
    fix: 'f',
  }, overrides);
}

function wrap(findings = [], extras = {}) {
  return Object.assign({
    schema_version: '1.0',
    deck: 'test.pptx',
    generated_at: '2026-04-28T00:00:00Z',
    slides: [{ slideNum: 1, title: 't', findings }],
  }, extras);
}

test('validate: rejects null / non-object / array as document', () => {
  assert.throws(() => validate(null), /schema_version: missing/);
  assert.throws(() => validate('s'), /schema_version: missing/);
  assert.throws(() => validate([]), /schema_version: missing/);
});

test('validate: rejects missing schema_version', () => {
  assert.throws(() => validate({}), /schema_version: missing/);
});

test('validate: rejects empty schema_version', () => {
  assert.throws(() => validate({ schema_version: '' }), /schema_version: missing/);
});

test('validate: rejects unsupported schema_version (2.0)', () => {
  assert.throws(() => validate({ schema_version: '2.0' }), /unsupported "2\.0"/);
});

test('validate: accepts 1.0 and 1.1', () => {
  assert.equal(validate(wrap([baseFinding()], { schema_version: '1.0' })), true);
  assert.equal(validate(wrap([baseFinding()], { schema_version: '1.1' })), true);
});

test('validate: rejects empty/non-string deck', () => {
  assert.throws(() => validate(wrap([], { deck: '' })), /deck: must be non-empty string/);
  assert.throws(() => validate(wrap([], { deck: 42 })), /deck: must be non-empty string/);
});

test('validate: rejects non-ISO generated_at', () => {
  assert.throws(() => validate(wrap([], { generated_at: 'yesterday' })), /generated_at: must be ISO8601/);
  assert.throws(() => validate(wrap([], { generated_at: 1234 })), /generated_at: must be ISO8601/);
});

test('validate: rejects non-array slides', () => {
  const doc = wrap([]);
  doc.slides = 'no';
  assert.throws(() => validate(doc), /slides: must be array/);
});

test('validate: rejects null/array slide entry', () => {
  const doc = wrap([]);
  doc.slides = [null];
  assert.throws(() => validate(doc), /slides\[0\]: must be object/);
  doc.slides = [[]];
  assert.throws(() => validate(doc), /slides\[0\]: must be object/);
});

test('validate: rejects non-positive slideNum', () => {
  const doc = wrap([]);
  doc.slides[0].slideNum = 0;
  assert.throws(() => validate(doc), /slideNum: must be positive integer/);
  doc.slides[0].slideNum = -1;
  assert.throws(() => validate(doc), /slideNum: must be positive integer/);
  doc.slides[0].slideNum = 1.5;
  assert.throws(() => validate(doc), /slideNum: must be positive integer/);
});

test('validate: rejects non-string slide.title', () => {
  const doc = wrap([]);
  doc.slides[0].title = 42;
  assert.throws(() => validate(doc), /title: must be string/);
});

test('validate: rejects non-array slide.findings', () => {
  const doc = wrap([]);
  doc.slides[0].findings = {};
  assert.throws(() => validate(doc), /findings: must be array/);
});

test('validate: rejects null finding entry', () => {
  assert.throws(() => validate(wrap([null])), /findings\[0\]: must be object/);
});

test('validate: every REQUIRED_FINDING_FIELDS missing → pinpoint error', () => {
  for (const field of REQUIRED_FINDING_FIELDS) {
    const f = baseFinding();
    delete f[field];
    assert.throws(
      () => validate(wrap([f])),
      new RegExp(`missing required field "${field}"`),
      `expected throw for missing ${field}`,
    );
  }
});

test('validate: severity_reviewer must be in 4-tier set', () => {
  assert.throws(() => validate(wrap([baseFinding({ severity_reviewer: 'Bogus' })])), /severity_reviewer: must be one of/);
  for (const s of SEVERITIES) {
    assert.equal(validate(wrap([baseFinding({ severity_reviewer: s })])), true);
  }
});

test('validate: category must be in 4-value set', () => {
  assert.throws(() => validate(wrap([baseFinding({ category: 'foo' })])), /category: must be one of/);
});

test('validate: content category requires check_id from VALID_CHECK_IDS', () => {
  assert.throws(
    () => validate(wrap([baseFinding({ category: 'content' })])),
    /check_id: required for category="content"/,
  );
  for (const id of VALID_CHECK_IDS) {
    assert.equal(validate(wrap([baseFinding({ category: 'content', check_id: id })])), true);
  }
});

test('validate: non-content finding with check_id still validated against VALID_CHECK_IDS', () => {
  assert.equal(
    validate(wrap([baseFinding({ category: 'defect', check_id: 'redundancy' })])),
    true,
  );
  assert.throws(
    () => validate(wrap([baseFinding({ category: 'defect', check_id: 'invalid-id' })])),
    /check_id: must be one of/,
  );
});

test('validate: genuine must be boolean', () => {
  assert.throws(() => validate(wrap([baseFinding({ genuine: 'yes' })])), /genuine: must be boolean/);
  assert.throws(() => validate(wrap([baseFinding({ genuine: 1 })])), /genuine: must be boolean/);
});

test('validate: nx must be number in [0,1]', () => {
  assert.throws(() => validate(wrap([baseFinding({ nx: -0.1 })])), /nx: must be number in \[0,1\]/);
  assert.throws(() => validate(wrap([baseFinding({ nx: 1.1 })])), /nx: must be number in \[0,1\]/);
  assert.throws(() => validate(wrap([baseFinding({ nx: NaN })])), /nx: must be number in \[0,1\]/);
  assert.throws(() => validate(wrap([baseFinding({ nx: 'half' })])), /nx: must be number in \[0,1\]/);
});

test('validate: ny must be number in [0,1]', () => {
  assert.throws(() => validate(wrap([baseFinding({ ny: -1 })])), /ny: must be number in \[0,1\]/);
  assert.throws(() => validate(wrap([baseFinding({ ny: 2 })])), /ny: must be number in \[0,1\]/);
});

test('validate: nx/ny accept 0 and 1 as boundary values', () => {
  assert.equal(validate(wrap([baseFinding({ nx: 0, ny: 1 })])), true);
});

test('validate: NON_EMPTY_STRING_FIELDS rejected when empty/non-string', () => {
  for (const field of ['text', 'rationale', 'location', 'standard', 'fix']) {
    assert.throws(
      () => validate(wrap([baseFinding({ [field]: '' })])),
      new RegExp(`${field}: must be non-empty string`),
    );
    assert.throws(
      () => validate(wrap([baseFinding({ [field]: 42 })])),
      new RegExp(`${field}: must be non-empty string`),
    );
  }
});

test('SEVERITIES set has the locked 4 tiers', () => {
  for (const s of ['Critical', 'Major', 'Minor', 'Nitpick']) assert.ok(SEVERITIES.has(s));
});

test('CATEGORIES set has the locked 4 values', () => {
  for (const c of ['defect', 'improvement', 'style', 'content']) assert.ok(CATEGORIES.has(c));
});

test('VALID_CHECK_IDS has the 8 locked content check IDs', () => {
  assert.equal(VALID_CHECK_IDS.size, 8);
});
