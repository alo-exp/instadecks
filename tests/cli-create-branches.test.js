'use strict';
// tests/cli-create-branches.test.js — branch-coverage gaps for skills/create/scripts/cli.js.
// Complements tests/create-cli.test.js + tests/create-cli-soft-cap.test.js (which cover the
// JSON-on-stdout happy path and soft-cap helpers). This file targets the parseArgs branches,
// the unrecognized-arg throw path, and the soft-cap parse error path, all via direct require()
// (no subprocess) for speed and determinism.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.join(__dirname, '..');
const CLI = path.join(REPO_ROOT, 'skills', 'create', 'scripts', 'cli.js');
const { parseArgs, parseSoftCapFlag, resolveSoftCap, isInteractive } =
  require('../skills/create/scripts/cli.js');

test('cli-create-branches', async (t) => {
  await t.test('parseArgs: --brief / --run-id / --out-dir / --mode all populated', () => {
    const a = parseArgs(['--brief', 'b.json', '--run-id', 'r1', '--out-dir', '/o', '--mode', 'standalone']);
    assert.equal(a.brief, 'b.json');
    assert.equal(a.runId, 'r1');
    assert.equal(a.outDir, '/o');
    assert.equal(a.mode, 'standalone');
  });

  await t.test('parseArgs: positional outDir captured when --out-dir not used', () => {
    const a = parseArgs(['outpos', '--brief', 'b.json']);
    assert.equal(a.outDir, 'outpos');
  });

  await t.test('parseArgs: --soft-cap=accept populates softCap', () => {
    const a = parseArgs(['--brief', 'b.json', '--soft-cap=accept']);
    assert.equal(a.softCap, 'accept');
  });

  await t.test('parseArgs: --soft-cap=invalid throws', () => {
    assert.throws(() => parseArgs(['--brief', 'b.json', '--soft-cap=bogus']),
      /--soft-cap must be one of/);
  });

  await t.test('parseArgs: unrecognized flag throws', () => {
    assert.throws(() => parseArgs(['--bogus', 'x']), /unrecognized argument/);
  });

  await t.test('parseSoftCapFlag: returns null when no --soft-cap flag in argv', () => {
    assert.equal(parseSoftCapFlag(['--brief', 'x']), null);
    assert.equal(parseSoftCapFlag(undefined), null);
  });

  await t.test('parseSoftCapFlag: each valid value round-trips', () => {
    for (const v of ['accept', 'stop', 'continue']) {
      assert.equal(parseSoftCapFlag([`--soft-cap=${v}`]), v);
    }
  });

  await t.test('resolveSoftCap: explicit flag wins', () => {
    assert.equal(resolveSoftCap('stop'), 'stop');
  });

  await t.test('resolveSoftCap: non-interactive (CI=1) → accept with stderr warning', () => {
    const prev = process.env.CI;
    process.env.CI = '1';
    const writes = [];
    const orig = process.stderr.write;
    process.stderr.write = (chunk) => { writes.push(String(chunk)); return true; };
    try {
      assert.equal(resolveSoftCap(null), 'accept');
      assert.match(writes.join(''), /non-interactive/);
    } finally {
      process.stderr.write = orig;
      if (prev === undefined) delete process.env.CI; else process.env.CI = prev;
    }
  });

  await t.test('resolveSoftCap: interactive path defaults to accept with warning', () => {
    const prev = { CI: process.env.CI, NI: process.env.NON_INTERACTIVE, isTTY: process.stdout.isTTY };
    delete process.env.CI;
    delete process.env.NON_INTERACTIVE;
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
    const writes = [];
    const orig = process.stderr.write;
    process.stderr.write = (chunk) => { writes.push(String(chunk)); return true; };
    try {
      assert.equal(resolveSoftCap(null), 'accept');
      assert.match(writes.join(''), /defaulting to accept/);
    } finally {
      process.stderr.write = orig;
      if (prev.CI !== undefined) process.env.CI = prev.CI;
      if (prev.NI !== undefined) process.env.NON_INTERACTIVE = prev.NI;
      Object.defineProperty(process.stdout, 'isTTY', { value: prev.isTTY, configurable: true });
    }
  });

  await t.test('isInteractive: NON_INTERACTIVE=1 forces false', () => {
    const prev = process.env.NON_INTERACTIVE;
    process.env.NON_INTERACTIVE = '1';
    try {
      assert.equal(isInteractive(), false);
    } finally {
      if (prev === undefined) delete process.env.NON_INTERACTIVE; else process.env.NON_INTERACTIVE = prev;
    }
  });

  // Subprocess branches — drive main() via real argv.
  await t.test('main: --brief unrecognized arg → exit 1 with stderr', () => {
    const r = spawnSync(process.execPath, [CLI, '--bogus'], { encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /unrecognized argument/);
  });

  await t.test('main: missing --brief → exit 1 with Usage', () => {
    const r = spawnSync(process.execPath, [CLI, '--run-id', 'x'], { encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Usage/);
  });

  await t.test('main: --brief points to missing file → exit 2', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-create-br-'));
    try {
      const r = spawnSync(process.execPath,
        [CLI, '--brief', path.join(tmp, 'nope.json')], { encoding: 'utf8' });
      assert.equal(r.status, 2);
      assert.match(r.stderr, /failed to read --brief/);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
