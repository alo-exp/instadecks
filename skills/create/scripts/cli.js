#!/usr/bin/env node
'use strict';
// cli.js — Standalone CLI for /instadecks:create. Mirrors skills/review/scripts/cli.js shape.
// Usage: cli.js [outDir] --brief <path> [--run-id <id>] [--out-dir <dir>] [--mode standalone|structured-handoff]
// Pure JSON to stdout in standalone mode (runCreate prints); errors to stderr.

const fs = require('node:fs');
const path = require('node:path');
const { runCreate } = require('./index');

function parseArgs(argv) {
  const args = { brief: null, runId: null, outDir: null, mode: 'standalone' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--brief') { args.brief = argv[++i]; }
    else if (a === '--run-id') { args.runId = argv[++i]; }
    else if (a === '--out-dir') { args.outDir = argv[++i]; }
    else if (a === '--mode') { args.mode = argv[++i]; }
    else if (!a.startsWith('--') && !args.outDir) { args.outDir = a; }
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
  if (!args.brief) {
    console.error('Usage: cli.js [outDir] --brief <path> [--run-id <id>] [--mode standalone|structured-handoff]');
    process.exit(1);
  }
  let brief;
  try {
    brief = JSON.parse(fs.readFileSync(path.resolve(args.brief), 'utf8'));
  } catch (e) {
    console.error(`cli.js: failed to read --brief: ${e.message}`);
    process.exit(2);
  }
  await runCreate({
    brief,
    runId: args.runId || undefined,
    outDir: args.outDir ? path.resolve(args.outDir) : undefined,
    mode: args.mode,
  });
}

main().catch(e => { console.error(e.stack || e.message); process.exit(3); });
