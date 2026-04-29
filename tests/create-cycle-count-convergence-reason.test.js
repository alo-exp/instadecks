'use strict';
// tests/create-cycle-count-convergence-reason.test.js — Iter2 Fix #11.
// runCreate result includes cycleCount + convergenceReason. Default for
// standalone CLI: {cycleCount:1, convergenceReason:'standalone-no-loop'}.
// Agent-mode wrappers may inject explicit values.

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

test('runCreate default: cycleCount=1, convergenceReason=standalone-no-loop', async (t) => {
  t.after(() => _test_setSpawn(null));
  const out = freshTmp('crt-cyc');
  try {
    fs.writeFileSync(path.join(out, 'render-deck.cjs'),
      "'use strict';\nconst pptxgen=require('pptxgenjs');const p=new pptxgen();p.layout='LAYOUT_16x9';async function m(){p.addSlide().addText('x',{x:1,y:1,w:1,h:1});await p.writeFile({fileName:'deck.pptx'});}m().catch(e=>{console.error(e);process.exit(1);});\n");
    const deckBytes = await buildMinimalPptx();
    _test_setSpawn(async (cjsPath, opts) => {
      fs.writeFileSync(path.join(opts.cwd, 'deck.pptx'), deckBytes);
    });
    const r = await runCreate({ brief: loadBrief(), outDir: out, mode: 'structured-handoff' });
    assert.equal(r.cycleCount, 1);
    assert.equal(r.convergenceReason, 'standalone-no-loop');
  } finally {
    _test_setSpawn(null);
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('runCreate accepts injected cycleCount + convergenceReason', async (t) => {
  t.after(() => _test_setSpawn(null));
  const out = freshTmp('crt-cyc-inj');
  try {
    fs.writeFileSync(path.join(out, 'render-deck.cjs'),
      "'use strict';\nconst pptxgen=require('pptxgenjs');const p=new pptxgen();p.layout='LAYOUT_16x9';async function m(){p.addSlide().addText('x',{x:1,y:1,w:1,h:1});await p.writeFile({fileName:'deck.pptx'});}m().catch(e=>{console.error(e);process.exit(1);});\n");
    const deckBytes = await buildMinimalPptx();
    _test_setSpawn(async (cjsPath, opts) => {
      fs.writeFileSync(path.join(opts.cwd, 'deck.pptx'), deckBytes);
    });
    const r = await runCreate({
      brief: loadBrief(), outDir: out, mode: 'structured-handoff',
      cycleCount: 3, convergenceReason: 'converged',
    });
    assert.equal(r.cycleCount, 3);
    assert.equal(r.convergenceReason, 'converged');
  } finally {
    _test_setSpawn(null);
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('runCreate sanitizes invalid convergenceReason → standalone-no-loop', async (t) => {
  t.after(() => _test_setSpawn(null));
  const out = freshTmp('crt-cyc-bad');
  try {
    fs.writeFileSync(path.join(out, 'render-deck.cjs'),
      "'use strict';\nconst pptxgen=require('pptxgenjs');const p=new pptxgen();p.layout='LAYOUT_16x9';async function m(){p.addSlide().addText('x',{x:1,y:1,w:1,h:1});await p.writeFile({fileName:'deck.pptx'});}m().catch(e=>{console.error(e);process.exit(1);});\n");
    const deckBytes = await buildMinimalPptx();
    _test_setSpawn(async (cjsPath, opts) => {
      fs.writeFileSync(path.join(opts.cwd, 'deck.pptx'), deckBytes);
    });
    const r = await runCreate({
      brief: loadBrief(), outDir: out, mode: 'structured-handoff',
      cycleCount: -1, convergenceReason: 'bogus',
    });
    assert.equal(r.cycleCount, 1);
    assert.equal(r.convergenceReason, 'standalone-no-loop');
  } finally {
    _test_setSpawn(null);
    fs.rmSync(out, { recursive: true, force: true });
  }
});
