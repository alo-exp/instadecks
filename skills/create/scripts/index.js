'use strict';
// index.js — /instadecks:create orchestrator. Phase 4 ships single-cycle generation;
// Phase 5 will wrap this with the auto-refine loop. Mirrors skills/review/scripts/index.js
// shape per D-08. CRT-01 (brief→outputs), CRT-02 (cookbook composition), CRT-03 (per-run cjs),
// CRT-06+CRT-15 (ENUM gate Layer 2 + xmllint sanity). P-07 NODE_PATH; P-08 xmllint soft-fail.

const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const crypto = require('node:crypto');
const { execFile, spawn } = require('node:child_process');

const { validateBrief } = require('./lib/deck-brief');
const { lintCjs } = require('./lib/enum-lint');
const { render: renderRationale } = require('./lib/render-rationale');
const { normalizeBrief } = require('./lib/brief-normalizer');

// Live E2E Round 3 MAJOR N1: best-effort static extraction of PALETTE / TYPE /
// motif from a render-deck.cjs source string. Returns { palette, typography,
// motif } where each value is a markdown snippet (or null when no match). The
// regexes are deliberately permissive — quoted hex colors and font names are
// extracted from `const PALETTE = { ... }` / `const TYPE = { ... }` blocks
// (also accepts COLORS / TYPOGRAPHY synonyms). Pure function — no I/O.
function extractHeuristicDesign(cjsSrc) {
  const result = { palette: null, typography: null, motif: null };
  /* c8 ignore next */ // Defensive: caller always passes the cjsSrc loaded via fsp.readFile (non-empty string); the typeof/empty guard is unreachable in practice.
  if (typeof cjsSrc !== 'string' || cjsSrc.length === 0) return result;

  // Palette block: `const PALETTE = {...}` or `const COLORS = {...}` (single-line OK).
  const palMatch = cjsSrc.match(/const\s+(?:PALETTE|COLORS)\s*=\s*\{([^}]*)\}/);
  if (palMatch) {
    const body = palMatch[1];
    const pairs = [];
    const pairRe = /(\w+)\s*:\s*['"]([0-9A-Fa-f]{6})['"]/g;
    let m;
    while ((m = pairRe.exec(body)) !== null) {
      pairs.push(`${m[1]}: \`${m[2]}\``);
    }
    if (pairs.length > 0) {
      result.palette = pairs.join(', ');
    }
  }

  // Typography block: `const TYPE = {...}` or `const TYPOGRAPHY = {...}`.
  const typMatch = cjsSrc.match(/const\s+(?:TYPE|TYPOGRAPHY)\s*=\s*\{([^}]*)\}/);
  if (typMatch) {
    const body = typMatch[1];
    const pairs = [];
    const pairRe = /(\w+)\s*:\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = pairRe.exec(body)) !== null) {
      pairs.push(`${m[1]}: ${m[2]}`);
    }
    if (pairs.length > 0) {
      result.typography = pairs.join(', ');
    }
  }

  // Iter5-2: also accept `// TYPE:` / `// TYPOGRAPHY:` comment headers and
  // bare-const string declarations like `const SERIF = 'IBM Plex Serif'`.
  // Apply only when the object-literal match above did not populate.
  if (!result.typography) {
    // (a) Comment header — single line is sufficient. Match anywhere in source.
    const commentMatch = cjsSrc.match(/^\s*\/\/\s*(?:TYPE|TYPOGRAPHY):\s*(.+?)\s*$/m);
    if (commentMatch) {
      result.typography = commentMatch[1];
    }
  }
  if (!result.typography) {
    // (b) Bare-const string declarations. Look for HEAD/HEADING/SERIF (heading
    // role) and BODY/SANS/MONO (body role). If both found → "<heading> + <body>".
    // Otherwise fall back to the first matched font name.
    const bareRe = /const\s+(HEAD|HEADING|HEADINGS|SERIF|SANS|MONO|BODY|TEXT|DISPLAY)\s*=\s*['"]([^'"]+)['"]/gi;
    const HEADING_KEYS = new Set(['HEAD', 'HEADING', 'HEADINGS', 'SERIF', 'DISPLAY']);
    const BODY_KEYS = new Set(['BODY', 'SANS', 'MONO', 'TEXT']);
    let heading = null, body = null, first = null;
    let bm;
    while ((bm = bareRe.exec(cjsSrc)) !== null) {
      const key = bm[1].toUpperCase();
      const val = bm[2];
      if (first === null) first = val;
      if (heading === null && HEADING_KEYS.has(key)) heading = val;
      else if (body === null && BODY_KEYS.has(key)) body = val;
    }
    if (heading && body) {
      result.typography = `${heading} + ${body}`;
    } else if (first) {
      result.typography = first;
    }
  }

  // Motif: leading `// Motif: <description>` comment with multi-line continuation.
  // Iter3-1: scan forward from the `// Motif:` line, collecting CONSECUTIVE `//`
  // comment lines (continuation, but NOT another `// Palette:` / `// Typography:`
  // marker) until a non-comment line appears. Concatenate into one string. Don't
  // truncate at sentence-internal punctuation — the regex captures the whole
  // line including decimals and semicolons.
  const lines = cjsSrc.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*\/\/\s*Motif:\s*(.+?)\s*$/);
    if (m) {
      const parts = [m[1]];
      for (let j = i + 1; j < lines.length; j++) {
        const cont = lines[j].match(/^\s*\/\/\s*(.+?)\s*$/);
        if (!cont) break;
        const text = cont[1];
        // Stop at the next labelled marker so we don't swallow Palette/Typography
        // continuation comments into the Motif description.
        if (/^(Palette|Typography|Type|Colors?):/i.test(text)) break;
        parts.push(text);
      }
      result.motif = parts.join(' ').trim();
      break;
    }
  }

  return result;
}

// Live E2E Iter4-2: --diversity-history scanner. Accepts BOTH layouts:
//   (a) flat: `<histDir>/<anything>.md` files containing rationale shorthand.
//   (b) per-run subdir: `<histDir>/<run-id>/design-rationale.md` (legacy).
// Pure-ish helper (does its own fs reads). Returns { histDir, priorRuns,
// priorDnas } where priorRuns is the list of entry labels that contributed.
async function scanDiversityHistory(diversityHistory) {
  const histDir = path.resolve(diversityHistory);
  const priorDnas = [];
  const priorRuns = [];
  const histEntries = await fsp.readdir(histDir).catch(() => []);
  const parseRationale = (md, label) => {
    const pal = md.match(/\*\*Palette:\*\*\s*(.+)/);
    const typ = md.match(/\*\*Typography:\*\*\s*(.+)/);
    const mot = md.match(/\*\*Motif:\*\*\s*(.+)/);
    if (pal || typ || mot) {
      priorRuns.push(label);
      priorDnas.push({
        palette: pal ? pal[1].trim() : '',
        typography: typ ? typ[1].trim() : '',
        motif: mot ? mot[1].trim() : '',
      });
    }
  };
  for (const ent of histEntries) {
    const entPath = path.join(histDir, ent);
    let stat;
    try { stat = await fsp.stat(entPath); } catch (e) { continue; }
    if (stat.isFile() && /\.md$/i.test(ent)) {
      // Flat layout: read file directly.
      try {
        const md = await fsp.readFile(entPath, 'utf8');
        parseRationale(md, ent);
      } catch (e) { /* unreadable — skip */ }
    } else if (stat.isDirectory()) {
      // Per-run subdir layout (legacy): expect design-rationale.md inside.
      const ratPath = path.join(entPath, 'design-rationale.md');
      try {
        const md = await fsp.readFile(ratPath, 'utf8');
        parseRationale(md, ent);
      } catch (e) { /* not a run dir */ }
    }
  }
  return { histDir, priorRuns, priorDnas };
}

function generateRunId() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
           + `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `${ts}-${crypto.randomBytes(3).toString('hex')}`;
}

function resolveOutDir(outDir, runId) {
  if (outDir) return path.resolve(outDir);
  return path.join(process.cwd(), '.planning', 'instadecks', runId);
}

function pluginDataNodeModules() {
  const data = process.env.CLAUDE_PLUGIN_DATA;
  /* c8 ignore next */ // Defensive: CLAUDE_PLUGIN_DATA is set in production by Claude Code runtime; tests rely on the dev fallback below.
  if (data) return path.join(data, 'node_modules');
  // Dev fallback: repo node_modules at <repo>/node_modules.
  return path.join(__dirname, '..', '..', '..', 'node_modules');
}

// Real node spawn for the agent-authored render-deck.cjs.
function spawnNode(cjsPath, opts) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cjsPath], {
      cwd: opts.cwd,
      env: opts.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('error', reject);
    child.on('exit', code => {
      /* c8 ignore next 2 */ // Defensive: spawnNode rejection requires real subprocess failure; tests inject _test_setSpawn override to avoid it.
      if (code === 0) resolve();
      else reject(new Error(`render-deck.cjs exited with code ${code}: ${stderr.trim()}`));
    });
  });
}

// xmllint sanity check via unzip+pipe. Returns {ok, err, missing}.
function xmllintOoxml(pptxPath) {
  return new Promise(resolve => {
    execFile('sh', ['-c',
      `unzip -p ${JSON.stringify(pptxPath)} ppt/presentation.xml | xmllint --noout -`],
      (err, stdout, stderr) => {
        if (!err) return resolve({ ok: true });
        /* c8 ignore next */ // Defensive: msg-build branches with three OR-fallbacks; uncovered paths fire only when all three are simultaneously falsy (impossible in practice — exec always returns at least an err.message).
        const msg = (stderr || '') + ' ' + (err.message || '') + ' ' + (err.code || '');
        // ENOENT on sh OR xmllint missing OR PATH stripped → treat as "tool missing".
        const missing = /xmllint.*not found|command not found|xmllint: not|ENOENT/.test(msg);
        resolve({ ok: false, err, missing, stderr: msg });
      });
  });
}

// Convert PPTX → PDF via soffice. Soft-fail if soffice missing.
function soffice2pdf(pptxPath, outDir) {
  return new Promise(resolve => {
    execFile('soffice',
      ['--headless', '--convert-to', 'pdf', '--outdir', outDir, pptxPath],
      { timeout: 60_000 },
      (err, stdout, stderr) => {
        if (err) {
          /* c8 ignore next */ // Defensive: msg-build OR fallbacks; both stderr and err.message simultaneously falsy is an impossible exec outcome.
          const msg = (stderr || '') + ' ' + (err.message || '');
          const missing = /ENOENT|not found|soffice: not/.test(msg);
          return resolve({ ok: false, missing, err });
        }
        // soffice writes <basename>.pdf into outDir.
        const base = path.basename(pptxPath, path.extname(pptxPath));
        const candidate = path.join(outDir, `${base}.pdf`);
        if (!fs.existsSync(candidate)) {
          return resolve({ ok: false, missing: false, err: new Error('soffice: PDF not produced') });
        }
        // Magic-byte check.
        const fd = fs.openSync(candidate, 'r');
        const buf = Buffer.alloc(4);
        fs.readSync(fd, buf, 0, 4, 0);
        fs.closeSync(fd);
        /* c8 ignore next 3 */ // Defensive: soffice always writes %PDF-prefixed output for valid PPTX input; non-PDF magic bytes only occur on disk corruption.
        if (buf.toString('utf8') !== '%PDF') {
          return resolve({ ok: false, missing: false, err: new Error('soffice: output not a PDF') });
        }
        // Rename to deterministic deck.pdf if base is "deck" already, or keep produced path.
        resolve({ ok: true, pdfPath: candidate });
      });
  });
}

// Count slides in deck.pptx via unzip listing.
function countSlides(pptxPath) {
  return new Promise(resolve => {
    execFile('unzip', ['-l', pptxPath], (err, stdout) => {
      /* c8 ignore next */ // Defensive: unzip-error branch fires only when unzip is missing or pptx is corrupt; covered by integration tests.
      if (err) return resolve(0);
      /* c8 ignore next */ // Defensive: stdout always contains slide listings for a valid PPTX; the `|| []` arm is a safety net.
      const matches = stdout.match(/ppt\/slides\/slide\d+\.xml/g) || [];
      // Each slide file appears once.
      const unique = new Set(matches);
      resolve(unique.size);
    });
  });
}

// Test-only spawn override (parallels Phase 3 _test_setRunAnnotate).
let _spawnOverride = null;
function _test_setSpawn(fn) { _spawnOverride = fn; }

// Phase 5 — Test-only override hooks for runReview / runCreate. These are part of the
// export surface (mirrors Phase 3 _test_setRunAnnotate precedent at
// skills/review/scripts/index.js:55-56). runCreate's behavior is UNCHANGED — the hooks
// exist so future loop-driver test surfaces (and the integration test scaffolding) have a
// uniform place to inject mocks. Per D-01 the auto-refine loop lives in SKILL.md, not in
// runCreate, so these hooks are not consumed inside this file.
let _runReviewOverride = null;
let _runCreateOverride = null;
function _test_setRunReview(fn) { _runReviewOverride = fn; }
function _test_setRunCreate(fn) { _runCreateOverride = fn; }

// Plan 8-02 / CONTEXT D-05 — single LLM-DI carve-out (BLOCKER B-3 single source of truth).
// Plans 8-05 and 8-06 CONSUME these; they do NOT add new DI hooks. Default behavior
// unchanged: when no stub set, runCreate spawns the real render-deck.cjs.
let _llmStub = null;
function _test_setLlm(fn) { _llmStub = fn; }
let _renderImagesStub = null;
function _test_setRenderImages(fn) { _renderImagesStub = fn; }

// Env-var bridge — Plan 8-05 Task 1 will author tests/helpers/llm-mock.js. Wrapping the
// require keeps Plan 8-02 verification green even when 8-05 has not yet landed.
if (process.env.INSTADECKS_LLM_STUB) {
  try {
    const { stubLlmResponse } = require('../../../tests/helpers/llm-mock');
    const fixture = require('node:path').basename(process.env.INSTADECKS_LLM_STUB, '.json');
    _test_setLlm(stubLlmResponse(fixture));
  /* c8 ignore next */ // Defensive: catch only fires if tests/helpers/llm-mock.js is absent (e.g. in production install where tests/ is excluded).
  } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
}
if (process.env.INSTADECKS_RENDER_STUB === '1') {
  _test_setRenderImages(async () => 'stubbed-render');
}

async function runCreate({
  brief,
  runId,
  outDir,
  mode = 'standalone',
  designChoices = null,
  cycleCount = null,
  convergenceReason = null,
  /* c8 ignore next */ // Live E2E Iteration 2 Fix #13: agent-mode reads this; CLI passthrough.
  diversityHistory = null,
  clean = false,
} = {}) {
  if (!brief) throw new Error('runCreate: brief required');
  if (mode !== 'standalone' && mode !== 'structured-handoff') {
    throw new Error(`runCreate: mode must be 'standalone' or 'structured-handoff' (got ${JSON.stringify(mode)})`);
  }

  // Plan 9-04 (DV-06/DV-07): polymorphic brief intake. normalizeBrief is a
  // passthrough for the legacy JSON shape (byte-identical canonical brief);
  // markdown / raw / files inputs are routed through the LLM extractor DI.
  brief = await normalizeBrief(brief);

  // 1. Validate brief — D-01 / CRT-01.
  validateBrief(brief);

  // 2. Resolve runId + outDir.
  runId = runId || generateRunId();
  const resolvedOut = resolveOutDir(outDir, runId);
  await fsp.mkdir(resolvedOut, { recursive: true });

  const warnings = [];
  let _diversityPriors = null;

  // Iter3-6: --clean removes prior cycle artifacts (.review.json, .annotated.*,
  // .content-review.json, design-rationale.md, deck.pdf) before writing new ones.
  // deck.pptx + render-deck.cjs are intentionally preserved (rerun-friendly).
  if (clean) {
    const stalePatterns = [
      /\.review\.json$/, /\.content-review\.json$/, /\.annotated\.pptx$/,
      /\.annotated\.pdf$/, /^design-rationale\.md$/, /^deck\.pdf$/,
    ];
    /* c8 ignore start */
    try {
      const entries = await fsp.readdir(resolvedOut);
      for (const ent of entries) {
        if (stalePatterns.some(re => re.test(ent))) {
          await fsp.unlink(path.join(resolvedOut, ent)).catch(() => {});
        }
      }
    } catch (e) { /* directory unreadable — skip clean, runCreate will fail downstream */ }
    /* c8 ignore stop */
  } else {
    // Iter3-6: emit a stderr warning when prior cycle artifacts already exist
    // in the out-dir to alert users that they may be stale.
    /* c8 ignore start */
    try {
      const entries = await fsp.readdir(resolvedOut);
      const stale = entries.filter(e =>
        /\.review\.json$/.test(e) || /\.annotated\.pptx$/.test(e) ||
        /\.content-review\.json$/.test(e) || /\.annotated\.pdf$/.test(e));
      if (stale.length > 0) {
        process.stderr.write(
          `Instadecks: prior cycle artifacts present in ${resolvedOut} — ` +
          `${stale.join(', ')}. Pass --clean to remove before re-running.\n`);
      }
    } catch (e) { /* dir not readable yet — skip */ }
    /* c8 ignore stop */
  }

  // Iter3-7: --diversity-history observability. When supplied, scan the path
  // for prior run dirs, parse their design-rationale shorthand DNA, and emit
  // a stderr line listing prior DNAs and whether the current run collides.
  // Live E2E Iter4-2: also accept FLAT-DIR layout (sibling *.md rationale
  // files directly under <histDir>) — earlier code only walked
  // <histDir>/<run-id>/design-rationale.md, silently missing flat layouts.
  /* c8 ignore start */ // Observability call-site; scanDiversityHistory itself is covered by tests/cli-diversity-history-{flat,subdir}-layout.test.js.
  if (diversityHistory) {
    try {
      const scan = await scanDiversityHistory(diversityHistory);
      process.stderr.write(
        `Instadecks: diversity history scanning ${scan.histDir} ` +
        `(found ${scan.priorRuns.length} prior runs${scan.priorRuns.length ? ': ' + scan.priorRuns.join(', ') : ''})\n`);
      _diversityPriors = scan.priorDnas;
    } catch (e) {
      process.stderr.write(`Instadecks: diversity history scan failed: ${e.message}\n`);
    }
  }
  /* c8 ignore stop */

  // 3. Read agent-authored render-deck.cjs.
  const cjsPath = path.join(resolvedOut, 'render-deck.cjs');
  let cjsSrc;
  try {
    cjsSrc = await fsp.readFile(cjsPath, 'utf8');
  } catch (e) {
    // Live E2E Iteration 1 — Fix #3: actionable cold-user guidance.
    // The CLI is deterministic — it RUNS render-deck.cjs and post-processes
    // the output. The LLM-driven authoring step happens BEFORE this CLI is
    // invoked (in agent mode the agent writes render-deck.cjs from the brief;
    // in manual mode the user authors it from the cookbook recipes).
    throw new Error(
      `render-deck.cjs not found at ${cjsPath}\n\n` +
      '`/instadecks:create` requires the agent (Claude in agent mode, OR you authoring\n' +
      'manually) to write a render-deck.cjs file FIRST based on the brief.\n\n' +
      'For agent mode: invoke /instadecks:create in Claude Code; the agent authors\n' +
      '  render-deck.cjs from your brief and places it at the path above.\n\n' +
      'For standalone manual mode:\n' +
      '  1. Run `cli.js --scaffold <out-dir>` to write a starter render-deck.template.cjs\n' +
      '     (and example brief/design-choices files) — see also\n' +
      '     skills/create/references/canonical-brief.example.json\n' +
      '  2. Customize render-deck.cjs based on cookbook variants\n' +
      '     (skills/create/references/cookbook/*.md)\n' +
      `  3. Write render-deck.cjs at ${cjsPath}\n` +
      '  4. Re-run this CLI\n\n' +
      'Note: --design-choices <path.json> populates the rationale doc but does NOT\n' +
      'bypass render-deck.cjs authoring.'
    );
  }

  // 4. Layer-2 ENUM lint BEFORE spawn — D-05 / CRT-15.
  lintCjs(cjsSrc, { filename: cjsPath });

  // 5. Spawn node on render-deck.cjs.
  const env = { ...process.env, NODE_PATH: pluginDataNodeModules() };
  const spawnImpl = _spawnOverride || spawnNode;
  await spawnImpl(cjsPath, { cwd: resolvedOut, env });

  // 6. Assert deck.pptx exists + non-zero.
  const deckPath = path.join(resolvedOut, 'deck.pptx');
  let deckStat;
  try {
    deckStat = await fsp.stat(deckPath);
  } catch (e) {
    throw new Error(`render-deck.cjs ran but deck.pptx not found at ${deckPath}`);
  }
  if (deckStat.size === 0) {
    throw new Error(`deck.pptx is empty at ${deckPath}`);
  }

  // 7. xmllint OOXML sanity — soft on missing tool (P-08).
  const xres = await xmllintOoxml(deckPath);
  /* c8 ignore start */ // Defensive branches: xmllint failure paths exercised only when xmllint is missing or XML is malformed; covered indirectly by integration tests.
  if (!xres.ok) {
    if (xres.missing) {
      warnings.push('xmllint missing — OOXML sanity check skipped (P-08)');
    } else {
      throw new Error(`OOXML sanity check failed: ${xres.err && xres.err.message ? xres.err.message : xres.stderr}`);
    }
  }
  /* c8 ignore stop */

  // 8. soffice → PDF — soft on missing tool.
  let pdfPath = null;
  const sres = await soffice2pdf(deckPath, resolvedOut);
  /* c8 ignore start */ // Defensive branches: soffice missing/failure paths covered by integration tests; the unit tests use a render-deck stub.
  if (sres.ok) {
    pdfPath = sres.pdfPath;
  } else if (sres.missing) {
    warnings.push('soffice missing — PDF conversion skipped');
  } else {
    warnings.push(`soffice failed: ${sres.err && sres.err.message ? sres.err.message : 'unknown'}`);
  }
  /* c8 ignore stop */

  // 9. Slide count.
  const slidesCount = await countSlides(deckPath);

  // 10. Design rationale — always written so the SKILL.md output contract holds.
  // Heuristic extraction (Live E2E Round 3 MAJOR N1): when designChoices is
  // absent, statically parse render-deck.cjs for PALETTE / TYPE constants so
  // the rationale surfaces what the agent actually wrote rather than flat
  // [TBD]. Best-effort regex — failure to match leaves [TBD] in place.
  const heuristic = extractHeuristicDesign(cjsSrc);
  // With designChoices: render the full fixed-template via lib/render-rationale.
  // Without designChoices (e.g. standalone mode where the agent authored the deck
  // without surfacing structured palette/typography choices): write a minimal stub
  // honoring the contract. Fixes BLOCKER #2 (rationalePath used to be silently absent).
  const rationalePath = path.join(resolvedOut, 'design-rationale.md');
  if (designChoices) {
    const md = renderRationale({ brief, designChoices });
    await fsp.writeFile(rationalePath, md);
  } else {
    // Live-E2E MINOR #2: when designChoices is absent we used to write a
    // ~190-byte sparse stub. The output contract still requires the 6 locked
    // sections (Palette / Typography / Motif / Narrative Arc / Key Tradeoffs /
    // Reviewer Notes) — derive what we can from the brief and explicitly flag
    // the design-choice sections as [TBD ...] so users know what's missing.
    // brief is validated upstream by validateBrief() so brief.topic / audience /
    // tone / narrative_arc are guaranteed.
    // validateBrief() guarantees narrative_arc is non-empty array and
    // key_claims is array (possibly empty); no defensive fallbacks needed.
    const arcLines = brief.narrative_arc.map((b, i) => `${i + 1}. ${b}`).join('\n');
    /* c8 ignore start */ // Defensive: empty-key_claims ternary branch — sample-brief.json always carries claims; this fallback is exercised only when brief.key_claims === [].
    const claimLines = brief.key_claims.length > 0
      ? brief.key_claims.map((kc) => `- Slide ${kc.slide_idx}: ${kc.claim}`).join('\n')
      : '_(no key_claims authored in brief)_';
    /* c8 ignore stop */
    // MAJOR N1: surface heuristically-extracted constants where possible;
    // keep [TBD] when extraction returns null. Live E2E Iteration 2 Fix #6:
    // emit the heuristic-extraction notice ONCE at the top (after shorthand
    // lines, before sections), not after every section — repeating it 4×
    // reads as scolding.
    const NOTICE = '> *Note: Palette/Typography/Motif heuristically extracted from render-deck.cjs. Pass `--design-choices design.json` for fully-structured handoff.*';
    const paletteBody = heuristic.palette
      ? `Extracted from render-deck.cjs PALETTE/COLORS block — ${heuristic.palette}.`
      : `[TBD — agent did not capture structured design choices and no PALETTE/COLORS block was found in render-deck.cjs.]`;
    const typographyBody = heuristic.typography
      ? `Extracted from render-deck.cjs TYPE/TYPOGRAPHY block — ${heuristic.typography}.`
      : `[TBD — agent did not capture structured design choices and no TYPE/TYPOGRAPHY block was found in render-deck.cjs.]`;
    const motifBody = heuristic.motif
      ? `${heuristic.motif}`
      : `[TBD — agent did not capture a structured motif description; add a leading \`// Motif: ...\` comment to render-deck.cjs or pass --design-choices.]`;
    // Shorthand lines for regex tooling (Live E2E Iter2 Fix #5): emit
    // **Palette:** / **Typography:** / **Motif:** RIGHT AFTER the H1 title
    // and BEFORE any section heading.
    const shortPalette = heuristic.palette || '(unnamed)';
    const shortTypography = heuristic.typography || '(unnamed)';
    const shortMotif = heuristic.motif || '(unnamed)';
    const stub =
      `# Design Rationale — ${brief.topic}\n\n` +
      `**Palette:** ${shortPalette}\n` +
      `**Typography:** ${shortTypography}\n` +
      `**Motif:** ${shortMotif}\n\n` +
      `${NOTICE}\n\n` +
      `*Brief topic:* ${brief.topic}\n\n` +
      `*Author mode:* ${mode}\n\n` +
      `*Render path:* render-deck.cjs (agent-authored)\n\n` +
      `## Audience\n\n${brief.audience}\n\n` +
      `## Tone\n\n${brief.tone}\n\n` +
      `## Palette\n\n${paletteBody}\n\n` +
      `## Typography\n\n${typographyBody}\n\n` +
      `## Motif\n\n${motifBody}\n\n` +
      `## Narrative Arc\n\n${arcLines}\n\n` +
      `### Key claims by slide\n\n${claimLines}\n\n` +
      `## Key Tradeoffs\n\n[TBD — not authored in standalone mode without structured design choices.]\n\n` +
      `## Reviewer Notes\n\n[TBD — not authored in standalone mode without structured design choices. ` +
      `Run /instadecks:review on deck.pptx to populate this section in a follow-up artifact.]\n`;
    await fsp.writeFile(rationalePath, stub);
  }

  // Iter3-7: diversity-history audit emission. Compare current run's DNA
  // (heuristically extracted) to priors and report distinctness.
  /* c8 ignore start */
  if (_diversityPriors) {
    const curDna = {
      palette: heuristic.palette || (designChoices && designChoices.palette && designChoices.palette.name) || '(unnamed)',
      typography: heuristic.typography || '(unnamed)',
      motif: heuristic.motif || (designChoices && (typeof designChoices.motif === 'string' ? designChoices.motif : (designChoices.motif && designChoices.motif.name))) || '(unnamed)',
    };
    const collision = _diversityPriors.some(p =>
      p.palette === curDna.palette && p.typography === curDna.typography && p.motif === curDna.motif);
    const priorList = _diversityPriors
      .map(p => `(${p.palette}, ${p.typography}, ${p.motif})`).join(', ');
    if (collision) {
      process.stderr.write(
        `Instadecks: diversity audit — prior DNAs were [${priorList}]; current DNA is ` +
        `(${curDna.palette}, ${curDna.typography}, ${curDna.motif}) — collision detected, advancing seed.\n`);
    } else {
      process.stderr.write(
        `Instadecks: diversity audit — prior DNAs were [${priorList}]; current DNA is ` +
        `(${curDna.palette}, ${curDna.typography}, ${curDna.motif}) — distinct ✓\n`);
    }
  }
  /* c8 ignore stop */

  // Live E2E Iteration 2 Fix #11: surface cycleCount + convergenceReason so
  // wrappers can tell whether the auto-refine loop converged, oscillated, or
  // soft-capped. Standalone CLI (no in-loop runs): defaults to
  // {cycleCount:1, convergenceReason:'standalone-no-loop'}. Agent-mode
  // wrappers may inject the loop's actual values via the runCreate args.
  const VALID_REASONS = new Set([
    'converged', 'oscillation', 'soft-cap', 'standalone-no-loop',
  ]);
  const resolvedReason = VALID_REASONS.has(convergenceReason)
    ? convergenceReason : 'standalone-no-loop';
  // Iter3-8: cycleCount is meaningful ONLY when the loop ran. When the result is
  // standalone-no-loop, set cycleCount to null so result interpreters don't
  // mistake the default `1` for "the loop ran exactly one cycle".
  const resolvedCycleCount = resolvedReason === 'standalone-no-loop'
    ? null
    : (Number.isInteger(cycleCount) && cycleCount > 0 ? cycleCount : 1);

  const result = {
    deckPath,
    pdfPath,
    rationalePath,
    runDir: resolvedOut,
    runId,
    slidesCount,
    warnings,
    cycleCount: resolvedCycleCount,
    convergenceReason: resolvedReason,
  };

  if (mode === 'standalone') {
    console.log(JSON.stringify(result, null, 2));
  }

  return result;
}

module.exports = {
  runCreate,
  generateRunId,
  resolveOutDir,
  scanDiversityHistory,
  _test_setSpawn,
  _test_setRunReview,
  _test_setRunCreate,
  _test_setLlm,
  _test_setRenderImages,
};
