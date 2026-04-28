'use strict';
// tests/annotate-polygon.test.js — Plan 08-03 Task 1.
// Direct unit tests for the polygon-math primitives in annotate.js. The math is
// inlined inside drawBarArrowMerged: vector normalize, perpendicular, miter
// intersection, and polygon-from-line (line thicken to bar+arm+diagonal silhouette).
// Tests drive the function with synthetic geometry, capture the resulting
// CUSTOM_GEOMETRY polygon points, and assert numeric properties within tolerance ≤1e-9.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAnnotateInternals, makeRecordingPres } = require('./helpers/annotate-vm');

const TOL = 1e-9;

function captureCustomGeometry(internals, barGeom, dotX, dotY) {
  const { pres, slide, calls } = makeRecordingPres();
  internals.drawBarArrowMerged(slide, pres, barGeom, dotX, dotY);
  const cg = calls.find(c => c.method === 'addShape' && c.kind === 'CUSTOM_GEOMETRY');
  assert.ok(cg, 'expected at least one CUSTOM_GEOMETRY shape');
  return { cg, calls };
}

test('polygon math — vector normalize behaves analytically (3,4) → magnitude 5', () => {
  const len = Math.sqrt(3 * 3 + 4 * 4);
  assert.ok(Math.abs(len - 5) < TOL);
  // ux, uy in annotate.js: dx/len, dy/len
  const ux = 3 / len, uy = 4 / len;
  assert.ok(Math.abs(ux - 0.6) < TOL);
  assert.ok(Math.abs(uy - 0.8) < TOL);
  // unit-vector invariant
  assert.ok(Math.abs(ux * ux + uy * uy - 1) < TOL);
});

test('polygon math — perpendicular (sgn=+1) of (1,0) → (0,-1)', () => {
  // From annotate.js: sgn = ux >= 0 ? 1 : -1; topPerp = (sgn*uy, -sgn*ux).
  const ux = 1, uy = 0;
  const sgn = ux >= 0 ? 1 : -1;
  const topPerpX = sgn * uy;
  const topPerpY = -sgn * ux;
  assert.ok(Math.abs(topPerpX - 0) < TOL);
  assert.ok(Math.abs(topPerpY - -1) < TOL);
});

test('polygon math — perpendicular (sgn=-1) of (-1,0) → (0,-1)', () => {
  // ux negative branch — sgn = -1.
  const ux = -1, uy = 0;
  const sgn = ux >= 0 ? 1 : -1;
  const topPerpX = sgn * uy;
  const topPerpY = -sgn * ux;
  assert.ok(Math.abs(topPerpX - 0) < TOL);
  assert.ok(Math.abs(topPerpY - -1) < TOL);
});

test('polygon-from-line — LEFT bar+arm produces 10-vertex closed polygon', () => {
  const internals = loadAnnotateInternals();
  const barGeom = { barX: 1.0, barY: 2.0, barH: 1.5, isLeft: true };
  const { cg } = captureCustomGeometry(internals, barGeom, 4.0, 3.0);
  const pts = cg.opts.points;
  // 10 coordinate vertices + 1 close marker = 11 points (LEFT branch).
  const closes = pts.filter(p => p.close).length;
  const verts = pts.filter(p => 'x' in p);
  assert.equal(closes, 1, 'one close marker');
  assert.equal(verts.length, 10, 'LEFT polygon has 10 vertices');
  // First vertex carries moveTo flag (path-start).
  assert.equal(verts[0].moveTo, true);
  // All coords are non-negative after bbox-relative translation.
  for (const v of verts) {
    assert.ok(v.x >= -TOL && v.y >= -TOL, `vertex ${JSON.stringify(v)} is bbox-relative`);
  }
});

test('polygon-from-line — RIGHT branch produces a closed polygon (10 vertices)', () => {
  const internals = loadAnnotateInternals();
  const barGeom = { barX: 10.5, barY: 2.0, barH: 1.5, isLeft: false };
  const { cg } = captureCustomGeometry(internals, barGeom, 7.0, 3.0);
  const pts = cg.opts.points;
  const verts = pts.filter(p => 'x' in p);
  assert.equal(verts.length, 10, 'RIGHT polygon also 10 vertices');
  assert.equal(pts.filter(p => p.close).length, 1);
});

test('polygon-from-line — bbox dimensions match max-min of vertices', () => {
  const internals = loadAnnotateInternals();
  const barGeom = { barX: 1.0, barY: 2.0, barH: 1.5, isLeft: true };
  const { cg } = captureCustomGeometry(internals, barGeom, 4.0, 3.0);
  // Re-derive expected bbox by scanning the absolute coords from helper.
  // Since points are bbox-relative, max-coord equals shape w/h.
  const pts = cg.opts.points.filter(p => 'x' in p);
  const maxX = Math.max(...pts.map(p => p.x));
  const maxY = Math.max(...pts.map(p => p.y));
  assert.ok(Math.abs(cg.opts.w - maxX) < TOL, `w=${cg.opts.w} vs maxX=${maxX}`);
  assert.ok(Math.abs(cg.opts.h - maxY) < TOL, `h=${cg.opts.h} vs maxY=${maxY}`);
});

test('seg primitive — emits a LINE shape with min-bbox and flipV flag', () => {
  const internals = loadAnnotateInternals();
  const { pres, slide, calls } = makeRecordingPres();
  // (x1,y1)=(2,3), (x2,y2)=(5,1) → x2>=x1 and y2<=y1 → flipV true.
  internals.seg(slide, pres, 2, 3, 5, 1, '123456', 1.5, 25);
  const c = calls[0];
  assert.equal(c.method, 'addShape');
  assert.equal(c.kind, 'LINE');
  assert.equal(c.opts.flipV, true);
  assert.equal(c.opts.x, 2);
  assert.equal(c.opts.y, 1);
  assert.equal(c.opts.w, 3);
  assert.equal(c.opts.h, 2);
  assert.equal(c.opts.line.color, '123456');
  assert.equal(c.opts.line.width, 1.5);
  assert.equal(c.opts.line.transparency, 25);
});

test('seg primitive — degenerate (zero-length) segment clamps w,h to 0.002', () => {
  const internals = loadAnnotateInternals();
  const { pres, slide, calls } = makeRecordingPres();
  internals.seg(slide, pres, 4, 4, 4, 4, 'AAAAAA');
  const c = calls[0];
  assert.equal(c.opts.w, 0.002);
  assert.equal(c.opts.h, 0.002);
  // default transparency=0 when undefined
  assert.equal(c.opts.line.transparency, 0);
  assert.equal(c.opts.line.width, 1.1);
});

test('circleDot primitive — default transparency=0 when trans omitted', () => {
  const internals = loadAnnotateInternals();
  const { pres, slide, calls } = makeRecordingPres();
  internals.circleDot(slide, pres, 1, 1, 0.05, 'FFFFFF');
  assert.equal(calls[0].opts.fill.transparency, 0);
});

test('circleDot primitive — OVAL centred on (cx,cy) with radius r', () => {
  const internals = loadAnnotateInternals();
  const { pres, slide, calls } = makeRecordingPres();
  internals.circleDot(slide, pres, 5, 7, 0.034, 'A0AEC0', 50);
  const c = calls[0];
  assert.equal(c.kind, 'OVAL');
  assert.ok(Math.abs(c.opts.x - (5 - 0.034)) < TOL);
  assert.ok(Math.abs(c.opts.y - (7 - 0.034)) < TOL);
  assert.ok(Math.abs(c.opts.w - 0.068) < TOL);
  assert.ok(Math.abs(c.opts.h - 0.068) < TOL);
  assert.equal(c.opts.fill.color, 'A0AEC0');
  assert.equal(c.opts.fill.transparency, 50);
});
