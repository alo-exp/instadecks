'use strict';
// tests/cli-annotate-branches.test.js — branch-coverage gaps for skills/annotate/scripts/cli.js.
// Annotate cli is the simplest of the four: positional <deck> <findings> [outDir]; missing
// either positional → exit 2, runtime throw → exit 1.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.join(__dirname, '..');
const CLI = path.join(REPO_ROOT, 'skills', 'annotate', 'scripts', 'cli.js');

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'cli-ann-br-')); }

test('cli-annotate-branches', async (t) => {
  await t.test('no args → exit 2 + Usage', () => {
    const r = spawnSync(process.execPath, [CLI], { encoding: 'utf8' });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Usage/);
  });

  await t.test('only deck arg, missing findings → exit 2', () => {
    const r = spawnSync(process.execPath, [CLI, '/some/deck.pptx'], { encoding: 'utf8' });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Usage/);
  });

  await t.test('malformed findings JSON → exit 1 (uncaught throw)', () => {
    const dir = tmp();
    try {
      const deck = path.join(dir, 'd.pptx'); fs.writeFileSync(deck, '');
      const findings = path.join(dir, 'f.json'); fs.writeFileSync(findings, '{nope');
      const r = spawnSync(process.execPath, [CLI, deck, findings], { encoding: 'utf8' });
      assert.equal(r.status, 1);
      assert.match(r.stderr, /JSON|SyntaxError/i);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  await t.test('valid findings + nonexistent deck → exit 1 (runAnnotate throws)', () => {
    const dir = tmp();
    try {
      const findings = path.join(dir, 'f.json');
      fs.writeFileSync(findings, JSON.stringify([]));
      const r = spawnSync(process.execPath,
        [CLI, path.join(dir, 'missing.pptx'), findings, dir],
        { encoding: 'utf8' });
      assert.notEqual(r.status, 0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
