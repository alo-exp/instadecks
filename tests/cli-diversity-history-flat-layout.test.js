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

test('scanDiversityHistory: partial-shorthand (each axis individually) is captured with empty siblings', async () => {
  // Covers the pal/typ/mot ternary branches in parseRationale when each is
  // individually missing.
  const dir = await mktmp('iddh-partial-');
  try {
    await fsp.writeFile(path.join(dir, 'pal-only.md'), '**Palette:** Cobalt Edge\n');
    await fsp.writeFile(path.join(dir, 'typ-only.md'), '**Typography:** Plex Serif + Plex Sans\n');
    await fsp.writeFile(path.join(dir, 'mot-only.md'), '**Motif:** rule-line\n');
    const r = await scanDiversityHistory(dir);
    assert.equal(r.priorRuns.length, 3);
    const palOnly = r.priorDnas.find(d => d.palette === 'Cobalt Edge');
    assert.ok(palOnly);
    assert.equal(palOnly.typography, '');
    assert.equal(palOnly.motif, '');
    const typOnly = r.priorDnas.find(d => d.typography === 'Plex Serif + Plex Sans');
    assert.ok(typOnly);
    assert.equal(typOnly.palette, '');
    assert.equal(typOnly.motif, '');
    const motOnly = r.priorDnas.find(d => d.motif === 'rule-line');
    assert.ok(motOnly);
    assert.equal(motOnly.palette, '');
    assert.equal(motOnly.typography, '');
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

test('scanDiversityHistory: unreadable flat .md (path is a dir → EISDIR) is skipped', async () => {
  // Covers the catch branch in flat-layout reader. A directory named *.md
  // matches /\.md$/i but stat.isFile() === false, so it falls into the
  // isDirectory branch; readFile of <fake.md>/design-rationale.md ENOENTs
  // → silently skipped without throwing.
  const dir = await mktmp('iddh-unread-');
  try {
    await fsp.mkdir(path.join(dir, 'fake.md'));
    await fsp.writeFile(path.join(dir, 'real.md'), '**Palette:** Editorial Mono\n');
    const r = await scanDiversityHistory(dir);
    assert.equal(r.priorRuns.length, 1);
    assert.equal(r.priorDnas[0].palette, 'Editorial Mono');
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

test('scanDiversityHistory: stat-failing entry is skipped (continue branch)', async () => {
  // Covers the `try { stat = await fsp.stat(entPath); } catch (e) { continue; }`
  // branch. Create a broken symlink whose target does not exist — fsp.stat
  // will throw ENOENT. The scanner must silently skip and not throw.
  const dir = await mktmp('iddh-broken-');
  try {
    await fsp.symlink('/no/such/target/' + Date.now(), path.join(dir, 'broken.md'));
    await fsp.writeFile(path.join(dir, 'good.md'), '**Palette:** Tech Noir\n');
    const r = await scanDiversityHistory(dir);
    assert.equal(r.priorRuns.length, 1);
    assert.equal(r.priorDnas[0].palette, 'Tech Noir');
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

test('scanDiversityHistory: flat .md whose contents become unreadable mid-scan is skipped', async () => {
  // Covers the inner readFile catch on the flat-layout branch. We use a
  // FIFO/named-pipe (no readable contents) — readFile will hang or error.
  // Easier: create a .md file then chmod 000 it on POSIX. Skip on platforms
  // without chmod-strict semantics.
  if (process.platform === 'win32') return;
  const dir = await mktmp('iddh-perm-');
  try {
    const blocked = path.join(dir, 'blocked.md');
    await fsp.writeFile(blocked, '**Palette:** X\n');
    await fsp.chmod(blocked, 0o000);
    await fsp.writeFile(path.join(dir, 'open.md'), '**Palette:** Open\n');
    const r = await scanDiversityHistory(dir);
    // root user (e.g. CI in container) can still read 0o000 files; tolerate
    // either {1: open only} or {2: both}.
    assert.ok(r.priorRuns.length >= 1);
    const opened = r.priorDnas.find(d => d.palette === 'Open');
    assert.ok(opened, 'open.md must always be readable');
  } finally {
    // Restore perms so cleanup works.
    try { await fsp.chmod(path.join(dir, 'blocked.md'), 0o644); } catch {}
    await fsp.rm(dir, { recursive: true, force: true });
  }
});
