#!/usr/bin/env node
'use strict';
// tools/validate-cookbook.js — Live-E2E NITPICK #4 fix.
//
// Parses skills/create/references/cookbook.md, extracts every recipe-index link
// of the form `[label](cookbook/<file>.md)`, and asserts the target file exists
// on disk. Exits 0 on success, non-zero (with a list of missing targets) on
// any miss.
//
// Modes:
//   - With no per-recipe link references: exits 0 (inline-recipes mode).
//   - With cookbook.md missing entirely:  exits non-zero.
//
// Usage:
//   node tools/validate-cookbook.js [<dir-containing-cookbook.md>]
//
// Default dir is skills/create/references/. Tests pass an alternate dir to
// exercise the missing-target / inline-only / missing-cookbook branches.

const fs = require('node:fs');
const path = require('node:path');

function main(argv) {
  const arg = argv[2];
  const dir = arg
    ? path.resolve(arg)
    : path.join(__dirname, '..', 'skills', 'create', 'references');

  const cookbookPath = path.join(dir, 'cookbook.md');
  if (!fs.existsSync(cookbookPath)) {
    process.stderr.write(`validate-cookbook: cookbook.md not found at ${cookbookPath}\n`);
    return 1;
  }

  const md = fs.readFileSync(cookbookPath, 'utf8');
  // Match links of the form [label](cookbook/<file>.md). The relative
  // `cookbook/` prefix is required — links to siblings (e.g. design-ideas.md)
  // are out of scope for this gate.
  const re = /\[[^\]]+\]\(cookbook\/([^)\s]+\.md)\)/g;
  const targets = new Set();
  let m;
  while ((m = re.exec(md)) !== null) targets.add(m[1]);

  if (targets.size === 0) {
    // Inline-recipes mode — nothing to validate, exit cleanly.
    process.stdout.write(
      'validate-cookbook: no [label](cookbook/<file>.md) links found — inline-recipes mode, OK\n');
    return 0;
  }

  const missing = [];
  for (const t of targets) {
    const full = path.join(dir, 'cookbook', t);
    if (!fs.existsSync(full)) missing.push(t);
  }

  if (missing.length > 0) {
    process.stderr.write(
      `validate-cookbook: ${missing.length} missing recipe target(s):\n`);
    for (const t of missing) process.stderr.write(`  - cookbook/${t}\n`);
    return 1;
  }

  process.stdout.write(
    `validate-cookbook: all ${targets.size} recipe link(s) resolved ✓\n`);
  return 0;
}

/* c8 ignore next 4 */ // CLI entry — covered via spawnSync in tests/tools-validate-cookbook.test.js.
if (require.main === module) {
  process.exit(main(process.argv));
}

module.exports = { main };
