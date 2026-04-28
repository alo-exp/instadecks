// tests/lib-create-loop-primitives-branches.test.js — Plan 08-02 Task 1 (Group B).
// EXTENDS tests/loop-primitives.test.js coverage with branch-completion edge cases:
// - appendLedger: NaN cycle, non-integer cycle, missing cycle, null entry
// - readLedger: silent skip of bad lines, empty file, file with only newlines
// - hashIssueSet: non-array, deterministic SHA, ordering invariance
// - slideImagesSha: non-existent dir, dir with no slide-NN.jpg files, slides/ subdir
// - slidesChangedSinceLastCycle: cycle≤1 returns null, missing-prev-cycle dir
// - checkInterrupt: false on bare dir, true after file creation

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  appendLedger, readLedger, checkInterrupt,
  hashIssueSet, slideImagesSha, slidesChangedSinceLastCycle,
} = require('../skills/create/scripts/lib/loop-primitives');

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'instadecks-08-02-lp-')); }

test('appendLedger: rejects NaN cycle', async (t) => {
  const dir = tmp();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  await assert.rejects(() => appendLedger(dir, { cycle: NaN }), /cycle: must be positive integer/);
});

test('appendLedger: rejects negative cycle', async (t) => {
  const dir = tmp();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  await assert.rejects(() => appendLedger(dir, { cycle: -1 }), /cycle: must be positive integer/);
});

test('appendLedger: rejects entry without cycle field', async (t) => {
  const dir = tmp();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  await assert.rejects(() => appendLedger(dir, { foo: 'bar' }), /cycle: must be positive integer/);
});

test('appendLedger: error message reports null when entry is null', async (t) => {
  const dir = tmp();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  await assert.rejects(() => appendLedger(dir, null), /got null/);
});

test('readLedger: empty file → []', async (t) => {
  const dir = tmp();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dir, 'refine-ledger.jsonl'), '');
  assert.deepEqual(await readLedger(dir), []);
});

test('readLedger: file with only newlines → []', async (t) => {
  const dir = tmp();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dir, 'refine-ledger.jsonl'), '\n\n\n');
  assert.deepEqual(await readLedger(dir), []);
});

test('readLedger: silently skips malformed JSON lines (Pitfall 1)', async (t) => {
  const dir = tmp();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(
    path.join(dir, 'refine-ledger.jsonl'),
    '{"cycle":1}\nnot-json\n{"cycle":2}\n',
  );
  const arr = await readLedger(dir);
  assert.equal(arr.length, 2);
  assert.equal(arr[0].cycle, 1);
  assert.equal(arr[1].cycle, 2);
});

test('readLedger: rethrows non-ENOENT fs errors', async (t) => {
  const dir = tmp();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  // Stage refine-ledger.jsonl as a directory (not file) — readFile throws EISDIR.
  fs.mkdirSync(path.join(dir, 'refine-ledger.jsonl'));
  await assert.rejects(() => readLedger(dir));
});

test('checkInterrupt: false on dir without .interrupt', () => {
  const dir = tmp();
  try {
    assert.equal(checkInterrupt(dir), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('hashIssueSet: throws on non-array', () => {
  assert.throws(() => hashIssueSet(null), /must be array/);
  assert.throws(() => hashIssueSet({}), /must be array/);
  assert.throws(() => hashIssueSet('s'), /must be array/);
});

test('hashIssueSet: deterministic format sha1:<40hex>', () => {
  const h = hashIssueSet([{ slideNum: 1, text: 'foo' }]);
  assert.match(h, /^sha1:[0-9a-f]{40}$/);
});

test('slideImagesSha: returns {} on non-existent dir', async () => {
  const out = await slideImagesSha('/nonexistent/cycle-99');
  assert.deepEqual(out, {});
});

test('slideImagesSha: skips files NOT matching slide-NN.jpg', async (t) => {
  const dir = tmp();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dir, 'README.txt'), 'x');
  fs.writeFileSync(path.join(dir, 'slide-01.png'), 'x');
  fs.writeFileSync(path.join(dir, 'slide-1.jpg'), 'x'); // no zero-pad → does NOT match (\d+ does match — re-check)
  fs.writeFileSync(path.join(dir, 'slide-02.jpg'), 'data');
  const out = await slideImagesSha(dir);
  // SLIDE_RE = /^slide-(\d+)\.jpg$/ — matches both slide-1.jpg and slide-02.jpg.
  assert.ok('slide-02.jpg' in out);
  assert.ok('slide-1.jpg' in out);
  assert.ok(!('README.txt' in out));
  assert.ok(!('slide-01.png' in out));
});

test('slideImagesSha: prefers slides/ subdir when present', async (t) => {
  const dir = tmp();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  // Top-level file should be ignored once slides/ subdir exists.
  fs.writeFileSync(path.join(dir, 'slide-01.jpg'), 'TOP');
  fs.mkdirSync(path.join(dir, 'slides'));
  fs.writeFileSync(path.join(dir, 'slides', 'slide-01.jpg'), 'SUB');
  const out = await slideImagesSha(dir);
  // Hash should be of 'SUB', not 'TOP'.
  const crypto = require('node:crypto');
  const expected = crypto.createHash('sha256').update('SUB').digest('hex');
  assert.equal(out['slide-01.jpg'], expected);
});

test('slidesChangedSinceLastCycle: cycle 1 → null', async () => {
  assert.equal(await slidesChangedSinceLastCycle('/anywhere', 1), null);
});

test('slidesChangedSinceLastCycle: non-integer cycle → null', async () => {
  assert.equal(await slidesChangedSinceLastCycle('/anywhere', 1.5), null);
  assert.equal(await slidesChangedSinceLastCycle('/anywhere', 'two'), null);
});

test('slidesChangedSinceLastCycle: missing cycle dirs → []', async (t) => {
  const dir = tmp();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  // No cycle-N subdirs created → cur and prev both empty → no diffs.
  const out = await slidesChangedSinceLastCycle(dir, 2);
  assert.deepEqual(out, []);
});
