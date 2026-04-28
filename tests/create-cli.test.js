// tests/create-cli.test.js — Subprocess tests for skills/create/scripts/cli.js.
// Covers exit ladder (0/1/2) and JSON-on-stdout in standalone mode.

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.join(__dirname, '..');
const CLI = path.join(REPO_ROOT, 'skills', 'create', 'scripts', 'cli.js');
const SAMPLE_BRIEF = path.join(REPO_ROOT, 'tests', 'fixtures', 'sample-brief.json');
const SAMPLE_CJS = path.join(REPO_ROOT, 'tests', 'fixtures', 'sample-render-deck.cjs');

function freshTmp(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }

test('create-cli', async (t) => {
  await t.test('no args → exit 1 + Usage', () => {
    const r = spawnSync(process.execPath, [CLI], { encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Usage/);
  });

  await t.test('--brief unreadable path → exit 2', () => {
    const r = spawnSync(process.execPath, [CLI, '--brief', '/nonexistent/path.json'],
      { encoding: 'utf8' });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /failed to read --brief/);
  });

  await t.test('happy path → exit 0 + JSON on stdout', () => {
    const out = freshTmp('crt-cli-happy');
    try {
      fs.copyFileSync(SAMPLE_CJS, path.join(out, 'render-deck.cjs'));
      const r = spawnSync(process.execPath,
        [CLI, '--brief', SAMPLE_BRIEF, '--out-dir', out, '--mode', 'standalone'],
        { encoding: 'utf8', timeout: 90_000 });
      assert.equal(r.status, 0, `cli failed: stderr=${r.stderr}`);
      const parsed = JSON.parse(r.stdout);
      assert.ok(parsed.deckPath, 'deckPath');
      assert.ok(fs.existsSync(parsed.deckPath));
    } finally {
      fs.rmSync(out, { recursive: true, force: true });
    }
  });
});
