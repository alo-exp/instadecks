'use strict';
// tests/tools-build-ai-tells-fixtures-branches.test.js — branch coverage for
// tools/build-ai-tells-fixtures.js. Snapshot+restore both committed fixtures.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.join(__dirname, '..');
const TOOL = path.join(REPO_ROOT, 'tools', 'build-ai-tells-fixtures.js');
const POS = path.join(REPO_ROOT, 'tests', 'fixtures', 'ai-tells-positive.pptx');
const NEG = path.join(REPO_ROOT, 'tests', 'fixtures', 'ai-tells-negative.pptx');

function snap(p) { return fs.existsSync(p) ? fs.readFileSync(p) : null; }
function restore(p, buf) { if (buf) fs.writeFileSync(p, buf); }

test('tools-build-ai-tells-fixtures-branches', async (t) => {
  await t.test('builder writes both positive + negative fixtures (each ai-tell category emits a file)', () => {
    const sp = snap(POS); const sn = snap(NEG);
    try {
      const r = spawnSync(process.execPath, [TOOL], { encoding: 'utf8', cwd: REPO_ROOT });
      assert.equal(r.status, 0, `stderr=${r.stderr}`);
      assert.match(r.stdout, /ai-tells-positive\.pptx/);
      assert.match(r.stdout, /ai-tells-negative\.pptx/);
      assert.ok(fs.statSync(POS).size > 0);
      assert.ok(fs.statSync(NEG).size > 0);
    } finally {
      restore(POS, sp); restore(NEG, sn);
    }
  });

  await t.test('failure path: bad PPTXGENJS_PATH → exit 1 with build-failed stderr', () => {
    const sp = snap(POS); const sn = snap(NEG);
    try {
      const r = spawnSync(process.execPath, [TOOL], {
        encoding: 'utf8', cwd: REPO_ROOT,
        env: { ...process.env, PPTXGENJS_PATH: '/nope/pptxgenjs' },
      });
      assert.equal(r.status, 1);
      assert.match(r.stderr, /ai-tells fixture generation failed|Cannot find module/);
    } finally {
      restore(POS, sp); restore(NEG, sn);
    }
  });
});
