'use strict';
// Smoke: /annotate cli.js — no-args invocation prints Usage banner and exits non-zero.

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('smoke: cli-annotate no-args prints Usage and exits non-zero', () => {
  const cli = path.resolve(__dirname, '..', '..', 'skills', 'annotate', 'scripts', 'cli.js');
  const r = spawnSync('node', [cli], { encoding: 'utf8', timeout: 5000 });
  assert.notEqual(r.status, 0, 'expected non-zero exit for no-args invocation');
  assert.match(r.stderr, /Usage:.*deck\.pptx/, `stderr did not contain Usage banner: ${r.stderr}`);
});
