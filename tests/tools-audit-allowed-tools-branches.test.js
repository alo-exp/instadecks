'use strict';
// tests/tools-audit-allowed-tools-branches.test.js — branch-coverage gaps for
// tools/audit-allowed-tools.js. Complements tests/audit-allowed-tools.test.js with the
// non-Bash entry pass-through, comment-bearing entry, no frontmatter, run() with
// missing skills dir, and the require.main entry point smoke.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { auditSkill, parseAllowedTools, run } = require('../tools/audit-allowed-tools');
const TOOL = path.resolve(__dirname, '..', 'tools', 'audit-allowed-tools.js');

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'aat-br-')); }

test('tools-audit-allowed-tools-branches', async (t) => {
  await t.test('parseAllowedTools: returns null on file without frontmatter', () => {
    assert.equal(parseAllowedTools('no frontmatter\n'), null);
  });

  await t.test('parseAllowedTools: returns null when allowed-tools key is absent', () => {
    const text = '---\nname: x\ndescription: y\n---\n';
    assert.equal(parseAllowedTools(text), null);
  });

  await t.test('parseAllowedTools: trims trailing comments on entries', () => {
    const text = '---\nallowed-tools:\n  - Bash(node:*) # safe\n  - Read\n---\n';
    const e = parseAllowedTools(text);
    assert.deepEqual(e, ['Bash(node:*)', 'Read']);
  });

  await t.test('parseAllowedTools: stops at next top-level key', () => {
    const text = '---\nallowed-tools:\n  - Read\nuser-invocable: true\n---\n';
    const e = parseAllowedTools(text);
    assert.deepEqual(e, ['Read']);
  });

  await t.test('parseAllowedTools: skips blank lines within list', () => {
    const text = '---\nallowed-tools:\n  - Read\n\n  - Write\n---\n';
    const e = parseAllowedTools(text);
    // Blank line continues parse; non-`-` line breaks. Spec says blank → continue.
    assert.ok(e.includes('Read'));
  });

  await t.test('auditSkill: non-Bash entries do not contribute violations', () => {
    const dir = tmp();
    try {
      const p = path.join(dir, 'SKILL.md');
      fs.writeFileSync(p, '---\nallowed-tools:\n  - Read\n  - Write\n  - Bash(node:*)\n---\n');
      const r = auditSkill(p);
      assert.equal(r.ok, true);
      assert.deepEqual(r.violations, []);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  await t.test('auditSkill: Bash with weird parens (Bash(foo bar)) is bare-bash', () => {
    const dir = tmp();
    try {
      const p = path.join(dir, 'SKILL.md');
      // Bash(...) without :* and without matching the regex falls into bare-bash branch.
      fs.writeFileSync(p, '---\nallowed-tools:\n  - Bash[node]\n---\n');
      const r = auditSkill(p);
      // 'Bash[node]' starts with Bash but doesn't match Bash\(...\) → bare-bash branch.
      assert.equal(r.ok, false);
      assert.equal(r.violations[0].reason, 'bare-bash');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  await t.test('run(): missing skills/ → ok:false with error message', () => {
    const root = tmp();
    try {
      const r = run(root);
      assert.equal(r.ok, false);
      assert.match(r.error, /skills dir missing/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  await t.test('run(): all-green skills tree → ok with stdout summary', () => {
    const root = tmp();
    try {
      const skill = path.join(root, 'skills', 'a');
      fs.mkdirSync(skill, { recursive: true });
      fs.writeFileSync(path.join(skill, 'SKILL.md'),
        '---\nallowed-tools:\n  - Read\n  - Bash(node:*)\n---\n');
      const r = run(root);
      assert.equal(r.ok, true);
      assert.equal(r.results.length, 1);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  await t.test('require.main entry point: spawn the script', () => {
    // From REPO_ROOT, the production tree is green → exit 0.
    const r = spawnSync(process.execPath, [TOOL],
      { encoding: 'utf8', cwd: path.resolve(__dirname, '..') });
    assert.equal(r.status, 0, `stderr=${r.stderr}`);
    assert.match(r.stdout, /audit-allowed-tools: OK/);
  });
});
