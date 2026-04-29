'use strict';
// tests/cli-diversity-history-flat-layout.test.js — Live E2E Iter4-2.
// scanDiversityHistory MUST read flat *.md files directly under <histDir>
// (in addition to legacy per-run subdir layout). Earlier code only walked
// <histDir>/<entry>/design-rationale.md and silently reported 0 priors.

const test = require('node:test');
const assert = require('node:assert/strict');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { scanDiversityHistory } = require('../skills/create/scripts/index');

async function mktmp(prefix) {
  return fsp.mkdtemp(path.join(os.tmpdir(), prefix));
}

const RAT = (palette, typography, motif) =>
  `# Design Rationale\n\n` +
  `**Palette:** ${palette}\n` +
  `**Typography:** ${typography}\n` +
  `**Motif:** ${motif}\n`;

test('scanDiversityHistory: flat-dir layout — *.md files at top of <histDir>', async () => {
  const dir = await mktmp('iddh-flat-');
  try {
    await fsp.writeFile(path.join(dir, 'run-1-design-rationale.md'), RAT('Verdant Steel', 'Plex Serif + Plex Sans', 'underline-accent'));
    await fsp.writeFile(path.join(dir, 'run-2-design-rationale.md'), RAT('Cobalt Edge', 'Plex Sans Bold + Plex Sans', 'numeric-hero'));
    // Non-rationale .md should be ignored silently.
    await fsp.writeFile(path.join(dir, 'README.md'), '# nope\n');

    const r = await scanDiversityHistory(dir);
    assert.equal(r.priorRuns.length, 2, 'should detect both flat rationale files');
    const palettes = r.priorDnas.map(d => d.palette).sort();
    assert.deepEqual(palettes, ['Cobalt Edge', 'Verdant Steel']);
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

test('scanDiversityHistory: empty dir reports zero priors (no throw)', async () => {
  const dir = await mktmp('iddh-empty-');
  try {
    const r = await scanDiversityHistory(dir);
    assert.equal(r.priorRuns.length, 0);
    assert.equal(r.priorDnas.length, 0);
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

test('scanDiversityHistory: missing dir reports zero priors (no throw)', async () => {
  const r = await scanDiversityHistory('/tmp/iddh-does-not-exist-' + Date.now());
  assert.equal(r.priorRuns.length, 0);
});

test('scanDiversityHistory: flat *.md without rationale shorthand is skipped', async () => {
  const dir = await mktmp('iddh-skip-');
  try {
    await fsp.writeFile(path.join(dir, 'notes.md'), '# free-form notes, no shorthand\n');
    const r = await scanDiversityHistory(dir);
    assert.equal(r.priorRuns.length, 0);
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});
