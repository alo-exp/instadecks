'use strict';

// HARD-11 — automated permission-mode coverage.
// Replaces the manual matrix in tests/PERMISSION-MODE.md.
// Asserts every subprocess command our skill scripts actually invoke is
// covered by the skill's `allowed-tools` frontmatter list, in BOTH `default`
// and `dontAsk` simulation modes.

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const {
  parseAllowedTools,
  extractSubprocessCalls,
  simulatePermissionMode,
} = require('./lib/permission-walker.js');

const fs = require('node:fs');
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SKILLS = ['create', 'review', 'content-review', 'annotate', 'doctor'];

function skillMdPath(skill) {
  const cmd = path.join(REPO_ROOT, 'commands', `instadecks-${skill}.md`);
  return fs.existsSync(cmd) ? cmd : path.join(REPO_ROOT, 'skills', skill, 'SKILL.md');
}

for (const skill of SKILLS) {
  test(`permission-mode — /instadecks:${skill} default mode covers all subprocess calls`, () => {
    const allowed = parseAllowedTools(skillMdPath(skill));
    const calls = extractSubprocessCalls(path.join(REPO_ROOT, 'skills', skill, 'scripts'));
    const r = simulatePermissionMode(allowed, calls, 'default');
    assert.ok(
      r.passes,
      `${skill} (default): missing allowed-tools entries for: ${r.missing.join(', ')}.\n` +
      `  Calls detected: ${[...calls].join(', ') || '(none)'}\n` +
      `  Allowed-tools: ${allowed.join(', ')}`,
    );
  });

  test(`permission-mode — /instadecks:${skill} dontAsk mode covers all subprocess calls`, () => {
    const allowed = parseAllowedTools(skillMdPath(skill));
    const calls = extractSubprocessCalls(path.join(REPO_ROOT, 'skills', skill, 'scripts'));
    const r = simulatePermissionMode(allowed, calls, 'dontAsk');
    assert.ok(
      r.passes,
      `${skill} (dontAsk): missing allowed-tools entries for: ${r.missing.join(', ')}.\n` +
      `  Calls detected: ${[...calls].join(', ') || '(none)'}\n` +
      `  Allowed-tools: ${allowed.join(', ')}`,
    );
  });
}
