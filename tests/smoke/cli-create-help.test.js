'use strict';
// Smoke: /create cli.js — no-args invocation prints Usage banner and exits non-zero.
// cli.js does not implement --help; argv-parse + exit-ladder is what's exercised here
// (Plan 08-06 W-6: orchestrator confirmed this contract; smoke tests the no-args path).

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('smoke: cli-create no-args prints Usage and exits non-zero', () => {
  const cli = path.resolve(__dirname, '..', '..', 'skills', 'create', 'scripts', 'cli.js');
  const r = spawnSync('node', [cli], { encoding: 'utf8', timeout: 5000 });
  assert.notEqual(r.status, 0, 'expected non-zero exit for no-args invocation');
  assert.match(r.stderr, /Usage:.*--brief/, `stderr did not contain Usage banner: ${r.stderr}`);
});
