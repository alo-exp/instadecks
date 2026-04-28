'use strict';
// Smoke: /annotate cli.js — minimal invocation exercises argv-parse + exit-ladder
// (missing positional args → exit 2).

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('smoke: cli-annotate with one positional arg exits 2 with Usage banner', () => {
  const cli = path.resolve(__dirname, '..', '..', 'skills', 'annotate', 'scripts', 'cli.js');
  // Annotate cli.js requires <deck.pptx> AND <findings.json>. Supply only one to hit
  // the missing-positional branch and the Usage exit-ladder.
  const r = spawnSync('node', [cli, '/tmp/does-not-matter.pptx'], {
    encoding: 'utf8', timeout: 10000,
  });
  assert.equal(r.status, 2, `expected exit 2; got ${r.status}; stderr: ${r.stderr}`);
  assert.match(r.stderr, /Usage:.*deck\.pptx.*findings\.json/, `stderr missing Usage banner: ${r.stderr}`);
});

// Note: annotate cli requires real soffice for the PDF step (no render-stub
// equivalent for soffice in the orchestrator). Real-soffice happy-path is
// covered by tests/e2e/annotate-real-soffice.test.js.
