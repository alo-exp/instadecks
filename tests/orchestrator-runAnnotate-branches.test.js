'use strict';
// Plan 8-02 Task 3 — runAnnotate branch coverage.
// Covers: input validation (missing deckPath / missing findings), adapter routing
// (schema 1.0 + 1.1 both go through adaptFindings), severity-collapse spot-check via
// the adapter (4-tier → 3-tier MAJOR/MINOR/POLISH happens here per CLAUDE.md), empty
// genuine-findings produces empty samples (effective short-circuit at the adapter),
// resolveSiblingOutputs strips trailing .annotated (P-05). All without spawning soffice.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  runAnnotate, generateRunId, resolveSiblingOutputs,
  _test_setLlm, _test_setRenderImages,
} = require('../skills/annotate/scripts/index');
const { adaptFindings, SEV_MAP } = require('../skills/annotate/scripts/adapter');

const REPO_ROOT = path.join(__dirname, '..');
const SAMPLE_FINDINGS = path.join(REPO_ROOT, 'tests', 'fixtures', 'sample-findings.json');
const V11_FINDINGS = path.join(REPO_ROOT, 'tests', 'fixtures', 'cross-domain-design-findings.json');

function freshTmpDir(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }

test('runAnnotate: DI hooks exported (BLOCKER B-3)', () => {
  assert.equal(typeof _test_setLlm, 'function');
  assert.equal(typeof _test_setRenderImages, 'function');
  _test_setLlm(null);
  _test_setRenderImages(null);
});

test('runAnnotate: missing deckPath rejects', async () => {
  await assert.rejects(runAnnotate({ findings: {} }), /deckPath required/);
});

test('runAnnotate: missing findings rejects', async () => {
  await assert.rejects(runAnnotate({ deckPath: '/x.pptx' }), /findings required/);
});

test('runAnnotate: generateRunId format (timestamp + 6-hex)', () => {
  assert.match(generateRunId(), /^\d{8}-\d{6}-[0-9a-f]{6}$/);
});

test('runAnnotate: resolveSiblingOutputs strips trailing .annotated (P-05)', () => {
  assert.deepEqual(resolveSiblingOutputs('/x/foo.pptx'),
    { pptxPath: '/x/foo.annotated.pptx', pdfPath: '/x/foo.annotated.pdf' });
  assert.deepEqual(resolveSiblingOutputs('/x/foo.annotated.pptx'),
    { pptxPath: '/x/foo.annotated.pptx', pdfPath: '/x/foo.annotated.pdf' });
});

test('runAnnotate: adapter severity collapse 4→3 (CLAUDE.md invariant)', () => {
  // Spot-check the SEV_MAP collapse table runAnnotate consumes.
  assert.equal(SEV_MAP.Critical, 'major');
  assert.equal(SEV_MAP.Major, 'major');
  assert.equal(SEV_MAP.Minor, 'minor');
  assert.equal(SEV_MAP.Nitpick, 'polish');
});

test('runAnnotate: adapter accepts schema v1.0 (sample-findings)', () => {
  const findings = JSON.parse(fs.readFileSync(SAMPLE_FINDINGS, 'utf8'));
  const samples = adaptFindings(findings);
  assert.ok(Array.isArray(samples));
  assert.ok(samples.length > 0);
  // Severity-collapse spot-check on first emitted annotation.
  for (const s of samples) {
    for (const a of s.annotations) {
      assert.ok(['major', 'minor', 'polish'].includes(a.sev), `unexpected sev ${a.sev}`);
    }
  }
});

test('runAnnotate: adapter accepts schema v1.1 (content category)', () => {
  const findings = JSON.parse(fs.readFileSync(V11_FINDINGS, 'utf8'));
  const samples = adaptFindings(findings);
  assert.ok(Array.isArray(samples));
});

test('runAnnotate: adapter rejects non-1.x schema_version', () => {
  assert.throws(
    () => adaptFindings({ schema_version: '2.0', slides: [] }),
    /Unsupported findings schema version/,
  );
});

test('runAnnotate: empty findings → empty samples (effective short-circuit)', () => {
  // No genuine findings → adapter emits zero samples; runAnnotate would have nothing
  // to render but the upstream orchestrators gate on findings.length before invoking
  // (see review/index.js + content-review/index.js annotate=true branch). Adapter
  // contract: only `genuine === true` survives.
  const empty = { schema_version: '1.0', slides: [] };
  assert.deepEqual(adaptFindings(empty), []);

  const allFalseGenuine = {
    schema_version: '1.0',
    slides: [{
      slideNum: 1,
      title: 'X',
      findings: [{
        severity_reviewer: 'Major',
        category: 'defect',
        genuine: false,
        nx: 0.5, ny: 0.5,
        text: 'x', rationale: 'x', location: 'x', standard: 'x', fix: 'x',
      }],
    }],
  };
  assert.deepEqual(adaptFindings(allFalseGenuine), []);
});

test('runAnnotate: adapter rejects findings missing required field (fail-loud P-09)', () => {
  const bad = {
    schema_version: '1.0',
    slides: [{
      slideNum: 1, title: 'X',
      findings: [{ severity_reviewer: 'Major' }], // missing the rest
    }],
  };
  assert.throws(() => adaptFindings(bad), /missing required field/);
});

test('runAnnotate: standalone vs pipelined signature — runAnnotate is a function', () => {
  // Both standalone (CLI) and pipelined (in-memory from /review or /content-review)
  // call the exact same runAnnotate(deckPath, findings, outDir, runId) signature —
  // there is no `mode` parameter on runAnnotate. Signature-level assertion only;
  // soffice invocation is exercised by tests/annotate-runtime.test.js (skipped when
  // soffice is absent) and Plan 8-03's annotate.js geometry-primitive tests.
  assert.equal(typeof runAnnotate, 'function');
  assert.equal(runAnnotate.length, 0); // single destructured-options arg
});
