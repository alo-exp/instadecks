'use strict';
// Plan 8-02 Task 3 — runContentReview branch coverage.
// Covers: schema v1.0 vs v1.1 routing, lazy-annotate gate (off vs on),
// annotate stub wired through DI, output stem `<deck>.content-review.{json,md}`,
// stdout suppression in structured-handoff mode, error paths.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  runContentReview, _test_setRunAnnotate, _test_setLlm, _test_setRenderImages,
} = require('../skills/content-review/scripts/index');

const REPO_ROOT = path.join(__dirname, '..');
const V10_FINDINGS = path.join(REPO_ROOT, 'tests', 'fixtures', 'sample-findings.json');
const V11_FINDINGS = path.join(REPO_ROOT, 'tests', 'fixtures', 'cross-domain-content-findings.json');

function freshTmpDir(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }
function loadV10() { return JSON.parse(fs.readFileSync(V10_FINDINGS, 'utf8')); }
function loadV11() { return JSON.parse(fs.readFileSync(V11_FINDINGS, 'utf8')); }

test('runContentReview: DI hooks exported (BLOCKER B-3)', () => {
  assert.equal(typeof _test_setLlm, 'function');
  assert.equal(typeof _test_setRenderImages, 'function');
  _test_setLlm(null);
  _test_setRenderImages(null);
});

test('runContentReview: missing deckPath rejects', async () => {
  await assert.rejects(runContentReview({ findings: loadV10() }), /deckPath required/);
});

test('runContentReview: missing findings rejects', async () => {
  await assert.rejects(runContentReview({ deckPath: '/x.pptx' }), /findings required/);
});

test('runContentReview: invalid mode rejects', async () => {
  await assert.rejects(
    runContentReview({ deckPath: '/x.pptx', findings: loadV10(), mode: 'banana' }),
    /mode must be/,
  );
});

test('runContentReview: schema v1.1 routing — produces .content-review.json sibling', async (t) => {
  const tmpDeck = freshTmpDir('crv-v11');
  const outDir = freshTmpDir('crv-v11-out');
  t.after(() => {
    fs.rmSync(tmpDeck, { recursive: true, force: true });
    fs.rmSync(outDir, { recursive: true, force: true });
  });
  const deckPath = path.join(tmpDeck, 'mydeck.pptx');
  fs.writeFileSync(deckPath, '');
  const findings = loadV11();
  assert.equal(findings.schema_version, '1.1');
  const r = await runContentReview({ deckPath, findings, outDir, mode: 'structured-handoff' });
  assert.equal(r.jsonPath, path.join(tmpDeck, 'mydeck.content-review.json'));
  assert.equal(r.mdPath, path.join(tmpDeck, 'mydeck.content-review.md'));
  assert.ok(fs.existsSync(r.jsonPath));
  assert.ok(fs.existsSync(r.mdPath));
  // Run-dir mirror exists.
  assert.ok(fs.existsSync(path.join(outDir, 'mydeck.content-review.json')));
});

test('runContentReview: schema v1.0 also accepted (validator routes both)', async (t) => {
  const tmpDeck = freshTmpDir('crv-v10');
  const outDir = freshTmpDir('crv-v10-out');
  t.after(() => {
    fs.rmSync(tmpDeck, { recursive: true, force: true });
    fs.rmSync(outDir, { recursive: true, force: true });
  });
  const deckPath = path.join(tmpDeck, 'foo.pptx');
  fs.writeFileSync(deckPath, '');
  const r = await runContentReview({
    deckPath, findings: loadV10(), outDir, mode: 'structured-handoff',
  });
  const round = JSON.parse(fs.readFileSync(r.jsonPath, 'utf8'));
  assert.equal(round.schema_version, '1.0');
});

test('runContentReview: lazy-annotate gate OFF — annotate=false does not invoke stub', async (t) => {
  const tmpDeck = freshTmpDir('crv-laz-off');
  const outDir = freshTmpDir('crv-laz-off-out');
  let invoked = false;
  _test_setRunAnnotate(async () => { invoked = true; return { pptxPath: 'x', pdfPath: 'y' }; });
  t.after(() => {
    _test_setRunAnnotate(null);
    fs.rmSync(tmpDeck, { recursive: true, force: true });
    fs.rmSync(outDir, { recursive: true, force: true });
  });
  const deckPath = path.join(tmpDeck, 'foo.pptx');
  fs.writeFileSync(deckPath, '');
  const r = await runContentReview({
    deckPath, findings: loadV11(), outDir, mode: 'structured-handoff', annotate: false,
  });
  assert.equal(invoked, false, 'lazy-annotate gate: stub must not run when annotate=false');
  assert.equal(r.annotated, null);
});

test('runContentReview: lazy-annotate gate ON — annotate=true wires through DI', async (t) => {
  const tmpDeck = freshTmpDir('crv-laz-on');
  const outDir = freshTmpDir('crv-laz-on-out');
  let called = null;
  _test_setRunAnnotate(async (args) => {
    called = args;
    return { pptxPath: '/tmp/fake.annotated.pptx', pdfPath: '/tmp/fake.annotated.pdf' };
  });
  t.after(() => {
    _test_setRunAnnotate(null);
    fs.rmSync(tmpDeck, { recursive: true, force: true });
    fs.rmSync(outDir, { recursive: true, force: true });
  });
  const deckPath = path.join(tmpDeck, 'foo.pptx');
  fs.writeFileSync(deckPath, '');
  const r = await runContentReview({
    deckPath, findings: loadV11(), outDir, mode: 'structured-handoff', annotate: true,
  });
  assert.ok(called, 'DI stub invoked');
  assert.equal(r.annotatedPptx, '/tmp/fake.annotated.pptx');
});

test('runContentReview: structured-handoff suppresses stdout', async (t) => {
  const tmpDeck = freshTmpDir('crv-sh');
  const outDir = freshTmpDir('crv-sh-out');
  t.after(() => {
    fs.rmSync(tmpDeck, { recursive: true, force: true });
    fs.rmSync(outDir, { recursive: true, force: true });
  });
  const deckPath = path.join(tmpDeck, 'foo.pptx');
  fs.writeFileSync(deckPath, '');
  const orig = process.stdout.write.bind(process.stdout);
  let captured = '';
  process.stdout.write = (chunk, ...rest) => {
    captured += typeof chunk === 'string' ? chunk : chunk.toString();
    return orig(chunk, ...rest);
  };
  try {
    await runContentReview({
      deckPath, findings: loadV11(), outDir, mode: 'structured-handoff',
    });
  } finally {
    process.stdout.write = orig;
  }
  assert.doesNotMatch(captured, /jsonPath/);
});
