'use strict';
// Plan 08-05 Task 2 — outcome assertions for /instadecks:annotate SKILL.md.
//
// Asserts the locked adapter behaviour:
//   - 4-tier reviewer severity collapses to 3-tier annotator severity at the
//     adapter boundary only (Critical+Major→major, Minor→minor, Nitpick→polish).
//   - genuine !== true findings are filtered out before annotate.js sees them.
//   - annotate.js receives only major/minor/polish.
// Visual baseline (PPTX SHA) is asserted by tests/annotate-visual-regression.test.js
// (Plan 8-03 anchor) — this file references that anchor without re-running soffice.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { parseInstructions, skillMdPath } = require('../skill-outcome-harness');
const { stubLlmResponse } = require('../helpers/llm-mock');
const { adaptFindings, SEV_MAP } = require('../../skills/annotate/scripts/adapter');

const SKILL_MD = skillMdPath('annotate');

// W-5: FIRST assertion in the file MUST be on instructions.length > 0.
test('W-5: parseInstructions returns >=1 instruction for annotate/SKILL.md', () => {
  const instructions = parseInstructions(SKILL_MD);
  assert.ok(instructions.length > 0, 'annotate/SKILL.md must yield >=1 parseable instruction');
});

test('adapter collapses 4→3: Critical+Major→major, Minor→minor, Nitpick→polish', () => {
  // SEV_MAP is the contract; the adapter is its consumer.
  assert.equal(SEV_MAP.Critical, 'major');
  assert.equal(SEV_MAP.Major, 'major');
  assert.equal(SEV_MAP.Minor, 'minor');
  assert.equal(SEV_MAP.Nitpick, 'polish');
});

test('adapter filters genuine!==true: 4 genuine + 1 non-genuine → 4 samples annotations', async () => {
  const doc = await stubLlmResponse('annotate-passthrough')();
  const samples = adaptFindings(doc);
  // 1 slide with 4 genuine annotations (Critical, Major, Minor, Nitpick).
  assert.equal(samples.length, 1);
  assert.equal(samples[0].slideNum, 7);
  assert.equal(samples[0].annotations.length, 4,
    'genuine:false finding must be filtered out before annotate.js');
});

test('annotate.js receives ONLY major|minor|polish (no Critical/Major/Minor/Nitpick leaks)', async () => {
  const doc = await stubLlmResponse('annotate-passthrough')();
  const samples = adaptFindings(doc);
  const ALLOWED = new Set(['major', 'minor', 'polish']);
  for (const sample of samples) {
    for (const a of sample.annotations) {
      assert.ok(ALLOWED.has(a.sev),
        `annotate.js sev must be lowercase 3-tier (got "${a.sev}")`);
    }
  }
});

test('severity collapse counts: 1 Critical + 1 Major → 2 major; 1 Minor → 1 minor; 1 Nitpick → 1 polish', async () => {
  const doc = await stubLlmResponse('annotate-passthrough')();
  const samples = adaptFindings(doc);
  const counts = { major: 0, minor: 0, polish: 0 };
  for (const a of samples[0].annotations) counts[a.sev]++;
  assert.deepStrictEqual(counts, { major: 2, minor: 1, polish: 1 });
});

test('adapter rejects non-1.x schema_version with explicit error', () => {
  assert.throws(
    () => adaptFindings({ schema_version: '2.0', slides: [] }),
    /Unsupported findings schema version 2\.0\. \/annotate supports 1\.x\./,
  );
});

test('adapter accepts category=content (Phase 6 lockstep patch)', () => {
  const doc = {
    schema_version: '1.1', deck: 'd', generated_at: '2026-01-01T00:00:00Z',
    slides: [{ slideNum: 2, title: 't', findings: [{
      severity_reviewer: 'Major', category: 'content', genuine: true,
      nx: 0.5, ny: 0.5, text: 'x', rationale: 'r', location: 'l', standard: 's', fix: 'f',
    }] }],
  };
  const samples = adaptFindings(doc);
  assert.equal(samples.length, 1);
  assert.equal(samples[0].annotations[0].sev, 'major');
});

test('visual regression anchor: Phase 1 baseline SHA file exists for cross-reference', () => {
  // Plan 8-03 owns the live regression run (skips when soffice absent). This test
  // simply asserts the baseline SHA is committed under tests/fixtures/v8-reference/
  // — the SKILL.md instruction "produced PPTX SHA matches Phase 1 baseline" is
  // anchored there.
  const repoRoot = path.join(__dirname, '..', '..');
  const baseline = path.join(repoRoot, 'tests', 'fixtures', 'v8-reference',
    'Annotations_Sample.pptx.normalized.sha256');
  assert.ok(fs.existsSync(baseline), `Phase 1 normalized-SHA baseline must exist: ${baseline}`);
});
