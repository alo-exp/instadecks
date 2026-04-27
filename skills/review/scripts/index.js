'use strict';
// index.js — exports runReview({deckPath, runId, outDir, mode, findings, annotate}) per Phase 3 D-04.
// Mode-gated invocation: 'standalone' (CLI) prints JSON to stdout; 'structured-handoff' (pipelined
// from /create or test) returns a rich object without printing. Annotate gating per D-03/RVW-06.
// Run-dir = .planning/instadecks/<runId>/ per D-01/D-02/D-05; sibling-of-input outputs per D-03/D-04.
// P-01 guard: severity_reviewer kept as 4-tier here — collapse to MAJOR/MINOR/POLISH happens only
// at the /annotate adapter boundary, never in this orchestrator.
// P-07 guard: runAnnotate is lazy-required INSIDE the if(annotate) branch — never at module-load
// time. tests/review-pipeline.test.js asserts the require-cache stays clean when annotate is false.

const path = require('node:path');
const fsp = require('node:fs/promises');
const crypto = require('node:crypto');
const { validate } = require('./lib/schema-validator');

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
    jsonPath: path.join(dir, `${base}.review.json`),
    mdPath: path.join(dir, `${base}.review.md`),
    narrativePath: path.join(dir, `${base}.review.narrative.md`),
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

// Test-only override for path-stability test (tests/review-pipeline.test.js).
// When set, runReview uses this function instead of require('../../annotate/scripts').runAnnotate.
// Lets the test verify the wired call without spawning soffice / loading the annotate module.
let _runAnnotateOverride = null;
function _test_setRunAnnotate(fn) { _runAnnotateOverride = fn; }

async function runReview({
  deckPath,
  runId,
  outDir,
  mode = 'standalone',
  findings,
  annotate = false,
} = {}) {
  if (!deckPath) throw new Error('runReview: deckPath required');
  if (!findings) throw new Error('runReview: findings required (in-memory object honoring findings-schema.md v1.0)');
  if (mode !== 'standalone' && mode !== 'structured-handoff') {
    throw new Error(`runReview: mode must be 'standalone' or 'structured-handoff' (got ${JSON.stringify(mode)})`);
  }

  // 1. Validate (throws pinpoint Error on violation; P-01 guard rejects pre-collapsed severities).
  validate(findings);

  // 2. Resolve outputs.
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

  // 4. Render fixed-template MD (Plan 03-04 ships real renderer; stub here).
  const { render } = require('./render-fixed');
  const mdContent = render(findings);
  await fsp.writeFile(sibling.mdPath, mdContent);
  const mdMirror = path.join(outDir, path.basename(sibling.mdPath));
  await fsp.writeFile(mdMirror, mdContent);

  // 5. Counts.
  const { findingCounts, genuineCount } = countFindings(findings);

  // 6. Optional annotate pipeline (P-07: lazy require — only loaded when gated on).
  let annotated = null;
  if (annotate) {
    const runAnnotate = _runAnnotateOverride
      || require('../../annotate/scripts').runAnnotate;
    annotated = await runAnnotate({ deckPath, findings, outDir, runId });
  }

  const result = {
    jsonPath: sibling.jsonPath,
    mdPath: sibling.mdPath,
    narrativePath: sibling.narrativePath,
    runDir: outDir,
    runId,
    findingCounts,
    genuineCount,
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
  runReview,
  generateRunId,
  resolveSiblingOutputs,
  _test_setRunAnnotate,
};
