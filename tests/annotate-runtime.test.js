// tests/annotate-runtime.test.js — Integration tests for skills/annotate/scripts/index.js (runAnnotate) and cli.js.
// Covers ANNO-08 (PPTX + PDF written), ANNO-09 (CLI wrapper), ANNO-10 (in-memory pipelined invocation),
// D-03/D-04 (sibling outputs), P-05 (no .annotated.annotated double-suffix), D-05 (run-dir archive layout).

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { runAnnotate, generateRunId, resolveSiblingOutputs } = require('../skills/annotate/scripts/index');

const REPO_ROOT = path.join(__dirname, '..');
const SAMPLE_FINDINGS = path.join(REPO_ROOT, 'tests', 'fixtures', 'sample-findings.json');
const REF_DECK = path.join(REPO_ROOT, 'tests', 'fixtures', 'v8-reference', 'Annotations_Sample.pptx');
const CLI = path.join(REPO_ROOT, 'skills', 'annotate', 'scripts', 'cli.js');

const sofficeAvailable = spawnSync('command', ['-v', 'soffice'], { shell: true }).status === 0;

function freshTmpDir(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }

test('annotate-runtime', async (t) => {
  await t.test('pure: input validation — missing deckPath', async () => {
    await assert.rejects(runAnnotate({ findings: {} }), /deckPath required/);
  });

  await t.test('pure: input validation — missing findings', async () => {
    await assert.rejects(runAnnotate({ deckPath: '/x' }), /findings required/);
  });

  await t.test('pure: generateRunId format', () => {
    assert.match(generateRunId(), /^\d{8}-\d{6}-[0-9a-f]{6}$/);
  });

  await t.test('pure: resolveSiblingOutputs strips trailing .annotated (P-05)', () => {
    assert.deepEqual(resolveSiblingOutputs('/x/y/foo.pptx'),
      { pptxPath: '/x/y/foo.annotated.pptx', pdfPath: '/x/y/foo.annotated.pdf' });
    assert.deepEqual(resolveSiblingOutputs('/x/y/foo.annotated.pptx'),
      { pptxPath: '/x/y/foo.annotated.pptx', pdfPath: '/x/y/foo.annotated.pdf' });
  });

  await t.test('integration: pipelined mode (in-memory findings)', async (t) => {
    if (!sofficeAvailable) { t.skip('soffice not available'); return; }
    const tmpDeck = freshTmpDir('anno-deck');
    const outDir = freshTmpDir('anno-out');
    try {
      const deckCopy = path.join(tmpDeck, 'foo.pptx');
      fs.copyFileSync(REF_DECK, deckCopy);
      const findings = JSON.parse(fs.readFileSync(SAMPLE_FINDINGS, 'utf8'));
      const r = await runAnnotate({ deckPath: deckCopy, findings, outDir });
      assert.ok(fs.statSync(r.pptxPath).size > 0, 'pptxPath has content');
      assert.ok(fs.statSync(r.pdfPath).size > 0, 'pdfPath has content');
      assert.match(r.runId, /^\d{8}-\d{6}-[0-9a-f]{6}$/);
      assert.ok(fs.existsSync(path.join(r.runDir, 'findings.json')));
      assert.ok(fs.existsSync(path.join(r.runDir, 'work')));
      // Slide 7 is in sample-findings; symlink basename follows verbatim annotate.js (v8s-07.jpg).
      assert.ok(fs.existsSync(path.join(r.runDir, 'work', 'v8s-07.jpg')));
    } finally {
      fs.rmSync(tmpDeck, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  await t.test('integration: CLI mode equivalence', async (t) => {
    if (!sofficeAvailable) { t.skip('soffice not available'); return; }
    const tmpDeck = freshTmpDir('anno-cli-deck');
    const outDir = freshTmpDir('anno-cli');
    try {
      const deckCopy = path.join(tmpDeck, 'bar.pptx');
      fs.copyFileSync(REF_DECK, deckCopy);
      const res = spawnSync(process.execPath, [CLI, deckCopy, SAMPLE_FINDINGS, outDir],
        { encoding: 'utf8', timeout: 120_000 });
      assert.equal(res.status, 0, `cli failed: ${res.stderr}`);
      const out = JSON.parse(res.stdout);
      assert.ok(fs.statSync(out.pptxPath).size > 0);
      assert.ok(fs.statSync(out.pdfPath).size > 0);
    } finally {
      fs.rmSync(tmpDeck, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  await t.test('integration: sibling-output naming', async (t) => {
    if (!sofficeAvailable) { t.skip('soffice not available'); return; }
    const tmp = freshTmpDir('anno-sibling');
    const outDir = freshTmpDir('anno-sibling-out');
    try {
      const deckCopy = path.join(tmp, 'foo.pptx');
      fs.copyFileSync(REF_DECK, deckCopy);
      const findings = JSON.parse(fs.readFileSync(SAMPLE_FINDINGS, 'utf8'));
      const r = await runAnnotate({ deckPath: deckCopy, findings, outDir });
      assert.equal(r.pptxPath, path.join(tmp, 'foo.annotated.pptx'));
      assert.ok(fs.existsSync(r.pptxPath));
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  await t.test('integration: silent overwrite re-run (D-04)', async (t) => {
    if (!sofficeAvailable) { t.skip('soffice not available'); return; }
    const tmp = freshTmpDir('anno-rerun');
    const outDir1 = freshTmpDir('anno-rerun-1');
    const outDir2 = freshTmpDir('anno-rerun-2');
    try {
      const deckCopy = path.join(tmp, 'foo.pptx');
      fs.copyFileSync(REF_DECK, deckCopy);
      const findings = JSON.parse(fs.readFileSync(SAMPLE_FINDINGS, 'utf8'));
      const r1 = await runAnnotate({ deckPath: deckCopy, findings, outDir: outDir1 });
      const m1 = fs.statSync(r1.pptxPath).mtimeMs;
      await new Promise(res => setTimeout(res, 50));
      const r2 = await runAnnotate({ deckPath: deckCopy, findings, outDir: outDir2 });
      const m2 = fs.statSync(r2.pptxPath).mtimeMs;
      assert.equal(r1.pptxPath, r2.pptxPath, 'sibling output path is stable');
      assert.ok(m2 >= m1, 'mtime advances on re-run (silent overwrite)');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
      fs.rmSync(outDir1, { recursive: true, force: true });
      fs.rmSync(outDir2, { recursive: true, force: true });
    }
  });

  await t.test('integration: P-05 no .annotated.annotated', async (t) => {
    if (!sofficeAvailable) { t.skip('soffice not available'); return; }
    const tmp = freshTmpDir('anno-p05');
    const outDir = freshTmpDir('anno-p05-out');
    try {
      const deckCopy = path.join(tmp, 'foo.annotated.pptx');
      fs.copyFileSync(REF_DECK, deckCopy);
      const findings = JSON.parse(fs.readFileSync(SAMPLE_FINDINGS, 'utf8'));
      const r = await runAnnotate({ deckPath: deckCopy, findings, outDir });
      assert.equal(r.pptxPath, path.join(tmp, 'foo.annotated.pptx'));
      assert.ok(!r.pptxPath.includes('.annotated.annotated'));
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  await t.test('integration: run-dir archive (D-05)', async (t) => {
    if (!sofficeAvailable) { t.skip('soffice not available'); return; }
    const tmp = freshTmpDir('anno-archive');
    const outDir = freshTmpDir('anno-archive-out');
    try {
      const deckCopy = path.join(tmp, 'foo.pptx');
      fs.copyFileSync(REF_DECK, deckCopy);
      const findings = JSON.parse(fs.readFileSync(SAMPLE_FINDINGS, 'utf8'));
      const r = await runAnnotate({ deckPath: deckCopy, findings, outDir });
      const findingsCopy = JSON.parse(fs.readFileSync(path.join(r.runDir, 'findings.json'), 'utf8'));
      assert.equal(findingsCopy.schema_version, findings.schema_version);
      assert.equal(findingsCopy.slides.length, findings.slides.length);
      assert.ok(fs.existsSync(path.join(r.runDir, 'work', 'Annotations_Sample.pptx')));
      assert.ok(fs.existsSync(path.join(r.runDir, 'Annotations_Sample.pdf')));
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  await t.test('CLI: missing args exits 2', () => {
    const res = spawnSync(process.execPath, [CLI], { encoding: 'utf8' });
    assert.equal(res.status, 2);
    assert.match(res.stderr, /Usage:/);
  });
});
