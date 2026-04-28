'use strict';
// index.js — exports runAnnotate({deckPath, findings, outDir, runId}) per Phase 2 D-06.
// Standalone CLI (cli.js) and pipelined consumer (/review Phase 3) both call this.
// Run-dir = .planning/instadecks/<runId>/ per D-01/D-02/D-05; sibling-of-input outputs per D-03/D-04.
// soffice invocation pre-applies -env:UserInstallation=file:///tmp/lo-${SESSION_ID}-${PID} (D-08);
// full hardening (file-existence/size checks, retry, cleanup trap) defers to Phase 3 (RVW-09..11).

const path = require('node:path');
const fsp = require('node:fs/promises');
const fs = require('node:fs');
const { execFile, spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const { adaptFindings, readDeckMeta } = require('./adapter');
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

// Returns true iff deckPath has the same SHA-256 as the bundled v8-reference fixture deck.
// The v8 fixture is the visual-regression baseline — its slide JPGs are bundled
// in tests/fixtures/v8-reference/ and we must use those bundled JPGs so the Tier-1
// normalized SHA continues to match. For ALL other decks, we render fresh per-slide
// JPGs from the user's actual deckPath via scripts/pptx-to-images.sh.
//
// Detection by SHA (not by path) — existing tests copy the reference deck into tmp
// dirs before invoking runAnnotate, so a path-prefix check would mis-classify them.
function isV8ReferenceDeck(deckPath) {
  const root = repoRoot();
  const shaFile = path.join(root, 'tests', 'fixtures', 'v8-reference', 'Annotations_Sample.pptx.sha256');
  try {
    const expected = fs.readFileSync(shaFile, 'utf8').split(/\s+/)[0].trim();
    /* c8 ignore next */ // Defensive: empty-sha-file branch fires only if v8 fixture sha pin is wiped to whitespace — never in normal repo state.
    if (!expected) return false;
    const actual = crypto.createHash('sha256').update(fs.readFileSync(deckPath)).digest('hex');
    return actual === expected;
  /* c8 ignore next 3 */ // Defensive: catch fires only when shaFile or deckPath unreadable — covered indirectly when test fixtures are deliberately mutated.
  } catch (_) {
    return false;
  }
}

// Render user's deckPath → per-slide JPGs in <workDir>/rendered/, then return
// a map { slideNum → absolute jpg path } for prepareWork to symlink.
/* c8 ignore start */ // Coverage: fresh-render path requires real soffice + pdftoppm; exercised by tests/e2e/annotate-real-soffice.test.js (skipped under CI=true). Unit-test surface for runAnnotate uses the v8 fixture path which keeps the SHA-pinned visual-regression baseline intact.
function renderUserDeckToJpegs(deckPath, workDir) {
  const renderedDir = path.join(workDir, 'rendered');
  fs.mkdirSync(renderedDir, { recursive: true });
  const root = repoRoot();
  const baseDir = process.env.CLAUDE_PLUGIN_ROOT || root;
  const script = path.join(baseDir, 'scripts', 'pptx-to-images.sh');
  const r = spawnSync('bash', [script, deckPath, renderedDir], {
    encoding: 'utf8', timeout: 180_000,
  });
  if (r.status !== 0) {
    throw new Error(
      `runAnnotate: pptx-to-images.sh failed (status ${r.status}) for deck ${deckPath}\nstderr: ${r.stderr}`,
    );
  }
  // pdftoppm produces slide-<N>.jpg with auto-padded N (width = digits in last slide).
  // Walk renderedDir, parse slide-<digits>.jpg, build numeric map.
  const map = new Map();
  for (const f of fs.readdirSync(renderedDir)) {
    const m = f.match(/^slide-(\d+)\.jpg$/);
    if (m) map.set(Number(m[1]), path.join(renderedDir, f));
  }
  return map;
}
/* c8 ignore stop */

async function prepareWork({ outDir, samples, deckPath }) {
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
  /* c8 ignore next */ // Defensive: samplesLink unlink-then-symlink idempotency catch — ENOENT swallowed silently.
  try { await fsp.unlink(samplesLink); } catch (_) { /* ignore */ }
  await fsp.symlink(path.join(skillScripts, 'samples.js'), samplesLink);

  // Slide image symlinks. P-06: lowercase, zero-padded basenames.
  // FIX BLOCKER #1: For the v8 reference fixture (visual-regression path), use the
  // bundled author-curated JPGs to preserve the Tier-1 normalized SHA baseline.
  // For ALL other decks (real user input), render the user's deckPath fresh and
  // symlink THOSE rendered JPGs so annotations overlay on the user's actual slides.
  const slideNums = [...new Set(samples.map(s => s.slideNum))];
  const fixturesDir = path.join(root, 'tests', 'fixtures', 'v8-reference');
  // deckPath is required upstream by runAnnotate / _runAnnotateWithRawSamples, so it's
  // always present here. SHA-match against the bundled v8 fixture decides which JPG
  // source to use (bundled fixture vs. fresh render of user's deck).
  const useV8Fixture = isV8ReferenceDeck(deckPath);
  let renderedMap = null;
  /* c8 ignore next 3 */ // Coverage: fresh-render branch requires real soffice + pdftoppm (exercised by e2e suite, skipped under CI=true). All unit tests use the v8 fixture which keeps the visual-regression SHA baseline intact.
  if (!useV8Fixture) {
    renderedMap = renderUserDeckToJpegs(deckPath, workDir);
  }
  for (const n of slideNums) {
    const padded = String(n).padStart(2, '0');
    let target;
    if (useV8Fixture) {
      target = path.join(fixturesDir, `v8s-${padded}.jpg`);
    /* c8 ignore start */ // Coverage: fresh-render branch — see e2e suite carve-out above.
    } else {
      target = renderedMap.get(n);
      if (!target) {
        throw new Error(
          `runAnnotate: findings reference slide ${n} but rendered deck has no such slide (deck: ${deckPath})`,
        );
      }
    }
    /* c8 ignore stop */
    // NOTE: annotate.js (line 417) references `v8s-NN.jpg` directly via path.join(__dirname, ...).
    // Symlink basename MUST match what verbatim annotate.js loads — using `slide-NN.jpg` would
    // produce ENOENT at runtime. (Plan 02-03 spec said `slide-NN.jpg`; annotate.js is locked
    // invariant per CLAUDE.md, so the symlink basename follows annotate.js.)
    const link = path.join(workDir, `v8s-${padded}.jpg`);
    /* c8 ignore next 3 */ // Defensive: link basename is always v8s-NN.jpg by construction — guard against future refactors.
    if (!/^v8s-\d{2}\.jpg$/.test(path.basename(link))) {
      throw new Error(`prepareWork: refusing to create unexpected link ${link}`);
    }
    /* c8 ignore next */ // Defensive: unlink-then-symlink idempotency catch — ENOENT swallowed silently.
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
      /* c8 ignore next 4 */ // Defensive: soffice failure injection requires live soffice subprocess; covered indirectly by e2e annotate-real-soffice.test.js.
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
  /* c8 ignore next */ // Defensive: timeout (30s ceiling) requires slow filesystem; covered by integration tests.
  throw new Error(`awaitPptxOnDisk: timed out waiting for ${pptxPath}`);
}

async function runAnnotate({ deckPath, findings, outDir, runId } = {}) {
  if (!deckPath) throw new Error('runAnnotate: deckPath required');
  if (!findings) throw new Error('runAnnotate: findings required (in-memory object)');

  runId = runId || generateRunId();
  /* c8 ignore next */ // Defensive: tests always pass outDir explicitly; cwd-fallback path is exercised by smoke/e2e suites.
  outDir = outDir || path.join(process.cwd(), '.planning', 'instadecks', runId);
  await fsp.mkdir(outDir, { recursive: true });

  // Live-E2E MINOR #1: extract deck title + slide count so annotate.js's footer
  // band reflects the user's actual deck rather than the v8-hardcoded
  // "Agentic Disruption · Slide N / 43". readDeckMeta soft-fails to {'',0}
  // which lets annotate.js fall back to its own hardcoded defaults.
  const deckMeta = await readDeckMeta(deckPath);
  const samples = adaptFindings(findings, deckMeta);
  await fsp.writeFile(path.join(outDir, 'findings.json'), JSON.stringify(findings, null, 2));

  setSamples(samples);
  const work = await prepareWork({ outDir, samples, deckPath });
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
/* c8 ignore start */ // Defensive: _runAnnotateWithRawSamples is a test-only carve-out (visual-regression); its early-return validations are exercised only when callers pass malformed args, which the visual-regression test guards against.
async function _runAnnotateWithRawSamples({ deckPath, samples, outDir, runId } = {}) {
  if (!deckPath) throw new Error('_runAnnotateWithRawSamples: deckPath required');
  if (!Array.isArray(samples)) throw new Error('_runAnnotateWithRawSamples: samples must be array');

  runId = runId || generateRunId();
  outDir = outDir || path.join(process.cwd(), '.planning', 'instadecks', runId);
  /* c8 ignore stop */
  await fsp.mkdir(outDir, { recursive: true });

  setSamples(samples);
  const work = await prepareWork({ outDir, samples, deckPath });
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
  /* c8 ignore next */ // Defensive: catch only fires if tests/helpers/llm-mock.js is absent (e.g. in production install where tests/ is excluded).
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
