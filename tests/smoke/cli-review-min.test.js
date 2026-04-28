'use strict';
// Smoke: /review cli.js — minimal invocation exercises argv-parse + exit-ladder
// (missing --findings → exit 2; deckPath supplied so we get past the first check).

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('smoke: cli-review without --findings exits 2 with explanatory stderr', () => {
  const cli = path.resolve(__dirname, '..', '..', 'skills', 'review', 'scripts', 'cli.js');
  const env = {
    ...process.env,
    INSTADECKS_LLM_STUB: path.resolve(__dirname, '..', 'fixtures', 'llm-stubs', 'review-design-findings.json'),
    INSTADECKS_RENDER_STUB: '1',
  };
  const r = spawnSync('node', [cli, '/tmp/does-not-matter.pptx'], {
    encoding: 'utf8', env, timeout: 10000,
  });
  assert.equal(r.status, 2, `expected exit 2; got ${r.status}; stderr: ${r.stderr}`);
  assert.match(r.stderr, /--findings/, `stderr did not mention --findings: ${r.stderr}`);
});

// TODO(plan-08-05): once tests/helpers/llm-mock.js + review-design-findings.json land,
// extend with a happy-path subprocess invocation against tests/fixtures/v8-reference/
// Annotations_Sample.pptx that asserts findings.json + review.md materialize.
