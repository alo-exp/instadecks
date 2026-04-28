'use strict';
// tests/annotate-color.test.js — Plan 08-03 Task 2.
// Severity-tier color and arrow-transparency constants in annotate.js.
// Source-of-truth values (lines 90, 96-111):
//   ARROW_TRANS = 50;
//   C.major  = 'D97706'   (orange)
//   C.minor  = '2563EB'   (blue)
//   C.polish = '8896A7'   (slate)
//   C.bodyText = '1E2A4A' (navy)
//   SEV.major.label  = 'MAJOR'
//   SEV.minor.label  = 'MINOR'
//   SEV.polish.label = 'POLISH'
// Tests assert these match the expected literals AND that the helpers consume
// them correctly (severity label addText receives si.color; arrow CUSTOM_GEOMETRY
// fill receives ARROW_TRANS).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAnnotateInternals, makeRecordingPres } = require('./helpers/annotate-vm');

const internals = loadAnnotateInternals();
const { C, SEV, ARROW_TRANS } = internals;

const EXPECTED_C = {
  bg: 'F7F8FD', footer: 'A0AEC0', border: 'D9DFE8', arrow: 'A0AEC0',
  major: 'D97706', minor: '2563EB', polish: '8896A7', bodyText: '1E2A4A',
};
const EXPECTED_ARROW_TRANS = 50;

test('color constants — C palette matches source-of-truth values', () => {
  for (const [k, v] of Object.entries(EXPECTED_C)) {
    assert.equal(C[k], v, `C.${k} expected ${v}, got ${C[k]}`);
  }
});

test('ARROW_TRANS — read from source equals 50', () => {
  assert.equal(ARROW_TRANS, EXPECTED_ARROW_TRANS);
});

test('SEV table — labels and colors align (major→D97706/MAJOR, etc.)', () => {
  assert.equal(SEV.major.label, 'MAJOR');
  assert.equal(SEV.major.color, 'D97706');
  assert.equal(SEV.minor.label, 'MINOR');
  assert.equal(SEV.minor.color, '2563EB');
  assert.equal(SEV.polish.label, 'POLISH');
  assert.equal(SEV.polish.color, '8896A7');
});

test('annotBox — severity label addText carries the severity color', () => {
  const { pres, slide, calls } = makeRecordingPres();
  internals.annotBox(slide, { sev: 'major', text: 'demo' }, 0.1, 1.0, true, 0.5);
  // Two addText calls: first is the severity label.
  const labelCall = calls.find(c => c.method === 'addText' && c.text === 'MAJOR');
  assert.ok(labelCall, 'MAJOR severity label rendered');
  assert.equal(labelCall.opts.color, EXPECTED_C.major);
  // The second addText is the body text in bodyText navy.
  const bodyCall = calls.find(c => c.method === 'addText' && c.text === 'demo');
  assert.ok(bodyCall);
  assert.equal(bodyCall.opts.color, EXPECTED_C.bodyText);
});

test('annotBox — minor severity label carries C.minor color', () => {
  const { pres, slide, calls } = makeRecordingPres();
  internals.annotBox(slide, { sev: 'minor', text: 't' }, 0.1, 1.0, false, 0.5);
  const label = calls.find(c => c.method === 'addText' && c.text === 'MINOR');
  assert.equal(label.opts.color, EXPECTED_C.minor);
});

test('annotBox — polish severity label carries C.polish color', () => {
  const { pres, slide, calls } = makeRecordingPres();
  internals.annotBox(slide, { sev: 'polish', text: 't' }, 0.1, 1.0, false, 0.5);
  const label = calls.find(c => c.method === 'addText' && c.text === 'POLISH');
  assert.equal(label.opts.color, EXPECTED_C.polish);
});

test('annotBoxTB — above-zone severity label uses correct color + transparency on bar', () => {
  const { pres, slide, calls } = makeRecordingPres();
  internals.annotBoxTB(slide, { sev: 'major', text: 'tb' }, 0.5, 0.5, 1.0, true, 0.6);
  // Bar rect transparency hard-coded 50 in source.
  const bar = calls.find(c => c.method === 'addShape' && c.kind === 'rect');
  assert.ok(bar);
  assert.equal(bar.opts.fill.color, EXPECTED_C.arrow);
  assert.equal(bar.opts.fill.transparency, 50);
  // Severity label color
  const label = calls.find(c => c.method === 'addText' && c.text === 'MAJOR');
  assert.equal(label.opts.color, EXPECTED_C.major);
});

test('drawBarArrowMerged — merged-arrow polygon fill uses C.arrow + ARROW_TRANS', () => {
  const { pres, slide, calls } = makeRecordingPres();
  internals.drawBarArrowMerged(slide, pres,
    { barX: 1.0, barY: 2.0, barH: 1.5, isLeft: true }, 4.0, 4.0);
  const cg = calls.find(c => c.method === 'addShape' && c.kind === 'CUSTOM_GEOMETRY');
  assert.equal(cg.opts.fill.color, EXPECTED_C.arrow);
  assert.equal(cg.opts.fill.transparency, ARROW_TRANS);
  assert.equal(cg.opts.line.transparency, 100, 'border is fully transparent');
});

test('circleDot — endpoint OVAL receives C.arrow + ARROW_TRANS via drawBarArrowMerged', () => {
  const { pres, slide, calls } = makeRecordingPres();
  internals.drawBarArrowMerged(slide, pres,
    { barX: 1.0, barY: 2.0, barH: 1.5, isLeft: true }, 4.0, 4.0);
  const oval = calls.find(c => c.method === 'addShape' && c.kind === 'OVAL');
  assert.equal(oval.opts.fill.color, EXPECTED_C.arrow);
  assert.equal(oval.opts.fill.transparency, ARROW_TRANS);
});

test('arrowTB — vertical+diagonal segments use C.arrow + ARROW_TRANS', () => {
  const { pres, slide, calls } = makeRecordingPres();
  internals.arrowTB(slide, pres, 4.0, 1.0, 6.0, 1.5, 1.4, true);
  const lines = calls.filter(c => c.method === 'addShape' && c.kind === 'LINE');
  assert.ok(lines.length >= 1);
  for (const ln of lines) {
    assert.equal(ln.opts.line.color, EXPECTED_C.arrow);
    assert.equal(ln.opts.line.transparency, ARROW_TRANS);
  }
});

test('arrowTB — short-distance branch (len ≤ DOT_R + 0.04) skips diagonal segment', () => {
  // Force len < DOT_R + 0.04 so the second seg() does NOT fire.
  const { pres, slide, calls } = makeRecordingPres();
  // anchor at (4,1), elbow=miniY-0.04=1.36, dot at (4.001, 1.36) → tiny dx,dy.
  internals.arrowTB(slide, pres, 4.0, 1.0, 4.001, 1.36, 1.4, true);
  const lines = calls.filter(c => c.method === 'addShape' && c.kind === 'LINE');
  // Only the vertical seg fires (1 LINE) — diagonal seg short-circuited.
  assert.equal(lines.length, 1, `expected 1 line, got ${lines.length}`);
});

test('arrowTB — below variant (isAbove=false) elbow Y reflects MINI_H+0.04 offset', () => {
  const { pres, slide, calls } = makeRecordingPres();
  // miniY=1.4 → elbowY = 1.4 + MINI_H + 0.04
  const expectedElbowY = 1.4 + internals.MINI_H + 0.04;
  internals.arrowTB(slide, pres, 4.0, 6.5, 6.0, 5.0, 1.4, false);
  const verticalSeg = calls.find(c =>
    c.method === 'addShape' && c.kind === 'LINE'
    && Math.abs(c.opts.x - 4.0) < 1e-9);
  assert.ok(verticalSeg, 'vertical seg from anchor → elbow exists');
  // Vertical seg's bbox encompasses anchorY → elbowY range.
  assert.ok(verticalSeg.opts.y <= expectedElbowY + 1e-9);
});
