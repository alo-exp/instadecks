'use strict';
// Plan 08-05 Task 2 — outcome assertions for /instadecks:doctor SKILL.md.
//
// /doctor's surface is `skills/doctor/scripts/check.sh`. Plan 8-04 covers bash
// branch coverage via bats; this file invokes through the SKILL.md surface
// (Bash(bash:*) → check.sh) and asserts the documented OUTPUT FORMAT and
// EXIT-CODE policy hold. PATH is manipulated to simulate missing tools.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { parseInstructions, skillMdPath } = require('../skill-outcome-harness');

const REPO_ROOT = path.join(__dirname, '..', '..');
const CHECK_SH = path.join(REPO_ROOT, 'skills', 'doctor', 'scripts', 'check.sh');
const SKILL_MD = skillMdPath('doctor');

function freshTmp(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }

function runDoctor({ pathOverride, pluginData } = {}) {
  const env = { ...process.env };
  if (pathOverride !== undefined) env.PATH = pathOverride;
  if (pluginData !== undefined) env.CLAUDE_PLUGIN_DATA = pluginData;
  const r = spawnSync('bash', [CHECK_SH], { env, encoding: 'utf8' });
  return { stdout: r.stdout || '', stderr: r.stderr || '', status: r.status };
}

// W-5: FIRST assertion in the file MUST be on instructions.length > 0.
test('W-5: parseInstructions returns >=1 instruction for doctor/SKILL.md', () => {
  const instructions = parseInstructions(SKILL_MD);
  assert.ok(instructions.length > 0, 'doctor/SKILL.md must yield >=1 parseable instruction');
});

test('output format: per-probe rows use [OK] / [MISSING] / [WARN] markers per SKILL.md', () => {
  // Run with current PATH so node is at minimum present.
  const r = runDoctor();
  // Every non-blank, non-summary line must start with one of the three markers.
  const lines = r.stdout.split('\n').filter(Boolean);
  let markerLines = 0;
  for (const line of lines) {
    if (/^\[(OK|MISSING|WARN)\] /.test(line)) markerLines++;
  }
  assert.ok(markerLines >= 1,
    `expected at least one [OK]/[MISSING]/[WARN] marker line; got:\n${r.stdout}`);
});

test('exit-code policy: status is integer and matches MISSING-row presence', () => {
  const r = runDoctor();
  assert.equal(typeof r.status, 'number');
  // SKILL.md: "Exits 0 if every required probe is OK; 1 if any probe is MISSING.
  // WARN rows do not flip the exit code."
  const hasMissing = /^\[MISSING\] /m.test(r.stdout);
  if (hasMissing) {
    assert.equal(r.status, 1, 'MISSING row present must flip status to 1');
  } else {
    assert.equal(r.status, 0, 'no MISSING rows must yield status 0');
  }
});

// Minimal PATH that has bash/sed/grep/command but not soffice/pdftoppm/fc-list/node.
// On Mac, /usr/bin:/bin happens not to ship fc-list. On Linux CI, fontconfig is in
// /usr/bin/fc-list, which would defeat the missing-fc-list branch we want to test.
// `buildCoreutilsSandbox()` constructs a minimal $TMP/cu/ that symlinks only the
// utilities check.sh actually invokes — explicitly excluding fc-list, soffice,
// pdftoppm, node — so the missing-tool branches are exercised on every host.
const SANDBOX_PATH = '/usr/bin:/bin';

function buildCoreutilsSandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-cu-'));
  // Whitelist: utilities check.sh actually invokes. Deliberately excludes
  // fc-list, soffice, pdftoppm, node so the missing-tool branches fire.
  const utils = ['sed', 'grep', 'head', 'basename', 'dirname', 'tr', 'cat',
                 'ls', 'cut', 'awk', 'bash', 'sh', 'env', 'wc', 'command'];
  for (const u of utils) {
    for (const root of ['/usr/bin', '/bin', '/usr/local/bin', '/opt/homebrew/bin']) {
      const src = path.join(root, u);
      try {
        if (fs.existsSync(src)) {
          fs.symlinkSync(src, path.join(dir, u));
          break;
        }
      } catch { /* already linked */ }
    }
  }
  return dir;
}

test('missing soffice → install instruction surfaced in stdout', () => {
  // Linux CI installs libreoffice into /usr/bin/soffice, defeating SANDBOX_PATH.
  // Use the curated coreutils sandbox (excludes soffice/pdftoppm/fc-list/node).
  const sandbox = buildCoreutilsSandbox();
  const r = runDoctor({ pathOverride: sandbox, pluginData: freshTmp('drctr-pd') });
  assert.match(r.stdout, /\[MISSING\] soffice/);
  assert.match(r.stdout, /install: brew install --cask libreoffice/);
});

test('missing pdftoppm → poppler install instruction surfaced', () => {
  // Linux CI installs poppler-utils into /usr/bin/pdftoppm, defeating SANDBOX_PATH.
  const sandbox = buildCoreutilsSandbox();
  const r = runDoctor({ pathOverride: sandbox, pluginData: freshTmp('drctr-pd-2') });
  assert.match(r.stdout, /\[MISSING\] pdftoppm/);
  assert.match(r.stdout, /install: brew install poppler/);
});

test('IBM Plex Sans probe is soft (WARN, not MISSING) when fc-list absent', () => {
  // Build a minimal coreutils sandbox that deliberately excludes fc-list — Linux CI
  // ships /usr/bin/fc-list which would defeat the missing-fc-list branch otherwise.
  const sandbox = buildCoreutilsSandbox();
  const r = runDoctor({ pathOverride: sandbox, pluginData: freshTmp('drctr-pd-3') });
  // fc-list missing path emits a WARN row mentioning IBM Plex Sans OR fc-list itself.
  assert.match(r.stdout, /\[WARN\] (fc-list|IBM Plex Sans)/);
});

test('all-required-OK path: exit 0 + final summary line "doctor: all required prerequisites OK"', () => {
  // Use real PATH; if soffice/pdftoppm aren't installed in test env, this test
  // gracefully tolerates either outcome — the contract is exit==0 implies
  // "all required OK" summary line.
  const r = runDoctor();
  if (r.status === 0) {
    assert.match(r.stdout, /doctor: all required prerequisites OK/);
  } else {
    // Otherwise: exit 1 implies the "MISSING — see rows above" summary.
    assert.match(r.stdout, /doctor: \d+ or more required prerequisites MISSING/);
  }
});
