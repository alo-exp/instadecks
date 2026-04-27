// tests/review-schema-emission.test.js — Property test (P-01 guard).
// Reviewers MUST keep the full 4-tier severity vocabulary {Critical,Major,Minor,Nitpick}.
// The 4→3 collapse to MAJOR/MINOR/POLISH happens ONLY at the /annotate adapter, never at
// producer/orchestrator boundary. This file locks that invariant.

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validate } = require('../skills/review/scripts/lib/schema-validator');

const SAMPLE_FINDINGS = path.join(__dirname, 'fixtures', 'sample-findings.json');
const FOUR_TIER = new Set(['Critical', 'Major', 'Minor', 'Nitpick']);
const CATEGORIES = new Set(['defect', 'improvement', 'style']);

function loadCanonical() { return JSON.parse(fs.readFileSync(SAMPLE_FINDINGS, 'utf8')); }

function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

test('review-schema-emission', async (t) => {
  await t.test('every emitted finding severity_reviewer ∈ 4-tier (P-01)', () => {
    const doc = loadCanonical();
    let count = 0;
    for (const slide of doc.slides) {
      for (const f of slide.findings) {
        assert.ok(FOUR_TIER.has(f.severity_reviewer),
          `slide ${slide.slideNum}: severity_reviewer "${f.severity_reviewer}" not in 4-tier`);
        count++;
      }
    }
    assert.ok(count > 0, 'fixture has at least one finding');
  });

  await t.test('validator rejects 3-tier collapsed severity (MAJOR / MINOR / POLISH)', () => {
    for (const collapsed of ['MAJOR', 'MINOR', 'POLISH', 'major', 'minor', 'polish']) {
      const doc = loadCanonical();
      doc.slides[0].findings[0].severity_reviewer = collapsed;
      assert.throws(() => validate(doc), /severity_reviewer/,
        `validator must reject collapsed severity ${collapsed}`);
    }
  });

  await t.test('every finding category ∈ {defect, improvement, style}', () => {
    const doc = loadCanonical();
    for (const slide of doc.slides) {
      for (const f of slide.findings) {
        assert.ok(CATEGORIES.has(f.category),
          `slide ${slide.slideNum}: category "${f.category}" not in vocabulary`);
      }
    }
  });

  await t.test('validator rejects unknown category', () => {
    const doc = loadCanonical();
    doc.slides[0].findings[0].category = 'wibble';
    assert.throws(() => validate(doc), /category/);
  });

  await t.test('genuine is strictly boolean (not truthy)', () => {
    for (const bad of ['true', 'false', 1, 0, null]) {
      const doc = loadCanonical();
      doc.slides[0].findings[0].genuine = bad;
      assert.throws(() => validate(doc), /genuine/,
        `validator must reject genuine=${JSON.stringify(bad)}`);
    }
  });

  await t.test('nx/ny must be numbers in [0,1]', () => {
    for (const bad of [-0.1, 1.5, '0.5', NaN, null]) {
      const doc = loadCanonical();
      doc.slides[0].findings[0].nx = bad;
      assert.throws(() => validate(doc), /nx/,
        `validator must reject nx=${JSON.stringify(bad)}`);
    }
  });

  await t.test('canonical fixture passes validation', () => {
    const doc = loadCanonical();
    assert.equal(validate(doc), true);
  });

  await t.test('schema_version must match 1.x', () => {
    const doc = loadCanonical();
    doc.schema_version = '2.0';
    assert.throws(() => validate(doc), /schema_version/);
  });
});
