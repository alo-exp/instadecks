#!/usr/bin/env node
'use strict';
// cli.js — Standalone CLI for /instadecks:create. Mirrors skills/review/scripts/cli.js shape.
// Usage: cli.js [outDir] --brief <path> [--run-id <id>] [--out-dir <dir>] [--mode standalone|structured-handoff]
//        [--soft-cap=<accept|stop|continue>]
// Pure JSON to stdout in standalone mode (runCreate prints); errors to stderr.
//
// Soft-cap helpers (Phase 5 D-05 / Q-5): the helpers below are exported for the agent-mode
// SKILL.md playbook to consume AND for non-interactive standalone runs (CI). For v0.1.0 the
// CLI does NOT drive a multi-cycle loop on its own; the helpers exist as a clean surface so
// callers can resolve cycle-5 fallback behavior consistently.

const fs = require('node:fs');
const path = require('node:path');
const { runCreate } = require('./index');

const SOFT_CAP_VALUES = ['accept', 'stop', 'continue'];

function isInteractive() {
  if (process.env.CI === '1' || process.env.CI === 'true') return false;
  if (process.env.NON_INTERACTIVE === '1') return false;
  if (!process.stdout.isTTY) return false;
  return true;
}

function parseSoftCapFlag(argv) {
  const flag = (argv || []).find(a => typeof a === 'string' && a.startsWith('--soft-cap='));
  if (!flag) return null;
  const val = flag.slice('--soft-cap='.length);
  if (!SOFT_CAP_VALUES.includes(val)) {
    throw new Error(
      `--soft-cap must be one of: accept, stop, continue (got ${JSON.stringify(val)})`,
    );
  }
  return val;
}

function resolveSoftCap(softCapFlag) {
  if (softCapFlag) return softCapFlag;
  if (!isInteractive()) {
    process.stderr.write(
      'Instadecks: cycle 5 reached without convergence; non-interactive mode → ' +
      'accepting current deck. Use --soft-cap=stop or interactive run for choice.\n',
    );
    return 'accept';
  }
  // Interactive standalone CLI path — for v0.1.0 we still default to accept with warning;
  // full AskUserQuestion is agent-mode only (D-05).
  process.stderr.write(
    'Instadecks: cycle 5 reached without convergence; defaulting to accept. ' +
    'Use --soft-cap=stop to override.\n',
  );
  return 'accept';
}

function parseArgs(argv) {
  const args = { brief: null, runId: null, outDir: null, mode: 'standalone', softCap: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--brief') { args.brief = argv[++i]; }
    else if (a === '--run-id') { args.runId = argv[++i]; }
    else if (a === '--out-dir') { args.outDir = argv[++i]; }
    else if (a === '--mode') { args.mode = argv[++i]; }
    else if (typeof a === 'string' && a.startsWith('--soft-cap=')) {
      args.softCap = parseSoftCapFlag([a]);
    }
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
    console.error('Usage: cli.js [outDir] --brief <path> [--run-id <id>] [--mode standalone|structured-handoff] [--soft-cap=<accept|stop|continue>]');
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

if (require.main === module) {
  main().catch(e => { console.error(e.stack || e.message); process.exit(3); });
}

module.exports = { isInteractive, parseSoftCapFlag, resolveSoftCap, parseArgs };
