// Tier 1 (active): SHA self-check of v8-reference PPTX baseline. Tier 2 (test.skip): per-slide pixelmatch on PNG baselines — unsuspended in Phase 2 once /annotate produces regenerated PPTX. PNG baselines are NOT in Tier 1 scope (they're byte-fragile across LibreOffice versions; Tier 2 tolerates ≤ 0.5% pixel diff).
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');

const FIXTURE_DIR = path.join(__dirname, 'fixtures', 'v8-reference');
const PPTX_PATH = path.join(FIXTURE_DIR, 'Annotations_Sample.pptx');
const PPTX_SHA_PATH = path.join(FIXTURE_DIR, 'Annotations_Sample.pptx.sha256');

function readExpectedSha(shaFilePath) {
  const raw = fs.readFileSync(shaFilePath, 'utf8');
  const line = raw
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith('#'));
  if (!line) throw new Error(`No SHA line found in ${shaFilePath}`);
  return line.split(/\s+/)[0].toLowerCase();
}

function sha256OfFile(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

test('Tier 1: Annotations_Sample.pptx SHA matches v8 baseline', () => {
  const expected = readExpectedSha(PPTX_SHA_PATH);
  const actual = sha256OfFile(PPTX_PATH);
  // Self-check: confirms .sha256 file format and matches committed PPTX binary. Drift detection activates from Phase 2 onward (when /annotate regenerates the PPTX from samples.js + skills/annotate/scripts/annotate.js).
  assert.equal(
    actual,
    expected,
    'PPTX byte-level drift detected — committed baseline diverged from .sha256 file',
  );
});

test(
  'Tier 2: per-slide pixel-diff < 0.5%',
  {
    skip: 'Phase 2 unsuspends — needs /annotate regenerated PPTX + LibreOffice in CI; baselines are slide-NN.png at 150 dpi',
  },
  async () => {
    // Phase 2 unsuspends. Implementation reference (RESEARCH.md Pattern 5):
    //   const { PNG } = require('pngjs');
    //   const pixelmatch = require('pixelmatch');
    //   For each slide-NN.png in tests/fixtures/v8-reference/:
    //     - render the freshly-built PPTX via soffice + pdftoppm @ 150 dpi
    //     - compare pixel ratio; assert ratio < 0.005 (0.5%)
    const { PNG } = require('pngjs');
    const pixelmatch = require('pixelmatch');
    void PNG;
    void pixelmatch;
    assert.fail('Tier 2 body not implemented in Phase 1 — should be skipped');
  },
);
