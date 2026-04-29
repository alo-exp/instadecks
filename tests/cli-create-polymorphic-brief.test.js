'use strict';
// tests/cli-create-polymorphic-brief.test.js — Plan 9-04 Task 3.
// Covers --brief-text / --brief-md / --brief-files flag wiring, mutual
// exclusion (exit 2), unknown-extension error, and backward-compat with
// the legacy --brief flag (still works unchanged). Pure parseArgs / helper
// tests + a couple of subprocess assertions for stderr exit codes.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.join(__dirname, '..');
const CLI = path.join(REPO_ROOT, 'skills', 'create', 'scripts', 'cli.js');
const SAMPLE_BRIEF = path.join(REPO_ROOT, 'tests', 'fixtures', 'sample-brief.json');

const { parseArgs, inferTypeFromExt, countBriefFlags } =
  require('../skills/create/scripts/cli.js');

function freshTmp(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }

test('cli-create-polymorphic-brief', async (t) => {
  // ---------- parseArgs branches for new flags ----------

  await t.test('parseArgs: --brief-text populates briefText', () => {
    const a = parseArgs(['--brief-text', 'raw prose here']);
    assert.equal(a.briefText, 'raw prose here');
  });

  await t.test('parseArgs: --brief-md populates briefMd', () => {
    const a = parseArgs(['--brief-md', 'b.md']);
    assert.equal(a.briefMd, 'b.md');
  });

  await t.test('parseArgs: --brief-files populates briefFiles', () => {
    const a = parseArgs(['--brief-files', 'a.pdf,b.docx']);
    assert.equal(a.briefFiles, 'a.pdf,b.docx');
  });

  await t.test('parseArgs: legacy --brief still works', () => {
    const a = parseArgs(['--brief', 'b.json']);
    assert.equal(a.brief, 'b.json');
  });

  // ---------- inferTypeFromExt ----------

  await t.test('inferTypeFromExt: .pdf → pdf', () => {
    assert.equal(inferTypeFromExt('a.pdf'), 'pdf');
  });
  await t.test('inferTypeFromExt: .docx → docx', () => {
    assert.equal(inferTypeFromExt('a.docx'), 'docx');
  });
  await t.test('inferTypeFromExt: .md → md', () => {
    assert.equal(inferTypeFromExt('a.md'), 'md');
  });
  await t.test('inferTypeFromExt: .txt → transcript', () => {
    assert.equal(inferTypeFromExt('a.txt'), 'transcript');
  });
  await t.test('inferTypeFromExt: .transcript → transcript', () => {
    assert.equal(inferTypeFromExt('a.transcript'), 'transcript');
  });
  await t.test('inferTypeFromExt: unknown ext throws', () => {
    assert.throws(() => inferTypeFromExt('a.rtf'), /cli: cannot infer type for path: a\.rtf/);
  });

  // ---------- countBriefFlags ----------

  await t.test('countBriefFlags: zero', () => {
    assert.equal(countBriefFlags(parseArgs([])), 0);
  });
  await t.test('countBriefFlags: one', () => {
    assert.equal(countBriefFlags(parseArgs(['--brief-text', 'x'])), 1);
  });
  await t.test('countBriefFlags: two → caller treats as conflict', () => {
    assert.equal(
      countBriefFlags(parseArgs(['--brief', 'a.json', '--brief-text', 'x'])),
      2,
    );
  });
  await t.test('countBriefFlags: counts empty-string --brief-text as set', () => {
    // The user explicitly passed the flag; treat as set even if value is "".
    assert.equal(countBriefFlags(parseArgs(['--brief-text', ''])), 1);
  });

  // ---------- subprocess: mutual exclusion exits 2 ----------

  await t.test('subprocess: --brief + --brief-text → exit 2 + stderr', () => {
    const r = spawnSync(process.execPath,
      [CLI, '--brief', SAMPLE_BRIEF, '--brief-text', 'hi'],
      { encoding: 'utf8' });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /^cli: brief flags are mutually exclusive/);
  });

  // ---------- subprocess: unknown extension → exit 2 ----------

  await t.test('subprocess: --brief-files unknown ext → exit 2', () => {
    const r = spawnSync(process.execPath,
      [CLI, '--brief-files', 'a.rtf'],
      { encoding: 'utf8' });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /cli: cannot infer type for path: a\.rtf/);
  });

  // ---------- subprocess: --brief-md reads file (will then fail downstream
  // because no LLM stub + no render-deck.cjs, but we only verify routing) ----------

  await t.test('subprocess: --brief-md reads file & routes to runCreate', () => {
    const tmp = freshTmp('cli-bmd');
    try {
      const mdPath = path.join(tmp, 'brief.md');
      fs.writeFileSync(mdPath, '# My Deck\nbody', 'utf8');
      // No render-deck.cjs in outDir + no LLM stub → expect non-zero exit
      // with a stderr that proves we got past brief-flag parsing.
      const r = spawnSync(process.execPath,
        [CLI, '--brief-md', mdPath, '--out-dir', tmp],
        { encoding: 'utf8' });
      assert.notEqual(r.status, 0);
      // The error must come from the normalizer (no LLM) — proving the md
      // file was read and routed through normalizeBrief, not from arg parsing.
      assert.match(r.stderr, /brief-normalizer: no LLM configured/);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  // ---------- subprocess: --brief-text routes to runCreate ----------

  await t.test('subprocess: --brief-text routes to runCreate (raw shape)', () => {
    const tmp = freshTmp('cli-btxt');
    try {
      const r = spawnSync(process.execPath,
        [CLI, '--brief-text', 'plain prose input', '--out-dir', tmp],
        { encoding: 'utf8' });
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /brief-normalizer: no LLM configured/);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  // ---------- subprocess: --brief-files routes to runCreate ----------

  await t.test('subprocess: --brief-files routes to runCreate (files shape)', () => {
    const tmp = freshTmp('cli-bfiles');
    try {
      const txt = path.join(tmp, 'src.txt');
      fs.writeFileSync(txt, 'source text', 'utf8');
      const r = spawnSync(process.execPath,
        [CLI, '--brief-files', txt, '--out-dir', tmp],
        { encoding: 'utf8' });
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /brief-normalizer: no LLM configured/);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  // ---------- subprocess: no brief flag → exit 1 + Usage ----------

  await t.test('subprocess: no brief flag → exit 1 + Usage', () => {
    const r = spawnSync(process.execPath, [CLI], { encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Usage/);
  });

  // ---------- subprocess: --brief-md missing file → exit 2 ----------

  await t.test('subprocess: --brief-md missing file → exit 2', () => {
    const r = spawnSync(process.execPath,
      [CLI, '--brief-md', '/nonexistent/path.md'],
      { encoding: 'utf8' });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /failed to read --brief-md/);
  });
});
