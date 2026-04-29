'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { auditSkill, run } = require('../tools/audit-allowed-tools');

function tmpSkill(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-tools-'));
  const p = path.join(dir, 'SKILL.md');
  fs.writeFileSync(p, content);
  return { dir, p };
}

const GREEN = `---
name: x
description: a test skill
allowed-tools:
  - Bash(node:*)
  - Bash(soffice:*)
  - Read
  - Write
user-invocable: true
---

body
`;

const RED_WILDCARD = `---
name: x
description: a test skill
allowed-tools:
  - Bash(*)
  - Read
---

body
`;

const RED_BARE = `---
name: x
description: a test skill
allowed-tools:
  - Bash
  - Read
---

body
`;

const RED_UNSCOPED = `---
name: x
description: a test skill
allowed-tools:
  - Bash(node)
  - Read
---

body
`;

const RED_MISSING = `---
name: x
description: a test skill
user-invocable: true
---

body
`;

test('green: scoped Bash(<cmd>:*) entries pass', () => {
  const { p } = tmpSkill(GREEN);
  const r = auditSkill(p);
  assert.equal(r.ok, true);
  assert.deepEqual(r.violations, []);
});

test('red: Bash(*) is rejected as unscoped-bash-wildcard', () => {
  const { p } = tmpSkill(RED_WILDCARD);
  const r = auditSkill(p);
  assert.equal(r.ok, false);
  assert.equal(r.violations.length, 1);
  assert.equal(r.violations[0].reason, 'unscoped-bash-wildcard');
});

test('red: bare Bash (no parens) is rejected as bare-bash', () => {
  const { p } = tmpSkill(RED_BARE);
  const r = auditSkill(p);
  assert.equal(r.ok, false);
  assert.equal(r.violations[0].reason, 'bare-bash');
});

test('red: Bash(node) without :* is rejected as bash-missing-arg-wildcard', () => {
  const { p } = tmpSkill(RED_UNSCOPED);
  const r = auditSkill(p);
  assert.equal(r.ok, false);
  assert.equal(r.violations[0].reason, 'bash-missing-arg-wildcard');
});

test('red: missing allowed-tools key is rejected', () => {
  const { p } = tmpSkill(RED_MISSING);
  const r = auditSkill(p);
  assert.equal(r.ok, false);
  assert.equal(r.violations[0].reason, 'missing-allowed-tools');
});

test('run() globs skills/* and returns aggregate', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-run-'));
  fs.mkdirSync(path.join(root, 'skills', 'a'), { recursive: true });
  fs.mkdirSync(path.join(root, 'skills', 'b'), { recursive: true });
  fs.writeFileSync(path.join(root, 'skills', 'a', 'SKILL.md'), GREEN);
  fs.writeFileSync(path.join(root, 'skills', 'b', 'SKILL.md'), RED_WILDCARD);
  const r = run(root);
  assert.equal(r.ok, false);
  assert.equal(r.results.length, 2);
});

test('run() scans commands/*.md for allowed-tools violations', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-cmd-'));
  fs.mkdirSync(path.join(root, 'commands'));
  fs.writeFileSync(path.join(root, 'commands', 'my-cmd.md'), GREEN);
  fs.writeFileSync(path.join(root, 'commands', 'bad-cmd.md'), RED_WILDCARD);
  // A commands doc with no frontmatter at all (null return) — should be silently skipped
  fs.writeFileSync(path.join(root, 'commands', 'no-fm.md'), '# Just a doc\n\nNo frontmatter here.');
  // A commands doc with missing-allowed-tools — should also be silently skipped
  fs.writeFileSync(path.join(root, 'commands', 'no-tools.md'), RED_MISSING);
  const r = run(root);
  assert.equal(r.ok, false);
  assert.equal(r.results.length, 2); // my-cmd + bad-cmd; no-fm and no-tools skipped
});

test('run() returns error when no skills or commands directories exist', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-empty-'));
  const r = run(root);
  assert.equal(r.ok, false);
  assert.ok(r.error && r.error.includes('no command or skill files found'));
});
