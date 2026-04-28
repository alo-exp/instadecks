// tests/lib-create-oscillation-branches.test.js — Plan 08-02 Task 1 (Group B).
// EXTENDS tests/oscillation.test.js with edge-case branches.

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const { detectOscillation } = require('../skills/create/scripts/lib/oscillation');

function entry(hash, gen) {
  return { cycle: 0, issue_set_hash: hash, findings_genuine: gen };
}

test('detectOscillation: ledger of length exactly 3 — happy path', () => {
  assert.equal(detectOscillation([entry('A', 1), entry('B', 1), entry('A', 1)]), true);
});

test('detectOscillation: ledger of length exactly 1 → false', () => {
  assert.equal(detectOscillation([entry('A', 5)]), false);
});

test('detectOscillation: missing N or N-2 entries (sparse-array hole) → false', () => {
  // eslint-disable-next-line no-sparse-arrays
  const led = [entry('A', 1), entry('B', 1), undefined];
  assert.equal(detectOscillation(led), false);
});

test('detectOscillation: N has issue_set_hash undefined → false', () => {
  const led = [entry('A', 1), entry('B', 1), { findings_genuine: 1 }];
  assert.equal(detectOscillation(led), false);
});

test('detectOscillation: N has empty-string hash → false (Boolean coerce)', () => {
  const led = [entry('A', 1), entry('B', 1), entry('', 1)];
  assert.equal(detectOscillation(led), false);
});

test('detectOscillation: N missing findings_genuine treated as 0 → false', () => {
  const led = [entry('A', 1), entry('B', 1), { issue_set_hash: 'A' }];
  assert.equal(detectOscillation(led), false);
});

test('detectOscillation: longer ledger uses LAST and N-2 (not first/middle)', () => {
  // [_,_,_,_,_,A,_,A] — len 8. last index 7 hash 'A'; N-2 index 5 hash 'A'.
  const led = [
    entry('Z', 1), entry('Z', 1), entry('Z', 1), entry('Z', 1), entry('Z', 1),
    entry('A', 2), entry('B', 2), entry('A', 2),
  ];
  assert.equal(detectOscillation(led), true);
});

test('detectOscillation: throws on non-array', () => {
  assert.throws(() => detectOscillation(undefined), /must be array/);
  assert.throws(() => detectOscillation(42), /must be array/);
});
