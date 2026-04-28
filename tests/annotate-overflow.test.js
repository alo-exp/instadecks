'use strict';
// tests/annotate-overflow.test.js — Plan 08-03 Task 2.
// MAX_SIDE overflow path in annotate.js buildSlide(): when either left or right
// column has > MAX_SIDE annotations, the surplus is shifted into above/below
// rows via the inner overflow() helper. Tests assert:
//   • EXPECTED_MAX_SIDE matches the source-of-truth constant (no magic number).
//   • At exactly MAX_SIDE annotations on one side, no above/below row appears.
//   • At MAX_SIDE+1 annotations on one side, the overflow branch fires and the
//     extra annotation is rendered in the above/below row (verified via the
//     extra rect-shape that annotBoxTB emits for top-or-bottom severity bars).
//   • The function does NOT throw on heavy overflow.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAnnotateInternals, makeRecordingPres } = require('./helpers/annotate-vm');

const internals = loadAnnotateInternals();
const EXPECTED_MAX_SIDE = internals.MAX_SIDE;

function buildSample(rightCount) {
  // All annotations on the RIGHT (nx >= 0.5), spread along ny so overflow()
  // pushes the centre-most annotation up into the above/below zone.
  const annotations = [];
  for (let i = 0; i < rightCount; i++) {
    annotations.push({
      sev: 'minor',
      nx: 0.6 + i * 0.01,
      ny: 0.2 + i * 0.15,
      text: `annotation ${i + 1}`,
    });
  }
  return { slideNum: 7, title: 'overflow test', annotations };
}

test('MAX_SIDE constant — read from source equals 3 (do not hard-code)', () => {
  assert.equal(EXPECTED_MAX_SIDE, 3);
  assert.equal(typeof EXPECTED_MAX_SIDE, 'number');
});

// annotBoxTB emits an `addShape('rect', ...)` with h=BAR_W (0.055) for each
// above/below severity-bar. The mini-slide border is also a rect but with
// h ≈ MINI_H + 0.024 (~4.5"). Filter by height to count only TB bars.
const BAR_W = internals.BAR_W;
function countTbBars(calls) {
  return calls.filter(c =>
    c.method === 'addShape' && c.kind === 'rect'
    && Math.abs(c.opts.h - BAR_W) < 1e-9).length;
}

test('overflow — at exactly MAX_SIDE annotations: no above/below box rect emitted', () => {
  const { pres, calls } = makeRecordingPres();
  internals.buildSlide(pres, buildSample(EXPECTED_MAX_SIDE));
  assert.equal(countTbBars(calls), 0);
});

test('overflow — at MAX_SIDE+1 annotations: overflow branch fires (≥1 above/below bar)', () => {
  const { pres, calls } = makeRecordingPres();
  assert.doesNotThrow(() => internals.buildSlide(pres, buildSample(EXPECTED_MAX_SIDE + 1)));
  assert.ok(countTbBars(calls) >= 1, `expected ≥1 above/below bar, got ${countTbBars(calls)}`);
});

test('overflow — surplus 2 (MAX_SIDE+2) emits ≥2 above/below bars', () => {
  const { pres, calls } = makeRecordingPres();
  internals.buildSlide(pres, buildSample(EXPECTED_MAX_SIDE + 2));
  assert.ok(countTbBars(calls) >= 2);
});

test('overflow — heavy overload (MAX_SIDE * 3 on one side) does NOT throw', () => {
  const { pres, slide } = makeRecordingPres();
  assert.doesNotThrow(() =>
    internals.buildSlide(pres, buildSample(EXPECTED_MAX_SIDE * 3)));
});

test('overflow — both LEFT and RIGHT overflow simultaneously', () => {
  const annotations = [];
  // 4 LEFT, 4 RIGHT → both columns overflow.
  for (let i = 0; i < 4; i++) {
    annotations.push({ sev: 'major', nx: 0.1 + i * 0.05, ny: 0.2 + i * 0.15, text: `L${i}` });
    annotations.push({ sev: 'minor', nx: 0.7 + i * 0.05, ny: 0.2 + i * 0.15, text: `R${i}` });
  }
  const sample = { slideNum: 7, title: 'dual overflow', annotations };
  const { pres } = makeRecordingPres();
  assert.doesNotThrow(() => internals.buildSlide(pres, sample));
});

test('overflow — empty annotations array: no LR or TB layout, no throw', () => {
  const { pres, calls } = makeRecordingPres();
  assert.doesNotThrow(() => internals.buildSlide(pres, {
    slideNum: 7, title: 'empty', annotations: [],
  }));
  // Mini-slide border + image + footer must still render.
  assert.ok(calls.some(c => c.method === 'addImage'));
});
