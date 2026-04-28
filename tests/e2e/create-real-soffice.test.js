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

    // Per Phase 4 architecture, the LLM (agent) authors render-deck.cjs into the
    // run directory before runCreate spawns it. The e2e test stubs the LLM, so we
    // pre-stage the canonical fixture render-deck.cjs (covers all 9 cookbook recipes,
    // ENUM-clean) into <tmp>/render-deck.cjs to simulate that authoring step.
    const fixtureCjs = path.resolve(__dirname, '..', 'fixtures', 'sample-render-deck.cjs');
    assert.ok(fs.existsSync(fixtureCjs), `sample-render-deck.cjs missing at ${fixtureCjs}`);
    fs.copyFileSync(fixtureCjs, path.join(tmp, 'render-deck.cjs'));

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
    const pptxStat = fs.statSync(path.join(tmp, pptx));
    assert.ok(pptxStat.size > 10_000,
      `expected non-trivial pptx (>10KB); got ${pptxStat.size} bytes`);
    // FIX BLOCKER #2: design-rationale.md must always exist post-run (SKILL.md contract).
    const rationalePath = path.join(tmp, 'design-rationale.md');
    assert.ok(fs.existsSync(rationalePath),
      `expected design-rationale.md at ${rationalePath} (BLOCKER #2: rationalePath was silently never written)`);
    const rationaleBody = fs.readFileSync(rationalePath, 'utf8');
    assert.ok(rationaleBody.startsWith('# Design Rationale'),
      `design-rationale.md should start with '# Design Rationale' header; got: ${rationaleBody.slice(0, 80)}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
