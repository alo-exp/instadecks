#!/usr/bin/env node
'use strict';
// cli.js — standalone CLI wrapper around runAnnotate. Per Phase 2 D-06 + ANNO-09.
// Usage: node cli.js <deck.pptx> <findings.json> [outDir]

const fs = require('node:fs');
const path = require('node:path');
const { runAnnotate } = require('./index');

async function main() {
  const [, , deckArg, findingsArg, outDirArg] = process.argv;
  if (!deckArg || !findingsArg) {
    console.error('Usage: node cli.js <deck.pptx> <findings.json> [outDir]');
    process.exit(2);
  }
  const findings = JSON.parse(fs.readFileSync(path.resolve(findingsArg), 'utf8'));
  const result = await runAnnotate({
    deckPath: path.resolve(deckArg),
    findings,
    /* c8 ignore next */ // Defensive: outDir-undefined branch covered indirectly when outDir omitted; truthy branch covered by happy-path subprocess test.
    outDir: outDirArg ? path.resolve(outDirArg) : undefined,
  });
  console.log(JSON.stringify(result, null, 2));
}
/* c8 ignore next */ // Defensive: err.message branch only fires for stack-less throws (rare in Node); err.stack branch is covered.
main().catch(err => { console.error(err.stack || err.message); process.exit(1); });
