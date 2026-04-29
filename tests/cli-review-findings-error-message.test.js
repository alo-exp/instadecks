'use strict';
// tests/cli-review-findings-error-message.test.js — Live E2E Iteration 2 Fix #1.
//
// /review and /content-review CLI errors when --findings is missing must give
// actionable parity with /create's --brief-md error: schema reference, example,
// and usage hint.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.join(__dirname, '..');
const REVIEW_CLI = path.join(REPO_ROOT, 'skills', 'review', 'scripts', 'cli.js');
const CONTENT_CLI = path.join(REPO_ROOT, 'skills', 'content-review', 'scripts', 'cli.js');

function tmp(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }

test('/review CLI: missing --findings → actionable error with schema ref + example', () => {
  const dir = tmp('cli-rev-iter2');
  try {
    const fakeDeck = path.join(dir, 'deck.pptx');
    fs.writeFileSync(fakeDeck, '');
    const r = spawnSync(process.execPath, [REVIEW_CLI, fakeDeck], { encoding: 'utf8' });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /--findings <path> required/);
    assert.match(r.stderr, /findings-schema\.md/);
    assert.match(r.stderr, /schema_version/);
    assert.match(r.stderr, /agent-mode|Claude Code/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('/content-review CLI: missing --findings → actionable error with schema ref + example', () => {
  const dir = tmp('cli-cr-iter2');
  try {
    const fakeDeck = path.join(dir, 'deck.pptx');
    fs.writeFileSync(fakeDeck, '');
    const r = spawnSync(process.execPath, [CONTENT_CLI, fakeDeck], { encoding: 'utf8' });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /--findings <path> required/);
    assert.match(r.stderr, /findings-schema\.md/);
    assert.match(r.stderr, /schema_version/);
    assert.match(r.stderr, /agent-mode|Claude Code/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
