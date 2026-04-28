'use strict';
// E2E: /review end-to-end against a real PPTX with real soffice + pdftoppm
// rendering pipeline. Skipped when CI=true or soffice absent (CONTEXT D-08).

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { skipWithoutSoffice } = require('./helpers/skip-without-soffice');

test('e2e: /review against real PPTX with real soffice', { timeout: 180000 }, (t) => {
  if (skipWithoutSoffice(t)) return;

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'instadecks-e2e-review-'));
  try {
    const deckPath = path.resolve(__dirname, '..', 'fixtures', 'v8-reference', 'Annotations_Sample.pptx');
    const findingsPath = path.resolve(__dirname, '..', 'fixtures', 'sample-findings.json');
    assert.ok(fs.existsSync(deckPath), `reference deck missing at ${deckPath}`);
    assert.ok(fs.existsSync(findingsPath), `sample findings missing at ${findingsPath}`);

    const cli = path.resolve(__dirname, '..', '..', 'skills', 'review', 'scripts', 'cli.js');
    const r = spawnSync('node', [cli, deckPath, '--findings', findingsPath, '--out-dir', tmp], {
      encoding: 'utf8', timeout: 160000,
    });
    assert.equal(r.status, 0, `review cli exited ${r.status}; stderr:\n${r.stderr}`);
    // Don't pin exact filename — orchestrator chooses; just assert SOMETHING materializes.
    const produced = fs.readdirSync(tmp);
    assert.ok(produced.length > 0, `expected sidecar artifacts in ${tmp}; saw none`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
