#!/usr/bin/env node
'use strict';
// cli.js — standalone CLI wrapper around runAnnotate. Per Phase 2 D-06 + ANNO-09.
// Usage (positional):  node cli.js <deck.pptx> <findings.json> [outDir]
// Usage (named flags): node cli.js --deck <deck.pptx> --findings <findings.json> [--out-dir <outDir>]
// Iter3-4: named flags added for parity with /create, /review, /content-review.

const fs = require('node:fs');
const path = require('node:path');
const { runAnnotate } = require('./index');

function parseArgs(argv) {
  const args = { deck: null, findings: null, outDir: null };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--deck') { args.deck = argv[++i]; }
    else if (a === '--findings') { args.findings = argv[++i]; }
    else if (a === '--out-dir' || a === '--out') { args.outDir = argv[++i]; }
    else if (typeof a === 'string' && a.startsWith('--')) {
      throw new Error(`cli.js: unrecognized argument "${a}"`);
    }
    else { positional.push(a); }
  }
  // Fill from positionals only when corresponding named flag absent (backward compat).
  if (!args.deck && positional[0]) args.deck = positional[0];
  if (!args.findings && positional[1]) args.findings = positional[1];
  if (!args.outDir && positional[2]) args.outDir = positional[2];
  return args;
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }
  if (!parsed.deck || !parsed.findings) {
    console.error(
      'Usage: node cli.js <deck.pptx> <findings.json> [outDir]\n' +
      '   or: node cli.js --deck <deck.pptx> --findings <findings.json> [--out-dir <outDir>]'
    );
    process.exit(2);
  }
  const findings = JSON.parse(fs.readFileSync(path.resolve(parsed.findings), 'utf8'));
  const result = await runAnnotate({
    deckPath: path.resolve(parsed.deck),
    findings,
    /* c8 ignore next */ // Defensive: outDir-undefined branch covered indirectly when outDir omitted; truthy branch covered by happy-path subprocess test.
    outDir: parsed.outDir ? path.resolve(parsed.outDir) : undefined,
  });
  console.log(JSON.stringify(result, null, 2));
}
/* c8 ignore next */ // Defensive: err.message branch only fires for stack-less throws (rare in Node); err.stack branch is covered.
main().catch(err => { console.error(err.stack || err.message); process.exit(1); });
