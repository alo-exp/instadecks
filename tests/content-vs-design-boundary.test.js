'use strict';
// content-vs-design-boundary.test.js — Phase 6 Plan 06-03 / D-05 / CRV-10.
//
// Locks the CLAUDE.md content-vs-design boundary into CI as a CI-enforceable regression
// test (NOT prose discipline). Pure JSON-in / asserts-out: no LLM, no child processes,
// no network. Runs against the two pre-computed fixtures committed in this plan:
//   - tests/fixtures/cross-domain-design-findings.json   (visual-only, /review domain)
//   - tests/fixtures/cross-domain-content-findings.json  (content-only, /content-review domain)
//
// CRV-10 invariant (CLAUDE.md, locked):
//   "/review does not flag argument structure; /content-review does not flag visual /
//   typographic / layout issues. Crossover is a defect."
//
// Reference: 06-RESEARCH.md §"Check D-05 — Boundary regression test".
// Do NOT loosen these assertions without a paired CLAUDE.md amendment + sign-off.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { validate } = require('../skills/review/scripts/lib/schema-validator');
const { adaptFindings } = require('../skills/annotate/scripts/adapter');

const REPO_ROOT = path.join(__dirname, '..');
const DESIGN_PATH = path.join(REPO_ROOT, 'tests', 'fixtures', 'cross-domain-design-findings.json');
const CONTENT_PATH = path.join(REPO_ROOT, 'tests', 'fixtures', 'cross-domain-content-findings.json');

// eslint-disable-next-line global-require, import/no-dynamic-require
const designDoc = require(DESIGN_PATH);
// eslint-disable-next-line global-require, import/no-dynamic-require
const contentDoc = require(CONTENT_PATH);

const VALID_DESIGN_CATEGORIES = new Set(['defect', 'improvement', 'style']);
const VALID_CHECK_IDS = new Set([
  'action-title', 'redundancy', 'jargon', 'length',
  'pyramid-mece', 'narrative-arc', 'claim-evidence', 'standalone-readability',
]);
const COLLAPSED_SEVS = new Set(['major', 'minor', 'polish']);

function slideNums(doc) {
  return new Set((doc.slides || []).map((s) => s.slideNum));
}

function findingsOn(doc, slideNum) {
  const slide = (doc.slides || []).find((s) => s.slideNum === slideNum);
  return slide ? slide.findings : [];
}

test('content-vs-design-boundary', async (t) => {
  await t.test('(c) both fixtures pass schema-validator v1.1', () => {
    assert.equal(validate(designDoc), true);
    assert.equal(validate(contentDoc), true);
  });

  await t.test('(a) design fixture: zero findings on slide 4 + no content category', () => {
    // Boundary: /review must NOT cross into content even when slide 4 has obvious content issues.
    assert.equal(findingsOn(designDoc, 4).length, 0,
      'CLAUDE.md boundary: /review fixture must have zero findings on the content-only slide (4)');
    for (const slide of designDoc.slides) {
      for (const f of slide.findings) {
        assert.ok(VALID_DESIGN_CATEGORIES.has(f.category),
          `design finding has illegal category="${f.category}" on slide ${slide.slideNum} — must be one of {defect,improvement,style}`);
        assert.notEqual(f.category, 'content',
          `design finding category MUST NOT be "content" on slide ${slide.slideNum} (CRV-10)`);
      }
    }
  });

  await t.test('(b) content fixture: zero findings on slide 3 + every finding is content', () => {
    // Boundary: /content-review must NOT cross into visual even when slide 3 has obvious visual issues.
    assert.equal(findingsOn(contentDoc, 3).length, 0,
      'CLAUDE.md boundary: /content-review fixture must have zero findings on the visual-only slide (3)');
    for (const slide of contentDoc.slides) {
      for (const f of slide.findings) {
        assert.equal(f.category, 'content',
          `content finding category MUST be "content" on slide ${slide.slideNum} (CRV-10)`);
        assert.ok(typeof f.check_id === 'string' && VALID_CHECK_IDS.has(f.check_id),
          `content finding check_id missing/invalid on slide ${slide.slideNum}: ${JSON.stringify(f.check_id)}`);
      }
    }
  });

  await t.test('(d) cross-set invariants: slide 1 clean, intersection={2}, slide 4 length+jargon', () => {
    const dSlides = slideNums(designDoc);
    const cSlides = slideNums(contentDoc);

    // Slide 1 has zero findings in either fixture (control slide).
    assert.equal(findingsOn(designDoc, 1).length, 0,
      'control: slide 1 has zero design findings');
    assert.equal(findingsOn(contentDoc, 1).length, 0,
      'control: slide 1 has zero content findings');

    // Intersection of slide blocks present in both docs is exactly {2} (the both-defects slide).
    const intersection = [...dSlides].filter((n) => cSlides.has(n));
    assert.deepEqual(new Set(intersection), new Set([2]),
      `cross-set: slide block intersection must be exactly {2} (got ${JSON.stringify(intersection)})`);

    // Slide 4 has zero design findings AND ≥1 content finding for length AND jargon.
    assert.equal(findingsOn(designDoc, 4).length, 0,
      'cross-set: slide 4 has zero design findings');
    const s4content = findingsOn(contentDoc, 4);
    assert.ok(s4content.length >= 1, 'cross-set: slide 4 has ≥1 content finding');
    const checkIds = new Set(s4content.map((f) => f.check_id));
    assert.ok(checkIds.has('length'),
      'cross-set: slide 4 must have a length finding');
    assert.ok(checkIds.has('jargon'),
      'cross-set: slide 4 must have a jargon finding');
  });

  await t.test('(e) round-trip both fixtures through /annotate adapter live (Plan 06-01 patch)', () => {
    // Live require — not mocked. Asserts adapter.js VALID_CATEGORY accepts 'content' (Plan 06-01 patch)
    // and that 4→3 severity collapse produces a valid sev for every annotation. Throws → fail loud.
    const designSamples = adaptFindings(designDoc);
    const contentSamples = adaptFindings(contentDoc);
    assert.ok(Array.isArray(designSamples) && designSamples.length > 0,
      'design fixture must round-trip to non-empty SAMPLES');
    assert.ok(Array.isArray(contentSamples) && contentSamples.length > 0,
      'content fixture must round-trip to non-empty SAMPLES');
    for (const samples of [designSamples, contentSamples]) {
      for (const s of samples) {
        for (const a of s.annotations) {
          assert.ok(COLLAPSED_SEVS.has(a.sev),
            `adapter must emit collapsed sev in {major,minor,polish}; got "${a.sev}"`);
        }
      }
    }
  });
});
