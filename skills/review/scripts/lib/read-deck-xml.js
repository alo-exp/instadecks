'use strict';
// read-deck-xml.js — jszip wrapper that returns ordered slide XML strings.
// Per Plan 03-03 (Phase 3 D-02 / RVW-03) + T-03-13 zip-bomb guard.
//
// Public surface:
//   loadSlides(pptxPath) → Promise<Array<{ slideNum, xml }>> ordered by slide index.
//   MAX_PPTX_BYTES — 100MB hard cap enforced before JSZip.loadAsync.
//
// jszip is promoted to a direct devDep (A4/A8) so future pptxgenjs bumps cannot
// silently break Phase 3 tests by dropping its transitive jszip.

const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const JSZip = require('jszip');

const MAX_PPTX_BYTES = 100 * 1024 * 1024;

async function loadSlides(pptxPath) {
  const stat = fsSync.statSync(pptxPath);
  if (stat.size > MAX_PPTX_BYTES) {
    throw new Error(
      `Instadecks read-deck-xml: PPTX exceeds 100MB cap (${stat.size} bytes): ${pptxPath}`,
    );
  }
  const buf = await fs.readFile(pptxPath);
  const zip = await JSZip.loadAsync(buf);
  const slideFiles = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const an = parseInt(a.match(/slide(\d+)/)[1], 10);
      const bn = parseInt(b.match(/slide(\d+)/)[1], 10);
      return an - bn;
    });
  const slides = [];
  for (const f of slideFiles) {
    slides.push({
      slideNum: parseInt(f.match(/slide(\d+)/)[1], 10),
      xml: await zip.file(f).async('string'),
    });
  }
  return slides;
}

module.exports = { loadSlides, MAX_PPTX_BYTES };
