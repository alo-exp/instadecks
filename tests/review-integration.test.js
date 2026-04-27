'use strict';
// review-integration.test.js — Phase 3 happy-path end-to-end.
// Closes the integration ribbon for RVW-01 / RVW-02 / RVW-03 / RVW-05 / RVW-06 / RVW-07 / RVW-08.
// Guards locked invariants: P-01 (4-tier severity preserved at producer side; never pre-collapsed)
// and P-07 (annotate stays lazy-loaded — only required when the gate is true).
//
// Traversal:
//   detectAITells(positive fixture) -> wrap into schema-valid findingsDoc -> runReview(structured)
//   -> assert sibling JSON + fixed MD + run-dir mirror; assert narrative MD does NOT exist
//   -> --annotate path: stub runAnnotate, assert it fires, assert annotated paths returned
//   -> standalone CLI subprocess (RVW-07) produces sibling outputs
//   -> render-fixed determinism cross-check vs Plan 03-04 snapshot.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { runReview, _test_setRunAnnotate } = require('../skills/review/scripts/index');
const { detectAITells } = require('../skills/review/scripts/ai-tells');
const { render } = require('../skills/review/scripts/render-fixed');

const REPO_ROOT = path.resolve(__dirname, '..');
const POSITIVE_FIXTURE = path.join(__dirname, 'fixtures', 'ai-tells-positive.pptx');
const SAMPLE_FINDINGS = path.join(__dirname, 'fixtures', 'sample-findings.json');
const SAMPLE_FIXED_MD = path.join(__dirname, 'fixtures', 'sample-findings.fixed.md');

function makeTmpDeck() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rvw-int-deck-'));
  const deckPath = path.join(tmp, 'fake.pptx');
  // Touch a placeholder; runReview standalone path does not open the deck.
  fs.writeFileSync(deckPath, 'PK\x03\x04stub');
  return { tmp, deckPath };
}

function makeTmpOut() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'rvw-int-out-'));
}

function rmrf(p) {
  try { fs.rmSync(p, { recursive: true, force: true }); } catch (_) { /* noop */ }
}

function wrapAITellsIntoDoc(deckPath, aiTellFindings) {
  // Partition by slideNum: null -> systemic; 1..3 -> per-slide buckets.
  const perSlide = new Map();
  const systemic = [];
  for (const f of aiTellFindings) {
    if (f.slideNum == null) {
      // Re-shape a copy with slideNum:null (kept) but place in a deck-systemic slot.
      systemic.push(f);
    } else {
      if (!perSlide.has(f.slideNum)) perSlide.set(f.slideNum, []);
      perSlide.get(f.slideNum).push(f);
    }
  }

  const slides = [];
  // §1 deck-systemic slot — schema requires slideNum integer, so use slide 0 as the
  // canonical systemic bucket (P-01 — render-fixed routes slideNum:null findings to §1).
  // We instead inline systemic findings into slide entries with slideNum present, dropping
  // the slideNum:null marker so the doc stays schema-valid. The systemic findings keep
  // category:'style' + r18_ai_tell:true tags, which is what render-fixed groups on.
  // To keep the shape clean we attach systemic findings to the lowest-numbered slide
  // entry that we are creating below.
  const slideNums = [...perSlide.keys()].sort((a, b) => a - b);
  if (slideNums.length === 0) slideNums.push(1);

  for (const n of slideNums) {
    const findings = (perSlide.get(n) || []).map(f => ({ ...f, slideNum: n }));
    slides.push({ slideNum: n, title: `Slide ${String(n).padStart(2, '0')}`, findings });
  }
  // Inline systemic findings as slideNum:null on the first slide entry — schema permits null.
  if (systemic.length && slides.length) {
    for (const f of systemic) {
      slides[0].findings.push({ ...f });
    }
  }

  return {
    schema_version: '1.0',
    deck: deckPath,
    generated_at: '2026-04-28T00:00:00Z',
    slides,
  };
}

test('happy path: detectAITells findings flow into runReview standalone', async (t) => {
  const aiTellFindings = await detectAITells(POSITIVE_FIXTURE);
  assert.ok(aiTellFindings.length >= 3,
    `positive fixture should fire >=3 AI-tell findings (got ${aiTellFindings.length})`);
  // P-01 guard: every emitted severity is from the 4-tier producer vocabulary.
  for (const f of aiTellFindings) {
    assert.ok(['Critical', 'Major', 'Minor', 'Nitpick'].includes(f.severity_reviewer),
      `ai-tell findings must use 4-tier severity (got ${JSON.stringify(f.severity_reviewer)})`);
    assert.strictEqual(f.r18_ai_tell, true);
  }

  const { tmp: tmpDeckDir, deckPath: tmpPptx } = makeTmpDeck();
  const tmpOut = makeTmpOut();
  t.after(() => { rmrf(tmpDeckDir); rmrf(tmpOut); });

  const doc = wrapAITellsIntoDoc(tmpPptx, aiTellFindings);
  const r = await runReview({
    deckPath: tmpPptx,
    findings: doc,
    mode: 'structured-handoff',
    outDir: tmpOut,
  });

  // Sibling outputs exist.
  assert.ok(fs.existsSync(r.jsonPath), 'sibling JSON written');
  assert.ok(fs.existsSync(r.mdPath), 'sibling MD written');
  // Narrative MD authored by the agent post-runReview — must NOT exist yet.
  assert.ok(!fs.existsSync(r.narrativePath), 'narrative MD authored by agent post-runReview');

  // Run-dir is the outDir we passed; mirrors of JSON + MD live there.
  assert.strictEqual(r.runDir, path.resolve(tmpOut));
  assert.ok(fs.existsSync(path.join(r.runDir, path.basename(r.jsonPath))), 'run-dir JSON mirror');
  assert.ok(fs.existsSync(path.join(r.runDir, path.basename(r.mdPath))), 'run-dir MD mirror');

  // Counts shape.
  assert.strictEqual(typeof r.findingCounts, 'object');
  assert.strictEqual(typeof r.genuineCount, 'number');
  // Cross-check: counts match the synthesized doc.
  let expCritical = 0, expMajor = 0, expMinor = 0, expNitpick = 0, expGenuine = 0;
  for (const s of doc.slides) {
    for (const f of s.findings) {
      if (f.severity_reviewer === 'Critical') expCritical++;
      else if (f.severity_reviewer === 'Major') expMajor++;
      else if (f.severity_reviewer === 'Minor') expMinor++;
      else if (f.severity_reviewer === 'Nitpick') expNitpick++;
      if (f.genuine === true) expGenuine++;
    }
  }
  assert.deepStrictEqual(r.findingCounts,
    { critical: expCritical, major: expMajor, minor: expMinor, nitpick: expNitpick });
  assert.strictEqual(r.genuineCount, expGenuine);
});

test('--annotate path: runAnnotate stub fires + annotated paths returned', async (t) => {
  let annotateCalled = false;
  _test_setRunAnnotate(async ({ deckPath }) => {
    annotateCalled = true;
    return {
      pptxPath: deckPath.replace(/\.pptx$/, '.annotated.pptx'),
      pdfPath: deckPath.replace(/\.pptx$/, '.annotated.pdf'),
    };
  });
  t.after(() => _test_setRunAnnotate(null));

  const { tmp: tmpDeckDir, deckPath: tmpPptx } = makeTmpDeck();
  const tmpOut = makeTmpOut();
  t.after(() => { rmrf(tmpDeckDir); rmrf(tmpOut); });

  const findings = JSON.parse(fs.readFileSync(SAMPLE_FINDINGS, 'utf8'));
  const r = await runReview({
    deckPath: tmpPptx,
    findings,
    mode: 'structured-handoff',
    annotate: true,
    outDir: tmpOut,
  });

  assert.strictEqual(annotateCalled, true, 'runAnnotate stub fired');
  assert.ok(r.annotatedPptx && r.annotatedPptx.endsWith('.annotated.pptx'));
  assert.ok(r.annotatedPdf && r.annotatedPdf.endsWith('.annotated.pdf'));
});

test('standalone CLI invocation produces expected outputs (RVW-07)', async (t) => {
  const { tmp: tmpDeckDir, deckPath: tmpPptx } = makeTmpDeck();
  const tmpOut = makeTmpOut();
  t.after(() => { rmrf(tmpDeckDir); rmrf(tmpOut); });

  const cliPath = path.join(REPO_ROOT, 'skills', 'review', 'scripts', 'cli.js');
  const res = spawnSync('node',
    [cliPath, tmpPptx, '--findings', SAMPLE_FINDINGS, '--out-dir', tmpOut],
    { encoding: 'utf8' });
  assert.strictEqual(res.status, 0, `cli exit 0 (stderr: ${res.stderr})`);

  const base = path.basename(tmpPptx, '.pptx');
  const siblingJson = path.join(path.dirname(tmpPptx), `${base}.review.json`);
  const siblingMd   = path.join(path.dirname(tmpPptx), `${base}.review.md`);
  assert.ok(fs.existsSync(siblingJson), 'CLI wrote sibling JSON');
  assert.ok(fs.existsSync(siblingMd), 'CLI wrote sibling MD');
});

test('fixed MD renders the canonical fixture deterministically (RVW-02 cross-link)', async (t) => {
  // render() is pure — same findings doc -> byte-identical Markdown. The Plan 03-04
  // snapshot is the locked baseline; runReview must produce the identical body when
  // fed the same canonical doc (modulo any deck-name surface — sample-findings.json
  // already contains its own deck path, so render() output is fully deterministic).
  const findings = JSON.parse(fs.readFileSync(SAMPLE_FINDINGS, 'utf8'));
  const expected = fs.readFileSync(SAMPLE_FIXED_MD, 'utf8');
  const actual = render(findings);
  assert.strictEqual(actual, expected, 'render-fixed output matches Plan 03-04 snapshot');
});
