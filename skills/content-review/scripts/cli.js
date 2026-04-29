#!/usr/bin/env node
'use strict';
// skills/content-review/scripts/cli.js — Standalone CLI for /instadecks-content-review (Plan 06-02).
// Usage: node cli.js <deckPath> --findings <path> [--run-id <id>] [--out-dir <dir>] [--annotate]
// Reads findings JSON from --findings; calls runContentReview({mode:'standalone'}).
// Mirrors skills/review/scripts/cli.js shape; pure JSON to stdout, errors to stderr.

const fs = require('node:fs');
const path = require('node:path');
const { runContentReview } = require('./index');

function parseArgs(argv) {
  const args = { deckPath: null, findings: null, runId: null, outDir: null, annotate: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--findings') { args.findings = argv[++i]; }
    /* c8 ignore next */ // Defensive: --run-id branch covered by integration tests but not by stub branch tests.
    else if (a === '--run-id') { args.runId = argv[++i]; }
    else if (a === '--out-dir' || a === '--out') { args.outDir = argv[++i]; }
    else if (a === '--annotate') { args.annotate = true; }
    else if (!a.startsWith('--') && !args.deckPath) { args.deckPath = a; }
    else { throw new Error(`cli.js: unrecognized argument "${a}"`); }
  }
  return args;
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  if (!args.deckPath) {
    console.error('Usage: cli.js <deckPath> --findings <path> [--run-id <id>] [--out-dir <dir>] [--annotate]');
    process.exit(1);
  }
  if (!args.findings) {
    console.error(
      'Error: --findings <path> required for standalone CLI\n\n' +
      'The content reviewer step (LLM reading slide content, producing findings JSON)\n' +
      'is an agent-mode operation only available when running through Claude Code\n' +
      '(/instadecks-content-review).\n\n' +
      'For standalone CLI usage:\n' +
      '  1. Author findings JSON conforming to skills/review/references/findings-schema.md (v1.1)\n' +
      '  2. Save as findings.json\n' +
      '  3. Run: cli.js --findings findings.json <deck.pptx>\n\n' +
      'Minimal example:\n' +
      '  {\n' +
      '    "schema_version": "1.1",\n' +
      '    "deck": "deck.pptx",\n' +
      '    "generated_at": "<ISO8601>",\n' +
      '    "slides": [{"slideNum": 1, "title": "...", "findings": []}]\n' +
      '  }\n\n' +
      'See skills/review/references/findings-schema.md for the full schema.'
    );
    process.exit(2);
  }
  let findings;
  try {
    findings = JSON.parse(fs.readFileSync(path.resolve(args.findings), 'utf8'));
  } catch (e) {
    console.error(
      `Error: --findings <path> file not found or invalid JSON: ${args.findings}\n\n` +
      'The content reviewer step (LLM reading slide content, producing findings JSON)\n' +
      'is an agent-mode operation only available when running through Claude Code\n' +
      '(/instadecks-content-review).\n\n' +
      'For standalone CLI usage:\n' +
      '  1. Author findings JSON conforming to skills/review/references/findings-schema.md (v1.1)\n' +
      '  2. Save as findings.json\n' +
      '  3. Run: cli.js --findings findings.json <deck.pptx>\n\n' +
      `Underlying error: ${e.message}`
    );
    process.exit(2);
  }
  await runContentReview({
    deckPath: path.resolve(args.deckPath),
    runId: args.runId || undefined,
    outDir: args.outDir ? path.resolve(args.outDir) : undefined,
    mode: 'standalone',
    findings,
    annotate: !!args.annotate,
  });
}

/* c8 ignore next */ // Defensive: err.message branch only fires for stack-less throws (rare in Node); err.stack branch is covered.
main().catch(e => { console.error(e.stack || e.message); process.exit(3); });
