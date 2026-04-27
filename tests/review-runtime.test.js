// tests/review-runtime.test.js — Integration tests for skills/review/scripts/index.js (runReview) and cli.js.
// Covers RVW-04 (validate findings), RVW-05 (write JSON+MD sibling + run-dir mirror),
// RVW-07 (CLI/standalone mode prints to stdout), RVW-08 (structured-handoff returns rich object silently).

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { runReview, generateRunId, resolveSiblingOutputs } = require('../skills/review/scripts/index');

const REPO_ROOT = path.join(__dirname, '..');
const SAMPLE_FINDINGS = path.join(REPO_ROOT, 'tests', 'fixtures', 'sample-findings.json');
const CLI = path.join(REPO_ROOT, 'skills', 'review', 'scripts', 'cli.js');

function freshTmpDir(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }

function loadCanonical() {
  return JSON.parse(fs.readFileSync(SAMPLE_FINDINGS, 'utf8'));
}

test('review-runtime', async (t) => {
  await t.test('pure: input validation — missing deckPath', async () => {
    await assert.rejects(runReview({ findings: loadCanonical() }), /deckPath required/);
  });

  await t.test('pure: input validation — missing findings', async () => {
    await assert.rejects(runReview({ deckPath: '/x.pptx' }), /findings required/);
  });

  await t.test('pure: invalid mode rejected', async () => {
    await assert.rejects(
      runReview({ deckPath: '/x.pptx', findings: loadCanonical(), mode: 'banana' }),
      /mode must be/,
    );
  });

  await t.test('pure: generateRunId format', () => {
    assert.match(generateRunId(), /^\d{8}-\d{6}-[0-9a-f]{6}$/);
  });

  await t.test('pure: resolveSiblingOutputs', () => {
    assert.deepEqual(resolveSiblingOutputs('/x/y/foo.pptx'), {
      jsonPath: '/x/y/foo.review.json',
      mdPath: '/x/y/foo.review.md',
      narrativePath: '/x/y/foo.review.narrative.md',
    });
  });

  await t.test('runReview validates findings (RVW-04)', async () => {
    const tmpDeck = freshTmpDir('rvw-validate-deck');
    const outDir = freshTmpDir('rvw-validate-out');
    try {
      const deckPath = path.join(tmpDeck, 'foo.pptx');
      fs.writeFileSync(deckPath, ''); // dummy file — runReview doesn't read PPTX bytes when annotate=false
      const mutated = loadCanonical();
      mutated.slides[0].findings[0].severity_reviewer = 'MAJOR'; // 3-tier collapsed — must reject
      await assert.rejects(
        runReview({ deckPath, findings: mutated, outDir, mode: 'structured-handoff' }),
        /severity_reviewer/,
      );
    } finally {
      fs.rmSync(tmpDeck, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  await t.test('runReview writes JSON + MD sibling + run-dir mirror (RVW-05)', async () => {
    const tmpDeck = freshTmpDir('rvw-write-deck');
    const outDir = freshTmpDir('rvw-write-out');
    try {
      const deckPath = path.join(tmpDeck, 'mydeck.pptx');
      fs.writeFileSync(deckPath, '');
      const findings = loadCanonical();
      const r = await runReview({ deckPath, findings, outDir, mode: 'structured-handoff' });
      // Sibling outputs
      assert.equal(r.jsonPath, path.join(tmpDeck, 'mydeck.review.json'));
      assert.equal(r.mdPath, path.join(tmpDeck, 'mydeck.review.md'));
      assert.equal(r.narrativePath, path.join(tmpDeck, 'mydeck.review.narrative.md'));
      assert.ok(fs.statSync(r.jsonPath).size > 0, 'sibling JSON exists');
      assert.ok(fs.statSync(r.mdPath).size > 0, 'sibling MD exists');
      // Run-dir mirrors
      assert.ok(fs.existsSync(path.join(outDir, 'mydeck.review.json')));
      assert.ok(fs.existsSync(path.join(outDir, 'mydeck.review.md')));
      // Round-trip JSON content equals input
      const round = JSON.parse(fs.readFileSync(r.jsonPath, 'utf8'));
      assert.equal(round.schema_version, findings.schema_version);
      assert.equal(round.slides.length, findings.slides.length);
    } finally {
      fs.rmSync(tmpDeck, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  await t.test('standalone mode prints to stdout, structured-handoff does not (RVW-07/08)', async () => {
    const tmpDeck = freshTmpDir('rvw-mode-deck');
    const outDir1 = freshTmpDir('rvw-mode-out1');
    const outDir2 = freshTmpDir('rvw-mode-out2');
    try {
      const deckPath = path.join(tmpDeck, 'foo.pptx');
      fs.writeFileSync(deckPath, '');
      const findings = loadCanonical();

      // Capture stdout for standalone
      const origWrite = process.stdout.write.bind(process.stdout);
      let captured = '';
      process.stdout.write = (chunk, ...rest) => {
        captured += typeof chunk === 'string' ? chunk : chunk.toString();
        return origWrite(chunk, ...rest);
      };
      try {
        await runReview({ deckPath, findings, outDir: outDir1, mode: 'standalone' });
      } finally {
        process.stdout.write = origWrite;
      }
      assert.match(captured, /jsonPath/);

      // Structured-handoff: should NOT print result
      let captured2 = '';
      process.stdout.write = (chunk, ...rest) => {
        captured2 += typeof chunk === 'string' ? chunk : chunk.toString();
        return origWrite(chunk, ...rest);
      };
      let result;
      try {
        result = await runReview({ deckPath, findings, outDir: outDir2, mode: 'structured-handoff' });
      } finally {
        process.stdout.write = origWrite;
      }
      assert.doesNotMatch(captured2, /jsonPath/);
      assert.ok(result.findingCounts);
      assert.equal(typeof result.findingCounts.critical, 'number');
      assert.equal(typeof result.findingCounts.major, 'number');
      assert.equal(typeof result.findingCounts.minor, 'number');
      assert.equal(typeof result.findingCounts.nitpick, 'number');
      assert.equal(typeof result.genuineCount, 'number');
    } finally {
      fs.rmSync(tmpDeck, { recursive: true, force: true });
      fs.rmSync(outDir1, { recursive: true, force: true });
      fs.rmSync(outDir2, { recursive: true, force: true });
    }
  });

  await t.test('structured-handoff returns correct findingCounts (RVW-08)', async () => {
    const tmpDeck = freshTmpDir('rvw-counts-deck');
    const outDir = freshTmpDir('rvw-counts-out');
    try {
      const deckPath = path.join(tmpDeck, 'foo.pptx');
      fs.writeFileSync(deckPath, '');
      const findings = loadCanonical();
      // Hand-counted from sample-findings.json:
      // Slide 7: Critical (genuine), Major (genuine)
      // Slide 8: Minor (genuine), Nitpick (NOT genuine)
      // Slide 9: Major (genuine), Minor (genuine)
      // Totals: Critical=1, Major=2, Minor=2, Nitpick=1; genuine=5
      const r = await runReview({ deckPath, findings, outDir, mode: 'structured-handoff' });
      assert.deepEqual(r.findingCounts, { critical: 1, major: 2, minor: 2, nitpick: 1 });
      assert.equal(r.genuineCount, 5);
      assert.equal(r.runDir, outDir);
      assert.match(r.runId, /^\d{8}-\d{6}-[0-9a-f]{6}$/);
    } finally {
      fs.rmSync(tmpDeck, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  await t.test('CLI happy path (RVW-07)', async () => {
    const tmpDeck = freshTmpDir('rvw-cli-deck');
    const outDir = freshTmpDir('rvw-cli-out');
    try {
      const deckPath = path.join(tmpDeck, 'foo.pptx');
      fs.writeFileSync(deckPath, '');
      const res = spawnSync(process.execPath,
        [CLI, deckPath, '--findings', SAMPLE_FINDINGS, '--out-dir', outDir],
        { encoding: 'utf8', timeout: 30_000 });
      assert.equal(res.status, 0, `cli failed: ${res.stderr}`);
      const out = JSON.parse(res.stdout);
      assert.ok(fs.existsSync(out.jsonPath));
      assert.ok(fs.existsSync(out.mdPath));
      assert.ok(fs.existsSync(path.join(outDir, 'foo.review.json')));
      assert.ok(fs.existsSync(path.join(outDir, 'foo.review.md')));
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
