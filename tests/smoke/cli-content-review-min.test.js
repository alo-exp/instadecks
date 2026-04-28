'use strict';
// Smoke: /content-review cli.js — minimal invocation exercises argv-parse +
// exit-ladder (missing --findings → exit 2).

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('smoke: cli-content-review without --findings exits 2 with explanatory stderr', () => {
  const cli = path.resolve(__dirname, '..', '..', 'skills', 'content-review', 'scripts', 'cli.js');
  const env = {
    ...process.env,
    INSTADECKS_LLM_STUB: path.resolve(__dirname, '..', 'fixtures', 'llm-stubs', 'content-review-findings.json'),
    INSTADECKS_RENDER_STUB: '1',
  };
  const r = spawnSync('node', [cli, '/tmp/does-not-matter.pptx'], {
    encoding: 'utf8', env, timeout: 10000,
  });
  assert.equal(r.status, 2, `expected exit 2; got ${r.status}; stderr: ${r.stderr}`);
  assert.match(r.stderr, /--findings/, `stderr did not mention --findings: ${r.stderr}`);
});

// TODO(plan-08-05): once content-review-findings.json fixture lands, extend with a
// happy-path subprocess invocation that asserts content-review.md materializes.
