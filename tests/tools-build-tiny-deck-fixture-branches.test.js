'use strict';
// tests/tools-build-tiny-deck-fixture-branches.test.js — branch coverage for
// tools/build-tiny-deck-fixture.js. The script writes tests/fixtures/tiny-deck.pptx;
// we snapshot the existing committed fixture, run the builder, assert non-empty + valid
// PPTX magic bytes, then restore the snapshot so the committed fixture is byte-stable.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.join(__dirname, '..');
const TOOL = path.join(REPO_ROOT, 'tools', 'build-tiny-deck-fixture.js');
const OUT = path.join(REPO_ROOT, 'tests', 'fixtures', 'tiny-deck.pptx');

test('tools-build-tiny-deck-fixture-branches', async (t) => {
  await t.test('happy path: builder exits 0 and writes a non-empty PPTX (zip magic)', () => {
    const snapshot = fs.existsSync(OUT) ? fs.readFileSync(OUT) : null;
    try {
      const r = spawnSync(process.execPath, [TOOL], { encoding: 'utf8', cwd: REPO_ROOT });
      assert.equal(r.status, 0, `stderr=${r.stderr}`);
      assert.match(r.stdout, /tiny-deck\.pptx \(\d+ bytes\)/);
      const buf = fs.readFileSync(OUT);
      assert.ok(buf.length > 0);
      // PPTX is a zip; first two bytes are 'PK'.
      assert.equal(buf[0], 0x50);
      assert.equal(buf[1], 0x4b);
    } finally {
      if (snapshot) fs.writeFileSync(OUT, snapshot);
    }
  });

  await t.test('PPTXGENJS_PATH preset is honored (alt branch in ensurePptxgenjsPath)', () => {
    const snapshot = fs.existsSync(OUT) ? fs.readFileSync(OUT) : null;
    try {
      const r = spawnSync(process.execPath, [TOOL], {
        encoding: 'utf8', cwd: REPO_ROOT,
        env: { ...process.env, PPTXGENJS_PATH: path.join(REPO_ROOT, 'node_modules', 'pptxgenjs') },
      });
      assert.equal(r.status, 0, `stderr=${r.stderr}`);
    } finally {
      if (snapshot) fs.writeFileSync(OUT, snapshot);
    }
  });
});
