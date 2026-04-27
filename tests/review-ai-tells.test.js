'use strict';
// review-ai-tells.test.js — RVW-03 unit coverage for skills/review/scripts/ai-tells.js.
// Per Plan 03-03 Task 2 acceptance.
// Subtests:
//   1. positive fixture: all 3 heuristics fire
//   2. negative fixture: zero heuristics fire
//   3. every emitted finding has r18_ai_tell: true and full 4-tier severity (P-01 guard)
//   4. title-detection fallback fires when no bold-large title (P-09)
//   5. zip-bomb cap rejects oversized pptx (T-03-13)

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const { detectAITells, _internal } = require('../skills/review/scripts/ai-tells');

const POS_FIXTURE = path.resolve(__dirname, 'fixtures/ai-tells-positive.pptx');
const NEG_FIXTURE = path.resolve(__dirname, 'fixtures/ai-tells-negative.pptx');

test('positive fixture: all 3 heuristics fire', async () => {
  const findings = await detectAITells(POS_FIXTURE);
  const blue = findings.filter((f) => /Default Office-blue/.test(f.text));
  const accent = findings.filter((f) => /Accent line under title/.test(f.text));
  const layout = findings.filter((f) => /Identical layout repeated on slides/.test(f.text));
  assert.ok(blue.length >= 1, `expected ≥1 default-blue finding, got ${blue.length}`);
  assert.ok(accent.length >= 3, `expected ≥3 accent-line findings, got ${accent.length}`);
  assert.ok(layout.length >= 1, `expected ≥1 identical-layout finding, got ${layout.length}`);
});

test('negative fixture: zero heuristics fire', async () => {
  const findings = await detectAITells(NEG_FIXTURE);
  assert.strictEqual(findings.length, 0, `expected 0 findings, got ${findings.length}: ${JSON.stringify(findings)}`);
});

test('every emitted finding has r18_ai_tell: true and 4-tier severity (P-01)', async () => {
  const findings = await detectAITells(POS_FIXTURE);
  const TIERS = new Set(['Critical', 'Major', 'Minor', 'Nitpick']);
  for (const f of findings) {
    assert.strictEqual(f.r18_ai_tell, true, `finding missing r18_ai_tell: ${JSON.stringify(f)}`);
    assert.ok(TIERS.has(f.severity_reviewer), `bad severity ${f.severity_reviewer}`);
    assert.strictEqual(f.category, 'style');
    assert.strictEqual(f.genuine, true);
  }
});

test('title-detection fallback fires when no bold-large title (P-09)', () => {
  // Three slides, each with a topmost text shape (no b="1", no large sz) immediately
  // followed by a thin full-width accent rect. The fallback path should locate the
  // topmost text shape and detect the accent rect underneath on each slide.
  function makeSlideXml() {
    return `<?xml version="1.0"?>
<p:sld xmlns:p="x" xmlns:a="x">
  <p:sp>
    <p:spPr><a:xfrm><a:off x="457200" y="457200"/><a:ext cx="8229600" cy="457200"/></a:xfrm></p:spPr>
    <p:txBody><a:p><a:r><a:rPr sz="1800"/><a:t>Plain title text</a:t></a:r></a:p></p:txBody>
  </p:sp>
  <p:sp>
    <p:spPr><a:xfrm><a:off x="457200" y="990600"/><a:ext cx="8229600" cy="38100"/></a:xfrm><a:prstGeom prst="rect"/></p:spPr>
  </p:sp>
</p:sld>`;
  }
  const slides = [1, 2, 3].map((n) => ({ slideNum: n, xml: makeSlideXml() }));
  const findings = _internal.detectAccentLineUnderTitle(slides);
  assert.strictEqual(findings.length, 3, `expected 3 fallback-path findings, got ${findings.length}`);
  for (const f of findings) {
    assert.strictEqual(f.r18_ai_tell, true);
    assert.strictEqual(f.location, 'under title');
  }
});

test('zip-bomb cap rejects oversized pptx (T-03-13)', async () => {
  // Create a sparse 105MB temp file (above the 100MB MAX_PPTX_BYTES cap).
  const tmp = path.join(os.tmpdir(), `instadecks-ai-tells-bomb-${process.pid}.pptx`);
  const fd = fs.openSync(tmp, 'w');
  try {
    fs.ftruncateSync(fd, 105 * 1024 * 1024);
  } finally {
    fs.closeSync(fd);
  }
  try {
    await assert.rejects(
      detectAITells(tmp),
      /exceeds 100MB cap/,
    );
  } finally {
    try { fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
  }
});
