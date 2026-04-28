'use strict';
// E2E: /annotate end-to-end with real soffice (PDF conversion) + real pptxgenjs
// (PPTX emit). Skipped when CI=true or soffice absent (CONTEXT D-08).

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { skipWithoutSoffice } = require('./helpers/skip-without-soffice');

test('e2e: /annotate end-to-end with real soffice', { timeout: 180000 }, (t) => {
  if (skipWithoutSoffice(t)) return;

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'instadecks-e2e-annotate-'));
  try {
    const deckSrc = path.resolve(__dirname, '..', 'fixtures', 'v8-reference', 'Annotations_Sample.pptx');
    const findingsPath = path.resolve(__dirname, '..', 'fixtures', 'sample-findings.json');
    assert.ok(fs.existsSync(deckSrc), `reference deck missing at ${deckSrc}`);
    assert.ok(fs.existsSync(findingsPath), `sample findings missing at ${findingsPath}`);

    // Copy the deck into tmp so the .annotated.pptx sibling lands inside our tmp dir
    // (annotate writes sibling-of-input, per Phase 2 D-03/D-04).
    const deckPath = path.join(tmp, 'deck.pptx');
    fs.copyFileSync(deckSrc, deckPath);

    const cli = path.resolve(__dirname, '..', '..', 'skills', 'annotate', 'scripts', 'cli.js');
    const r = spawnSync('node', [cli, deckPath, findingsPath, tmp], {
      encoding: 'utf8', timeout: 160000,
    });
    assert.equal(r.status, 0, `annotate cli exited ${r.status}; stderr:\n${r.stderr}`);

    const annotatedPptx = path.join(tmp, 'deck.annotated.pptx');
    const annotatedPdf = path.join(tmp, 'deck.annotated.pdf');
    assert.ok(fs.existsSync(annotatedPptx), `expected ${annotatedPptx}`);
    assert.ok(fs.existsSync(annotatedPdf), `expected ${annotatedPdf} (real soffice required)`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
