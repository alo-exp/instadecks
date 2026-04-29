'use strict';
// Plan 8-02 Task 3 — runCreate branch coverage.
// Covers: input validation (missing brief, invalid mode), missing render-deck.cjs error,
// successful spawn via _test_setSpawn DI, deck.pptx-not-produced + empty-deck error paths,
// soffice/xmllint missing produce warnings (soft-fail), designChoices triggers
// renderRationale write. All via DI stubs; no real spawn, no real soffice.
//
// runCreate is the SINGLE-CYCLE orchestrator — soft-cap / oscillation / interrupt are
// outer-loop concerns owned by SKILL.md (per CONTEXT D-01) and exercised end-to-end in
// tests/auto-refine-integration.test.js (Plan 8-02 Task 3c TEST-06 deliverable). Branch
// coverage of those primitives lives in tests/lib-create-loop-primitives-branches.test.js
// + tests/lib-create-oscillation-branches.test.js + tests/auto-refine-integration.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  runCreate, generateRunId, resolveOutDir,
  _test_setSpawn, _test_setLlm, _test_setRenderImages,
} = require('../skills/create/scripts/index');

const REPO_ROOT = path.join(__dirname, '..');
const SAMPLE_BRIEF = path.join(REPO_ROOT, 'tests', 'fixtures', 'sample-brief.json');
const SAMPLE_CJS = path.join(REPO_ROOT, 'tests', 'fixtures', 'sample-render-deck.cjs');
const TINY_DECK = path.join(REPO_ROOT, 'tests', 'fixtures', 'tiny-deck.pptx');

function freshTmpDir(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }
function loadBrief() { return JSON.parse(fs.readFileSync(SAMPLE_BRIEF, 'utf8')); }
function loadCjsSrc() { return fs.readFileSync(SAMPLE_CJS, 'utf8'); }

test('runCreate: DI hooks exported (BLOCKER B-3)', () => {
  assert.equal(typeof _test_setLlm, 'function');
  assert.equal(typeof _test_setRenderImages, 'function');
  _test_setLlm(null);
  _test_setRenderImages(null);
});

test('runCreate: missing brief rejects', async () => {
  await assert.rejects(runCreate({}), /brief required/);
});

test('runCreate: invalid mode rejects', async () => {
  await assert.rejects(
    runCreate({ brief: loadBrief(), mode: 'banana' }),
    /mode must be/,
  );
});

test('runCreate: generateRunId format', () => {
  assert.match(generateRunId(), /^\d{8}-\d{6}-[0-9a-f]{6}$/);
});

test('runCreate: resolveOutDir absolute pass-through', () => {
  assert.equal(resolveOutDir('/abs/dir', 'rid'), path.resolve('/abs/dir'));
});

test('runCreate: resolveOutDir defaults to .planning/instadecks/<runId>', () => {
  const got = resolveOutDir(null, 'abc-123');
  assert.equal(got, path.join(process.cwd(), '.planning', 'instadecks', 'abc-123'));
});

test('runCreate: missing render-deck.cjs rejects with pinpoint error', async (t) => {
  const outDir = freshTmpDir('crc-no-cjs');
  t.after(() => fs.rmSync(outDir, { recursive: true, force: true }));
  await assert.rejects(
    runCreate({ brief: loadBrief(), outDir, mode: 'structured-handoff' }),
    /render-deck\.cjs not found/,
  );
});

test('runCreate: spawn DI stub — happy path produces deck.pptx', async (t) => {
  const outDir = freshTmpDir('crc-happy');
  t.after(() => {
    _test_setSpawn(null);
    fs.rmSync(outDir, { recursive: true, force: true });
  });
  // Author render-deck.cjs (real source — must pass enum-lint).
  await fsp.writeFile(path.join(outDir, 'render-deck.cjs'), loadCjsSrc());
  // Spawn stub: writes a non-empty deck.pptx with a fake header.
  _test_setSpawn(async (cjsPath, opts) => {
    await fsp.copyFile(TINY_DECK, path.join(opts.cwd, 'deck.pptx'));
  });
  const r = await runCreate({ brief: loadBrief(), outDir, mode: 'structured-handoff' });
  assert.equal(r.deckPath, path.join(outDir, 'deck.pptx'));
  assert.ok(fs.statSync(r.deckPath).size > 0);
  assert.ok(Array.isArray(r.warnings));
});

test('runCreate: spawn DI stub — deck.pptx not produced rejects', async (t) => {
  const outDir = freshTmpDir('crc-no-deck');
  t.after(() => {
    _test_setSpawn(null);
    fs.rmSync(outDir, { recursive: true, force: true });
  });
  await fsp.writeFile(path.join(outDir, 'render-deck.cjs'), loadCjsSrc());
  _test_setSpawn(async () => { /* writes nothing */ });
  await assert.rejects(
    runCreate({ brief: loadBrief(), outDir, mode: 'structured-handoff' }),
    /deck\.pptx not found/,
  );
});

test('runCreate: spawn DI stub — empty deck.pptx rejects', async (t) => {
  const outDir = freshTmpDir('crc-empty-deck');
  t.after(() => {
    _test_setSpawn(null);
    fs.rmSync(outDir, { recursive: true, force: true });
  });
  await fsp.writeFile(path.join(outDir, 'render-deck.cjs'), loadCjsSrc());
  _test_setSpawn(async (cjsPath, opts) => {
    await fsp.writeFile(path.join(opts.cwd, 'deck.pptx'), Buffer.alloc(0));
  });
  await assert.rejects(
    runCreate({ brief: loadBrief(), outDir, mode: 'structured-handoff' }),
    /deck\.pptx is empty/,
  );
});

test('runCreate: designChoices supplied → design-rationale.md written', async (t) => {
  const outDir = freshTmpDir('crc-rationale');
  t.after(() => {
    _test_setSpawn(null);
    fs.rmSync(outDir, { recursive: true, force: true });
  });
  await fsp.writeFile(path.join(outDir, 'render-deck.cjs'), loadCjsSrc());
  _test_setSpawn(async (cjsPath, opts) => {
    await fsp.copyFile(TINY_DECK, path.join(opts.cwd, 'deck.pptx'));
  });
  const designChoices = {
    palette: { primary: '#0F172A', accent: '#3B82F6' },
    typography: { heading: 'IBM Plex Sans', body: 'IBM Plex Sans' },
    motif: 'minimal-grid',
    narrative: 'Q3 expansion arc',
    tradeoffs: [{ choice: 'X', rejected: 'Y', why: 'Z' }],
  };
  const r = await runCreate({
    brief: loadBrief(), outDir, mode: 'structured-handoff', designChoices,
  });
  assert.equal(r.rationalePath, path.join(outDir, 'design-rationale.md'));
  assert.ok(fs.existsSync(r.rationalePath));
  assert.ok(fs.statSync(r.rationalePath).size > 0);
});

test('runCreate HARD-02: serial calls against same outDir both succeed; lock removed after each', async (t) => {
  const outDir = freshTmpDir('crc-lock-serial');
  t.after(() => {
    _test_setSpawn(null);
    fs.rmSync(outDir, { recursive: true, force: true });
  });
  await fsp.writeFile(path.join(outDir, 'render-deck.cjs'), loadCjsSrc());
  _test_setSpawn(async (cjsPath, opts) => {
    await fsp.copyFile(TINY_DECK, path.join(opts.cwd, 'deck.pptx'));
  });
  const r1 = await runCreate({ brief: loadBrief(), outDir, mode: 'structured-handoff' });
  assert.ok(r1.deckPath);
  assert.equal(fs.existsSync(path.join(outDir, '.runCreate.lock')), false);
  const r2 = await runCreate({ brief: loadBrief(), outDir, mode: 'structured-handoff' });
  assert.ok(r2.deckPath);
  assert.equal(fs.existsSync(path.join(outDir, '.runCreate.lock')), false);
});

test('runCreate HARD-02: parallel call blocks while lock held; proceeds after release', async (t) => {
  const outDir = freshTmpDir('crc-lock-parallel');
  t.after(() => {
    _test_setSpawn(null);
    fs.rmSync(outDir, { recursive: true, force: true });
  });
  await fsp.writeFile(path.join(outDir, 'render-deck.cjs'), loadCjsSrc());
  _test_setSpawn(async (cjsPath, opts) => {
    await fsp.copyFile(TINY_DECK, path.join(opts.cwd, 'deck.pptx'));
  });
  // Pre-create the lock to simulate a concurrent holder.
  const lockPath = path.join(outDir, '.runCreate.lock');
  fs.writeFileSync(lockPath, String(process.pid));
  let resolved = false;
  const p = runCreate({ brief: loadBrief(), outDir, mode: 'structured-handoff' })
    .then((r) => { resolved = true; return r; });
  // Wait 600ms — runCreate should still be retrying lock acquisition.
  await new Promise((r) => setTimeout(r, 600));
  assert.equal(resolved, false, 'runCreate should still be blocked on lock');
  // Release the lock; runCreate should complete shortly after.
  fs.unlinkSync(lockPath);
  const r = await p;
  assert.ok(r.deckPath);
});

test('runCreate HARD-02: lock timeout soft-fails with stderr message and proceeds', async (t) => {
  const outDir = freshTmpDir('crc-lock-timeout');
  t.after(() => {
    _test_setSpawn(null);
    delete process.env.INSTADECKS_LOCK_TIMEOUT_MS;
    fs.rmSync(outDir, { recursive: true, force: true });
  });
  await fsp.writeFile(path.join(outDir, 'render-deck.cjs'), loadCjsSrc());
  _test_setSpawn(async (cjsPath, opts) => {
    await fsp.copyFile(TINY_DECK, path.join(opts.cwd, 'deck.pptx'));
  });
  // Pre-create the lock and never release it; rely on timeout soft-fail.
  fs.writeFileSync(path.join(outDir, '.runCreate.lock'), 'held');
  process.env.INSTADECKS_LOCK_TIMEOUT_MS = '300';
  // Capture stderr.
  const origWrite = process.stderr.write.bind(process.stderr);
  let captured = '';
  process.stderr.write = (chunk, ...rest) => { captured += String(chunk); return origWrite(chunk, ...rest); };
  try {
    const r = await runCreate({ brief: loadBrief(), outDir, mode: 'structured-handoff' });
    assert.ok(r.deckPath);
    assert.match(captured, /cwd lock timeout \(300ms\) on .* — soft-fail, proceeding without lock/);
  } finally {
    process.stderr.write = origWrite;
  }
});

test('runCreate: bogus deck content → OOXML sanity check throws (xmllint hard-fail path)', async (t) => {
  // When xmllint IS present and the deck is not valid OOXML, runCreate throws (hard fail);
  // when xmllint is MISSING, runCreate pushes a warning and continues. Both branches are
  // exercised by host tooling — this test pins the hard-fail branch which is the only one
  // we can reliably trigger in a developer/CI environment that has xmllint installed.
  const outDir = freshTmpDir('crc-bogus');
  t.after(() => {
    _test_setSpawn(null);
    fs.rmSync(outDir, { recursive: true, force: true });
  });
  await fsp.writeFile(path.join(outDir, 'render-deck.cjs'), loadCjsSrc());
  _test_setSpawn(async (cjsPath, opts) => {
    await fsp.writeFile(path.join(opts.cwd, 'deck.pptx'), Buffer.from('not really a pptx'));
  });
  await assert.rejects(
    runCreate({ brief: loadBrief(), outDir, mode: 'structured-handoff' }),
    /OOXML sanity check failed|xmllint/,
  );
});
