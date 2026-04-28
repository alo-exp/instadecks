// tests/slides-to-review.test.js — Q-1 NON-BREAKING + filter-correctness for runReview slidesToReview.
// Phase 5 D-03 / CRT-13: cycle 2+ diff-only review filters findings by slideNum.
// All asserts inspect runReview's in-memory return value and/or the written sibling JSON.

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO_ROOT = path.join(__dirname, '..');
const SAMPLE_FINDINGS = path.join(REPO_ROOT, 'tests', 'fixtures', 'sample-findings.json');

function freshTmpDir(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }

function loadFindings() {
  return JSON.parse(fs.readFileSync(SAMPLE_FINDINGS, 'utf8'));
}

test('runReview slidesToReview', async (t) => {
  const { runReview } = require('../skills/review/scripts/index');

  await t.test('null → full passthrough (default behavior)', async (t) => {
    const tmpDeck = freshTmpDir('s2r-null-deck');
    const outDir = freshTmpDir('s2r-null-out');
    t.after(() => {
      fs.rmSync(tmpDeck, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    });
    const deckPath = path.join(tmpDeck, 'foo.pptx');
    fs.writeFileSync(deckPath, '');
    const findings = loadFindings();
    const inputLen = findings.slides.length;
    const r = await runReview({ deckPath, findings, outDir, mode: 'structured-handoff', slidesToReview: null });
    const written = JSON.parse(fs.readFileSync(r.jsonPath, 'utf8'));
    assert.equal(written.slides.length, inputLen);
  });

  await t.test('"all" → full passthrough', async (t) => {
    const tmpDeck = freshTmpDir('s2r-all-deck');
    const outDir = freshTmpDir('s2r-all-out');
    t.after(() => {
      fs.rmSync(tmpDeck, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    });
    const deckPath = path.join(tmpDeck, 'foo.pptx');
    fs.writeFileSync(deckPath, '');
    const findings = loadFindings();
    const r = await runReview({ deckPath, findings, outDir, mode: 'structured-handoff', slidesToReview: 'all' });
    const written = JSON.parse(fs.readFileSync(r.jsonPath, 'utf8'));
    assert.equal(written.slides.length, findings.slides.length);
  });

  await t.test('[7, 9] → only slides 7 and 9 retained', async (t) => {
    const tmpDeck = freshTmpDir('s2r-filter-deck');
    const outDir = freshTmpDir('s2r-filter-out');
    t.after(() => {
      fs.rmSync(tmpDeck, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    });
    const deckPath = path.join(tmpDeck, 'foo.pptx');
    fs.writeFileSync(deckPath, '');
    const findings = loadFindings();
    const r = await runReview({ deckPath, findings, outDir, mode: 'structured-handoff', slidesToReview: [7, 9] });
    const written = JSON.parse(fs.readFileSync(r.jsonPath, 'utf8'));
    assert.equal(written.slides.length, 2);
    const nums = written.slides.map(s => s.slideNum).sort();
    assert.deepEqual(nums, [7, 9]);
    // Slide 8 dropped — its findings should not appear
    const allText = JSON.stringify(written);
    assert.equal(/Pricing Tier Comparison/.test(allText), false, 'slide 8 entry must be dropped');
  });

  await t.test('[] → empty findings.slides; genuineCount=0; no throw', async (t) => {
    const tmpDeck = freshTmpDir('s2r-empty-deck');
    const outDir = freshTmpDir('s2r-empty-out');
    t.after(() => {
      fs.rmSync(tmpDeck, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    });
    const deckPath = path.join(tmpDeck, 'foo.pptx');
    fs.writeFileSync(deckPath, '');
    const findings = loadFindings();
    const r = await runReview({ deckPath, findings, outDir, mode: 'structured-handoff', slidesToReview: [] });
    const written = JSON.parse(fs.readFileSync(r.jsonPath, 'utf8'));
    assert.equal(written.slides.length, 0);
    assert.equal(r.genuineCount, 0);
    assert.equal(r.findingCounts.critical, 0);
    assert.equal(r.findingCounts.major, 0);
    assert.equal(r.findingCounts.minor, 0);
    assert.equal(r.findingCounts.nitpick, 0);
  });

  await t.test('[1.5] (float) → throws /positive integers/', async () => {
    const findings = loadFindings();
    await assert.rejects(
      () => runReview({ deckPath: '/tmp/x.pptx', findings, mode: 'structured-handoff', slidesToReview: [1.5] }),
      /positive integers/,
    );
  });

  await t.test('[-2] (negative) → throws /positive integers/', async () => {
    const findings = loadFindings();
    await assert.rejects(
      () => runReview({ deckPath: '/tmp/x.pptx', findings, mode: 'structured-handoff', slidesToReview: [-2] }),
      /positive integers/,
    );
  });

  await t.test('"three" (string non-"all") → throws /null\\|\'all\'\\|int\\[\\]/', async () => {
    const findings = loadFindings();
    await assert.rejects(
      () => runReview({ deckPath: '/tmp/x.pptx', findings, mode: 'structured-handoff', slidesToReview: 'three' }),
      /null\|'all'\|int\[\]/,
    );
  });

  await t.test('genuineCount recomputes from filtered slides[]', async (t) => {
    const tmpDeck = freshTmpDir('s2r-counts-deck');
    const outDir = freshTmpDir('s2r-counts-out');
    t.after(() => {
      fs.rmSync(tmpDeck, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    });
    const deckPath = path.join(tmpDeck, 'foo.pptx');
    fs.writeFileSync(deckPath, '');
    const findings = loadFindings();
    // Slide 7: 2 genuine. Slide 8: 1 genuine + 1 not-genuine. Slide 9: 2 genuine.
    // Filter to [8] → expect genuineCount === 1
    const r = await runReview({ deckPath, findings, outDir, mode: 'structured-handoff', slidesToReview: [8] });
    assert.equal(r.genuineCount, 1);
    assert.equal(r.findingCounts.minor, 1);
    assert.equal(r.findingCounts.nitpick, 1);
    assert.equal(r.findingCounts.critical, 0);
    assert.equal(r.findingCounts.major, 0);
  });
});
