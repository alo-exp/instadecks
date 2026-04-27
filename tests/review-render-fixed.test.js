'use strict';
// review-render-fixed.test.js — snapshot + property tests for render-fixed.js.
// Per Phase 3 D-06 / RVW-02 / RVW-05.
// Locks tests/fixtures/sample-findings.fixed.md as the regression baseline; any
// drift fails the snapshot subtest. Property tests cover determinism, the locked
// 4-branch maturity rubric, §5 row cap, no-clock-leak, and severity-glyph preservation.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { render } = require('../skills/review/scripts/render-fixed');

const REPO_ROOT = path.join(__dirname, '..');
const SAMPLE_PATH = path.join(REPO_ROOT, 'tests', 'fixtures', 'sample-findings.json');
const SNAPSHOT_PATH = path.join(REPO_ROOT, 'tests', 'fixtures', 'sample-findings.fixed.md');

function loadSample() {
  return JSON.parse(fs.readFileSync(SAMPLE_PATH, 'utf8'));
}

function makeDoc(findings) {
  return {
    schema_version: '1.0',
    deck: 'synthetic.pptx',
    generated_at: '2026-04-28T00:00:00Z',
    slides: [{ slideNum: 1, title: 'Slide 1', findings }],
  };
}

function makeFinding(severity, overrides = {}) {
  return {
    severity_reviewer: severity,
    category: 'defect',
    genuine: true,
    nx: 0.5,
    ny: 0.5,
    text: `text-${severity}`,
    rationale: 'r',
    location: 'loc',
    standard: 'std',
    fix: `fix-${severity}-${overrides._tag || ''}`,
    ...overrides,
  };
}

test('render-fixed: snapshot + property tests', async (t) => {
  await t.test('snapshot matches locked baseline', () => {
    const actual = render(loadSample());
    const expected = fs.readFileSync(SNAPSHOT_PATH, 'utf8');
    assert.strictEqual(
      actual,
      expected,
      'render-fixed drift — regenerate sample-findings.fixed.md only with deliberate plan-checker review'
    );
  });

  await t.test('determinism: 5 calls produce byte-identical output', () => {
    const sample = loadSample();
    const outputs = [];
    for (let i = 0; i < 5; i++) outputs.push(render(sample));
    for (let i = 1; i < 5; i++) {
      assert.strictEqual(outputs[i], outputs[0], `call ${i} diverged from call 0`);
    }
  });

  await t.test('maturity: 1 Critical → Draft', () => {
    const doc = makeDoc([makeFinding('Critical')]);
    assert.match(render(doc), /maturity: \*\*Draft\*\*/);
  });

  await t.test('maturity: 0/0/0/2 (clean deck per locked rubric) → Client-ready', () => {
    // Per the locked rubric (RESEARCH §"Maturity rubric"), the third rule
    // `counts.major <= 2` fires before the Partner-ready rule for clean decks.
    // This branch tests the first-matching-rule discipline.
    const doc = makeDoc([
      makeFinding('Nitpick', { _tag: 'a', fix: 'fix-a' }),
      makeFinding('Nitpick', { _tag: 'b', fix: 'fix-b' }),
    ]);
    assert.match(render(doc), /maturity: \*\*Client-ready\*\*/);
  });

  await t.test('maturity: 6 Majors → Draft (major > 5 branch)', () => {
    // Exercises the second clause of the first rule: counts.major > 5 → Draft.
    const findings = [];
    for (let i = 0; i < 6; i++) {
      findings.push(makeFinding('Major', { _tag: `${i}`, fix: `fix-${i}` }));
    }
    const doc = makeDoc(findings);
    assert.match(render(doc), /maturity: \*\*Draft\*\*/);
  });

  await t.test('maturity: exactly 4 Majors → Internal-ready', () => {
    const doc = makeDoc([
      makeFinding('Major', { _tag: 'a', fix: 'fix-a' }),
      makeFinding('Major', { _tag: 'b', fix: 'fix-b' }),
      makeFinding('Major', { _tag: 'c', fix: 'fix-c' }),
      makeFinding('Major', { _tag: 'd', fix: 'fix-d' }),
    ]);
    assert.match(render(doc), /maturity: \*\*Internal-ready\*\*/);
  });

  await t.test('§5 caps at 10 rows even with 25 distinct fixes', () => {
    const findings = [];
    for (let i = 0; i < 25; i++) {
      findings.push(makeFinding('Minor', { _tag: `${i}`, fix: `unique-fix-${String(i).padStart(2, '0')}` }));
    }
    const doc = makeDoc(findings);
    const out = render(doc);
    const section5 = out.split('## §5 — Top 10 Highest-Leverage Fixes')[1];
    assert.ok(section5, 'expected §5 section in output');
    const dataRows = (section5.match(/^\| \d+ \|/gm) || []).length;
    assert.ok(dataRows <= 10, `§5 has ${dataRows} rows (>10)`);
    assert.strictEqual(dataRows, 10, `expected exactly 10 rows, got ${dataRows}`);
  });

  await t.test('no clock leak: outputs identical across 1.1s gap', async () => {
    const sample = loadSample();
    const a = render(sample);
    await new Promise(r => setTimeout(r, 1100));
    const b = render(sample);
    assert.strictEqual(a, b, 'render output drifted across 1.1s — clock leak suspected');
  });

  await t.test('severity glyphs: 4-tier emoji preserved; no 3-tier collapsed labels in body', () => {
    const out = render(loadSample());
    assert.ok(out.includes('🔴'), 'expected 🔴 (Critical) glyph');
    assert.ok(out.includes('🟠'), 'expected 🟠 (Major) glyph');
    assert.ok(out.includes('🟡'), 'expected 🟡 (Minor) glyph');
    assert.ok(out.includes('⚪'), 'expected ⚪ (Nitpick) glyph');
    // The 3-tier collapsed labels (MAJOR/MINOR/POLISH) belong to the /annotate adapter, not the
    // reviewer. The renderer DOES use uppercase tier headers (CRITICAL / MAJOR / MINOR / NITPICK)
    // in per-slide blocks per the locked skeleton — ensure POLISH never appears (that label is
    // adapter-only).
    assert.ok(!/\bPOLISH\b/.test(out), 'POLISH label leaked from /annotate adapter into renderer output');
  });
});
