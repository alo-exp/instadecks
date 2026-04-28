'use strict';
// Plan 8-02 Task 3 — runReview branch coverage.
// Covers: structured-handoff vs standalone modes, schema v1.0 vs v1.1 routing,
// slidesToReview filtering (Phase 5 D-03), invalid slidesToReview shapes,
// annotate=true wires through DI stub (no real soffice), annotate-stub-failure
// path, render-fixed pure path. All via DI stubs; no soffice, no fs beyond tmpdir.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { runReview, _test_setRunAnnotate, _test_setLlm, _test_setRenderImages } =
  require('../skills/review/scripts/index');

const REPO_ROOT = path.join(__dirname, '..');
const SAMPLE_FINDINGS = path.join(REPO_ROOT, 'tests', 'fixtures', 'sample-findings.json');
const V11_FINDINGS = path.join(REPO_ROOT, 'tests', 'fixtures', 'cross-domain-design-findings.json');

function freshTmpDir(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }
function loadV10() { return JSON.parse(fs.readFileSync(SAMPLE_FINDINGS, 'utf8')); }
function loadV11() { return JSON.parse(fs.readFileSync(V11_FINDINGS, 'utf8')); }

test('runReview: DI hooks are exported and callable (Plan 8-02 BLOCKER B-3)', () => {
  assert.equal(typeof _test_setLlm, 'function');
  assert.equal(typeof _test_setRenderImages, 'function');
  // Setting+clearing must not throw.
  _test_setLlm(() => {});
  _test_setLlm(null);
  _test_setRenderImages(() => {});
  _test_setRenderImages(null);
});

test('runReview: schema v1.0 routing (default sample fixture)', async (t) => {
  const tmpDeck = freshTmpDir('rvw-v10');
  const outDir = freshTmpDir('rvw-v10-out');
  t.after(() => {
    fs.rmSync(tmpDeck, { recursive: true, force: true });
    fs.rmSync(outDir, { recursive: true, force: true });
  });
  const deckPath = path.join(tmpDeck, 'foo.pptx');
  fs.writeFileSync(deckPath, '');
  const findings = loadV10();
  assert.equal(findings.schema_version, '1.0');
  const r = await runReview({ deckPath, findings, outDir, mode: 'structured-handoff' });
  const round = JSON.parse(fs.readFileSync(r.jsonPath, 'utf8'));
  assert.equal(round.schema_version, '1.0');
});

test('runReview: schema v1.1 routing (cross-domain fixture)', async (t) => {
  const tmpDeck = freshTmpDir('rvw-v11');
  const outDir = freshTmpDir('rvw-v11-out');
  t.after(() => {
    fs.rmSync(tmpDeck, { recursive: true, force: true });
    fs.rmSync(outDir, { recursive: true, force: true });
  });
  const deckPath = path.join(tmpDeck, 'foo.pptx');
  fs.writeFileSync(deckPath, '');
  const findings = loadV11();
  assert.equal(findings.schema_version, '1.1');
  const r = await runReview({ deckPath, findings, outDir, mode: 'structured-handoff' });
  const round = JSON.parse(fs.readFileSync(r.jsonPath, 'utf8'));
  assert.equal(round.schema_version, '1.1');
});

test('runReview: slidesToReview="all" passes through unchanged', async (t) => {
  const tmpDeck = freshTmpDir('rvw-all');
  const outDir = freshTmpDir('rvw-all-out');
  t.after(() => {
    fs.rmSync(tmpDeck, { recursive: true, force: true });
    fs.rmSync(outDir, { recursive: true, force: true });
  });
  const deckPath = path.join(tmpDeck, 'foo.pptx');
  fs.writeFileSync(deckPath, '');
  const findings = loadV10();
  const r = await runReview({
    deckPath, findings, outDir, mode: 'structured-handoff', slidesToReview: 'all',
  });
  const round = JSON.parse(fs.readFileSync(r.jsonPath, 'utf8'));
  assert.equal(round.slides.length, findings.slides.length);
});

test('runReview: slidesToReview=[7] filters out slides 8 and 9', async (t) => {
  const tmpDeck = freshTmpDir('rvw-filter');
  const outDir = freshTmpDir('rvw-filter-out');
  t.after(() => {
    fs.rmSync(tmpDeck, { recursive: true, force: true });
    fs.rmSync(outDir, { recursive: true, force: true });
  });
  const deckPath = path.join(tmpDeck, 'foo.pptx');
  fs.writeFileSync(deckPath, '');
  const findings = loadV10();
  const r = await runReview({
    deckPath, findings, outDir, mode: 'structured-handoff', slidesToReview: [7],
  });
  const round = JSON.parse(fs.readFileSync(r.jsonPath, 'utf8'));
  assert.equal(round.slides.length, 1);
  assert.equal(round.slides[0].slideNum, 7);
});

test('runReview: slidesToReview must be null|"all"|int[] (rejects bad shape)', async () => {
  await assert.rejects(
    runReview({ deckPath: '/x.pptx', findings: loadV10(), slidesToReview: 'banana' }),
    /slidesToReview must be/,
  );
});

test('runReview: slidesToReview entries must be positive integers', async () => {
  await assert.rejects(
    runReview({ deckPath: '/x.pptx', findings: loadV10(), slidesToReview: [0] }),
    /positive integers/,
  );
  await assert.rejects(
    runReview({ deckPath: '/x.pptx', findings: loadV10(), slidesToReview: [1.5] }),
    /positive integers/,
  );
});

test('runReview: annotate=true wires through to DI stub (no soffice)', async (t) => {
  const tmpDeck = freshTmpDir('rvw-ann');
  const outDir = freshTmpDir('rvw-ann-out');
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
  const r = await runReview({
    deckPath, findings: loadV10(), outDir, mode: 'structured-handoff', annotate: true,
  });
  assert.ok(called, 'DI stub invoked');
  assert.equal(r.annotatedPptx, '/tmp/fake.annotated.pptx');
  assert.equal(r.annotatedPdf, '/tmp/fake.annotated.pdf');
});

test('runReview: annotate stub failure surfaces (soffice-failure proxy)', async (t) => {
  const tmpDeck = freshTmpDir('rvw-annfail');
  const outDir = freshTmpDir('rvw-annfail-out');
  _test_setRunAnnotate(async () => { throw new Error('soffice ENOENT'); });
  t.after(() => {
    _test_setRunAnnotate(null);
    fs.rmSync(tmpDeck, { recursive: true, force: true });
    fs.rmSync(outDir, { recursive: true, force: true });
  });
  const deckPath = path.join(tmpDeck, 'foo.pptx');
  fs.writeFileSync(deckPath, '');
  await assert.rejects(
    runReview({
      deckPath, findings: loadV10(), outDir, mode: 'structured-handoff', annotate: true,
    }),
    /soffice ENOENT/,
  );
});
