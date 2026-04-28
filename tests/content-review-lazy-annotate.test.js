'use strict';
// content-review-lazy-annotate.test.js — CRV-11 / P-07 lazy-require gate.
// Asserts requiring skills/content-review/scripts and calling runContentReview with annotate=false
// does NOT load skills/annotate/scripts. Mirrors tests/review-pipeline.test.js P-07 subtest.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.join(__dirname, '..');
const INDEX = path.join(REPO_ROOT, 'skills', 'content-review', 'scripts', 'index.js');

test('content-review-lazy-annotate', async (t) => {
  await t.test('module-load of content-review/scripts does NOT load annotate/scripts', () => {
    // Subprocess: require runContentReview only (no call). require.cache should be clean of annotate.
    const script = `
      require(${JSON.stringify(INDEX)});
      const annotateLoaded = Object.keys(require.cache).some(k =>
        /skills\\/annotate\\/scripts\\/index\\.js$/.test(k) ||
        /skills\\/annotate\\/scripts\\/annotate\\.js$/.test(k));
      process.stdout.write(JSON.stringify({ annotateLoaded }));
    `;
    const res = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8', timeout: 10_000 });
    assert.equal(res.status, 0, `subprocess failed: ${res.stderr}`);
    const out = JSON.parse(res.stdout);
    assert.equal(out.annotateLoaded, false,
      'P-07: requiring content-review must NOT load annotate at module-load time');
  });

  await t.test('runContentReview with annotate=false does NOT load annotate (P-07)', () => {
    const tmpDeck = fs.mkdtempSync(path.join(os.tmpdir(), 'crv-p07-deck-'));
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'crv-p07-out-'));
    const deckPath = path.join(tmpDeck, 'foo.pptx');
    fs.writeFileSync(deckPath, '');
    const findings = {
      schema_version: '1.1',
      deck: 'foo.pptx',
      generated_at: '2026-04-28T00:00:00Z',
      slides: [],
    };
    const findingsPath = path.join(tmpDeck, 'f.json');
    fs.writeFileSync(findingsPath, JSON.stringify(findings));
    try {
      const script = `
        (async () => {
          const fs = require('node:fs');
          const { runContentReview } = require(${JSON.stringify(INDEX)});
          const findings = JSON.parse(fs.readFileSync(${JSON.stringify(findingsPath)}, 'utf8'));
          await runContentReview({
            deckPath: ${JSON.stringify(deckPath)},
            findings,
            outDir: ${JSON.stringify(outDir)},
            mode: 'structured-handoff',
            annotate: false,
          });
          const annotateLoaded = Object.keys(require.cache).some(k =>
            /skills\\/annotate\\/scripts\\/index\\.js$/.test(k) ||
            /skills\\/annotate\\/scripts\\/annotate\\.js$/.test(k));
          process.stdout.write(JSON.stringify({ annotateLoaded }));
        })().catch(e => { process.stderr.write(e.stack || e.message); process.exit(1); });
      `;
      const res = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8', timeout: 15_000 });
      assert.equal(res.status, 0, `subprocess failed: ${res.stderr}`);
      const out = JSON.parse(res.stdout);
      assert.equal(out.annotateLoaded, false,
        'P-07: runContentReview({annotate:false}) must NOT load annotate');
    } finally {
      fs.rmSync(tmpDeck, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });
});
