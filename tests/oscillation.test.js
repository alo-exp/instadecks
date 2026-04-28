// tests/oscillation.test.js — Phase 5 D-09 / Pitfall 2 oscillation detector unit tests.
// Pure function; no fs.

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { detectOscillation } = require('../skills/create/scripts/lib/oscillation');
const { readLedger } = require('../skills/create/scripts/lib/loop-primitives');

const LEDGER_FIXTURE = path.join(__dirname, 'fixtures', 'sample-refine-ledger.jsonl');

function entry(hash, gen) {
  return {
    cycle: 0,
    issue_set_hash: hash,
    findings_genuine: gen,
    fixed_finding_ids: [],
    skipped_finding_ids: [],
  };
}

test('detectOscillation: empty ledger returns false', () => {
  assert.equal(detectOscillation([]), false);
});

test('detectOscillation: ledger of length 2 returns false (need >= 3 entries)', () => {
  assert.equal(detectOscillation([entry('A', 3), entry('B', 3)]), false);
});

test('detectOscillation: cycle N hash == cycle N-2 hash AND genuine > 0 → true', () => {
  const led = [entry('A', 3), entry('B', 3), entry('A', 3)];
  assert.equal(detectOscillation(led), true);
});

test('detectOscillation: drift (all hashes distinct) → false', () => {
  const led = [entry('A', 3), entry('B', 3), entry('C', 3)];
  assert.equal(detectOscillation(led), false);
});

test('detectOscillation: cycle N converged (genuine == 0) → false', () => {
  const led = [entry('A', 3), entry('A', 3), entry('A', 0)];
  assert.equal(detectOscillation(led), false);
});

test('detectOscillation: shrinking-but-N-matches-N-2 still flags (Pitfall 2)', () => {
  // Even though gen shrinks (5 → 3 → 2), the unfixed-genuine hash is
  // identical at N and N-2 → oscillation per D-09.
  const led = [entry('A', 5), entry('B', 3), entry('A', 2)];
  assert.equal(detectOscillation(led), true);
});

test('detectOscillation: throws on non-array input', () => {
  assert.throws(() => detectOscillation('not array'), /ledger must be array/);
  assert.throws(() => detectOscillation(null), /ledger must be array/);
  assert.throws(() => detectOscillation({}), /ledger must be array/);
});

test('detectOscillation: real fixture cycles 1-3 trigger true (cycle 3 hash matches cycle 1)', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'osc-fix-'));
  try {
    fs.copyFileSync(LEDGER_FIXTURE, path.join(dir, 'refine-ledger.jsonl'));
    const all = await readLedger(dir);
    const slice = all.slice(0, 3);
    assert.equal(slice.length, 3);
    assert.equal(slice[0].issue_set_hash, slice[2].issue_set_hash);
    assert.ok(slice[2].findings_genuine > 0);
    assert.equal(detectOscillation(slice), true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
