'use strict';
// E2E: /create end-to-end with real soffice + real pptxgenjs render path.
// LLM stays stubbed (we test the deterministic render half, not the LLM half).
// Skipped when CI=true or soffice absent (CONTEXT D-08).

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { skipWithoutSoffice } = require('./helpers/skip-without-soffice');

test('e2e: /create end-to-end with real soffice', { timeout: 120000 }, (t) => {
  if (skipWithoutSoffice(t)) return;

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'instadecks-e2e-create-'));
  try {
    const briefPath = path.resolve(__dirname, '..', 'fixtures', 'sample-brief.json');
    assert.ok(fs.existsSync(briefPath), `sample-brief.json missing at ${briefPath}`);

    const cli = path.resolve(__dirname, '..', '..', 'skills', 'create', 'scripts', 'cli.js');
    const stub = path.resolve(__dirname, '..', 'fixtures', 'llm-stubs', 'create-cycle-2-converged.json');
    const env = {
      ...process.env,
      // LLM stays stubbed; render path stays REAL so soffice + pptxgenjs are exercised.
      INSTADECKS_LLM_STUB: stub,
    };
    const r = spawnSync('node', [cli, '--brief', briefPath, '--out-dir', tmp], {
      encoding: 'utf8', env, timeout: 100000,
    });
    if (r.status !== 0) {
      // If Plan 08-05 fixtures missing, fall back to skip — e2e is opt-in.
      if (!fs.existsSync(stub)) {
        t.skip(`llm-stubs fixture not yet present (Plan 08-05): ${stub}`);
        return;
      }
      assert.fail(`create cli exited ${r.status}; stderr:\n${r.stderr}`);
    }
    const pptx = fs.readdirSync(tmp).find(f => f.endsWith('.pptx'));
    assert.ok(pptx, `expected a .pptx artifact in ${tmp}; saw: ${fs.readdirSync(tmp).join(', ')}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
