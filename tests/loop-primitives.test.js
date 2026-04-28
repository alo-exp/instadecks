// tests/loop-primitives.test.js — Phase 5 Plan 05-01 unit tests for the
// stateless auto-refine loop primitives. Mirrors tests/review-pipeline.test.js
// tmpdir+t.after style and tests/findings-schema.test.js field-enumeration style.

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const REPO_ROOT = path.join(__dirname, '..');
const FIXTURES = path.join(REPO_ROOT, 'tests', 'fixtures');
const LEDGER_FIXTURE = path.join(FIXTURES, 'sample-refine-ledger.jsonl');
const LEDGER_TRUNC = path.join(FIXTURES, 'sample-refine-ledger.truncated.jsonl');
const CYCLE_JPGS = path.join(FIXTURES, 'cycle-jpgs');

const {
  appendLedger, readLedger, checkInterrupt,
  hashIssueSet, slideImagesSha, slidesChangedSinceLastCycle,
} = require('../skills/create/scripts/lib/loop-primitives');

function freshTmpDir(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`)); }

function baseEntry(cycle) {
  return {
    cycle,
    timestamp: new Date(0).toISOString(),
    findings_total: 0,
    findings_genuine: 0,
    findings_fixed: 0,
    findings_intentionally_skipped: 0,
    issue_set_hash: 'sha1:da39a3ee5e6b4b0d3255bfef95601890afd80709',
    skipped_finding_ids: [],
    fixed_finding_ids: [],
    slides_changed: [],
    review_mode: 'full',
    ended_via: null,
  };
}

test('appendLedger writes JSONL line per call; readLedger preserves order', async (t) => {
  const dir = freshTmpDir('lp-append');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  await appendLedger(dir, baseEntry(1));
  await appendLedger(dir, baseEntry(2));
  const raw = fs.readFileSync(path.join(dir, 'refine-ledger.jsonl'), 'utf8');
  assert.equal(raw.split('\n').filter(Boolean).length, 2);
  assert.ok(raw.endsWith('\n'), 'final line ends with newline');
  const arr = await readLedger(dir);
  assert.equal(arr.length, 2);
  assert.equal(arr[0].cycle, 1);
  assert.equal(arr[1].cycle, 2);
});

test('appendLedger throws when entry.cycle missing or not positive integer', async (t) => {
  const dir = freshTmpDir('lp-bad');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  await assert.rejects(() => appendLedger(dir, {}), /cycle: must be positive integer/);
  await assert.rejects(() => appendLedger(dir, { cycle: 0 }), /cycle: must be positive integer/);
  await assert.rejects(() => appendLedger(dir, { cycle: 1.5 }), /cycle: must be positive integer/);
  await assert.rejects(() => appendLedger(dir, null), /cycle: must be positive integer/);
});

test('readLedger returns [] on absent file', async (t) => {
  const dir = freshTmpDir('lp-empty');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const arr = await readLedger(dir);
  assert.deepEqual(arr, []);
});

test('readLedger parses canonical 5-entry fixture', async () => {
  // Fixture is at <repo>/tests/fixtures/, but readLedger expects a runDir
  // containing refine-ledger.jsonl. Stage it to a tmpdir.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lp-fix-'));
  try {
    fs.copyFileSync(LEDGER_FIXTURE, path.join(dir, 'refine-ledger.jsonl'));
    const arr = await readLedger(dir);
    assert.equal(arr.length, 5);
    assert.equal(arr[4].ended_via, 'converged');
    assert.equal(arr[0].review_mode, 'full');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('readLedger tolerates truncated final line (Pitfall 1)', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lp-trunc-'));
  try {
    fs.copyFileSync(LEDGER_TRUNC, path.join(dir, 'refine-ledger.jsonl'));
    const arr = await readLedger(dir);
    // Truncated fixture has 4 valid entries + 1 truncated. We expect 4.
    assert.equal(arr.length, 4);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('checkInterrupt: false then true after .interrupt is created', async (t) => {
  const dir = freshTmpDir('lp-int');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  assert.equal(checkInterrupt(dir), false);
  fs.writeFileSync(path.join(dir, '.interrupt'), '');
  assert.equal(checkInterrupt(dir), true);
});

test('hashIssueSet is reorder-invariant', () => {
  const a = hashIssueSet([{ slideNum: 3, text: 'X' }, { slideNum: 1, text: 'Y' }]);
  const b = hashIssueSet([{ slideNum: 1, text: 'Y' }, { slideNum: 3, text: 'X' }]);
  assert.equal(a, b);
  assert.match(a, /^sha1:[0-9a-f]{40}$/);
});

test('hashIssueSet trims whitespace in finding text', () => {
  const trimmed = hashIssueSet([{ slideNum: 1, text: 'Y' }]);
  const padded = hashIssueSet([{ slideNum: 1, text: '  Y  ' }]);
  assert.equal(trimmed, padded);
});

test('hashIssueSet on empty array is deterministic SHA-1 of empty string', () => {
  const expected = 'sha1:' + crypto.createHash('sha1').update('').digest('hex');
  assert.equal(hashIssueSet([]), expected);
  // SHA-1 of empty string is da39a3ee5e6b4b0d3255bfef95601890afd80709.
  assert.equal(hashIssueSet([]), 'sha1:da39a3ee5e6b4b0d3255bfef95601890afd80709');
});

test('slideImagesSha returns sha256 hex per slide-NN.jpg in fixture cycle-1', async () => {
  const out = await slideImagesSha(path.join(CYCLE_JPGS, 'cycle-1'));
  assert.equal(Object.keys(out).length, 3);
  for (const name of ['slide-01.jpg', 'slide-02.jpg', 'slide-03.jpg']) {
    assert.ok(name in out, `expected ${name}`);
    assert.match(out[name], /^[0-9a-f]{64}$/);
  }
});

test('slideImagesSha is deterministic across calls (Q-2 guard)', async () => {
  const a = await slideImagesSha(path.join(CYCLE_JPGS, 'cycle-1'));
  const b = await slideImagesSha(path.join(CYCLE_JPGS, 'cycle-1'));
  assert.deepEqual(a, b);
});

test('slidesChangedSinceLastCycle returns null on cycle <= 1', async () => {
  assert.equal(await slidesChangedSinceLastCycle(CYCLE_JPGS, 1), null);
  assert.equal(await slidesChangedSinceLastCycle(CYCLE_JPGS, 0), null);
});

test('slidesChangedSinceLastCycle returns [2] on cycle-2 fixture (only slide 2 differs)', async () => {
  // Fixture layout: <CYCLE_JPGS>/cycle-1/slide-NN.jpg. Loop-primitives expects
  // <runDir>/cycle-N/slides/slide-NN.jpg. Stage runDir matching that layout.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lp-diff-'));
  try {
    for (const c of [1, 2]) {
      fs.mkdirSync(path.join(dir, `cycle-${c}`, 'slides'), { recursive: true });
      for (const n of ['slide-01.jpg', 'slide-02.jpg', 'slide-03.jpg']) {
        fs.copyFileSync(
          path.join(CYCLE_JPGS, `cycle-${c}`, n),
          path.join(dir, `cycle-${c}`, 'slides', n),
        );
      }
    }
    const changed = await slidesChangedSinceLastCycle(dir, 2);
    assert.deepEqual(changed, [2]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('slidesChangedSinceLastCycle treats missing-prior-cycle slide as changed', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lp-miss-'));
  try {
    fs.mkdirSync(path.join(dir, 'cycle-1', 'slides'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'cycle-2', 'slides'), { recursive: true });
    // cycle-1 has only slide-01; cycle-2 has slide-01 (identical) + slide-04 (new).
    const buf1 = Buffer.from('SAME');
    fs.writeFileSync(path.join(dir, 'cycle-1', 'slides', 'slide-01.jpg'), buf1);
    fs.writeFileSync(path.join(dir, 'cycle-2', 'slides', 'slide-01.jpg'), buf1);
    fs.writeFileSync(path.join(dir, 'cycle-2', 'slides', 'slide-04.jpg'), Buffer.from('NEW'));
    const changed = await slidesChangedSinceLastCycle(dir, 2);
    assert.deepEqual(changed, [4]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
