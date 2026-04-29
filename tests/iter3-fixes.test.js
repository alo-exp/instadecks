'use strict';
// tests/iter3-fixes.test.js — Live E2E Iteration 3 defect fixes (1-9).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.join(__dirname, '..');
const SAMPLE_BRIEF_PATH = path.join(REPO_ROOT, 'tests', 'fixtures', 'sample-brief.json');

const { runCreate, _test_setSpawn } = require('../skills/create/scripts/index');

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

// ----- Iter3-1: heuristic motif extractor handles multi-line continuation + decimals + multi-clause.

test('Iter3-1: heuristic motif preserves decimals (0.75pt) without truncation', async (t) => {
  t.after(() => _test_setSpawn(null));
  const out = freshTmp('iter3-1-decimal');
  try {
    fs.writeFileSync(path.join(out, 'render-deck.cjs'),
      "'use strict';\n// Motif: Thin horizontal hairline rules (0.75pt) framing each section.\nconst pptxgen = require('pptxgenjs');\nconst pres = new pptxgen();\npres.layout='LAYOUT_16x9';\nasync function main(){pres.addSlide().addText('hi',{x:1,y:1,w:1,h:1});await pres.writeFile({fileName:'deck.pptx'});}\nmain().catch(e=>{console.error(e);process.exit(1);});\n");
    const deckBytes = await buildMinimalPptx();
    _test_setSpawn(async (cjsPath, opts) => {
      fs.writeFileSync(path.join(opts.cwd, 'deck.pptx'), deckBytes);
    });
    const r = await runCreate({ brief: loadBrief(), outDir: out, mode: 'structured-handoff' });
    const md = fs.readFileSync(r.rationalePath, 'utf8');
    // Full description must survive — the leading-dot truncation is fixed.
    assert.match(md, /\*\*Motif:\*\* Thin horizontal hairline rules \(0\.75pt\) framing each section\./);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('Iter3-1: heuristic motif preserves multi-clause text past second `;`', async (t) => {
  t.after(() => _test_setSpawn(null));
  const out = freshTmp('iter3-1-multi');
  try {
    fs.writeFileSync(path.join(out, 'render-deck.cjs'),
      "'use strict';\n// Motif: Quiet diagonals; numerals foregrounded; marginalia page-numbers.\nconst pptxgen = require('pptxgenjs');\nconst pres = new pptxgen();\npres.layout='LAYOUT_16x9';\nasync function main(){pres.addSlide().addText('hi',{x:1,y:1,w:1,h:1});await pres.writeFile({fileName:'deck.pptx'});}\nmain().catch(e=>{console.error(e);process.exit(1);});\n");
    const deckBytes = await buildMinimalPptx();
    _test_setSpawn(async (cjsPath, opts) => {
      fs.writeFileSync(path.join(opts.cwd, 'deck.pptx'), deckBytes);
    });
    const r = await runCreate({ brief: loadBrief(), outDir: out, mode: 'structured-handoff' });
    const md = fs.readFileSync(r.rationalePath, 'utf8');
    assert.match(md, /marginalia page-numbers/);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('Iter3-1: heuristic motif concatenates multi-line `//` continuation comments', async (t) => {
  t.after(() => _test_setSpawn(null));
  const out = freshTmp('iter3-1-multiline');
  try {
    const cjs = [
      "'use strict';",
      '// Motif: Editorial layout with',
      '// generous whitespace and a',
      '// quiet rule above section titles.',
      "const pptxgen = require('pptxgenjs');",
      'const pres = new pptxgen();',
      "pres.layout='LAYOUT_16x9';",
      "async function main(){pres.addSlide().addText('hi',{x:1,y:1,w:1,h:1});await pres.writeFile({fileName:'deck.pptx'});}",
      'main().catch(e=>{console.error(e);process.exit(1);});',
      '',
    ].join('\n');
    fs.writeFileSync(path.join(out, 'render-deck.cjs'), cjs);
    const deckBytes = await buildMinimalPptx();
    _test_setSpawn(async (cjsPath, opts) => {
      fs.writeFileSync(path.join(opts.cwd, 'deck.pptx'), deckBytes);
    });
    const r = await runCreate({ brief: loadBrief(), outDir: out, mode: 'structured-handoff' });
    const md = fs.readFileSync(r.rationalePath, 'utf8');
    assert.match(md, /Editorial layout with generous whitespace and a quiet rule above section titles\./);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('Iter3-1: multi-line motif stops at next labelled marker (e.g. // Palette:)', async (t) => {
  t.after(() => _test_setSpawn(null));
  const out = freshTmp('iter3-1-marker');
  try {
    const cjs = [
      "'use strict';",
      '// Motif: First line of motif',
      '// continues here.',
      '// Palette: this is a different marker — must not be swallowed.',
      "const pptxgen = require('pptxgenjs');",
      'const pres = new pptxgen();',
      "pres.layout='LAYOUT_16x9';",
      "async function main(){pres.addSlide().addText('hi',{x:1,y:1,w:1,h:1});await pres.writeFile({fileName:'deck.pptx'});}",
      'main().catch(e=>{console.error(e);process.exit(1);});',
      '',
    ].join('\n');
    fs.writeFileSync(path.join(out, 'render-deck.cjs'), cjs);
    const deckBytes = await buildMinimalPptx();
    _test_setSpawn(async (cjsPath, opts) => {
      fs.writeFileSync(path.join(opts.cwd, 'deck.pptx'), deckBytes);
    });
    const r = await runCreate({ brief: loadBrief(), outDir: out, mode: 'structured-handoff' });
    const md = fs.readFileSync(r.rationalePath, 'utf8');
    assert.match(md, /First line of motif continues here\./);
    assert.doesNotMatch(md, /\*\*Motif:\*\*[^\n]*different marker/);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

// ----- Iter3-2: render-deck.cjs missing error revised — --scaffold mentioned, --design-choices clarified.

test('Iter3-2: missing render-deck.cjs error mentions --scaffold + clarifies --design-choices', async () => {
  const out = freshTmp('iter3-2');
  try {
    let caught = null;
    try {
      await runCreate({ brief: loadBrief(), outDir: out, mode: 'standalone' });
    } catch (e) { caught = e; }
    assert.ok(caught);
    assert.match(caught.message, /--scaffold/);
    assert.match(caught.message, /populates the rationale doc but does NOT[\s\S]*bypass/);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

// ----- Iter3-3: review/content-review CLI emit actionable error on bad --findings path.

test('Iter3-3: /review CLI on missing --findings file → actionable error (not raw ENOENT)', () => {
  const dir = freshTmp('iter3-3-rev');
  try {
    const fakeDeck = path.join(dir, 'deck.pptx');
    fs.writeFileSync(fakeDeck, '');
    const missing = path.join(dir, 'does-not-exist.json');
    const CLI = path.join(REPO_ROOT, 'skills', 'review', 'scripts', 'cli.js');
    const r = spawnSync(process.execPath, [CLI, fakeDeck, '--findings', missing], { encoding: 'utf8' });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /file not found or invalid JSON/);
    assert.match(r.stderr, /findings-schema\.md/);
    // Raw fs error (with `at Object.readFileSync`) MUST NOT escape.
    assert.doesNotMatch(r.stderr, /at Object\.readFileSync/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Iter3-3: /content-review CLI on missing --findings file → actionable error', () => {
  const dir = freshTmp('iter3-3-cr');
  try {
    const fakeDeck = path.join(dir, 'deck.pptx');
    fs.writeFileSync(fakeDeck, '');
    const missing = path.join(dir, 'does-not-exist.json');
    const CLI = path.join(REPO_ROOT, 'skills', 'content-review', 'scripts', 'cli.js');
    const r = spawnSync(process.execPath, [CLI, fakeDeck, '--findings', missing], { encoding: 'utf8' });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /file not found or invalid JSON/);
    assert.doesNotMatch(r.stderr, /at Object\.readFileSync/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ----- Iter3-4: annotate CLI accepts both positional and named flags.

test('Iter3-4: annotate CLI accepts named flags --deck/--findings/--out-dir', () => {
  const dir = freshTmp('iter3-4');
  try {
    const findings = path.join(dir, 'f.json');
    fs.writeFileSync(findings, JSON.stringify([]));
    const CLI = path.join(REPO_ROOT, 'skills', 'annotate', 'scripts', 'cli.js');
    const r = spawnSync(process.execPath,
      [CLI, '--deck', '/nonexistent/deck.pptx', '--findings', findings, '--out-dir', dir],
      { encoding: 'utf8' });
    // Either non-zero (runAnnotate fails because deck missing) — but stderr must NOT
    // mention "unrecognized" or Usage banner; the parse must succeed.
    assert.ok(!/unrecognized argument/.test(r.stderr), `stderr=${r.stderr}`);
    assert.ok(!/Usage: node cli\.js <deck/.test(r.stderr), `stderr should not be Usage banner; got=${r.stderr}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Iter3-4: annotate CLI rejects unrecognized --foo flag → exit 2 with parse error', () => {
  const CLI = path.join(REPO_ROOT, 'skills', 'annotate', 'scripts', 'cli.js');
  const r = spawnSync(process.execPath, [CLI, '--bogus'], { encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /unrecognized argument/);
});

test('Iter3-4: annotate CLI usage banner shows BOTH positional and named forms', () => {
  const CLI = path.join(REPO_ROOT, 'skills', 'annotate', 'scripts', 'cli.js');
  const r = spawnSync(process.execPath, [CLI], { encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /<deck\.pptx> <findings\.json>/);
  assert.match(r.stderr, /--deck.*--findings/);
});

// ----- Iter3-6 CLI parseArgs: --clean parsed.

test('Iter3-6: create CLI parseArgs accepts --clean as boolean flag', () => {
  const { parseArgs } = require('../skills/create/scripts/cli');
  const out = parseArgs(['--brief', 'b.json', '--clean']);
  assert.equal(out.clean, true);
});

// ----- Iter3-6: --clean removes prior cycle artifacts.

test('Iter3-6: --clean removes prior .review.json / .annotated.pptx before re-rendering', async (t) => {
  t.after(() => _test_setSpawn(null));
  const out = freshTmp('iter3-6');
  try {
    fs.writeFileSync(path.join(out, 'render-deck.cjs'),
      "'use strict';\nconst pptxgen=require('pptxgenjs');const p=new pptxgen();p.layout='LAYOUT_16x9';async function m(){p.addSlide().addText('x',{x:1,y:1,w:1,h:1});await p.writeFile({fileName:'deck.pptx'});}m().catch(e=>{console.error(e);process.exit(1);});\n");
    fs.writeFileSync(path.join(out, 'deck.review.json'), '{"stale":true}');
    fs.writeFileSync(path.join(out, 'deck.annotated.pptx'), 'stale-bytes');
    const deckBytes = await buildMinimalPptx();
    _test_setSpawn(async (cjsPath, opts) => {
      fs.writeFileSync(path.join(opts.cwd, 'deck.pptx'), deckBytes);
    });
    await runCreate({ brief: loadBrief(), outDir: out, mode: 'structured-handoff', clean: true });
    assert.ok(!fs.existsSync(path.join(out, 'deck.review.json')), '.review.json should be removed by --clean');
    assert.ok(!fs.existsSync(path.join(out, 'deck.annotated.pptx')), '.annotated.pptx should be removed by --clean');
    assert.ok(fs.existsSync(path.join(out, 'deck.pptx')), 'fresh deck.pptx should be written');
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

// ----- Iter3-8: cycleCount is null in standalone-no-loop mode.

test('Iter3-8: cycleCount falls back to 1 when reason is valid loop reason but cycleCount invalid', async (t) => {
  t.after(() => _test_setSpawn(null));
  const out = freshTmp('iter3-8-fallback');
  try {
    fs.writeFileSync(path.join(out, 'render-deck.cjs'),
      "'use strict';\nconst pptxgen=require('pptxgenjs');const p=new pptxgen();p.layout='LAYOUT_16x9';async function m(){p.addSlide().addText('x',{x:1,y:1,w:1,h:1});await p.writeFile({fileName:'deck.pptx'});}m().catch(e=>{console.error(e);process.exit(1);});\n");
    const deckBytes = await buildMinimalPptx();
    _test_setSpawn(async (cjsPath, opts) => {
      fs.writeFileSync(path.join(opts.cwd, 'deck.pptx'), deckBytes);
    });
    const r = await runCreate({
      brief: loadBrief(), outDir: out, mode: 'structured-handoff',
      cycleCount: -1, convergenceReason: 'converged',
    });
    assert.equal(r.convergenceReason, 'converged');
    assert.equal(r.cycleCount, 1);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('Iter3-8: cycleCount is null when convergenceReason=standalone-no-loop', async (t) => {
  t.after(() => _test_setSpawn(null));
  const out = freshTmp('iter3-8');
  try {
    fs.writeFileSync(path.join(out, 'render-deck.cjs'),
      "'use strict';\nconst pptxgen=require('pptxgenjs');const p=new pptxgen();p.layout='LAYOUT_16x9';async function m(){p.addSlide().addText('x',{x:1,y:1,w:1,h:1});await p.writeFile({fileName:'deck.pptx'});}m().catch(e=>{console.error(e);process.exit(1);});\n");
    const deckBytes = await buildMinimalPptx();
    _test_setSpawn(async (cjsPath, opts) => {
      fs.writeFileSync(path.join(opts.cwd, 'deck.pptx'), deckBytes);
    });
    const r = await runCreate({ brief: loadBrief(), outDir: out, mode: 'structured-handoff' });
    assert.equal(r.convergenceReason, 'standalone-no-loop');
    assert.equal(r.cycleCount, null);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

// ----- Iter3-9: schema-validator category error points to schema doc.

test('Iter3-9: schema-validator category error points to findings-schema.md §category', () => {
  const { validate } = require('../skills/review/scripts/lib/schema-validator');
  const doc = {
    schema_version: '1.1',
    deck: 'd.pptx',
    generated_at: '2026-01-01T00:00:00Z',
    slides: [{
      slideNum: 1, title: 't', findings: [{
        severity_reviewer: 'Major', category: 'bogus', genuine: true,
        nx: 0.1, ny: 0.1, text: 't', rationale: 'r', location: 'l', standard: 's', fix: 'f',
      }],
    }],
  };
  let caught = null;
  try { validate(doc); } catch (e) { caught = e; }
  assert.ok(caught);
  assert.match(caught.message, /findings-schema\.md §category/);
});
