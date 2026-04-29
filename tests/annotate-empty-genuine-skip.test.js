'use strict';
// tests/annotate-empty-genuine-skip.test.js — Live E2E Iteration 1 Fix #6.
//
// When all findings are genuine:false the adapter drops them; the post-filter
// samples array is empty. runAnnotate must short-circuit: NO deck.annotated.pptx,
// NO deck.annotated.pdf, structured `{annotatedSlideCount:0, message, ...}` return.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO_ROOT = path.join(__dirname, '..');
const FIXTURE_DECK = path.join(REPO_ROOT, 'tests', 'fixtures', 'v8-reference', 'Annotations_Sample.pptx');

test('runAnnotate: empty genuine findings → no .pptx/.pdf written, structured signal', async () => {
  if (!fs.existsSync(FIXTURE_DECK)) return;
  const { runAnnotate } = require('../skills/annotate/scripts/index');

  const findings = {
    schema_version: '1.1',
    slides: [
      { slideNum: 1, title: 'S1', findings: [
        { severity_reviewer: 'Nitpick', category: 'style', genuine: false,
          nx: 0.4, ny: 0.4, text: 'a', rationale: 'r', location: 'l', standard: 's', fix: 'f' },
      ] },
      { slideNum: 2, title: 'S2', findings: [
        { severity_reviewer: 'Minor', category: 'improvement', genuine: false,
          nx: 0.5, ny: 0.5, text: 'b', rationale: 'r', location: 'l', standard: 's', fix: 'f' },
      ] },
    ],
  };

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'anno-empty-'));
  try {
    const deckCopy = path.join(tmp, 'Annotations_Sample.pptx');
    fs.copyFileSync(FIXTURE_DECK, deckCopy);

    const r = await runAnnotate({ deckPath: deckCopy, findings, outDir: tmp });

    assert.equal(r.annotatedSlideCount, 0);
    assert.equal(r.pptxPath, null);
    assert.equal(r.pdfPath, null);
    assert.equal(r.annotatedPath, null);
    assert.equal(r.annotatedPdfPath, null);
    assert.match(r.message, /Clean convergence/);

    // Sibling annotated artifacts must NOT exist on disk.
    assert.equal(fs.existsSync(path.join(tmp, 'Annotations_Sample.annotated.pptx')), false);
    assert.equal(fs.existsSync(path.join(tmp, 'Annotations_Sample.annotated.pdf')), false);

    // findings.json IS still written (the input record is preserved for ledger).
    assert.equal(fs.existsSync(path.join(tmp, 'findings.json')), true);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
