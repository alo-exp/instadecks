'use strict';
// tests/tools-lint-doc-size-branches.test.js — Branch coverage for tools/lint-doc-size.js.
// Calls run() in-process so c8 instruments every branch:
//   (a) clean repo passes
//   (b) oversized docs/*.md fails
//   (c) oversized docs/knowledge/*.md fails
//   (d) --orphans detects synthesized unlisted doc
//   (e) --orphans passes when all docs linked
//   (f) missing docs/ directory: walk()'s !existsSync branch
//   (g) --orphans with no INDEX.md: orphan-fallback empty-string branch
//   (h) main() CLI exit-paths (success + violation), via spawnSync

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const TOOL = path.join(__dirname, '..', 'tools', 'lint-doc-size.js');
const { run, parseArgs, capFor } = require(TOOL);

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-doc-size-'));
  fs.mkdirSync(path.join(root, 'docs', 'knowledge'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs', 'lessons'), { recursive: true });
  return root;
}

function writeLines(p, n) {
  fs.writeFileSync(p, Array.from({ length: n }, (_, i) => `line ${i + 1}`).join('\n'));
}

test('case (a) — clean repo passes (no violations)', () => {
  const root = makeRoot();
  writeLines(path.join(root, 'docs', 'A.md'), 50);
  writeLines(path.join(root, 'docs', 'knowledge', '2026-04.md'), 50);
  writeLines(path.join(root, 'docs', 'lessons', '2026-04.md'), 50);
  fs.writeFileSync(path.join(root, 'docs', 'knowledge', 'INDEX.md'),
    'See [A](docs/A.md), [k](docs/knowledge/2026-04.md), [l](docs/lessons/2026-04.md)\n');

  const { violations, fileCount } = run([`--root=${root}`]);
  assert.deepEqual(violations, []);
  assert.equal(fileCount, 4);
});

test('case (b) — oversized docs/*.md flagged at cap 500', () => {
  const root = makeRoot();
  writeLines(path.join(root, 'docs', 'BIG.md'), 501);
  writeLines(path.join(root, 'docs', 'knowledge', 'INDEX.md'), 20);

  const { violations } = run([`--root=${root}`]);
  assert.ok(violations.some((v) => /docs\/BIG\.md:501 exceeds cap of 500/.test(v)), violations.join('\n'));
});

test('case (c) — oversized docs/knowledge/*.md flagged at cap 300', () => {
  const root = makeRoot();
  writeLines(path.join(root, 'docs', 'knowledge', 'INDEX.md'), 20);
  writeLines(path.join(root, 'docs', 'knowledge', '2026-04.md'), 301);

  const { violations } = run([`--root=${root}`]);
  assert.ok(violations.some((v) => /docs\/knowledge\/2026-04\.md:301 exceeds cap of 300/.test(v)), violations.join('\n'));
});

test('case (d) — --orphans flags synthesized unlisted doc', () => {
  const root = makeRoot();
  writeLines(path.join(root, 'docs', 'A.md'), 10);
  writeLines(path.join(root, 'docs', 'ORPHAN.md'), 10);
  fs.writeFileSync(path.join(root, 'docs', 'knowledge', 'INDEX.md'), '[A](docs/A.md)\n');

  const { violations } = run([`--root=${root}`, '--orphans']);
  assert.ok(violations.some((v) => /docs\/ORPHAN\.md: not linked from docs\/knowledge\/INDEX\.md/.test(v)), violations.join('\n'));
});

test('case (e) — --orphans passes when all docs linked', () => {
  const root = makeRoot();
  writeLines(path.join(root, 'docs', 'A.md'), 10);
  writeLines(path.join(root, 'docs', 'B.md'), 10);
  fs.writeFileSync(path.join(root, 'docs', 'knowledge', 'INDEX.md'), '[A](docs/A.md) [B](docs/B.md)\n');

  const { violations, fileCount } = run([`--root=${root}`, '--orphans']);
  assert.deepEqual(violations, []);
  assert.equal(fileCount, 3);
});

test('case (f) — missing docs/ directory: walk early-return branch', () => {
  // Branch: !fs.existsSync(dir) returns out (covers walk()'s early-return).
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-doc-size-nodocs-'));
  const { violations, fileCount } = run([`--root=${root}`]);
  assert.deepEqual(violations, []);
  assert.equal(fileCount, 0);
});

test('case (g) — --orphans with no INDEX.md: empty-string fallback branch', () => {
  // Branch: indexPath does not exist → empty-string fallback (no INDEX.md).
  const root = makeRoot();
  writeLines(path.join(root, 'docs', 'A.md'), 10);
  // Intentionally no docs/knowledge/INDEX.md.

  const { violations } = run([`--root=${root}`, '--orphans']);
  assert.ok(violations.some((v) => /docs\/A\.md: not linked from docs\/knowledge\/INDEX\.md/.test(v)), violations.join('\n'));
});

test('case (h) — CLI main() success + violation exit paths', () => {
  // Success path: clean tmp root with no docs.
  const okRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-doc-size-cli-ok-'));
  const ok = spawnSync(process.execPath, [TOOL, `--root=${okRoot}`], { encoding: 'utf8' });
  assert.equal(ok.status, 0);
  assert.match(ok.stdout, /lint-doc-size: OK \(0 files clean\)/);

  // Violation path: oversized doc.
  const badRoot = makeRoot();
  writeLines(path.join(badRoot, 'docs', 'BIG.md'), 501);
  const bad = spawnSync(process.execPath, [TOOL, `--root=${badRoot}`], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /docs\/BIG\.md:501 exceeds cap of 500/);
});

test('parseArgs defaults', () => {
  // Branch: no flags → defaults.
  const def = parseArgs([]);
  assert.equal(def.orphans, false);
  assert.equal(def.root, process.cwd());
});

test('capFor returns 300 for knowledge/lessons, 500 otherwise', () => {
  assert.equal(capFor('docs/A.md'), 500);
  assert.equal(capFor('docs/knowledge/2026-04.md'), 300);
  assert.equal(capFor('docs/lessons/2026-04.md'), 300);
});
