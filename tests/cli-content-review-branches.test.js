'use strict';
// tests/cli-content-review-branches.test.js — branch-coverage gaps for
// skills/content-review/scripts/cli.js. Mirrors cli-review-branches in shape; adds the
// --out / --out-dir alias branch and the --annotate branch.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.join(__dirname, '..');
const CLI = path.join(REPO_ROOT, 'skills', 'content-review', 'scripts', 'cli.js');

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'cli-crv-br-')); }

test('cli-content-review-branches', async (t) => {
  await t.test('no args → exit 1 + Usage', () => {
    const r = spawnSync(process.execPath, [CLI], { encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Usage/);
  });

  await t.test('unrecognized flag → exit 1', () => {
    const r = spawnSync(process.execPath, [CLI, '--bogus'], { encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /unrecognized argument/);
  });

  await t.test('deckPath without --findings → exit 2', () => {
    const dir = tmp();
    try {
      const deck = path.join(dir, 'd.pptx'); fs.writeFileSync(deck, '');
      const r = spawnSync(process.execPath, [CLI, deck], { encoding: 'utf8' });
      assert.equal(r.status, 2);
      assert.match(r.stderr, /--findings/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  await t.test('--out alias is accepted (parseArgs branch coverage)', () => {
    const dir = tmp();
    try {
      const deck = path.join(dir, 'd.pptx'); fs.writeFileSync(deck, '');
      const findings = path.join(dir, 'f.json');
      fs.writeFileSync(findings, '{not json');
      const r = spawnSync(process.execPath,
        [CLI, deck, '--findings', findings, '--out', dir],
        { encoding: 'utf8' });
      // Parse branch passes (no "unrecognized argument"); JSON.parse throws → non-zero.
      assert.ok(!/unrecognized argument/.test(r.stderr), `stderr=${r.stderr}`);
      assert.notEqual(r.status, 0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  await t.test('--annotate flag accepted (parse branch)', () => {
    const dir = tmp();
    try {
      const deck = path.join(dir, 'd.pptx'); fs.writeFileSync(deck, '');
      const findings = path.join(dir, 'f.json');
      fs.writeFileSync(findings, JSON.stringify({ schema_version: '1.1', deck: 'x', generated_at: 't', slides: [] }));
      const r = spawnSync(process.execPath,
        [CLI, deck, '--findings', findings, '--annotate'],
        { encoding: 'utf8' });
      assert.ok(!/unrecognized argument/.test(r.stderr), `stderr=${r.stderr}`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
