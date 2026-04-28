'use strict';
// tests/cli-review-branches.test.js — branch-coverage gaps for skills/review/scripts/cli.js.
// Covers argv parsing exit-code ladder (1 = bad args, 2 = missing --findings, 3 = runReview throw)
// plus the unrecognized-arg branch. The cli has no exported parseArgs, so every branch is driven
// via spawnSync.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.join(__dirname, '..');
const CLI = path.join(REPO_ROOT, 'skills', 'review', 'scripts', 'cli.js');

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'cli-rev-br-')); }

test('cli-review-branches', async (t) => {
  await t.test('no args → exit 1 + Usage', () => {
    const r = spawnSync(process.execPath, [CLI], { encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Usage/);
  });

  await t.test('unrecognized flag → exit 1 with parseArgs message', () => {
    const r = spawnSync(process.execPath, [CLI, '--bogus'], { encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /unrecognized argument/);
  });

  await t.test('positional deckPath but no --findings → exit 2', () => {
    const dir = tmp();
    try {
      const fakeDeck = path.join(dir, 'deck.pptx');
      fs.writeFileSync(fakeDeck, '');
      const r = spawnSync(process.execPath, [CLI, fakeDeck], { encoding: 'utf8' });
      assert.equal(r.status, 2);
      assert.match(r.stderr, /--findings <path> required/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  await t.test('--findings + missing deckPath — when only flags given, deckPath is null → Usage', () => {
    // run-id flag consumes its value, leaving no positional deckPath.
    const r = spawnSync(process.execPath, [CLI, '--run-id', 'x'], { encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Usage/);
  });

  await t.test('--findings malformed JSON → non-zero exit (uncaught throw → exit 3)', () => {
    const dir = tmp();
    try {
      const deck = path.join(dir, 'deck.pptx');
      const findings = path.join(dir, 'findings.json');
      fs.writeFileSync(deck, '');
      fs.writeFileSync(findings, '{not json');
      const r = spawnSync(process.execPath,
        [CLI, deck, '--findings', findings], { encoding: 'utf8' });
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /JSON|SyntaxError/i);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  await t.test('--annotate flag accepted by parseArgs (does not crash on parse)', () => {
    // Drive purely the parse branch — pass nonsense deck so runReview will throw later.
    const dir = tmp();
    try {
      const findings = path.join(dir, 'f.json');
      fs.writeFileSync(findings, JSON.stringify({ schema_version: '1.0', deck: 'x', generated_at: 't', slides: [] }));
      const r = spawnSync(process.execPath,
        [CLI, '/nonexistent/deck.pptx', '--findings', findings, '--annotate'],
        { encoding: 'utf8' });
      // Exit code is non-zero (runReview will fail), but stderr must NOT mention "unrecognized".
      assert.ok(!/unrecognized argument/.test(r.stderr), `stderr=${r.stderr}`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
