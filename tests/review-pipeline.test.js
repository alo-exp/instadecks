// tests/review-pipeline.test.js — RVW-06 annotate gating + path-stability (P-07).
// Asserts:
//  - annotate=true wires findings + deckPath through to runAnnotate (mocked via _test_setRunAnnotate)
//  - annotate omitted/false does NOT load skills/annotate/scripts (require.cache stays clean)
//  - canonical relative require path resolves (smoke test)

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.join(__dirname, '..');
const SAMPLE_FINDINGS = path.join(REPO_ROOT, 'tests', 'fixtures', 'sample-findings.json');
const REVIEW_INDEX = path.join(REPO_ROOT, 'skills', 'review', 'scripts', 'index.js');

function freshTmpDir(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }

test('review-pipeline', async (t) => {
  await t.test('annotate=true wires through to runAnnotate (RVW-06)', async (t) => {
    const { runReview, _test_setRunAnnotate } = require('../skills/review/scripts/index');
    const tmpDeck = freshTmpDir('rvw-pipe-deck');
    const outDir = freshTmpDir('rvw-pipe-out');
    let called = null;
    _test_setRunAnnotate(async (args) => {
      called = args;
      return {
        pptxPath: '/tmp/fake.annotated.pptx',
        pdfPath: '/tmp/fake.annotated.pdf',
        runDir: args.outDir,
        runId: args.runId,
      };
    });
    t.after(() => {
      _test_setRunAnnotate(null);
      fs.rmSync(tmpDeck, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    });
    const deckPath = path.join(tmpDeck, 'foo.pptx');
    fs.writeFileSync(deckPath, '');
    const findings = JSON.parse(fs.readFileSync(SAMPLE_FINDINGS, 'utf8'));
    const r = await runReview({ deckPath, findings, outDir, mode: 'structured-handoff', annotate: true });
    assert.ok(called, 'runAnnotate override invoked');
    assert.equal(called.deckPath, deckPath);
    assert.equal(called.findings, findings);
    assert.equal(called.outDir, outDir);
    assert.equal(r.annotatedPptx, '/tmp/fake.annotated.pptx');
    assert.equal(r.annotatedPdf, '/tmp/fake.annotated.pdf');
  });

  await t.test('annotate omitted does NOT load runAnnotate module (P-07)', () => {
    // Subprocess: load runReview, run with annotate=false, then check require.cache for any
    // key matching annotate/scripts. If none, lazy-require gate is intact.
    const tmpDeck = fs.mkdtempSync(path.join(os.tmpdir(), 'rvw-p07-deck-'));
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rvw-p07-out-'));
    const deckPath = path.join(tmpDeck, 'foo.pptx');
    fs.writeFileSync(deckPath, '');
    try {
      const script = `
        (async () => {
          const path = require('node:path');
          const { runReview } = require(${JSON.stringify(REVIEW_INDEX)});
          const findings = JSON.parse(require('node:fs').readFileSync(${JSON.stringify(SAMPLE_FINDINGS)}, 'utf8'));
          await runReview({
            deckPath: ${JSON.stringify(deckPath)},
            findings,
            outDir: ${JSON.stringify(outDir)},
            mode: 'structured-handoff',
            annotate: false,
          });
          const annotateLoaded = Object.keys(require.cache).some(k => /skills\\/annotate\\/scripts\\/index\\.js$/.test(k) || /skills\\/annotate\\/scripts\\/annotate\\.js$/.test(k));
          process.stdout.write(JSON.stringify({ annotateLoaded }));
        })().catch(e => { process.stderr.write(e.stack || e.message); process.exit(1); });
      `;
      const res = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8', timeout: 15_000 });
      assert.equal(res.status, 0, `subprocess failed: ${res.stderr}`);
      const out = JSON.parse(res.stdout);
      assert.equal(out.annotateLoaded, false, 'P-07: runAnnotate must NOT be loaded when annotate=false');
    } finally {
      fs.rmSync(tmpDeck, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  await t.test('runAnnotate import resolves from canonical relative path', () => {
    // Smoke test: simply require the canonical relative path the lazy-require uses.
    // If this resolves, runReview's `require('../../annotate/scripts')` is correct.
    const reviewDir = path.dirname(REVIEW_INDEX);
    const canonicalRelative = path.resolve(reviewDir, '..', '..', 'annotate', 'scripts');
    const mod = require(canonicalRelative);
    assert.equal(typeof mod.runAnnotate, 'function');
  });
});
