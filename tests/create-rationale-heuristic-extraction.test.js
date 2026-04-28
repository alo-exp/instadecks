'use strict';
// tests/create-rationale-heuristic-extraction.test.js — Live E2E Round 3 MAJOR N1.
//
// When designChoices is absent in standalone mode, runCreate now statically
// parses render-deck.cjs to extract PALETTE / TYPE constants and surfaces them
// in the design-rationale Palette / Typography sections instead of writing flat
// [TBD] placeholders.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { runCreate, _test_setSpawn } = require('../skills/create/scripts/index');

const REPO_ROOT = path.join(__dirname, '..');
const SAMPLE_BRIEF_PATH = path.join(REPO_ROOT, 'tests', 'fixtures', 'sample-brief.json');
const SAMPLE_CJS_PATH = path.join(REPO_ROOT, 'tests', 'fixtures', 'sample-render-deck.cjs');

function freshTmp(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }
function loadBrief() { return JSON.parse(fs.readFileSync(SAMPLE_BRIEF_PATH, 'utf8')); }

function buildMinimalPptx() {
  const JSZip = require('jszip');
  const zip = new JSZip();
  zip.file('ppt/presentation.xml',
    '<?xml version="1.0"?><p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"></p:presentation>');
  zip.file('ppt/slides/slide1.xml', '<x/>');
  return zip.generateAsync({ type: 'nodebuffer' });
}

test('rationale heuristic extracts PALETTE colors from render-deck.cjs', async (t) => {
  t.after(() => _test_setSpawn(null));
  const out = freshTmp('crt-heur');
  try {
    fs.copyFileSync(SAMPLE_CJS_PATH, path.join(out, 'render-deck.cjs'));
    const deckBytes = await buildMinimalPptx();
    _test_setSpawn(async (cjsPath, opts) => {
      fs.writeFileSync(path.join(opts.cwd, 'deck.pptx'), deckBytes);
    });
    const r = await runCreate({
      brief: loadBrief(),
      outDir: out,
      mode: 'structured-handoff',
    });
    const md = fs.readFileSync(r.rationalePath, 'utf8');
    // Sample fixture has primary: '1E2761'.
    assert.match(md, /1E2761/, 'rationale should surface PALETTE.primary hex from render-deck.cjs');
    // And typography heading: 'IBM Plex Sans'.
    assert.match(md, /IBM Plex Sans/, 'rationale should surface TYPE.heading from render-deck.cjs');
    // Hint about --design-choices flag should be present somewhere when extraction was used.
    assert.match(md, /--design-choices/, 'rationale should hint at --design-choices flag for structured handoff');
  } finally {
    _test_setSpawn(null);
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('rationale heuristic surfaces leading // Motif: comment from render-deck.cjs', async (t) => {
  t.after(() => _test_setSpawn(null));
  const out = freshTmp('crt-heur-motif');
  try {
    fs.writeFileSync(path.join(out, 'render-deck.cjs'),
      "'use strict';\n// Motif: Quiet diagonals as section bookends.\nconst pptxgen = require('pptxgenjs');\nconst pres = new pptxgen();\npres.layout='LAYOUT_16x9';\nasync function main(){pres.addSlide().addText('hi',{x:1,y:1,w:1,h:1});await pres.writeFile({fileName:'deck.pptx'});}\nmain().catch(e=>{console.error(e);process.exit(1);});\n");
    const deckBytes = await buildMinimalPptx();
    _test_setSpawn(async (cjsPath, opts) => {
      fs.writeFileSync(path.join(opts.cwd, 'deck.pptx'), deckBytes);
    });
    const r = await runCreate({
      brief: loadBrief(),
      outDir: out,
      mode: 'structured-handoff',
    });
    const md = fs.readFileSync(r.rationalePath, 'utf8');
    assert.match(md, /Quiet diagonals/, 'motif comment must be surfaced in the Motif section');
  } finally {
    _test_setSpawn(null);
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('rationale heuristic falls back gracefully when render-deck.cjs has no PALETTE', async (t) => {
  t.after(() => _test_setSpawn(null));
  const out = freshTmp('crt-heur-nopal');
  try {
    // Minimal cjs with no PALETTE / TYPE constants — must still pass enum-lint
    // (no string-literal addShape calls, no 8-char hex).
    fs.writeFileSync(path.join(out, 'render-deck.cjs'),
      "'use strict';\nconst pptxgen = require('pptxgenjs');\nconst pres = new pptxgen();\npres.layout='LAYOUT_16x9';\nasync function main(){pres.addSlide().addText('hi',{x:1,y:1,w:1,h:1});await pres.writeFile({fileName:'deck.pptx'});}\nmain().catch(e=>{console.error(e);process.exit(1);});\n");
    const deckBytes = await buildMinimalPptx();
    _test_setSpawn(async (cjsPath, opts) => {
      fs.writeFileSync(path.join(opts.cwd, 'deck.pptx'), deckBytes);
    });
    const r = await runCreate({
      brief: loadBrief(),
      outDir: out,
      mode: 'structured-handoff',
    });
    const md = fs.readFileSync(r.rationalePath, 'utf8');
    // No PALETTE found → still TBD, but the hint should be present.
    assert.match(md, /\[TBD/, 'sections should remain [TBD] when no PALETTE found');
    assert.match(md, /--design-choices/, 'fallback should still hint at --design-choices');
  } finally {
    _test_setSpawn(null);
    fs.rmSync(out, { recursive: true, force: true });
  }
});
