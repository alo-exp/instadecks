'use strict';
// Plan 09-05 Task 2 — diversity-violation rule:
// 3+ slides with the same `// VARIANT: <id>` marker → flag.
// 2 slides with same marker → no flag.

const test = require('node:test');
const assert = require('node:assert/strict');

const { validateRenderSource } = require('../skills/create/scripts/lib/design-validator');

test('diversity-violation: 3 same-variant slides → finding fires (severity major + slides)', () => {
  const src = `
    // VARIANT: section-B-numbered-anchor
    pres.addSlide().addText('Slide 1', {});
    // VARIANT: section-B-numbered-anchor
    pres.addSlide().addText('Slide 2', {});
    // VARIANT: section-B-numbered-anchor
    pres.addSlide().addText('Slide 3', {});
  `;
  const r = validateRenderSource(src);
  const dv = r.findings.find(f => f.id === 'diversity-violation');
  assert.ok(dv, 'expected diversity-violation finding');
  assert.equal(dv.severity, 'major');
  assert.match(dv.message, /section-B-numbered-anchor/);
  assert.match(dv.message, /3/);
  assert.deepEqual(dv.slides, [0, 1, 2]);
});

test('diversity-violation: 2 same-variant slides → no finding (threshold is ≥3)', () => {
  const src = `
    // VARIANT: title-A-centered-classic
    pres.addSlide().addText('Slide 1', {});
    // VARIANT: title-A-centered-classic
    pres.addSlide().addText('Slide 2', {});
  `;
  const r = validateRenderSource(src);
  assert.ok(!r.findings.some(f => f.id === 'diversity-violation'));
});

test('diversity-violation: distinct variants do not aggregate', () => {
  const src = `
    // VARIANT: title-A-centered-classic
    pres.addSlide();
    // VARIANT: title-B-asymmetric-block
    pres.addSlide();
    // VARIANT: stat-callout-A-centered-hero
    pres.addSlide();
  `;
  const r = validateRenderSource(src);
  assert.ok(!r.findings.some(f => f.id === 'diversity-violation'));
});

test('diversity-violation: 4+ markers fire and report all slide indices', () => {
  const src = `
    // VARIANT: closing-A-mono
    pres.addSlide();
    // VARIANT: closing-A-mono
    pres.addSlide();
    // VARIANT: closing-A-mono
    pres.addSlide();
    // VARIANT: closing-A-mono
    pres.addSlide();
  `;
  const r = validateRenderSource(src);
  const dv = r.findings.find(f => f.id === 'diversity-violation');
  assert.ok(dv);
  assert.equal(dv.slides.length, 4);
  assert.match(dv.message, /4/);
});
