// tests/annotate-adapter.test.js — Unit tests for skills/annotate/scripts/adapter.js.
// Covers ANNO-05 (severity collapse), ANNO-06 (genuine filter), Phase 2 D-07 (fail-loud structured errors), P-09 (validate-before-filter ordering).

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { adaptFindings, SEV_MAP } = require('../skills/annotate/scripts/adapter');

const REQUIRED_FINDING_FIELDS = [
  'severity_reviewer', 'category', 'genuine',
  'nx', 'ny', 'text', 'rationale', 'location', 'standard', 'fix',
];

function validFinding(overrides = {}) {
  return {
    severity_reviewer: 'Major',
    category: 'defect',
    genuine: true,
    nx: 0.5,
    ny: 0.5,
    text: 'sample finding text',
    rationale: 'why this matters',
    location: 'centre slide',
    standard: 'Heuristic',
    fix: 'do this',
    ...overrides,
  };
}

function validDoc(overrides = {}) {
  return {
    schema_version: '1.0',
    slides: [{ slideNum: 1, title: 'T', findings: [validFinding()] }],
    ...overrides,
  };
}

test('adapter validates and transforms findings', async (t) => {
  await t.test('rejects missing schema_version', () => {
    assert.throws(() => adaptFindings({ slides: [] }), /schema version/);
  });

  await t.test('rejects schema_version 2.0', () => {
    assert.throws(
      () => adaptFindings({ schema_version: '2.0', slides: [] }),
      /Unsupported findings schema version 2\.0/,
    );
  });

  await t.test('rejects non-array slides', () => {
    assert.throws(
      () => adaptFindings({ schema_version: '1.0', slides: 'oops' }),
      /findings\.slides: must be array/,
    );
  });

  await t.test('rejects each missing required field', () => {
    for (const key of REQUIRED_FINDING_FIELDS) {
      const doc = validDoc();
      delete doc.slides[0].findings[0][key];
      assert.throws(
        () => adaptFindings(doc),
        new RegExp(`slides\\[0\\]\\.findings\\[0\\] missing required field "${key}"`),
        `expected throw for missing ${key}`,
      );
    }
  });

  await t.test('rejects severity_reviewer not in allow-set', () => {
    const doc = validDoc();
    doc.slides[0].findings[0].severity_reviewer = 'Blocker';
    assert.throws(() => adaptFindings(doc), /severity_reviewer: Blocker not in/);
  });

  await t.test('rejects category not in allow-set', () => {
    const doc = validDoc();
    // Live E2E Iteration 1 Fix #4: `cosmetic` is now a recognized synonym for `style`.
    // Use a truly bogus category that isn't synonym-mapped.
    doc.slides[0].findings[0].category = 'totally-bogus';
    assert.throws(() => adaptFindings(doc), /category: totally-bogus not in/);
  });

  await t.test('rejects nx out of [0,1]', () => {
    const a = validDoc(); a.slides[0].findings[0].nx = 1.5;
    assert.throws(() => adaptFindings(a), /nx: must be number in \[0,1\]/);
    const b = validDoc(); b.slides[0].findings[0].nx = -0.1;
    assert.throws(() => adaptFindings(b), /nx: must be number in \[0,1\]/);
  });

  await t.test('rejects ny out of [0,1]', () => {
    const a = validDoc(); a.slides[0].findings[0].ny = 1.5;
    assert.throws(() => adaptFindings(a), /ny: must be number in \[0,1\]/);
    const b = validDoc(); b.slides[0].findings[0].ny = -0.1;
    assert.throws(() => adaptFindings(b), /ny: must be number in \[0,1\]/);
  });

  await t.test('rejects non-boolean genuine', () => {
    const doc = validDoc();
    doc.slides[0].findings[0].genuine = 'yes';
    assert.throws(() => adaptFindings(doc), /genuine: must be boolean/);
  });

  await t.test('collapses severity per SEV_MAP', () => {
    assert.equal(SEV_MAP.Critical, 'major');
    assert.equal(SEV_MAP.Major, 'major');
    assert.equal(SEV_MAP.Minor, 'minor');
    assert.equal(SEV_MAP.Nitpick, 'polish');
  });

  await t.test('filters genuine == false out', () => {
    const doc = validDoc({
      schema_version: '1.0',
      slides: [{
        slideNum: 1,
        title: 'T',
        findings: [
          validFinding({ genuine: true, text: 'keep' }),
          validFinding({ genuine: false, text: 'drop' }),
        ],
      }],
    });
    const out = adaptFindings(doc);
    assert.equal(out.length, 1);
    assert.equal(out[0].annotations.length, 1);
    assert.equal(out[0].annotations[0].text, 'keep');
  });

  await t.test('omits slides whose findings are all non-genuine', () => {
    const doc = {
      schema_version: '1.0',
      slides: [
        { slideNum: 1, title: 'A', findings: [validFinding({ genuine: false })] },
        { slideNum: 2, title: 'B', findings: [validFinding({ genuine: true, text: 'kept' })] },
      ],
    };
    const out = adaptFindings(doc);
    assert.equal(out.length, 1);
    assert.equal(out[0].slideNum, 2);
  });

  await t.test('happy-path canonical fixture', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'sample-findings.json');
    const data = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const out = adaptFindings(data);
    assert.ok(Array.isArray(out));
    assert.ok(out.length > 0);
    const validSevs = new Set(['major', 'minor', 'polish']);
    for (const slide of out) {
      assert.equal(typeof slide.slideNum, 'number');
      assert.equal(typeof slide.title, 'string');
      assert.ok(Array.isArray(slide.annotations));
      assert.ok(slide.annotations.length > 0);
      for (const a of slide.annotations) {
        assert.ok(validSevs.has(a.sev), `sev ${a.sev} not in allow-set`);
        assert.equal(typeof a.nx, 'number');
        assert.equal(typeof a.ny, 'number');
        assert.equal(typeof a.text, 'string');
      }
    }
  });

  await t.test('P-09: validation runs before filter', () => {
    const doc = validDoc();
    doc.slides[0].findings[0].genuine = false;
    doc.slides[0].findings[0].nx = 2;
    assert.throws(() => adaptFindings(doc), /nx: must be number/);
  });

  await t.test('P-09: validation runs before collapse', () => {
    const doc = validDoc();
    doc.slides[0].findings[0].severity_reviewer = 'Blocker';
    assert.throws(() => adaptFindings(doc), /severity_reviewer: Blocker not in/);
  });
});
