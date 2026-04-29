#!/usr/bin/env node
'use strict';
// tools/lint-doc-size.js — Phase 10 Gate 7 (HARD-07).
// Walks docs/**/*.md and asserts size caps from docs/doc-scheme.md:
//   - docs/*.md (non-subdir):           ≤ 500 lines
//   - docs/knowledge/*.md, lessons/*.md: ≤ 300 lines
//
// docs/workflows/ and docs/sessions/ are out-of-scope for size caps and
// orphan checks: workflows/ holds scaffolded GSD/silver-bullet reference
// material (not Instadecks-authored), and sessions/ holds per-session logs
// that are append-only and not indexed.
//
// With --orphans: also asserts every doc under docs/ (within scope) is
// referenced (as a substring path) from docs/knowledge/INDEX.md.
//
// Exit 0 on clean, 1 on any violation. CLI flag --root=<dir> overrides
// process.cwd() for hermetic testing.

const fs = require('node:fs');
const path = require('node:path');

function parseArgs(argv) {
  const out = { orphans: false, root: process.cwd() };
  for (const a of argv) {
    if (a === '--orphans') out.orphans = true;
    else if (a.startsWith('--root=')) out.root = a.slice('--root='.length);
  }
  return out;
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.isFile() && p.endsWith('.md')) out.push(p);
  }
  return out;
}

function capFor(relPath) {
  const norm = relPath.split(path.sep).join('/');
  if (/^docs\/(knowledge|lessons)\//.test(norm)) return 300;
  return 500;
}

function run(argv) {
  const { orphans, root } = parseArgs(argv);
  const docsDir = path.join(root, 'docs');
  const allFiles = walk(docsDir);
  // Exclude out-of-scope subtrees (workflows/, sessions/) — see header comment.
  const files = allFiles.filter((abs) => {
    const rel = path.relative(root, abs).split(path.sep).join('/');
    return !/^docs\/(workflows|sessions)\//.test(rel);
  });
  const violations = [];

  for (const abs of files) {
    const rel = path.relative(root, abs).split(path.sep).join('/');
    const lines = fs.readFileSync(abs, 'utf8').split('\n').length;
    const cap = capFor(rel);
    if (lines > cap) {
      violations.push(`${rel}:${lines} exceeds cap of ${cap}`);
    }
  }

  if (orphans) {
    const indexPath = path.join(docsDir, 'knowledge', 'INDEX.md');
    const indexContent = fs.existsSync(indexPath)
      ? fs.readFileSync(indexPath, 'utf8')
      : '';
    for (const abs of files) {
      const rel = path.relative(root, abs).split(path.sep).join('/');
      if (rel === 'docs/knowledge/INDEX.md') continue;
      if (!indexContent.includes(rel)) {
        violations.push(`${rel}: not linked from docs/knowledge/INDEX.md`);
      }
    }
  }

  return { violations, fileCount: files.length };
}

function main(argv = process.argv.slice(2)) {
  const { violations, fileCount } = run(argv);
  if (violations.length) {
    for (const v of violations) console.error(v);
    process.exit(1);
  }
  console.log(`lint-doc-size: OK (${fileCount} files clean)`);
  process.exit(0);
}

if (require.main === module) main();

module.exports = { run, parseArgs, walk, capFor, main };
