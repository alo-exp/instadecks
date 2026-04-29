'use strict';
// tests/cli-diversity-history-subdir-layout.test.js — Live E2E Iter4-2 back-compat.
// scanDiversityHistory MUST continue to read <histDir>/<run-id>/design-rationale.md
// (legacy layout) so previous workflows keep working.

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

test('scanDiversityHistory: per-run subdir layout still works', async () => {
  const dir = await mktmp('iddh-subdir-');
  try {
    const a = path.join(dir, 'run-2026-01');
    const b = path.join(dir, 'run-2026-02');
    await fsp.mkdir(a, { recursive: true });
    await fsp.mkdir(b, { recursive: true });
    await fsp.writeFile(path.join(a, 'design-rationale.md'), RAT('Verdant Steel', 'Plex Serif + Plex Sans', 'underline-accent'));
    await fsp.writeFile(path.join(b, 'design-rationale.md'), RAT('Cobalt Edge', 'Plex Sans Bold + Plex Sans', 'numeric-hero'));

    const r = await scanDiversityHistory(dir);
    assert.equal(r.priorRuns.length, 2);
    const palettes = r.priorDnas.map(d => d.palette).sort();
    assert.deepEqual(palettes, ['Cobalt Edge', 'Verdant Steel']);
    assert.ok(r.priorRuns.includes('run-2026-01'));
    assert.ok(r.priorRuns.includes('run-2026-02'));
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

test('scanDiversityHistory: subdir without design-rationale.md is skipped', async () => {
  const dir = await mktmp('iddh-subdir-empty-');
  try {
    await fsp.mkdir(path.join(dir, 'empty-run'), { recursive: true });
    const r = await scanDiversityHistory(dir);
    assert.equal(r.priorRuns.length, 0);
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

test('scanDiversityHistory: mixed flat + subdir layouts both detected', async () => {
  const dir = await mktmp('iddh-mixed-');
  try {
    // Flat
    await fsp.writeFile(path.join(dir, 'flat-rationale.md'), RAT('Editorial Mono', 'Plex Serif', 'rule-line'));
    // Subdir
    const sub = path.join(dir, 'run-A');
    await fsp.mkdir(sub, { recursive: true });
    await fsp.writeFile(path.join(sub, 'design-rationale.md'), RAT('Carbon Neon', 'Plex Mono', 'neon-accent'));

    const r = await scanDiversityHistory(dir);
    assert.equal(r.priorRuns.length, 2);
    const palettes = r.priorDnas.map(d => d.palette).sort();
    assert.deepEqual(palettes, ['Carbon Neon', 'Editorial Mono']);
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});
