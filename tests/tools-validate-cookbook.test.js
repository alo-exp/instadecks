'use strict';
// tests/tools-validate-cookbook.test.js — NITPICK #4 fix verification.
//
// tools/validate-cookbook.js parses cookbook.md, extracts recipe-index links of
// the form [name](cookbook/<file>.md), and asserts each target file exists.
// Exit code 0 on success, non-zero on any missing target.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const TOOL = path.join(__dirname, '..', 'tools', 'validate-cookbook.js');
const { main } = require('../tools/validate-cookbook');

function freshTmp(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }

test('validate-cookbook exits 0 on the live cookbook tree', () => {
  const r = spawnSync(process.execPath, [TOOL], { encoding: 'utf8' });
  assert.equal(r.status, 0,
    `validate-cookbook failed on live tree.\nstdout: ${r.stdout}\nstderr: ${r.stderr}`);
});

test('validate-cookbook exits non-zero when a referenced recipe file is missing', () => {
  const dir = freshTmp('vc-missing');
  try {
    fs.mkdirSync(path.join(dir, 'cookbook'));
    // Write a cookbook.md referencing a non-existent recipe.
    fs.writeFileSync(path.join(dir, 'cookbook.md'),
      '# Cookbook\n\n| 1 | foo | [foo.md](cookbook/foo.md) | when |\n');
    const r = spawnSync(process.execPath, [TOOL, dir], { encoding: 'utf8' });
    assert.notEqual(r.status, 0,
      `expected non-zero exit on missing target; got ${r.status}\nstdout: ${r.stdout}`);
    assert.match((r.stdout || '') + (r.stderr || ''), /foo\.md|missing/i);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('validate-cookbook exits 0 cleanly when no per-recipe files exist (inline-recipes mode)', () => {
  const dir = freshTmp('vc-inline');
  try {
    // No cookbook/ subdir, no link references — everything inline.
    fs.writeFileSync(path.join(dir, 'cookbook.md'),
      '# Cookbook\n\nAll recipes inline below.\n');
    const r = spawnSync(process.execPath, [TOOL, dir], { encoding: 'utf8' });
    assert.equal(r.status, 0,
      `expected 0 exit when no recipe links present; got ${r.status}\nstdout: ${r.stdout}\nstderr: ${r.stderr}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('main() returns 0 on default (live) cookbook tree (in-process coverage)', () => {
  // In-process call so c8 instruments the module body itself (the spawnSync
  // tests above run validate-cookbook.js as a subprocess where coverage is
  // not captured into this c8 run).
  const rc = main(['node', 'validate-cookbook.js']);
  assert.equal(rc, 0);
});

test('main() returns 1 on missing cookbook.md (in-process coverage)', () => {
  const dir = freshTmp('vc-mainmiss');
  try {
    const rc = main(['node', 'validate-cookbook.js', dir]);
    assert.equal(rc, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('main() returns 0 on inline-recipes cookbook (in-process coverage)', () => {
  const dir = freshTmp('vc-maininline');
  try {
    fs.writeFileSync(path.join(dir, 'cookbook.md'), '# Cookbook\n\nInline only.\n');
    const rc = main(['node', 'validate-cookbook.js', dir]);
    assert.equal(rc, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('main() returns 1 on missing recipe target (in-process coverage)', () => {
  const dir = freshTmp('vc-maintgt');
  try {
    fs.mkdirSync(path.join(dir, 'cookbook'));
    fs.writeFileSync(path.join(dir, 'cookbook.md'),
      '| 1 | a | [a.md](cookbook/a.md) | x |\n| 2 | b | [b.md](cookbook/b.md) | y |\n');
    fs.writeFileSync(path.join(dir, 'cookbook', 'a.md'), '# a\n');
    // b.md intentionally missing
    const rc = main(['node', 'validate-cookbook.js', dir]);
    assert.equal(rc, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('validate-cookbook exits non-zero when cookbook.md missing entirely', () => {
  const dir = freshTmp('vc-no-cb');
  try {
    const r = spawnSync(process.execPath, [TOOL, dir], { encoding: 'utf8' });
    assert.notEqual(r.status, 0,
      `expected non-zero exit when cookbook.md absent; got ${r.status}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
