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
      if (err) return resolve(0);
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
  if (!xres.ok) {
    if (xres.missing) {
      warnings.push('xmllint missing — OOXML sanity check skipped (P-08)');
    } else {
      throw new Error(`OOXML sanity check failed: ${xres.err && xres.err.message ? xres.err.message : xres.stderr}`);
    }
  }

  // 8. soffice → PDF — soft on missing tool.
  let pdfPath = null;
  const sres = await soffice2pdf(deckPath, resolvedOut);
  if (sres.ok) {
    pdfPath = sres.pdfPath;
  } else if (sres.missing) {
    warnings.push('soffice missing — PDF conversion skipped');
  } else {
    warnings.push(`soffice failed: ${sres.err && sres.err.message ? sres.err.message : 'unknown'}`);
  }

  // 9. Slide count.
  const slidesCount = await countSlides(deckPath);

  // 10. Design rationale — write only if designChoices supplied; else agent writes.
  const rationalePath = path.join(resolvedOut, 'design-rationale.md');
  if (designChoices) {
    const md = renderRationale({ brief, designChoices });
    await fsp.writeFile(rationalePath, md);
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
