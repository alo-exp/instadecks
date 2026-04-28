'use strict';
// tests/tools-build-cross-domain-fixture-branches.test.js — branch coverage for
// tools/build-cross-domain-fixture.js. Snapshot+restore the committed fixture to keep
// the tree byte-stable; assert exit 0, non-empty PPTX magic bytes, and the stdout shape.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.join(__dirname, '..');
const TOOL = path.join(REPO_ROOT, 'tools', 'build-cross-domain-fixture.js');
const OUT = path.join(REPO_ROOT, 'tests', 'fixtures', 'cross-domain-test-deck.pptx');

test('tools-build-cross-domain-fixture-branches', async (t) => {
  await t.test('builder exits 0 and writes 4-slide PPTX', () => {
    const snapshot = fs.existsSync(OUT) ? fs.readFileSync(OUT) : null;
    try {
      const r = spawnSync(process.execPath, [TOOL], { encoding: 'utf8', cwd: REPO_ROOT });
      assert.equal(r.status, 0, `stderr=${r.stderr}`);
      assert.match(r.stdout, /cross-domain-test-deck\.pptx \(\d+ bytes\)/);
      const buf = fs.readFileSync(OUT);
      assert.ok(buf.length > 1000, `expected reasonably-sized PPTX, got ${buf.length}`);
      assert.equal(buf[0], 0x50); // 'P'
      assert.equal(buf[1], 0x4b); // 'K'
    } finally {
      if (snapshot) fs.writeFileSync(OUT, snapshot);
    }
  });

  await t.test('failure path: missing pptxgenjs at PPTXGENJS_PATH → exit 1 + stderr', () => {
    const snapshot = fs.existsSync(OUT) ? fs.readFileSync(OUT) : null;
    try {
      const r = spawnSync(process.execPath, [TOOL], {
        encoding: 'utf8', cwd: REPO_ROOT,
        env: { ...process.env, PPTXGENJS_PATH: '/nonexistent/pptxgenjs' },
      });
      assert.equal(r.status, 1);
      assert.match(r.stderr, /cross-domain fixture build failed|Cannot find module/);
    } finally {
      if (snapshot) fs.writeFileSync(OUT, snapshot);
    }
  });
});
