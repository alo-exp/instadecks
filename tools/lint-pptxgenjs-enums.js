#!/usr/bin/env node
'use strict';
// tools/lint-pptxgenjs-enums.js — Layer-1 CI gate for CRT-15 / D-05.
// Walks tracked source under skills/ and tests/fixtures/ for
// /addShape\s*\(\s*['"]\w+['"]/ literals. Exit 0 on clean; exit 1 with
// file:line on first violation.
//
// Aligned with skills/create/scripts/lib/enum-lint.js (Layer 2 runtime gate).

const fs = require('node:fs');
const path = require('node:path');

const ROOTS = ['skills', 'tests/fixtures'];
const EXTS = new Set(['.js', '.cjs', '.md']);
const RE = /addShape\s*\(\s*['"](\w+)['"]/;
const ALLOW_MARKER = /enum-lint-allow/;

// Allow-list: file paths exempt from this lint.
// - tests/fixtures/bad-render-deck.cjs: intentional negative fixture for
//   skills/create/scripts/lib/enum-lint.js tests.
// - skills/annotate/scripts/annotate.js: SHA-pinned binary asset per
//   CLAUDE.md locked invariants (verbatim from v5-blue-prestige). Cannot
//   be modified to add inline allow-markers.
const ALLOW = new Set([
  path.join('tests', 'fixtures', 'bad-render-deck.cjs'),
  path.join('skills', 'annotate', 'scripts', 'annotate.js'),
]);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(p, out);
    } else if (EXTS.has(path.extname(ent.name))) {
      out.push(p);
    }
  }
  return out;
}

function main() {
  const cwd = process.cwd();
  const files = ROOTS.flatMap(r => walk(path.join(cwd, r)));
  const violations = [];
  for (const f of files) {
    const rel = path.relative(cwd, f);
    if (ALLOW.has(rel)) continue;
    const src = fs.readFileSync(f, 'utf8');
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const m = line.match(RE);
      if (m && !ALLOW_MARKER.test(line)) {
        violations.push(
          `${rel}:${i + 1} addShape() string literal "${m[1]}" — use pres.shapes.${m[1].toUpperCase()} (CRT-15)`
        );
        break; // first violation per file is enough
      }
    }
  }
  if (violations.length) {
    for (const v of violations) console.error(v);
    process.exit(1);
  }
  console.log(`lint-pptxgenjs-enums: ${files.length} files clean`);
  process.exit(0);
}

main();
