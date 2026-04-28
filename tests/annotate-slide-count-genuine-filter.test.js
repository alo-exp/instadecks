'use strict';
// tests/annotate-slide-count-genuine-filter.test.js — Live E2E Round 4 MINOR R4-2.
//
// annotatedSlideCount must reflect what actually got annotated in the output PPTX
// (post-genuine-filter from the adapter), NOT the count of slide-finding groups
// in the raw input. Otherwise users see e.g. "annotatedSlideCount: 4" but the
// produced PPTX has only 3 slides because one slide-group had only nitpick
// genuine:false findings that the adapter dropped.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');

const REPO_ROOT = path.join(__dirname, '..');
const FIXTURE_DECK = path.join(REPO_ROOT, 'tests', 'fixtures', 'v8-reference', 'Annotations_Sample.pptx');

test('annotatedSlideCount equals unique slides AFTER genuine filter, not raw input count', async () => {
  // Skip if soffice unavailable.
  const probe = spawnSync('which', ['soffice']);
  if (probe.status !== 0) return;
  if (!fs.existsSync(FIXTURE_DECK)) return;

  const { runAnnotate } = require('../skills/annotate/scripts/index');

  // 4 slide-groups in the input. Slide 4's only finding has genuine:false — adapter drops it.
  // Expected post-filter: 3 unique slide nums in samples (1, 2, 3).
  const findings = {
    schema_version: '1.1',
    slides: [
      { slideNum: 1, title: 'S1', findings: [
        { severity_reviewer: 'Major', category: 'defect', genuine: true,
          nx: 0.5, ny: 0.5, text: 'a', rationale: 'r', location: 'l', standard: 's', fix: 'f' },
      ] },
      { slideNum: 2, title: 'S2', findings: [
        { severity_reviewer: 'Minor', category: 'style', genuine: true,
          nx: 0.3, ny: 0.3, text: 'b', rationale: 'r', location: 'l', standard: 's', fix: 'f' },
      ] },
      { slideNum: 3, title: 'S3', findings: [
        { severity_reviewer: 'Critical', category: 'defect', genuine: true,
          nx: 0.6, ny: 0.6, text: 'c', rationale: 'r', location: 'l', standard: 's', fix: 'f' },
      ] },
      { slideNum: 4, title: 'S4', findings: [
        { severity_reviewer: 'Nitpick', category: 'style', genuine: false,
          nx: 0.4, ny: 0.4, text: 'd', rationale: 'r', location: 'l', standard: 's', fix: 'f' },
      ] },
    ],
  };

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'anno-genuine-'));
  try {
    const deckCopy = path.join(tmp, 'Annotations_Sample.pptx');
    fs.copyFileSync(FIXTURE_DECK, deckCopy);

    const r = await runAnnotate({ deckPath: deckCopy, findings, outDir: tmp });

    // Raw input has 4 slide-groups; expected annotatedSlideCount is 3 (post-filter).
    assert.equal(r.annotatedSlideCount, 3,
      `annotatedSlideCount must be post-genuine-filter (expected 3, got ${r.annotatedSlideCount})`);

    // Verify against the actual produced PPTX.
    const list = execFileSync('unzip', ['-l', r.pptxPath]).toString();
    const slideEntries = (list.match(/ppt\/slides\/slide\d+\.xml(?!\.)/g) || []);
    const actualSlideCount = new Set(slideEntries).size;
    assert.equal(actualSlideCount, r.annotatedSlideCount,
      `annotatedSlideCount (${r.annotatedSlideCount}) must equal produced PPTX slide count (${actualSlideCount})`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
