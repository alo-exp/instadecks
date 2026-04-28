'use strict';
// tests/tools-lint-pptxgenjs-enums-branches.test.js — branch-coverage gaps for
// tools/lint-pptxgenjs-enums.js. Complements tests/create-enum-lint-cli.test.js.
// Adds: ALLOW_MARKER inline-allow branch, ALLOW set bypass, walk() over nested dirs,
// non-extension files skipped, missing root dir skipped (walk early-return).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.join(__dirname, '..');
const TOOL = path.join(REPO_ROOT, 'tools', 'lint-pptxgenjs-enums.js');

function freshTmp(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }
function run(cwd) { return spawnSync(process.execPath, [TOOL], { cwd, encoding: 'utf8' }); }

test('tools-lint-pptxgenjs-enums-branches', async (t) => {
  await t.test('inline allow-marker comment lets a violation pass', () => {
    const tmp = freshTmp('elint-allow');
    try {
      fs.mkdirSync(path.join(tmp, 'skills'), { recursive: true });
      fs.writeFileSync(path.join(tmp, 'skills', 'ok.cjs'),
        "slide.addShape('oval', { x: 1 }); // enum-lint-allow: legacy snippet\n");
      const r = run(tmp);
      assert.equal(r.status, 0, `stderr=${r.stderr}`);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  await t.test('nested skills/foo/bar.js is walked (recursion branch)', () => {
    const tmp = freshTmp('elint-nested');
    try {
      const deep = path.join(tmp, 'skills', 'a', 'b', 'c');
      fs.mkdirSync(deep, { recursive: true });
      fs.writeFileSync(path.join(deep, 'bad.js'),
        "slide.addShape('oval', { x: 1 });\n");
      const r = run(tmp);
      assert.equal(r.status, 1);
      assert.match(r.stderr, /oval/);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  await t.test('non-source extensions (.png, .json) are skipped', () => {
    const tmp = freshTmp('elint-ext');
    try {
      fs.mkdirSync(path.join(tmp, 'skills'), { recursive: true });
      fs.writeFileSync(path.join(tmp, 'skills', 'fake.json'),
        '{"banned": "addShape(\\"oval\\", {})"}');
      const r = run(tmp);
      assert.equal(r.status, 0, `stderr=${r.stderr}`);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  await t.test('only first violation per file reported (loop break branch)', () => {
    const tmp = freshTmp('elint-multi');
    try {
      fs.mkdirSync(path.join(tmp, 'skills'), { recursive: true });
      fs.writeFileSync(path.join(tmp, 'skills', 'twice.cjs'),
        "slide.addShape('oval', {});\nslide.addShape('rect', {});\n");
      const r = run(tmp);
      assert.equal(r.status, 1);
      // First-seen on line 1 (oval); second 'rect' should NOT appear (break after first).
      const errLines = r.stderr.trim().split('\n').filter(l => l.includes('twice.cjs'));
      assert.equal(errLines.length, 1, `expected exactly 1 violation line, got ${errLines.length}: ${r.stderr}`);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  await t.test('roots that do not exist on disk are silently skipped', () => {
    // Fresh tmp tree has no skills/ + no tests/fixtures/ → walk early-returns,
    // overall lint exits 0 with "0 files clean".
    const tmp = freshTmp('elint-empty');
    try {
      const r = run(tmp);
      assert.equal(r.status, 0, `stderr=${r.stderr}`);
      assert.match(r.stdout, /0 files clean/);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
