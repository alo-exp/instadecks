// tests/annotate-visual-regression.test.js — Visual-regression integration test for Phase 2.
// Tier 1 (mandatory on soffice host): structural-XML normalized SHA-256 of the regenerated
//   annotated PPTX matches tests/fixtures/v8-reference/Annotations_Sample.pptx.normalized.sha256.
//
//   Why normalized SHA, not byte-identical SHA: pptxgenjs 4.0.1 writes wall-clock timestamps
//   (`<dcterms:created>` / `<dcterms:modified>` in `docProps/core.xml`) and the absolute filesystem
//   path of each embedded image (in the `descr` attribute of `<p:cNvPr>` inside `ppt/slides/slide*.xml`)
//   on every generation. Both are non-deterministic / environment-bound and preclude byte-equivalence
//   across hosts and runs. The normalizer below strips both before hashing — see Plan 02-04 SUMMARY
//   §"Architectural changes (Rule 4)" for the full deviation rationale.
//
// Tier 2 (skip-guarded): per-slide pixelmatch < 0.5% diff vs Phase 1 baseline PNGs — stays
//   test.skip until .github/workflows/ci.yml RESERVED block (lines 91-99) installs soffice/pdftoppm
//   and Phase 7 / RVW-09..11 hardens the pipeline.
// Covers ANNO-11.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { _runAnnotateWithRawSamples } = require('../skills/annotate/scripts/index');
const { SAMPLES: V8_SAMPLES } = require('./fixtures/v8-reference/samples');
const { normalizedShaOfPptx } = require('../tools/normalize-pptx-sha');

const REPO_ROOT = path.join(__dirname, '..');
const REF_DECK = path.join(REPO_ROOT, 'tests', 'fixtures', 'v8-reference', 'Annotations_Sample.pptx');
const NORMALIZED_SHA_PATH = path.join(
  REPO_ROOT, 'tests', 'fixtures', 'v8-reference', 'Annotations_Sample.pptx.normalized.sha256',
);

const sofficeAvailable = spawnSync('command', ['-v', 'soffice'], { shell: true }).status === 0;
const pdftoppmAvailable = spawnSync('command', ['-v', 'pdftoppm'], { shell: true }).status === 0;

// Verbatim SHA reader from tests/visual-regression.test.js:
function readExpectedSha(shaFilePath) {
  const raw = fs.readFileSync(shaFilePath, 'utf8');
  const line = raw.split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('#'));
  if (!line) throw new Error(`No SHA line found in ${shaFilePath}`);
  return line.split(/\s+/)[0].toLowerCase();
}

function freshTmpDir(tag) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`));
}

// Normalization rules and implementation: see tools/normalize-pptx-sha.js (shared with the
// one-off baseline-regeneration tooling so the test and the baseline-pinning script are
// guaranteed to agree byte-for-byte).

test('Tier 1: regenerated annotated PPTX normalized SHA matches v8 baseline', { timeout: 120_000 }, async (t) => {
  if (!sofficeAvailable) {
    t.skip('soffice not available — Tier 1 deferred to ci.yml RESERVED block');
    return;
  }

  const tmpRunDir = freshTmpDir('vr1-run');
  const tmpDeckDir = freshTmpDir('vr1-deck');
  const deckCopy = path.join(tmpDeckDir, 'Annotations_Sample.pptx');
  fs.copyFileSync(REF_DECK, deckCopy);

  try {
    const result = await _runAnnotateWithRawSamples({
      deckPath: deckCopy,
      samples: V8_SAMPLES,
      outDir: tmpRunDir,
    });

    const actual = await normalizedShaOfPptx(result.pptxRun);
    const expected = readExpectedSha(NORMALIZED_SHA_PATH);

    // Tier 1 SHA-mismatch runbook (per Plan 02-04 acceptance criteria, Rule 4 deviation):
    // do NOT auto-regenerate the baseline. Escalate via plan-checker findings (severity BLOCKER).
    assert.strictEqual(
      actual,
      expected,
      `Tier 1 normalized SHA mismatch — bundled annotate.js + v8 SAMPLES diverged from Phase 1 baseline.\n` +
      `  expected: ${expected}\n  actual:   ${actual}\n` +
      `  Normalizer rules: strip dcterms:created/modified + descr-attribute paths.\n` +
      `  See Plan 02-04 SUMMARY §"Architectural changes (Rule 4)" + escalation runbook.`,
    );
  } finally {
    try { fs.rmSync(tmpRunDir, { recursive: true, force: true }); } catch (_) { /* ignore */ }
    try { fs.rmSync(tmpDeckDir, { recursive: true, force: true }); } catch (_) { /* ignore */ }
  }
});

test('Tier 2: per-slide pixelmatch < 0.5% diff', async (t) => {
  if (!sofficeAvailable || !pdftoppmAvailable) {
    t.skip('soffice/pdftoppm not available — Tier 2 deferred to ci.yml RESERVED block');
    return;
  }
  // Tier 2 stays test.skip until .github/workflows/ci.yml RESERVED block (lines 91-99)
  // installs soffice/pdftoppm in CI and Phase 7 / RVW-09..11 harden the pipeline.
  // Implementation reference (tests/visual-regression.test.js, RESEARCH Pattern 5):
  //   const { PNG } = require('pngjs');
  //   const pixelmatch = require('pixelmatch');
  //   For each slide-NN.png in tests/fixtures/v8-reference/:
  //     - render the freshly-built PPTX via soffice + pdftoppm @ 150 dpi
  //     - compare pixel ratio; assert ratio < 0.005 (0.5%)
  t.skip('Tier 2 deferred — see ci.yml RESERVED block (Phase 7 RVW-09..11 unblocks)');
});
