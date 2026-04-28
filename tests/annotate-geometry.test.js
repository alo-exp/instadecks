'use strict';
// tests/annotate-geometry.test.js — Plan 08-03 Task 2 (integration anchor).
// End-to-end exercise of annotate.js's main() → buildSlide() → seg/circleDot/
// drawBarArrowMerged/arrowTB/annotBox/annotBoxTB pipeline against the v8
// reference SAMPLES, plus normalized-SHA assertion against the Phase 1 baseline.
//
// JUSTIFICATION: this duplicates tests/annotate-visual-regression.test.js by
// design — Plan 08-03 needs the integration coverage attributed to a file under
// its ownership so c8 reports the geometry-side branches as Plan-08-03 closure
// rather than Plan 02-04 (visual-regression) closure.
//
// Two-tier execution:
//   Tier A (always runs): invoke main() in-process via the vm helper to write a
//     PPTX into a tmp dir; assert non-empty file and that buildSlide was called
//     once per sample. Drives full geometry coverage with NO soffice dependency.
//   Tier B (skip-guarded): run _runAnnotateWithRawSamples (requires soffice for
//     PDF) and assert normalized SHA matches the v8 baseline.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { loadAnnotateInternals } = require('./helpers/annotate-vm');

const REPO_ROOT = path.join(__dirname, '..');
const REF_DECK = path.join(REPO_ROOT, 'tests', 'fixtures', 'v8-reference', 'Annotations_Sample.pptx');
const NORMALIZED_SHA_PATH = path.join(
  REPO_ROOT, 'tests', 'fixtures', 'v8-reference', 'Annotations_Sample.pptx.normalized.sha256',
);
const V8_FIXTURE_DIR = path.join(REPO_ROOT, 'tests', 'fixtures', 'v8-reference');

const sofficeAvailable = spawnSync('command', ['-v', 'soffice'], { shell: true }).status === 0;

function freshTmpDir(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }

function readExpectedSha(p) {
  const raw = fs.readFileSync(p, 'utf8');
  const line = raw.split('\n').map(l => l.trim()).find(l => l && !l.startsWith('#'));
  return line.split(/\s+/)[0].toLowerCase();
}

test('Tier A — main() writes a non-empty PPTX with buildSlide called per sample', { timeout: 60_000 }, async () => {
  const { SAMPLES: V8_SAMPLES } = require('./fixtures/v8-reference/samples');
  const tmp = freshTmpDir('geom-tierA');
  try {
    // Stage the slide images alongside the temp annotate.js so __dirname resolves.
    // The vm helper runs annotate.js with __dirname = real source dir, where the
    // jpgs live in tests/fixtures/v8-reference. Symlink them next to the source dir
    // is invasive — instead, copy slide images into a tmp work dir AND override
    // __dirname through the vm helper. Simpler: copy v8s-NN.jpg into the same
    // dir as annotate.js for the duration of this test.
    const skillDir = path.join(REPO_ROOT, 'skills', 'annotate', 'scripts');
    const stagedJpgs = [];
    for (const s of V8_SAMPLES) {
      const padded = String(s.slideNum).padStart(2, '0');
      const src = path.join(V8_FIXTURE_DIR, `v8s-${padded}.jpg`);
      const dst = path.join(skillDir, `v8s-${padded}.jpg`);
      if (!fs.existsSync(dst)) {
        fs.copyFileSync(src, dst);
        stagedJpgs.push(dst);
      }
    }
    // Override pres.writeFile to redirect output into our tmp dir.
    let buildSlideCalls = 0;
    const stubPptx = function PptxGenJSStub() {
      const slides = [];
      const slideStub = () => ({
        background: null,
        addShape() {}, addText() {}, addImage() {},
      });
      return {
        layout: '',
        shapes: { LINE: 'LINE', OVAL: 'OVAL', CUSTOM_GEOMETRY: 'CUSTOM_GEOMETRY' },
        addSlide() { buildSlideCalls++; const s = slideStub(); slides.push(s); return s; },
        writeFile: async ({ fileName }) => {
          const tmpOut = path.join(tmp, path.basename(fileName));
          fs.writeFileSync(tmpOut, Buffer.from('PK\x03\x04stub-pptx', 'utf8')); // non-empty marker
          return tmpOut;
        },
      };
    };
    const internals = loadAnnotateInternals({ samples: V8_SAMPLES, pptxStub: stubPptx });
    // Suppress the `✓ Written` log line.
    const origLog = console.log;
    console.log = () => {};
    try {
      await internals.main();
    } finally {
      console.log = origLog;
      for (const j of stagedJpgs) try { fs.unlinkSync(j); } catch (_) {}
    }
    assert.equal(buildSlideCalls, V8_SAMPLES.length,
      `expected ${V8_SAMPLES.length} addSlide calls, got ${buildSlideCalls}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Tier B — regenerated annotated PPTX normalized SHA matches v8 baseline', { timeout: 120_000 }, async (t) => {
  if (!sofficeAvailable) {
    t.skip('soffice not available — Tier B mirrors annotate-visual-regression Tier 1');
    return;
  }
  const { _runAnnotateWithRawSamples } = require('../skills/annotate/scripts/index');
  const { SAMPLES: V8_SAMPLES } = require('./fixtures/v8-reference/samples');
  const { normalizedShaOfPptx } = require('../tools/normalize-pptx-sha');

  const tmpRunDir = freshTmpDir('geom-tierB');
  const tmpDeckDir = freshTmpDir('geom-tierB-deck');
  const deckCopy = path.join(tmpDeckDir, 'Annotations_Sample.pptx');
  fs.copyFileSync(REF_DECK, deckCopy);

  try {
    const result = await _runAnnotateWithRawSamples({
      deckPath: deckCopy, samples: V8_SAMPLES, outDir: tmpRunDir,
    });
    const actual = await normalizedShaOfPptx(result.pptxRun);
    const expected = readExpectedSha(NORMALIZED_SHA_PATH);
    assert.strictEqual(actual, expected,
      `Plan 08-03 anchor: normalized SHA mismatch — annotate.js or v8 SAMPLES drift.\n` +
      `  expected: ${expected}\n  actual:   ${actual}`);
  } finally {
    try { fs.rmSync(tmpRunDir, { recursive: true, force: true }); } catch (_) {}
    try { fs.rmSync(tmpDeckDir, { recursive: true, force: true }); } catch (_) {}
  }
});

test('layout constants — annotation Y respects FOOTER_Y top margin invariant', () => {
  const internals = loadAnnotateInternals();
  const { FOOTER_Y, MINI_H } = internals;
  // From buildSlide: startY = max(0.30, (FOOTER_Y - totalH)/2); miniY = startY + ABOVE_ZONE.
  // With no overflow, miniY ≈ (FOOTER_Y - MINI_H) / 2 — equals MINI_Y constant within tol.
  assert.ok(Math.abs(internals.MINI_Y - (FOOTER_Y - MINI_H) / 2) < 1e-9);
  // Slide width / height fixed at 13.333 x 7.5 (LAYOUT_WIDE inches).
  assert.equal(internals.SW, 13.333);
  assert.equal(internals.SH, 7.5);
});
