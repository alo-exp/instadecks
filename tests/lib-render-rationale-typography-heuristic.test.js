'use strict';
// tests/lib-render-rationale-typography-heuristic.test.js — Live E2E Iter5-2.
//
// MINOR Iter5-2: typography heuristic extractor must also recognize
//   (a) `// TYPE:` / `// TYPOGRAPHY:` comment headers (multi-line continuation)
//   (b) bare-const string declarations:
//       const SERIF = 'IBM Plex Serif';
//       const SANS  = 'IBM Plex Sans';
// In addition to the existing `const TYPE = { ... }` / `const TYPOGRAPHY = { ... }`
// object literals.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { runCreate, _test_setSpawn } = require('../skills/create/scripts/index');

const REPO_ROOT = path.join(__dirname, '..');
const SAMPLE_BRIEF_PATH = path.join(REPO_ROOT, 'tests', 'fixtures', 'sample-brief.json');

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

async function runWithCjs(cjs, tag) {
  const out = freshTmp(tag);
  fs.writeFileSync(path.join(out, 'render-deck.cjs'), cjs);
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
  return { md, out };
}

test('Iter5-2: typography heuristic extracts bare-const SERIF + SANS', async (t) => {
  t.after(() => _test_setSpawn(null));
  const cjs =
    "'use strict';\n" +
    "const SERIF = 'IBM Plex Serif';\n" +
    "const SANS = 'IBM Plex Sans';\n" +
    "const pptxgen = require('pptxgenjs');\n" +
    "const pres = new pptxgen();\n" +
    "pres.layout='LAYOUT_16x9';\n" +
    "async function main(){pres.addSlide().addText('hi',{x:1,y:1,w:1,h:1});await pres.writeFile({fileName:'deck.pptx'});}\n" +
    "main().catch(e=>{console.error(e);process.exit(1);});\n";
  const { md, out } = await runWithCjs(cjs, 'typ-bare');
  try {
    assert.match(md, /\*\*Typography:\*\*\s+IBM Plex Serif \+ IBM Plex Sans/,
      'shorthand should pair heading + body fonts');
    assert.doesNotMatch(md, /\*\*Typography:\*\*\s+\(unnamed\)/,
      'shorthand must not be (unnamed)');
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('Iter5-2: typography heuristic extracts // TYPE: comment header', async (t) => {
  t.after(() => _test_setSpawn(null));
  const cjs =
    "'use strict';\n" +
    "// TYPE: IBM Plex Serif (headings) + IBM Plex Sans (body)\n" +
    "const pptxgen = require('pptxgenjs');\n" +
    "const pres = new pptxgen();\n" +
    "pres.layout='LAYOUT_16x9';\n" +
    "async function main(){pres.addSlide().addText('hi',{x:1,y:1,w:1,h:1});await pres.writeFile({fileName:'deck.pptx'});}\n" +
    "main().catch(e=>{console.error(e);process.exit(1);});\n";
  const { md, out } = await runWithCjs(cjs, 'typ-comment');
  try {
    assert.match(md, /\*\*Typography:\*\*\s+IBM Plex Serif \(headings\) \+ IBM Plex Sans \(body\)/,
      'comment header should populate Typography shorthand');
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('Iter5-2: typography heuristic extracts // TYPOGRAPHY: synonym', async (t) => {
  t.after(() => _test_setSpawn(null));
  const cjs =
    "'use strict';\n" +
    "// TYPOGRAPHY: Inter Display + Inter Text\n" +
    "const pptxgen = require('pptxgenjs');\n" +
    "const pres = new pptxgen();\n" +
    "pres.layout='LAYOUT_16x9';\n" +
    "async function main(){pres.addSlide().addText('hi',{x:1,y:1,w:1,h:1});await pres.writeFile({fileName:'deck.pptx'});}\n" +
    "main().catch(e=>{console.error(e);process.exit(1);});\n";
  const { md, out } = await runWithCjs(cjs, 'typ-comment2');
  try {
    assert.match(md, /\*\*Typography:\*\*\s+Inter Display \+ Inter Text/);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('Iter5-2: bare-const single match (only HEAD) yields single font', async (t) => {
  t.after(() => _test_setSpawn(null));
  const cjs =
    "'use strict';\n" +
    "const HEADING = 'Playfair Display';\n" +
    "const pptxgen = require('pptxgenjs');\n" +
    "const pres = new pptxgen();\n" +
    "pres.layout='LAYOUT_16x9';\n" +
    "async function main(){pres.addSlide().addText('hi',{x:1,y:1,w:1,h:1});await pres.writeFile({fileName:'deck.pptx'});}\n" +
    "main().catch(e=>{console.error(e);process.exit(1);});\n";
  const { md, out } = await runWithCjs(cjs, 'typ-single');
  try {
    assert.match(md, /\*\*Typography:\*\*\s+Playfair Display/);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('Iter5-2: existing object-literal TYPE block still works (regression)', async (t) => {
  t.after(() => _test_setSpawn(null));
  const cjs =
    "'use strict';\n" +
    "const TYPE = { heading: 'IBM Plex Sans', body: 'IBM Plex Sans' };\n" +
    "const pptxgen = require('pptxgenjs');\n" +
    "const pres = new pptxgen();\n" +
    "pres.layout='LAYOUT_16x9';\n" +
    "async function main(){pres.addSlide().addText('hi',{x:1,y:1,w:1,h:1});await pres.writeFile({fileName:'deck.pptx'});}\n" +
    "main().catch(e=>{console.error(e);process.exit(1);});\n";
  const { md, out } = await runWithCjs(cjs, 'typ-obj');
  try {
    assert.match(md, /IBM Plex Sans/);
    assert.doesNotMatch(md, /\*\*Typography:\*\*\s+\(unnamed\)/);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});
