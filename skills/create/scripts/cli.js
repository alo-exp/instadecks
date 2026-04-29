#!/usr/bin/env node
'use strict';
// cli.js — Standalone CLI for /instadecks:create. Mirrors skills/review/scripts/cli.js shape.
// Usage: cli.js [outDir] (--brief <path.json> | --brief-text <text> | --brief-md <path.md>
//        | --brief-files <a.pdf,b.docx>) [--run-id <id>] [--out-dir <dir>]
//        [--mode standalone|structured-handoff] [--soft-cap=<accept|stop|continue>]
// Pure JSON to stdout in standalone mode (runCreate prints); errors to stderr.
//
// Plan 9-04 (DV-06/DV-07): polymorphic brief intake. The 4 brief flags are mutually
// exclusive — passing >1 exits with code 2.

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

// Plan 9-04: extension → extract-doc type inference.
function inferTypeFromExt(p) {
  const ext = path.extname(p).toLowerCase();
  if (ext === '.pdf') return 'pdf';
  if (ext === '.docx') return 'docx';
  if (ext === '.md') return 'md';
  if (ext === '.txt' || ext === '.transcript') return 'transcript';
  throw new Error(`cli: cannot infer type for path: ${p}`);
}

function parseArgs(argv) {
  const args = {
    brief: null, briefText: null, briefMd: null, briefFiles: null,
    runId: null, outDir: null, mode: 'standalone', softCap: null, designChoices: null,
    scaffold: null, diversityHistory: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--brief') { args.brief = argv[++i]; }
    else if (a === '--brief-text') { args.briefText = argv[++i]; }
    else if (a === '--brief-md') { args.briefMd = argv[++i]; }
    else if (a === '--brief-files') { args.briefFiles = argv[++i]; }
    else if (a === '--run-id') { args.runId = argv[++i]; }
    else if (a === '--out-dir') { args.outDir = argv[++i]; }
    else if (a === '--mode') { args.mode = argv[++i]; }
    else if (a === '--design-choices') { args.designChoices = argv[++i]; }
    else if (a === '--scaffold') { args.scaffold = argv[++i]; }
    else if (a === '--diversity-history') { args.diversityHistory = argv[++i]; }
    else if (typeof a === 'string' && a.startsWith('--soft-cap=')) {
      args.softCap = parseSoftCapFlag([a]);
    }
    else if (!a.startsWith('--') && !args.outDir) { args.outDir = a; }
    else { throw new Error(`cli.js: unrecognized argument "${a}"`); }
  }
  return args;
}

// Live E2E Iteration 2 Fix #10: --scaffold writes a working starter triplet
// (canonical brief, render-deck template, design-choices envelope) so a
// standalone-mode user has a runnable baseline without authoring from
// cookbook recipes.
function writeScaffold(outDir) {
  const fsm = require('node:fs');
  const pathm = require('node:path');
  const dir = pathm.resolve(outDir);
  fsm.mkdirSync(dir, { recursive: true });
  const briefSrc = pathm.join(__dirname, '..', 'references', 'canonical-brief.example.json');
  fsm.copyFileSync(briefSrc, pathm.join(dir, 'canonical-brief.example.json'));
  const designChoices = {
    palette: {
      name: 'Cobalt Edge',
      primary: '0B2A6B', secondary: '2E4A8C', accent: 'F59E0B', ink: '0B2A6B', muted: '8FA1C7',
      rationale: 'Authoritative finance/board register; cobalt + amber avoid default Office blue.'
    },
    typography: {
      heading: 'IBM Plex Sans', body: 'IBM Plex Sans',
      pairing: 'IBM Plex Sans Bold + IBM Plex Sans Regular',
      rationale: 'Single-family discipline; weight contrast carries hierarchy.'
    },
    motif: 'Quiet diagonals as section bookends; numerals foregrounded; no decorative imagery on data slides.',
    tradeoffs: [
      'Avoided default Office blue to dodge AI-tell',
      'Single typography family for discipline'
    ]
  };
  fsm.writeFileSync(pathm.join(dir, 'design-choices.example.json'),
    JSON.stringify(designChoices, null, 2) + '\n');
  const cjs = `'use strict';
// render-deck.template.cjs — Live E2E Iteration 2 Fix #10 scaffold.
// Replace TITLE/CONTENT placeholders with values from canonical-brief.example.json.
// See skills/create/references/cookbook/*.md for variant recipes.
// Motif: Quiet diagonals as section bookends; numerals foregrounded.

const pptxgen = require('pptxgenjs');
const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';

const PALETTE = { primary: '0B2A6B', secondary: '2E4A8C', accent: 'F59E0B', ink: '0B2A6B', muted: '8FA1C7' };
const TYPE = { heading: 'IBM Plex Sans', body: 'IBM Plex Sans' };
const W = 10, H = 5.625, MARGIN_X = 0.5;

async function main() {
  const slide = pres.addSlide();
  slide.background = { color: 'FFFFFF' };
  slide.addText('Replace with brief.topic', {
    x: MARGIN_X, y: 2.4, w: W - 1.0, h: 1.0,
    fontFace: TYPE.heading, fontSize: 36, bold: true, color: PALETTE.primary, margin: 0,
  });
  await pres.writeFile({ fileName: 'deck.pptx' });
}
main().catch(e => { console.error(e); process.exit(1); });
`;
  fsm.writeFileSync(pathm.join(dir, 'render-deck.template.cjs'), cjs);
  return {
    brief: pathm.join(dir, 'canonical-brief.example.json'),
    designChoices: pathm.join(dir, 'design-choices.example.json'),
    template: pathm.join(dir, 'render-deck.template.cjs'),
  };
}

function countBriefFlags(args) {
  let n = 0;
  if (args.brief) n++;
  if (args.briefText !== null && args.briefText !== undefined) n++;
  if (args.briefMd) n++;
  if (args.briefFiles) n++;
  return n;
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }

  // Live E2E Iteration 2 Fix #10: --scaffold short-circuits before brief checks.
  if (args.scaffold) {
    const written = writeScaffold(args.scaffold);
    process.stdout.write(JSON.stringify(written, null, 2) + '\n');
    return;
  }

  // Plan 9-04: mutual exclusion across the 4 brief flags.
  const briefCount = countBriefFlags(args);
  if (briefCount > 1) {
    process.stderr.write(
      'cli: brief flags are mutually exclusive — pass exactly one of ' +
      '--brief, --brief-text, --brief-md, --brief-files\n',
    );
    process.exit(2);
  }
  if (briefCount === 0) {
    console.error('Usage: cli.js [outDir] (--brief <path.json> | --brief-text <text> | --brief-md <path.md> | --brief-files <a.pdf,b.docx>) [--run-id <id>] [--mode standalone|structured-handoff] [--soft-cap=<accept|stop|continue>]');
    process.exit(1);
  }

  let briefInput;
  if (args.brief) {
    try {
      briefInput = JSON.parse(fs.readFileSync(path.resolve(args.brief), 'utf8'));
    } catch (e) {
      console.error(`cli.js: failed to read --brief: ${e.message}`);
      process.exit(2);
    }
  } else if (args.briefText !== null && args.briefText !== undefined) {
    briefInput = String(args.briefText);
  } else if (args.briefMd) {
    try {
      briefInput = fs.readFileSync(path.resolve(args.briefMd), 'utf8');
    } catch (e) {
      console.error(`cli.js: failed to read --brief-md: ${e.message}`);
      process.exit(2);
    }
  } else {
    // --brief-files
    const paths = args.briefFiles.split(',').map((s) => s.trim()).filter(Boolean);
    let files;
    try {
      files = paths.map((p) => ({ path: path.resolve(p), type: inferTypeFromExt(p) }));
    } catch (e) {
      process.stderr.write(`${e.message}\n`);
      process.exit(2);
    }
    briefInput = { files };
  }

  let designChoices = null;
  /* c8 ignore start */ // Defensive: --design-choices is opt-in (agent-driven path supplies designChoices via direct require, not the standalone CLI); covered by integration tests when invoked end-to-end.
  if (args.designChoices) {
    try {
      designChoices = JSON.parse(fs.readFileSync(path.resolve(args.designChoices), 'utf8'));
    } catch (e) {
      console.error(`cli.js: failed to read --design-choices: ${e.message}`);
      process.exit(2);
    }
  }
  /* c8 ignore stop */
  await runCreate({
    brief: briefInput,
    runId: args.runId || undefined,
    /* c8 ignore next */ // Defensive: outDir-undefined branch covered indirectly when arg omitted in tests; resolve-path branch covered by --out-dir tests.
    outDir: args.outDir ? path.resolve(args.outDir) : undefined,
    mode: args.mode,
    designChoices,
    diversityHistory: args.diversityHistory || undefined,
  });
}

/* c8 ignore next 3 */ // Defensive: require.main guard skips when module is required from tests; main()-rejection .catch err.message branch only fires for stack-less throws.
if (require.main === module) {
  main().catch(e => { console.error(e.stack || e.message); process.exit(3); });
}

module.exports = { isInteractive, parseSoftCapFlag, resolveSoftCap, parseArgs, inferTypeFromExt, countBriefFlags, writeScaffold };
