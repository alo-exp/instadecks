'use strict';
// tests/annotate-slide-count-output.test.js — Live E2E Round 3 MINOR N3.
//
// runAnnotate result must surface annotatedSlideCount (unique slide indexes
// from findings input) and sourceSlideCount (count from the source deck) so
// users know the annotated PDF is delta-only.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO_ROOT = path.join(__dirname, '..');
const FIXTURE_DECK = path.join(REPO_ROOT, 'tests', 'fixtures', 'v8-reference', 'Annotations_Sample.pptx');
const FIXTURE_FINDINGS = path.join(REPO_ROOT, 'tests', 'fixtures', 'sample-findings.json');

function freshTmp(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }

test('runAnnotate result includes annotatedSlideCount and sourceSlideCount', async () => {
  // Skip if soffice unavailable (matches existing annotate-runtime.test.js pattern).
  const { spawnSync } = require('node:child_process');
  const probe = spawnSync('which', ['soffice']);
  if (probe.status !== 0) {
    return; // soft-skip — annotate runtime requires soffice
  }
  if (!fs.existsSync(FIXTURE_DECK) || !fs.existsSync(FIXTURE_FINDINGS)) {
    return; // fixtures not present in this checkout
  }

  const { runAnnotate } = require('../skills/annotate/scripts/index');
  const findings = JSON.parse(fs.readFileSync(FIXTURE_FINDINGS, 'utf8'));
  const out = freshTmp('anno-cnt');
  try {
    // Copy deck into tmp so deckPath sibling outputs land in tmp, not in fixtures dir.
    const tmpDeck = path.join(out, 'Annotations_Sample.pptx');
    fs.copyFileSync(FIXTURE_DECK, tmpDeck);

    const r = await runAnnotate({ deckPath: tmpDeck, findings, outDir: out });
    assert.equal(typeof r.annotatedSlideCount, 'number',
      'annotatedSlideCount must be a number');
    assert.equal(typeof r.sourceSlideCount, 'number',
      'sourceSlideCount must be a number');
    // findings has unique slide indexes — count must equal that.
    const uniqueSlides = new Set((findings.slides || []).map(s => s.slideNum)).size;
    assert.equal(r.annotatedSlideCount, uniqueSlides,
      `annotatedSlideCount should equal unique findings slide count (${uniqueSlides})`);
    assert.ok(r.sourceSlideCount > 0,
      'sourceSlideCount should be > 0 for the v8 fixture deck');
    assert.ok(r.sourceSlideCount >= r.annotatedSlideCount,
      'sourceSlideCount should be >= annotatedSlideCount (delta-only contract)');
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});
