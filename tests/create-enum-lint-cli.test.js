// tests/create-enum-lint-cli.test.js — CI gate for tools/lint-pptxgenjs-enums.js.
// Covers Layer-1 of D-05: walks skills/ + tests/fixtures/ for string-literal addShape.

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.join(__dirname, '..');
const TOOL = path.join(REPO_ROOT, 'tools', 'lint-pptxgenjs-enums.js');

function freshTmp(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }

test('create-enum-lint-cli', async (t) => {
  await t.test('clean tmp tree → exit 0', () => {
    const tmp = freshTmp('enum-clean');
    try {
      fs.mkdirSync(path.join(tmp, 'skills'), { recursive: true });
      fs.writeFileSync(path.join(tmp, 'skills', 'good.cjs'),
        "slide.addShape(pres.shapes.OVAL, { x: 1 });\n");
      const r = spawnSync(process.execPath, [TOOL], { cwd: tmp, encoding: 'utf8' });
      assert.equal(r.status, 0, `expected clean exit; stderr=${r.stderr}`);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  await t.test('bad tmp tree → exit 1 + file:line on stderr', () => {
    const tmp = freshTmp('enum-bad');
    try {
      fs.mkdirSync(path.join(tmp, 'skills'), { recursive: true });
      fs.writeFileSync(path.join(tmp, 'skills', 'bad.cjs'),
        "// line1\nslide.addShape('oval', { x: 1 });\n");
      const r = spawnSync(process.execPath, [TOOL], { cwd: tmp, encoding: 'utf8' });
      assert.equal(r.status, 1);
      assert.match(r.stderr, /oval/);
      assert.match(r.stderr, /:2/);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  await t.test('production tree → exit 0 (cookbook + recipes are ENUM-clean)', () => {
    const r = spawnSync(process.execPath, [TOOL], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.equal(r.status, 0,
      `production-tree lint failed:\nstderr=${r.stderr}\nstdout=${r.stdout}`);
  });

  await t.test('bad-render-deck.cjs is allow-listed', () => {
    // Sanity: the negative fixture exists and contains the banned pattern.
    const badPath = path.join(REPO_ROOT, 'tests', 'fixtures', 'bad-render-deck.cjs');
    const src = fs.readFileSync(badPath, 'utf8');
    assert.match(src, /addShape\(['"]oval['"]/);
    // And yet production tree is clean (asserted above) → allow-list works.
  });
});
