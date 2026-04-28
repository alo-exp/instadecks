'use strict';
// Smoke: /create cli.js — minimal invocation exercises argv-parse + cli→orchestrator
// dispatch + exit-ladder for a recoverable failure (missing brief file → exit 2).
//
// Per Plan 08-06 orchestrator note: cli.js does not have --help; smoke tests the
// argv-parse and exit-ladder paths instead. Happy-path with stubbed LLM is gated on
// Plan 08-05's tests/helpers/llm-mock.js + tests/fixtures/llm-stubs/ — when those
// land, this test should be extended (see TODO below). The env-var bridge in
// skills/create/scripts/index.js (Plan 08-02) silently no-ops when llm-mock is
// absent (try/catch on MODULE_NOT_FOUND), so we use a deterministic error path here.

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

test('smoke: cli-create with missing brief exits 2 and reports the cause', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'instadecks-smoke-create-'));
  try {
    const cli = path.resolve(__dirname, '..', '..', 'skills', 'create', 'scripts', 'cli.js');
    const missingBrief = path.join(tmp, 'does-not-exist.json');
    const env = {
      ...process.env,
      INSTADECKS_LLM_STUB: path.resolve(__dirname, '..', 'fixtures', 'llm-stubs', 'create-cycle-2-converged.json'),
      INSTADECKS_RENDER_STUB: '1',
    };
    const r = spawnSync('node', [cli, '--brief', missingBrief], {
      encoding: 'utf8', env, timeout: 10000,
    });
    assert.equal(r.status, 2, `expected exit 2 for missing brief; got ${r.status}; stderr: ${r.stderr}`);
    assert.match(r.stderr, /failed to read --brief/i, `stderr did not contain failed-to-read message: ${r.stderr}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// TODO(plan-08-05): once tests/helpers/llm-mock.js + llm-stubs/create-cycle-2-converged.json
// land, extend this file with a happy-path subprocess invocation that asserts deck.pptx
// + design-rationale.md materialize under INSTADECKS_RUN_DIR. Smoke contract: <5s.
