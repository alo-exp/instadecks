// tests/create-runtime.test.js — Integration tests for skills/create/scripts/index.js (runCreate).
// Covers CRT-01 (brief→outputs), CRT-02 (cookbook composition), CRT-03 (per-run cjs),
// CRT-15 (D-05 layer 2 ENUM gate runs BEFORE spawn), mode-gating (D-08),
// xmllint soft-fail (P-08), generateRunId/resolveOutDir contracts.

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  runCreate,
  generateRunId,
  resolveOutDir,
  _test_setSpawn,
} = require('../skills/create/scripts/index');

const REPO_ROOT = path.join(__dirname, '..');
const SAMPLE_BRIEF_PATH = path.join(REPO_ROOT, 'tests', 'fixtures', 'sample-brief.json');
const SAMPLE_CJS_PATH = path.join(REPO_ROOT, 'tests', 'fixtures', 'sample-render-deck.cjs');
const BAD_CJS_PATH = path.join(REPO_ROOT, 'tests', 'fixtures', 'bad-render-deck.cjs');

function freshTmp(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }
function loadBrief() { return JSON.parse(fs.readFileSync(SAMPLE_BRIEF_PATH, 'utf8')); }

// Stub spawn that writes a minimal valid PPTX (PK zip with ppt/presentation.xml).
function makeStubSpawn(deckBytes) {
  return async (cjsPath, opts) => {
    fs.writeFileSync(path.join(opts.cwd, 'deck.pptx'), deckBytes);
  };
}

// Build a minimal PPTX that passes magic-byte + xmllint check, using jszip.
function buildMinimalPptx() {
  const JSZip = require('jszip');
  const zip = new JSZip();
  zip.file('ppt/presentation.xml',
    '<?xml version="1.0"?><p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"></p:presentation>');
  zip.file('ppt/slides/slide1.xml', '<x/>');
  zip.file('ppt/slides/slide2.xml', '<x/>');
  return zip.generateAsync({ type: 'nodebuffer' });
}

test('create-runtime', async (t) => {
  t.after(() => _test_setSpawn(null));

  await t.test('pure: runCreate({}) rejects /brief required/', async () => {
    await assert.rejects(runCreate({}), /brief required/);
  });

  await t.test('pure: runCreate with invalid brief throws via validateBrief', async () => {
    await assert.rejects(
      runCreate({ brief: { topic: 'x' } }),
      /missing|narrative_arc|audience/,
    );
  });

  await t.test('pure: generateRunId format', () => {
    assert.match(generateRunId(), /^\d{8}-\d{6}-[0-9a-f]{6}$/);
  });

  await t.test('pure: resolveOutDir absolute passthrough vs default', () => {
    const abs = resolveOutDir('/tmp/foo', 'rid');
    assert.equal(abs, path.resolve('/tmp/foo'));
    const def = resolveOutDir(undefined, 'rid-1');
    assert.ok(def.endsWith(path.join('.planning', 'instadecks', 'rid-1')));
    assert.ok(path.isAbsolute(def));
  });

  await t.test('lintCjs runs BEFORE spawn (CRT-15 / D-05 layer 2)', async () => {
    const out = freshTmp('crt-lint');
    try {
      // Copy bad cjs (uses string-literal addShape) into outDir
      fs.copyFileSync(BAD_CJS_PATH, path.join(out, 'render-deck.cjs'));
      // If spawn ran, this would throw a different error.
      _test_setSpawn(() => { throw new Error('SHOULD-NOT-SPAWN'); });
      await assert.rejects(
        runCreate({ brief: loadBrief(), outDir: out, mode: 'structured-handoff' }),
        /enum-lint/,
      );
    } finally {
      _test_setSpawn(null);
      fs.rmSync(out, { recursive: true, force: true });
    }
  });

  await t.test('runCreate happy path returns full result shape', async () => {
    const out = freshTmp('crt-happy');
    try {
      fs.copyFileSync(SAMPLE_CJS_PATH, path.join(out, 'render-deck.cjs'));
      const deckBytes = await buildMinimalPptx();
      _test_setSpawn(makeStubSpawn(deckBytes));
      const r = await runCreate({
        brief: loadBrief(),
        outDir: out,
        mode: 'structured-handoff',
        designChoices: {
          palette: { name: 'Indigo Dawn', primary: '1E2761', secondary: 'CADCFC', accent: 'FFFFFF', rationale: 'tested' },
          typography: { heading: 'IBM Plex Sans', body: 'IBM Plex Sans', rationale: 'pinned' },
          motif: 'Restrained executive.',
          tradeoffs: ['Simplicity over decoration.'],
        },
      });
      assert.ok(r.deckPath, 'deckPath');
      assert.ok('pdfPath' in r, 'pdfPath key present');
      assert.ok(r.rationalePath, 'rationalePath');
      assert.equal(r.runDir, path.resolve(out));
      assert.match(r.runId, /^\d{8}-\d{6}-[0-9a-f]{6}$/);
      assert.equal(typeof r.slidesCount, 'number');
      assert.ok(r.slidesCount >= 1);
      assert.ok(Array.isArray(r.warnings));
      // rationale was written because designChoices supplied
      assert.ok(fs.existsSync(r.rationalePath));
      const rationaleSrc = fs.readFileSync(r.rationalePath, 'utf8');
      assert.match(rationaleSrc, /Design Rationale/);
      assert.match(rationaleSrc, /## Palette/);
    } finally {
      _test_setSpawn(null);
      fs.rmSync(out, { recursive: true, force: true });
    }
  });

  await t.test('mode standalone prints JSON; structured-handoff silent', async () => {
    const out1 = freshTmp('crt-mode1');
    const out2 = freshTmp('crt-mode2');
    try {
      const deckBytes = await buildMinimalPptx();
      fs.copyFileSync(SAMPLE_CJS_PATH, path.join(out1, 'render-deck.cjs'));
      fs.copyFileSync(SAMPLE_CJS_PATH, path.join(out2, 'render-deck.cjs'));
      _test_setSpawn(makeStubSpawn(deckBytes));

      const origWrite = process.stdout.write.bind(process.stdout);
      let captured1 = '';
      process.stdout.write = (chunk, ...rest) => {
        captured1 += typeof chunk === 'string' ? chunk : chunk.toString();
        return origWrite(chunk, ...rest);
      };
      try {
        await runCreate({ brief: loadBrief(), outDir: out1, mode: 'standalone' });
      } finally { process.stdout.write = origWrite; }
      assert.match(captured1, /deckPath/);

      let captured2 = '';
      process.stdout.write = (chunk, ...rest) => {
        captured2 += typeof chunk === 'string' ? chunk : chunk.toString();
        return origWrite(chunk, ...rest);
      };
      try {
        await runCreate({ brief: loadBrief(), outDir: out2, mode: 'structured-handoff' });
      } finally { process.stdout.write = origWrite; }
      assert.doesNotMatch(captured2, /deckPath/);
    } finally {
      _test_setSpawn(null);
      fs.rmSync(out1, { recursive: true, force: true });
      fs.rmSync(out2, { recursive: true, force: true });
    }
  });

  await t.test('missing xmllint produces warning, not throw (P-08)', async () => {
    const out = freshTmp('crt-xmllint');
    try {
      fs.copyFileSync(SAMPLE_CJS_PATH, path.join(out, 'render-deck.cjs'));
      const deckBytes = await buildMinimalPptx();
      _test_setSpawn(makeStubSpawn(deckBytes));
      // Override PATH so xmllint cannot be resolved.
      const origPath = process.env.PATH;
      process.env.PATH = '/nonexistent-empty-dir';
      try {
        const r = await runCreate({ brief: loadBrief(), outDir: out, mode: 'structured-handoff' });
        // xmllint missing → warning; soffice also unreachable here → another warning.
        assert.ok(r.warnings.some(w => /xmllint/i.test(w)),
          `expected xmllint warning; got: ${JSON.stringify(r.warnings)}`);
      } finally {
        process.env.PATH = origPath;
      }
    } finally {
      _test_setSpawn(null);
      fs.rmSync(out, { recursive: true, force: true });
    }
  });
});
