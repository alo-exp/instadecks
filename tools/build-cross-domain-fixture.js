'use strict';
// tools/build-cross-domain-fixture.js — Phase 6 Plan 06-03 / D-05 / Q-4.
//
// Authors tests/fixtures/cross-domain-test-deck.pptx — a 4-slide PPTX calibrated for the
// content-vs-design boundary regression test (CRV-10). Slides:
//   1. Title slide — clean visual + clean content (control).
//   2. BOTH defects — body color #CCCCCC on white (WCAG <3:1) AND vague unsupported claim.
//   3. Visual-only — clean action title + sourced bullet, but bullet position offset ~12pt
//      off-grid (DECK-VDA flags); content is clean.
//   4. Content-only — topic-label title + 30-word run-on bullet with 7 distinct acronyms;
//      visual is clean (proper contrast, on-grid).
//
// Reproducibility recipe: `node tools/build-cross-domain-fixture.js` with the same Node
// version and pptxgenjs 4.0.1 (pinned exact, locked invariant per CLAUDE.md). Note:
// pptxgenjs writes a `dcterms:created` timestamp into the PPTX metadata that varies per
// run — the file is committed and is NOT SHA-pinned (mirrors tools/build-tiny-deck-fixture.js
// posture). The boundary regression test reads the COMMITTED .pptx; CI may regenerate as a
// sanity check but does not assert byte-identical output.
//
// Pinned at pptxgenjs 4.0.1 (do NOT bump — locked invariant; visual-regression sign-off required).

const path = require('node:path');
const fs = require('node:fs');

function repoRoot() {
  return path.join(__dirname, '..');
}

function ensurePptxgenjsPath() {
  if (!process.env.PPTXGENJS_PATH) {
    const baseDir = process.env.CLAUDE_PLUGIN_DATA || repoRoot();
    process.env.PPTXGENJS_PATH = path.join(baseDir, 'node_modules', 'pptxgenjs');
  }
}

async function main() {
  ensurePptxgenjsPath();
  const PptxGenJS = require(process.env.PPTXGENJS_PATH);
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';

  // Slide 1 — title (clean visual + clean content)
  const s1 = pptx.addSlide();
  s1.addText('Q4 Strategic Review', {
    x: 1, y: 2.5, w: 11, h: 1.2,
    fontSize: 36, bold: true, align: 'center', color: '111111',
  });
  s1.addText('Author: Strategy Team', {
    x: 1, y: 4.0, w: 11, h: 0.6,
    fontSize: 18, align: 'center', color: '333333',
  });

  // Slide 2 — BOTH defects: low-contrast (#CCCCCC on white) AND vague unsupported claim.
  const s2 = pptx.addSlide();
  s2.background = { color: 'FFFFFF' };
  s2.addText('Solution Overview', {
    x: 0.5, y: 0.4, w: 12, h: 0.8,
    fontSize: 28, bold: true, color: '111111',
    placeholder: 'title',
  });
  s2.addText('Our solution is innovative and disruptive in the market.', {
    x: 0.8, y: 2.0, w: 11.5, h: 0.6,
    fontSize: 20, color: 'CCCCCC', // Visual defect: <3:1 contrast on FFFFFF
  });

  // Slide 3 — visual-only: clean action title + sourced bullet, but bullet offset ~12pt off-grid.
  // 12pt ≈ 0.167" — we shift the bullet x by ~0.17" off of a notional 0.8" grid to 0.97".
  const s3 = pptx.addSlide();
  s3.background = { color: 'FFFFFF' };
  s3.addText('Revenue grew 40% in Q3 from enterprise renewals', {
    x: 0.5, y: 0.4, w: 12, h: 0.8,
    fontSize: 28, bold: true, color: '111111',
    placeholder: 'title',
  });
  s3.addText('Q3 ARR: $4.2M, sourced from 2026-04 board pack', {
    x: 0.97, y: 2.0, w: 11, h: 0.6,   // ~12pt off-grid (visual defect; content clean)
    fontSize: 20, color: '111111',
  });

  // Slide 4 — content-only: topic-label title + 30-word bullet with 7 distinct acronyms.
  // Bullet word count == 30; acronyms: SaaS, B2B, SMB, GTM, PLG, ARR, ACV, ICP, MQLs, SQLs, BCG.
  // (Detector filters CEO/CTO/CFO/I/II/etc.; the full set above is well above the >5 threshold.)
  const s4 = pptx.addSlide();
  s4.background = { color: 'FFFFFF' };
  s4.addText('Strategic Direction', {
    x: 0.5, y: 0.4, w: 12, h: 0.8,
    fontSize: 28, bold: true, color: '111111',
    placeholder: 'title',
  });
  // 30 words exactly:
  // Our SaaS B2B SMB GTM motion via PLG drives ARR ACV expansion through ICP-aligned
  // MQLs that convert to SQLs at industry-leading rates per the latest BCG report
  s4.addText(
    'Our SaaS B2B SMB GTM motion via PLG drives ARR ACV expansion through ICP-aligned MQLs that convert to SQLs at industry-leading rates per the latest BCG report',
    { x: 0.8, y: 2.0, w: 11.5, h: 1.0, fontSize: 20, color: '111111' }
  );

  const outPath = path.join(repoRoot(), 'tests', 'fixtures', 'cross-domain-test-deck.pptx');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await pptx.writeFile({ fileName: outPath });
  const size = fs.statSync(outPath).size;
  process.stdout.write(`Instadecks: wrote ${outPath} (${size} bytes)\n`);
}

main().catch((err) => {
  process.stderr.write(`Instadecks: cross-domain fixture build failed: ${err.stack || err}\n`);
  process.exit(1);
});
