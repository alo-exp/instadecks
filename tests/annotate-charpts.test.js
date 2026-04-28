'use strict';
// tests/annotate-charpts.test.js — Plan 08-03 Task 1.
// charPts in annotate.js is the per-character advance-width lookup used by the
// word-wrap simulator (wordWrapLineCount → estimateBoxH). Tests assert the table
// is exhaustive over the printable-ASCII subset annotate.js can encounter, every
// branch returns a finite positive number, and canonical lookups match source.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAnnotateInternals } = require('./helpers/annotate-vm');

const internals = loadAnnotateInternals();
const { charPts, wordWrapLineCount, estimateBoxH, COLUMN_PT } = internals;

test('charPts — all branches return finite positive numbers for printable ASCII', () => {
  let sum = 0;
  let count = 0;
  for (let code = 0x20; code < 0x7f; code++) {
    const c = String.fromCharCode(code);
    const w = charPts(c);
    assert.equal(typeof w, 'number');
    assert.ok(Number.isFinite(w), `charPts(${JSON.stringify(c)})=${w} must be finite`);
    assert.ok(w > 0, `charPts(${JSON.stringify(c)})=${w} must be positive`);
    sum += w;
    count += 1;
  }
  // Deterministic table — frozen sum across all printable ASCII (95 chars).
  assert.equal(count, 95);
  // Sanity: the sum is finite and within a reasonable proportional-font envelope.
  assert.ok(sum > 100 && sum < 1000, `sum=${sum} out of range`);
});

test('charPts — canonical glyph-class lookups match source-of-truth values', () => {
  // Values read directly from skills/annotate/scripts/annotate.js (lines 68-83).
  assert.equal(charPts(' '), 2.1);     // space
  assert.equal(charPts('i'), 2.3);     // narrow lowercase
  assert.equal(charPts('I'), 2.3);     // narrow lowercase set includes 'I' literal? No — capital 'I' is in the next branch
  // Re-check: 'iIl|!1j' includes 'I' → 2.3.
  assert.equal(charPts('l'), 2.3);
  assert.equal(charPts('1'), 2.3);     // '1' is in the narrow set, not the digits branch
  assert.equal(charPts('f'), 3.0);
  assert.equal(charPts('a'), 3.9);
  assert.equal(charPts('b'), 4.2);
  assert.equal(charPts('m'), 5.8);
  assert.equal(charPts('w'), 5.8);
  assert.equal(charPts('A'), 5.0);     // generic caps
  assert.equal(charPts('F'), 3.8);     // narrow caps
  assert.equal(charPts('M'), 6.2);     // wide caps
  assert.equal(charPts('W'), 6.2);
  assert.equal(charPts('0'), 4.3);     // digits
  assert.equal(charPts('9'), 4.3);
  assert.equal(charPts('?'), 3.2);     // punctuation fallthrough
});

test('charPts — exhaustive branch coverage for narrow-letter set', () => {
  for (const c of 'iIl|!1j') assert.equal(charPts(c), 2.3);
  for (const c of 'frt')      assert.equal(charPts(c), 3.0);
  for (const c of 'acesuvxyz') assert.equal(charPts(c), 3.9);
  for (const c of 'bdghknopq') assert.equal(charPts(c), 4.2);
  for (const c of 'mw')        assert.equal(charPts(c), 5.8);
  // 'I' and 'J' fall into the earlier narrow set 'iIl|!1j' (returns 2.3); only
  // 'F' and 'L' actually reach the IFJL caps branch.
  for (const c of 'FL')        assert.equal(charPts(c), 3.8);
  for (const c of 'MW')        assert.equal(charPts(c), 6.2);
});

test('wordWrapLineCount — single short word fits on one line', () => {
  assert.equal(wordWrapLineCount('hi'), 1);
});

test('wordWrapLineCount — empty/whitespace input returns 1 line', () => {
  assert.equal(wordWrapLineCount(''), 1);
  assert.equal(wordWrapLineCount('   '), 1);
});

test('wordWrapLineCount — long text wraps to ≥2 lines (forces else-branch)', () => {
  // Build a string whose wrapped point-width exceeds COLUMN_PT (165pt).
  const text = 'This is a long body of text that should certainly exceed the column point width and force the wrap branch to fire at least once and produce more than one line in the output.';
  const lines = wordWrapLineCount(text);
  assert.ok(lines >= 2, `expected ≥2 lines, got ${lines}`);
});

test('wordWrapLineCount — single huge word still returns 1 line (no infinite loop)', () => {
  // Word longer than COLUMN_PT — the branch `linePts === 0` keeps it on the same line.
  const huge = 'x'.repeat(200);
  const lines = wordWrapLineCount(huge);
  assert.equal(lines, 1);
});

test('estimateBoxH — derives from line count and layout constants', () => {
  // Re-derive expected formula from source (lines 142-146):
  //   SEV_H + SEV_GAP + lines*LINE_H + TEXT_PAD_B
  const { SEV_H, SEV_GAP, LINE_H, TEXT_PAD_B } = internals;
  const text = 'short';
  const expected = SEV_H + SEV_GAP + 1 * LINE_H + TEXT_PAD_B;
  assert.ok(Math.abs(estimateBoxH(text) - expected) < 1e-12);
});

test('estimateBoxH — multi-line text scales by line count', () => {
  const { SEV_H, SEV_GAP, LINE_H, TEXT_PAD_B } = internals;
  const longText = 'This is a long body of text that should certainly exceed the column point width and force the wrap branch to fire at least once and produce more than one line in the output.';
  const lines = wordWrapLineCount(longText);
  const expected = SEV_H + SEV_GAP + lines * LINE_H + TEXT_PAD_B;
  assert.ok(Math.abs(estimateBoxH(longText) - expected) < 1e-12);
});

test('COLUMN_PT constant — exposed value matches source-of-truth (165 pt)', () => {
  assert.equal(COLUMN_PT, 165);
});
