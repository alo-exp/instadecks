'use strict';
// tests/tools-lint-doc-size-branches.test.js — Branch coverage for tools/lint-doc-size.js.
// Five cases:
//   (a) clean repo passes
//   (b) oversized docs/*.md fails
//   (c) oversized docs/knowledge/*.md fails
//   (d) --orphans flag detects a synthesized unlisted doc
//   (e) --orphans flag passes when all docs are linked

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const TOOL = path.join(__dirname, '..', 'tools', 'lint-doc-size.js');

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-doc-size-'));
  fs.mkdirSync(path.join(root, 'docs', 'knowledge'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs', 'lessons'), { recursive: true });
  return root;
}

function writeLines(p, n) {
  fs.writeFileSync(p, Array.from({ length: n }, (_, i) => `line ${i + 1}`).join('\n'));
}

function runTool(root, args = []) {
  return spawnSync(process.execPath, [TOOL, `--root=${root}`, ...args], { encoding: 'utf8' });
}

test('case (a) — clean repo passes', () => {
  const root = makeRoot();
  writeLines(path.join(root, 'docs', 'A.md'), 50);
  writeLines(path.join(root, 'docs', 'knowledge', 'INDEX.md'), 20);
  writeLines(path.join(root, 'docs', 'knowledge', '2026-04.md'), 50);
  writeLines(path.join(root, 'docs', 'lessons', '2026-04.md'), 50);
  // INDEX must reference the other docs for orphan check below
  fs.writeFileSync(path.join(root, 'docs', 'knowledge', 'INDEX.md'),
    'See [A](docs/A.md), [k](docs/knowledge/2026-04.md), [l](docs/lessons/2026-04.md)\n');

  const r = runTool(root);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /lint-doc-size: OK/);
});

test('case (b) — oversized docs/*.md fails', () => {
  const root = makeRoot();
  writeLines(path.join(root, 'docs', 'BIG.md'), 501);
  writeLines(path.join(root, 'docs', 'knowledge', 'INDEX.md'), 20);

  const r = runTool(root);
  assert.equal(r.status, 1);
  assert.match(r.stderr + r.stdout, /docs\/BIG\.md:501 exceeds cap of 500/);
});

test('case (c) — oversized docs/knowledge/*.md fails', () => {
  const root = makeRoot();
  writeLines(path.join(root, 'docs', 'A.md'), 10);
  writeLines(path.join(root, 'docs', 'knowledge', 'INDEX.md'), 20);
  writeLines(path.join(root, 'docs', 'knowledge', '2026-04.md'), 301);

  const r = runTool(root);
  assert.equal(r.status, 1);
  assert.match(r.stderr + r.stdout, /docs\/knowledge\/2026-04\.md:301 exceeds cap of 300/);
});

test('case (d) — --orphans detects synthesized unlisted doc', () => {
  const root = makeRoot();
  writeLines(path.join(root, 'docs', 'A.md'), 10);
  writeLines(path.join(root, 'docs', 'ORPHAN.md'), 10);
  fs.writeFileSync(path.join(root, 'docs', 'knowledge', 'INDEX.md'),
    '[A](docs/A.md)\n');

  const r = runTool(root, ['--orphans']);
  assert.equal(r.status, 1);
  assert.match(r.stderr + r.stdout, /docs\/ORPHAN\.md: not linked from docs\/knowledge\/INDEX\.md/);
});

test('case (e) — --orphans passes when all docs linked', () => {
  const root = makeRoot();
  writeLines(path.join(root, 'docs', 'A.md'), 10);
  writeLines(path.join(root, 'docs', 'B.md'), 10);
  fs.writeFileSync(path.join(root, 'docs', 'knowledge', 'INDEX.md'),
    '[A](docs/A.md) [B](docs/B.md)\n');

  const r = runTool(root, ['--orphans']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /lint-doc-size: OK/);
});
