'use strict';
// index.js — exports runAnnotate({deckPath, findings, outDir, runId}) per Phase 2 D-06.
// Standalone CLI (cli.js) and pipelined consumer (/review Phase 3) both call this.
// Run-dir = .planning/instadecks/<runId>/ per D-01/D-02/D-05; sibling-of-input outputs per D-03/D-04.
// soffice invocation pre-applies -env:UserInstallation=file:///tmp/lo-${SESSION_ID}-${PID} (D-08);
// full hardening (file-existence/size checks, retry, cleanup trap) defers to Phase 3 (RVW-09..11).

const path = require('node:path');
const fsp = require('node:fs/promises');
const fs = require('node:fs');
const { execFile } = require('node:child_process');
const crypto = require('node:crypto');
const { adaptFindings } = require('./adapter');
const { setSamples } = require('./samples');

function generateRunId() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
           + `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `${ts}-${crypto.randomBytes(3).toString('hex')}`;
}

function resolveSiblingOutputs(deckPath) {
  const dir = path.dirname(deckPath);
  const ext = path.extname(deckPath);
  const base = path.basename(deckPath, ext).replace(/\.annotated$/, '');
  return {
    pptxPath: path.join(dir, `${base}.annotated.pptx`),
    pdfPath: path.join(dir, `${base}.annotated.pdf`),
  };
}

function repoRoot() {
  return path.join(__dirname, '..', '..', '..');
}

function ensurePptxgenjsPath() {
  if (!process.env.PPTXGENJS_PATH) {
    const baseDir = process.env.CLAUDE_PLUGIN_DATA || repoRoot();
    process.env.PPTXGENJS_PATH = path.join(baseDir, 'node_modules', 'pptxgenjs');
  }
}

async function prepareWork({ outDir, samples }) {
  const workDir = path.join(outDir, 'work');
  await fsp.mkdir(workDir, { recursive: true });

  const root = repoRoot();
  const skillScripts = path.join(root, 'skills', 'annotate', 'scripts');

  // P-03: COPY annotate.js (not symlink) so __dirname resolves to workDir at runtime.
  // If we symlinked, Node's realpath resolution would set __dirname to the skill scripts
  // dir, causing annotate.js to write Annotations_Sample.pptx into the skill tree and
  // look up slide-NN.jpg there too — breaking the run-dir archive contract (D-05).
  await fsp.copyFile(
    path.join(skillScripts, 'annotate.js'),
    path.join(workDir, 'annotate.js'),
  );

  // samples.js: SYMLINK so realpath resolves back to the skill module — guaranteeing the
  // same cached module instance that index.js called setSamples() on (live binding intact).
  const samplesLink = path.join(workDir, 'samples.js');
  try { await fsp.unlink(samplesLink); } catch (_) { /* ignore */ }
  await fsp.symlink(path.join(skillScripts, 'samples.js'), samplesLink);

  // Slide image symlinks. P-06: lowercase, zero-padded basenames.
  const slideNums = [...new Set(samples.map(s => s.slideNum))];
  const fixturesDir = path.join(root, 'tests', 'fixtures', 'v8-reference');
  for (const n of slideNums) {
    const padded = String(n).padStart(2, '0');
    const target = path.join(fixturesDir, `v8s-${padded}.jpg`);
    if (!/^v8s-\d{2}\.jpg$/.test(path.basename(target))) {
      throw new Error(`prepareWork: refusing to symlink unexpected target ${target}`);
    }
    // NOTE: annotate.js (line 417) references `v8s-NN.jpg` directly via path.join(__dirname, ...).
    // Symlink basename MUST match what verbatim annotate.js loads — using `slide-NN.jpg` would
    // produce ENOENT at runtime. (Plan 02-03 spec said `slide-NN.jpg`; annotate.js is locked
    // invariant per CLAUDE.md, so the symlink basename follows annotate.js.)
    const link = path.join(workDir, `v8s-${padded}.jpg`);
    try { await fsp.unlink(link); } catch (_) { /* ignore */ }
    await fsp.symlink(target, link);
  }

  return { cwd: workDir };
}

// Phase 3 owns: file-existence + size check after soffice (RVW-10), 1 retry on timeout (RVW-10),
// cleanup trap on /tmp/lo-* (RVW-11). Phase 2 ships only the per-call -env:UserInstallation flag.
function convertToPdf(pptxPath, outDir) {
  return new Promise((resolve, reject) => {
    const SESSION_ID = process.env.CLAUDE_SESSION_ID || `s${Date.now()}`;
    execFile('soffice', [
      '--headless',
      `-env:UserInstallation=file:///tmp/lo-${SESSION_ID}-${process.pid}`,
      '--convert-to', 'pdf',
      '--outdir', outDir,
      pptxPath,
    ], { timeout: 60_000 }, (err, stdout, stderr) => {
      if (err) {
        err.message = `soffice convert-to-pdf failed: ${err.message}\nstderr: ${stderr}`;
        return reject(err);
      }
      const base = path.basename(pptxPath, path.extname(pptxPath));
      const pdfPath = path.join(outDir, `${base}.pdf`);
      resolve(pdfPath);
    });
  });
}

async function awaitPptxOnDisk(pptxPath, baselineMtimeMs = 0, ceilingMs = 30_000, intervalMs = 100) {
  const start = Date.now();
  while (Date.now() - start < ceilingMs) {
    try {
      const st = fs.statSync(pptxPath);
      if (st.size > 0 && st.mtimeMs > baselineMtimeMs) return;
    } catch (_) { /* not yet */ }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error(`awaitPptxOnDisk: timed out waiting for ${pptxPath}`);
}

async function runAnnotate({ deckPath, findings, outDir, runId } = {}) {
  if (!deckPath) throw new Error('runAnnotate: deckPath required');
  if (!findings) throw new Error('runAnnotate: findings required (in-memory object)');

  runId = runId || generateRunId();
  outDir = outDir || path.join(process.cwd(), '.planning', 'instadecks', runId);
  await fsp.mkdir(outDir, { recursive: true });

  const samples = adaptFindings(findings);
  await fsp.writeFile(path.join(outDir, 'findings.json'), JSON.stringify(findings, null, 2));

  setSamples(samples);
  const work = await prepareWork({ outDir, samples });
  ensurePptxgenjsPath();

  const pptxRun = path.join(work.cwd, 'Annotations_Sample.pptx');
  // Capture mtime baseline BEFORE invoking main() so awaitPptxOnDisk can distinguish
  // a fresh write from any stale file in the workDir (defensive — workDir is normally
  // fresh-per-run, but this guards against same-runDir test re-invocations).
  let baselineMtimeMs = 0;
  try { baselineMtimeMs = fs.statSync(pptxRun).mtimeMs; } catch (_) { /* missing — fine */ }

  // Bust require cache so re-runs in the same process re-execute annotate.js's main().
  const annotateEntry = path.join(work.cwd, 'annotate.js');
  delete require.cache[require.resolve(annotateEntry)];
  // Redirect annotate.js's `✓ Written: ...` console.log to stderr so CLI stdout stays
  // pure JSON for pipelined consumers (ANNO-09 contract). Restored after main() resolves.
  const origLog = console.log;
  console.log = (...args) => console.error(...args);
  try {
    require(annotateEntry);
    await awaitPptxOnDisk(pptxRun, baselineMtimeMs);
  } finally {
    console.log = origLog;
  }
  const pdfRun = await convertToPdf(pptxRun, outDir);

  const sibling = resolveSiblingOutputs(deckPath);
  await fsp.copyFile(pptxRun, sibling.pptxPath);
  await fsp.copyFile(pdfRun, sibling.pdfPath);

  return {
    pptxPath: sibling.pptxPath,
    pdfPath: sibling.pdfPath,
    runDir: outDir,
    runId,
    pptxRun,
    pdfRun,
  };
}

/**
 * Test-only entry point: runs the same pipeline as runAnnotate but accepts a
 * pre-computed SAMPLES array (skipping the adapter). Required by the visual-
 * regression test (tests/annotate-visual-regression.test.js) to inject v8
 * author-curated SAMPLES verbatim per RESEARCH §A1 so byte-identical SHA
 * comparison against the Phase 1 baseline is possible.
 *
 * NOT part of the public D-06 contract — do not call from /review or /create.
 * The leading `_` prefix signals non-public; threat T-02-08 (validation
 * bypass) is accepted because no public CLI surfaces this export.
 */
async function _runAnnotateWithRawSamples({ deckPath, samples, outDir, runId } = {}) {
  if (!deckPath) throw new Error('_runAnnotateWithRawSamples: deckPath required');
  if (!Array.isArray(samples)) throw new Error('_runAnnotateWithRawSamples: samples must be array');

  runId = runId || generateRunId();
  outDir = outDir || path.join(process.cwd(), '.planning', 'instadecks', runId);
  await fsp.mkdir(outDir, { recursive: true });

  setSamples(samples);
  const work = await prepareWork({ outDir, samples });
  ensurePptxgenjsPath();

  const pptxRun = path.join(work.cwd, 'Annotations_Sample.pptx');
  let baselineMtimeMs = 0;
  try { baselineMtimeMs = fs.statSync(pptxRun).mtimeMs; } catch (_) { /* missing — fine */ }

  const annotateEntry = path.join(work.cwd, 'annotate.js');
  delete require.cache[require.resolve(annotateEntry)];
  const origLog = console.log;
  console.log = (...args) => console.error(...args);
  try {
    require(annotateEntry);
    await awaitPptxOnDisk(pptxRun, baselineMtimeMs);
  } finally {
    console.log = origLog;
  }
  const pdfRun = await convertToPdf(pptxRun, outDir);

  const sibling = resolveSiblingOutputs(deckPath);
  await fsp.copyFile(pptxRun, sibling.pptxPath);
  await fsp.copyFile(pdfRun, sibling.pdfPath);

  return {
    pptxPath: sibling.pptxPath,
    pdfPath: sibling.pdfPath,
    runDir: outDir,
    runId,
    pptxRun,
    pdfRun,
  };
}

// Plan 8-02 / CONTEXT D-05 — single LLM-DI carve-out (BLOCKER B-3 single source of truth).
// runAnnotate doesn't call an LLM directly (adapter is deterministic), but the hook is exposed
// uniformly across all 4 orchestrators so Plans 8-05/8-06 have one consistent contract.
let _llmStub = null;
function _test_setLlm(fn) { _llmStub = fn; }
let _renderImagesStub = null;
function _test_setRenderImages(fn) { _renderImagesStub = fn; }

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

module.exports = {
  runAnnotate,
  generateRunId,
  resolveSiblingOutputs,
  _runAnnotateWithRawSamples,
  _test_setLlm,
  _test_setRenderImages,
};
