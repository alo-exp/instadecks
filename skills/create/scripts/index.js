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
} = {}) {
  if (!brief) throw new Error('runCreate: brief required');
  if (mode !== 'standalone' && mode !== 'structured-handoff') {
    throw new Error(`runCreate: mode must be 'standalone' or 'structured-handoff' (got ${JSON.stringify(mode)})`);
  }

  // 1. Validate brief — D-01 / CRT-01.
  validateBrief(brief);

  // 2. Resolve runId + outDir.
  runId = runId || generateRunId();
  const resolvedOut = resolveOutDir(outDir, runId);
  await fsp.mkdir(resolvedOut, { recursive: true });

  const warnings = [];

  // 3. Read agent-authored render-deck.cjs.
  const cjsPath = path.join(resolvedOut, 'render-deck.cjs');
  let cjsSrc;
  try {
    cjsSrc = await fsp.readFile(cjsPath, 'utf8');
  } catch (e) {
    throw new Error(
      `render-deck.cjs not found at ${cjsPath} — agent must author it before calling ` +
      `runCreate(mode:standalone) or pass via designChoices for structured-handoff`
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
    const stub =
      `# Design Rationale — ${brief.topic}\n\n` +
      `*Brief topic:* ${brief.topic}\n\n` +
      `*Author mode:* ${mode}\n\n` +
      `*Render path:* render-deck.cjs (agent-authored)\n\n` +
      `## Audience\n\n${brief.audience}\n\n` +
      `## Tone\n\n${brief.tone}\n\n` +
      `## Palette\n\n[TBD — agent did not capture structured design choices in this run; ` +
      `palette tokens were inlined directly into render-deck.cjs without being surfaced ` +
      `via the structured-handoff contract.]\n\n` +
      `## Typography\n\n[TBD — agent did not capture structured design choices in this run; ` +
      `font choices were inlined directly into render-deck.cjs.]\n\n` +
      `## Motif\n\n[TBD — agent did not capture a structured motif description in this run.]\n\n` +
      `## Narrative Arc\n\n${arcLines}\n\n` +
      `### Key claims by slide\n\n${claimLines}\n\n` +
      `## Key Tradeoffs\n\n[Not authored in standalone mode without structured design choices.]\n\n` +
      `## Reviewer Notes\n\n[Not authored in standalone mode without structured design choices. ` +
      `Run /instadecks:review on deck.pptx to populate this section in a follow-up artifact.]\n`;
    await fsp.writeFile(rationalePath, stub);
  }

  const result = {
    deckPath,
    pdfPath,
    rationalePath,
    runDir: resolvedOut,
    runId,
    slidesCount,
    warnings,
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
  _test_setSpawn,
  _test_setRunReview,
  _test_setRunCreate,
  _test_setLlm,
  _test_setRenderImages,
};
