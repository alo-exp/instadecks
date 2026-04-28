'use strict';
// Phase 6 Plan 06-01 Task 1 — schema validator v1.1 (additive: content + check_id).

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const { validate } = require('../skills/review/scripts/lib/schema-validator');

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

function wrap(findings, version = '1.1') {
  return {
    schema_version: version,
    deck: 'test.pptx',
    generated_at: '2026-04-28T00:00:00Z',
    slides: [{ slideNum: 1, title: 't', findings }],
  };
}

test('v1.1 valid content finding with check_id passes', () => {
  const doc = wrap([baseFinding({
    category: 'content',
    check_id: 'redundancy',
    severity_reviewer: 'Major',
  })]);
  assert.equal(validate(doc), true);
});

test('v1.1 content finding without check_id throws', () => {
  const doc = wrap([baseFinding({ category: 'content' })]);
  assert.throws(() => validate(doc), /check_id: required for category="content"/);
});

test('v1.1 content finding with unknown check_id throws and lists 8 valid ids', () => {
  const doc = wrap([baseFinding({ category: 'content', check_id: 'bogus-id' })]);
  assert.throws(() => validate(doc), (err) => {
    const m = err.message;
    return /check_id/.test(m)
      && /action-title/.test(m) && /redundancy/.test(m)
      && /jargon/.test(m) && /length/.test(m)
      && /pyramid-mece/.test(m) && /narrative-arc/.test(m)
      && /claim-evidence/.test(m) && /standalone-readability/.test(m);
  });
});

test('legacy v1.0 finding (category:defect, no check_id) still passes', () => {
  const doc = wrap([baseFinding({ category: 'defect' })], '1.0');
  assert.equal(validate(doc), true);
});

test('UPPERCASE severity_reviewer throws (P-01 producer-side title-case guard)', () => {
  const doc = wrap([baseFinding({ severity_reviewer: 'MAJOR' })]);
  assert.throws(() => validate(doc), /severity_reviewer/);
});

test('mixed defect + content findings in one slide validates', () => {
  const doc = wrap([
    baseFinding({ category: 'defect' }),
    baseFinding({ category: 'content', check_id: 'jargon' }),
  ]);
  assert.equal(validate(doc), true);
});

test('back-compat: existing tests/fixtures/sample-findings.json still validates against v1.1 validator', () => {
  const fixturePath = path.join(__dirname, 'fixtures', 'sample-findings.json');
  const doc = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  assert.equal(validate(doc), true);
});

test('non-content category with explicit unknown check_id throws', () => {
  const doc = wrap([baseFinding({ category: 'defect', check_id: 'bogus' })]);
  assert.throws(() => validate(doc), /check_id/);
});
