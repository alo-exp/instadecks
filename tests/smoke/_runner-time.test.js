'use strict';
// Smoke runner wall-clock guard (Plan 08-06 W-6, CONTEXT D-06).
//
// node:test runs test FILES in parallel by default and exposes no across-file
// post-suite hook, so a same-process sentinel cannot reliably measure cumulative
// suite duration. This file therefore spawns a fresh `node --test` over the OTHER
// smoke files in a child process, times that child end-to-end with hrtime, and
// asserts the elapsed wall-clock stays under the 30000ms hard cap.
//
// To avoid infinite recursion the child sets INSTADECKS_SMOKE_INNER=1 so this
// file's outer test bails out early when re-entered.

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const HARD_CAP_MS = 30000;

test('smoke: cumulative suite wall-clock under 30s hard cap (CONTEXT D-06)', () => {
  if (process.env.INSTADECKS_SMOKE_INNER === '1') {
    // Re-entrant call from the outer timer — nothing to measure here; pass.
    return;
  }
  const smokeDir = __dirname;
  const otherFiles = fs.readdirSync(smokeDir)
    .filter(f => f.endsWith('.test.js') && f !== '_runner-time.test.js')
    .map(f => path.join(smokeDir, f));
  assert.ok(otherFiles.length >= 1, 'expected at least one peer smoke file to time');

  const t0 = process.hrtime.bigint();
  const r = spawnSync('node', ['--test', ...otherFiles], {
    encoding: 'utf8',
    timeout: HARD_CAP_MS + 5000,
    env: { ...process.env, INSTADECKS_SMOKE_INNER: '1' },
  });
  const elapsedMs = Number(process.hrtime.bigint() - t0) / 1_000_000;

  assert.equal(r.status, 0, `inner smoke run failed (status ${r.status}); stderr:\n${r.stderr}`);
  assert.ok(
    elapsedMs < HARD_CAP_MS,
    `smoke suite cumulative wall-clock ${elapsedMs.toFixed(0)}ms exceeded ${HARD_CAP_MS}ms hard cap (CONTEXT D-06)`,
  );
});
