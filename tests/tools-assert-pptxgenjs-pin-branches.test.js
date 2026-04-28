'use strict';
// tests/tools-assert-pptxgenjs-pin-branches.test.js — branch-coverage gaps for
// tools/assert-pptxgenjs-pin.js. Complements tests/assert-pin.test.js with the
// fs-readFileSync error branch (path → unreadable) and the no-argv default-path branch.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCRIPT = path.resolve(__dirname, '..', 'tools', 'assert-pptxgenjs-pin.js');

test('tools-assert-pptxgenjs-pin-branches', async (t) => {
  await t.test('unreadable package.json path → exit 1 with read-error', () => {
    const r = spawnSync(process.execPath,
      [SCRIPT, '/nonexistent/dir/package.json'], { encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Failed to read/);
  });

  await t.test('package.json with no dependencies key fails (v=undefined branch)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pin-br-'));
    try {
      const p = path.join(dir, 'package.json');
      fs.writeFileSync(p, JSON.stringify({ name: 'x', version: '0' }));
      const r = spawnSync(process.execPath, [SCRIPT, p], { encoding: 'utf8' });
      assert.equal(r.status, 1);
      assert.match(r.stderr, /must be exactly "4\.0\.1"/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  await t.test('no argv → default to repo package.json (covers default-path branch)', () => {
    // The repo's package.json pins pptxgenjs to 4.0.1 → exit 0.
    const r = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
    assert.equal(r.status, 0, `stderr=${r.stderr}`);
    assert.match(r.stdout, /pptxgenjs pin OK: 4\.0\.1/);
  });
});
