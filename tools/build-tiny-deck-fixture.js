'use strict';
// tools/build-tiny-deck-fixture.js — Generates tests/fixtures/tiny-deck.pptx,
// a 1-slide PPTX used as the smoke fixture for tests/pptx-to-images.test.js (RVW-09/10/11).
// Idempotent: re-running produces a byte-equivalent fixture (no nondeterminism beyond
// pptxgenjs's known dcterms:created timestamp — acceptable because fixture isn't SHA-pinned).

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
  const slide = pptx.addSlide();
  slide.addText('Instadecks tiny-deck fixture', {
    x: 1, y: 2.5, w: 11, h: 1.5,
    fontSize: 32, bold: true, align: 'center',
  });
  const outPath = path.join(repoRoot(), 'tests', 'fixtures', 'tiny-deck.pptx');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await pptx.writeFile({ fileName: outPath });
  const size = fs.statSync(outPath).size;
  process.stdout.write(`Instadecks: wrote ${outPath} (${size} bytes)\n`);
}

main().catch(err => {
  /* c8 ignore next */ // Defensive: Errors thrown by Node always carry .stack; the `|| err` arm only fires for non-Error throws.
  process.stderr.write(`Instadecks: fixture generation failed: ${err.stack || err}\n`);
  process.exit(1);
});
