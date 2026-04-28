'use strict';
// tests/create-rationale-content.test.js — MINOR #2 fix verification.
//
// Standalone-mode (no designChoices) used to write a 190-byte sparse stub for
// design-rationale.md. The output contract requires the 6 sections (Palette /
// Typography / Motif / Narrative Arc / Key Tradeoffs / Reviewer Notes); the
// fix derives Audience / Tone / Narrative Arc from `brief` and explicitly
// flags the design-choice sections as "[TBD ...]" so users see what's missing.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  runCreate,
  _test_setSpawn,
} = require('../skills/create/scripts/index');

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

test('standalone-mode rationale (no designChoices) is substantive (≥1KB) and contains brief-derived sections', async (t) => {
  t.after(() => _test_setSpawn(null));
  const out = freshTmp('crt-rat');
  try {
    fs.copyFileSync(SAMPLE_CJS_PATH, path.join(out, 'render-deck.cjs'));
    const deckBytes = await buildMinimalPptx();
    _test_setSpawn(async (cjsPath, opts) => {
      fs.writeFileSync(path.join(opts.cwd, 'deck.pptx'), deckBytes);
    });

    const r = await runCreate({
      brief: loadBrief(),
      outDir: out,
      mode: 'structured-handoff',  // suppress JSON stdout; behavior identical for rationale
    });

    const md = fs.readFileSync(r.rationalePath, 'utf8');
    const stat = fs.statSync(r.rationalePath);

    assert.ok(stat.size >= 1024,
      `rationale.md must be ≥1KB; got ${stat.size} bytes`);

    // Locked section ordering (D-07): all 6 headings present.
    for (const h of ['## Palette', '## Typography', '## Motif',
      '## Narrative Arc', '## Key Tradeoffs', '## Reviewer Notes']) {
      assert.match(md, new RegExp(h.replace(/\s/g, '\\s')),
        `rationale missing ${h}`);
    }

    // Brief-derived sections must surface audience + tone.
    assert.match(md, /## Audience/, 'rationale missing Audience section');
    assert.match(md, /## Tone/, 'rationale missing Tone section');
    assert.match(md, /board/i,
      'rationale must echo brief.audience ("board")');
    assert.match(md, /executive/i,
      'rationale must echo brief.tone ("executive")');

    // Narrative arc beats from sample-brief.json must show up.
    assert.match(md, /enterprise wins/i,
      'rationale must echo brief.narrative_arc beats');

    // Design-choice sections explicitly marked TBD.
    assert.match(md, /\[TBD/,
      'design-choice sections must be flagged [TBD ...]');
  } finally {
    _test_setSpawn(null);
    fs.rmSync(out, { recursive: true, force: true });
  }
});
