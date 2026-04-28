'use strict';
// content-review-runtime.test.js — Integration tests for skills/content-review/scripts/index.js
// (runContentReview) and cli.js. Mirrors tests/review-runtime.test.js pattern (Phase 3) but for
// /instadecks:content-review (Phase 6). Covers CRV-09 (sibling + run-dir mirror outputs),
// CRV-11 (lazy-annotate gate is exercised separately in content-review-lazy-annotate.test.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  runContentReview,
  generateRunId,
  resolveSiblingOutputs,
  _test_setRunAnnotate,
} = require('../skills/content-review/scripts');

const REPO_ROOT = path.join(__dirname, '..');
const CLI = path.join(REPO_ROOT, 'skills', 'content-review', 'scripts', 'cli.js');

function freshTmpDir(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }

function makeContentFindingsDoc(overrides = {}) {
  return {
    schema_version: '1.1',
    deck: 'demo.pptx',
    generated_at: '2026-04-28T00:00:00Z',
    slides: [
      {
        slideNum: 2,
        title: 'Revenue grew 40% in Q3',
        findings: [
          {
            severity_reviewer: 'Major',
            category: 'content',
            check_id: 'claim-evidence',
            genuine: true,
            nx: 0.5,
            ny: 0.5,
            text: 'Major | content — slide 2 — Claim "40% growth" lacks source citation — Heath, Made to Stick 2007 — Add source line',
            rationale: 'No data source on slide.',
            location: 'slide 2 body',
            standard: 'Claim-evidence balance (Heath, Made to Stick 2007)',
            fix: 'Add source line citing the Q3 financials',
          },
        ],
      },
      {
        slideNum: 3,
        title: 'Q3 Revenue',
        findings: [
          {
            severity_reviewer: 'Minor',
            category: 'content',
            check_id: 'jargon',
            genuine: true,
            nx: 0.5,
            ny: 0.5,
            text: 'Minor | content — slide 3 bullet — Acronym density (>5) impedes audience-fit — audience-fit (Knaflic 2015) — Spell out acronyms',
            rationale: '7 acronyms in one bullet.',
            location: 'slide 3 bullet',
            standard: 'audience-fit (Knaflic 2015)',
            fix: 'Spell out acronyms on first use',
          },
        ],
      },
    ],
    ...overrides,
  };
}

test('content-review-runtime', async (t) => {
  await t.test('input validation — missing deckPath', async () => {
    await assert.rejects(runContentReview({ findings: makeContentFindingsDoc() }),
      /runContentReview: deckPath required/);
  });

  await t.test('input validation — missing findings', async () => {
    await assert.rejects(runContentReview({ deckPath: '/x.pptx' }),
      /runContentReview: findings required/);
  });

  await t.test('generateRunId format', () => {
    assert.match(generateRunId(), /^\d{8}-\d{6}-[0-9a-f]{6}$/);
  });

  await t.test('resolveSiblingOutputs', () => {
    assert.deepEqual(resolveSiblingOutputs('/x/y/foo.pptx'), {
      jsonPath: '/x/y/foo.content-review.json',
      mdPath: '/x/y/foo.content-review.md',
      narrativePath: '/x/y/foo.content-review.narrative.md',
    });
  });

  await t.test('validator throw propagates verbatim — missing check_id on content finding', async () => {
    const tmpDeck = freshTmpDir('crv-validate-deck');
    const outDir = freshTmpDir('crv-validate-out');
    try {
      const deckPath = path.join(tmpDeck, 'foo.pptx');
      fs.writeFileSync(deckPath, '');
      const bad = makeContentFindingsDoc();
      delete bad.slides[0].findings[0].check_id;
      await assert.rejects(
        runContentReview({ deckPath, findings: bad, outDir, mode: 'structured-handoff' }),
        /check_id: required for category="content"/,
      );
    } finally {
      fs.rmSync(tmpDeck, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  await t.test('writes JSON + MD sibling-of-input + run-dir mirror (CRV-09)', async () => {
    const tmpDeck = freshTmpDir('crv-write-deck');
    const outDir = freshTmpDir('crv-write-out');
    try {
      const deckPath = path.join(tmpDeck, 'mydeck.pptx');
      fs.writeFileSync(deckPath, '');
      const findings = makeContentFindingsDoc();
      const r = await runContentReview({ deckPath, findings, outDir, mode: 'structured-handoff' });
      assert.equal(r.jsonPath, path.join(tmpDeck, 'mydeck.content-review.json'));
      assert.equal(r.mdPath, path.join(tmpDeck, 'mydeck.content-review.md'));
      assert.equal(r.narrativePath, path.join(tmpDeck, 'mydeck.content-review.narrative.md'));
      assert.ok(fs.statSync(r.jsonPath).size > 0, 'sibling JSON exists');
      assert.ok(fs.statSync(r.mdPath).size > 0, 'sibling MD exists');
      // narrativePath is RETURNED but NOT written by runContentReview (agent authors post-call)
      assert.ok(!fs.existsSync(r.narrativePath),
        'narrativePath must not be written by runContentReview');
      // Run-dir mirrors
      assert.ok(fs.existsSync(path.join(outDir, 'mydeck.content-review.json')));
      assert.ok(fs.existsSync(path.join(outDir, 'mydeck.content-review.md')));
      // Round-trip
      const round = JSON.parse(fs.readFileSync(r.jsonPath, 'utf8'));
      assert.equal(round.schema_version, '1.1');
      assert.equal(round.slides.length, 2);
    } finally {
      fs.rmSync(tmpDeck, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  await t.test('returns rich object with findingCounts + genuineCount + annotated:null', async () => {
    const tmpDeck = freshTmpDir('crv-rich-deck');
    const outDir = freshTmpDir('crv-rich-out');
    try {
      const deckPath = path.join(tmpDeck, 'foo.pptx');
      fs.writeFileSync(deckPath, '');
      const r = await runContentReview({
        deckPath,
        findings: makeContentFindingsDoc(),
        outDir,
        mode: 'structured-handoff',
      });
      assert.deepEqual(r.findingCounts, { critical: 0, major: 1, minor: 1, nitpick: 0 });
      assert.equal(r.genuineCount, 2);
      assert.equal(r.runDir, outDir);
      assert.match(r.runId, /^\d{8}-\d{6}-[0-9a-f]{6}$/);
      assert.equal(r.annotated, null);
    } finally {
      fs.rmSync(tmpDeck, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  await t.test('annotate=true wires through to runAnnotate (CRV-11; mocked)', async (t) => {
    const tmpDeck = freshTmpDir('crv-ann-deck');
    const outDir = freshTmpDir('crv-ann-out');
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
    const findings = makeContentFindingsDoc();
    const r = await runContentReview({
      deckPath, findings, outDir, mode: 'structured-handoff', annotate: true,
    });
    assert.ok(called, 'runAnnotate override invoked');
    assert.equal(called.deckPath, deckPath);
    assert.equal(called.findings, findings);
    assert.ok(r.annotated);
    assert.equal(r.annotatedPptx, '/tmp/fake.annotated.pptx');
    assert.equal(r.annotatedPdf, '/tmp/fake.annotated.pdf');
  });

  await t.test('CLI happy path', async () => {
    const tmpDeck = freshTmpDir('crv-cli-deck');
    const outDir = freshTmpDir('crv-cli-out');
    const findingsPath = path.join(tmpDeck, 'findings.json');
    try {
      const deckPath = path.join(tmpDeck, 'foo.pptx');
      fs.writeFileSync(deckPath, '');
      fs.writeFileSync(findingsPath, JSON.stringify(makeContentFindingsDoc()));
      const res = spawnSync(process.execPath,
        [CLI, deckPath, '--findings', findingsPath, '--out-dir', outDir],
        { encoding: 'utf8', timeout: 30_000 });
      assert.equal(res.status, 0, `cli failed: ${res.stderr}`);
      const out = JSON.parse(res.stdout);
      assert.ok(out.jsonPath && out.jsonPath.endsWith('foo.content-review.json'));
      assert.ok(out.mdPath && out.mdPath.endsWith('foo.content-review.md'));
      assert.ok(out.narrativePath && out.narrativePath.endsWith('foo.content-review.narrative.md'));
      assert.ok(fs.existsSync(out.jsonPath));
      assert.ok(fs.existsSync(out.mdPath));
    } finally {
      fs.rmSync(tmpDeck, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  await t.test('CLI: missing deckPath exits 1', () => {
    const res = spawnSync(process.execPath, [CLI], { encoding: 'utf8' });
    assert.equal(res.status, 1);
    assert.match(res.stderr, /Usage:/);
  });

  await t.test('CLI: missing --findings exits 2', () => {
    const res = spawnSync(process.execPath, [CLI, '/tmp/foo.pptx'], { encoding: 'utf8' });
    assert.equal(res.status, 2);
    assert.match(res.stderr, /--findings/);
  });
});
