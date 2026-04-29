'use strict';
// tests/cli-brief-md-error-message.test.js — Live E2E Iteration 1 Fix #1.
//
// When --brief-md / --brief-text / --brief-files runs without an LLM stub,
// the error must guide the user to either agent-mode or canonical JSON,
// not just a cryptic "no LLM configured" line.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.join(__dirname, '..');
const CLI = path.join(REPO_ROOT, 'skills', 'create', 'scripts', 'cli.js');

function freshTmp(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }

test('--brief-md: error message guides user to agent mode + canonical JSON', () => {
  const tmp = freshTmp('cli-bmd-err');
  try {
    const md = path.join(tmp, 'brief.md');
    fs.writeFileSync(md, '# Topic\nbody', 'utf8');
    const r = spawnSync(process.execPath,
      [CLI, '--brief-md', md, '--out-dir', tmp],
      { encoding: 'utf8' });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /brief-normalizer: no LLM configured/);
    assert.match(r.stderr, /Claude Code agent mode/);
    assert.match(r.stderr, /\/instadecks-create/);
    assert.match(r.stderr, /canonical JSON/);
    assert.match(r.stderr, /brief\.json/);
    assert.match(r.stderr, /SKILL\.md/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('--brief-text: error message includes actionable hints', () => {
  const tmp = freshTmp('cli-btxt-err');
  try {
    const r = spawnSync(process.execPath,
      [CLI, '--brief-text', 'plain prose', '--out-dir', tmp],
      { encoding: 'utf8' });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /agent mode|agent-mode|agent normalizes/i);
    assert.match(r.stderr, /canonical JSON/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
