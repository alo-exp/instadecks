#!/usr/bin/env node
// tools/assert-pptxgenjs-pin.js — Exact-pin assertion for pptxgenjs (FOUND-05).
//
// CLAUDE.md "Locked invariants" #2 mandates pptxgenjs is pinned at exactly
// "4.0.1" with no caret/tilde/range. Bumping requires explicit visual-regression
// sign-off. This script is the CI gate that enforces that invariant.
//
// Usage:
//   node tools/assert-pptxgenjs-pin.js [path/to/package.json]
//
// Exits 0 with "pptxgenjs pin OK: 4.0.1" if dependencies.pptxgenjs === "4.0.1".
// Exits 1 with ::error:: annotation otherwise.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const target = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, '..', 'package.json');

let pkg;
try {
  pkg = JSON.parse(fs.readFileSync(target, 'utf8'));
} catch (err) {
  console.error(`::error::Failed to read ${target}: ${err.message}`);
  process.exit(1);
}

const v = pkg.dependencies && pkg.dependencies.pptxgenjs;

if (v === '4.0.1') {
  console.log('pptxgenjs pin OK: 4.0.1');
  process.exit(0);
}

console.error(
  `::error::pptxgenjs must be exactly "4.0.1", got ${JSON.stringify(v)}. ` +
    'No caret/tilde/range allowed (FOUND-05 invariant).'
);
process.exit(1);
