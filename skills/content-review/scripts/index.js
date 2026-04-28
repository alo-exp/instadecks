'use strict';
// skills/content-review/scripts/index.js — runContentReview orchestrator (Phase 6 Plan 06-02).
//
// Mirrors skills/review/scripts/index.js (runReview) shape: validate → write JSON+MD sibling +
// run-dir mirror → optional /annotate pipeline (lazy-require, P-07). Specialized output stems
// `<deck>.content-review.{json,md,narrative.md}` per CONTEXT.md D-04 (two-report convention).
//
// CRV-09 — sibling-of-input + run-dir mirror outputs.
// CRV-11 — `runAnnotate` is lazy-required INSIDE the `if (annotate)` branch only; tests in
// content-review-lazy-annotate.test.js assert require.cache stays clean when annotate=false.
// P-01    — severity_reviewer kept as 4-tier here; collapse to 3-tier happens at /annotate
//           adapter boundary, never in this orchestrator.

const path = require('node:path');
const fsp = require('node:fs/promises');
const crypto = require('node:crypto');
const { validate } = require('../../review/scripts/lib/schema-validator');

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
  const base = path.basename(deckPath, ext);
  return {
    jsonPath: path.join(dir, `${base}.content-review.json`),
    mdPath: path.join(dir, `${base}.content-review.md`),
    narrativePath: path.join(dir, `${base}.content-review.narrative.md`),
  };
}

function countFindings(findings) {
  const counts = { critical: 0, major: 0, minor: 0, nitpick: 0 };
  let genuineCount = 0;
  for (const slide of findings.slides || []) {
    for (const f of slide.findings || []) {
      switch (f.severity_reviewer) {
        case 'Critical': counts.critical++; break;
        case 'Major': counts.major++; break;
        case 'Minor': counts.minor++; break;
        case 'Nitpick': counts.nitpick++; break;
      }
      if (f.genuine === true) genuineCount++;
    }
  }
  return { findingCounts: counts, genuineCount };
}

// Test-only override mirror of Phase 3 review/index.js — lets tests verify the wired call
// without spawning soffice / loading the annotate module.
let _runAnnotateOverride = null;
function _test_setRunAnnotate(fn) { _runAnnotateOverride = fn; }

/**
 * runContentReview — argument-quality / story-flow review orchestrator.
 *
 * @param {object} opts
 * @param {string} opts.deckPath
 * @param {string} [opts.runId]
 * @param {string} [opts.outDir]
 * @param {'standalone'|'structured-handoff'} [opts.mode]
 * @param {object} opts.findings              // findings-schema.md v1.1
 * @param {object} [opts.contentExtract]      // optional pre-extracted content (D-01)
 * @param {boolean} [opts.annotate=false]
 */
async function runContentReview({
  deckPath,
  runId,
  outDir,
  mode = 'standalone',
  findings,
  contentExtract,            // accepted but currently unused — reserved for v2 /create handoff
  annotate = false,
} = {}) {
  if (!deckPath) throw new Error('runContentReview: deckPath required');
  if (!findings) {
    throw new Error('runContentReview: findings required (in-memory object honoring findings-schema.md v1.1)');
  }
  if (mode !== 'standalone' && mode !== 'structured-handoff') {
    throw new Error(`runContentReview: mode must be 'standalone' or 'structured-handoff' (got ${JSON.stringify(mode)})`);
  }

  // Suppress unused-var warning while keeping the symbol part of the public API surface.
  void contentExtract;

  // 1. Validate (throws pinpoint Error on violation; v1.1 enforces check_id iff content).
  validate(findings);

  // 2. Resolve outputs (run-dir mirror + sibling-of-input).
  runId = runId || generateRunId();
  outDir = outDir
    ? path.resolve(outDir)
    : path.join(process.cwd(), '.planning', 'instadecks', runId);
  await fsp.mkdir(outDir, { recursive: true });

  const sibling = resolveSiblingOutputs(deckPath);

  // 3. Write JSON sibling + run-dir mirror.
  const jsonContent = JSON.stringify(findings, null, 2);
  await fsp.writeFile(sibling.jsonPath, jsonContent);
  const jsonMirror = path.join(outDir, path.basename(sibling.jsonPath));
  await fsp.writeFile(jsonMirror, jsonContent);

  // 4. Render fixed-template MD (Task 2 ships full renderer).
  const { render } = require('./render-content-fixed');
  const mdContent = render(findings);
  await fsp.writeFile(sibling.mdPath, mdContent);
  const mdMirror = path.join(outDir, path.basename(sibling.mdPath));
  await fsp.writeFile(mdMirror, mdContent);

  // 5. Counts.
  const { findingCounts, genuineCount } = countFindings(findings);

  // 6. Optional annotate pipeline (P-07 / CRV-11: lazy require — only loaded when gated on).
  let annotated = null;
  if (annotate) {
    const runAnnotate = _runAnnotateOverride
      || require('../../annotate/scripts').runAnnotate;
    annotated = await runAnnotate({ deckPath, findings, outDir, runId });
  }

  const result = {
    jsonPath: sibling.jsonPath,
    mdPath: sibling.mdPath,
    narrativePath: sibling.narrativePath,   // RETURNED but not written (agent authors post-call)
    runDir: outDir,
    runId,
    findingCounts,
    genuineCount,
    annotated,
    ...(annotated && {
      annotatedPptx: annotated.pptxPath,
      annotatedPdf: annotated.pdfPath,
    }),
  };

  if (mode === 'standalone') {
    console.log(JSON.stringify(result, null, 2));
  }

  return result;
}

module.exports = {
  runContentReview,
  generateRunId,
  resolveSiblingOutputs,
  _test_setRunAnnotate,
};
