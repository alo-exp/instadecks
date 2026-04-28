'use strict';
// create-design-validator.test.js — D-04 palette+typography guardrails (Plan 04-01 Task 2).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { validateDesignChoice } = require('../skills/create/scripts/lib/design-validator');

const DESIGN_IDEAS = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'sample-design-ideas.json'), 'utf8'),
);
const SAMPLE_BRIEF = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'sample-brief.json'), 'utf8'),
);

test('design-validator: default-blue without justification fires R1', () => {
  const r = validateDesignChoice({
    palette: { primary: '0070C0', secondary: 'CADCFC', accent: 'FFFFFF', ink: '000000', muted: '6B7280' },
    typography: DESIGN_IDEAS.typography_pairs[0],
    brief: { tone: 'playful', topic: 'team morale' },
    designIdeas: DESIGN_IDEAS,
  });
  assert.equal(r.ok, false);
  assert.ok(r.violations.some(v => v.rule === 'R1-default-blue'));
});

test('design-validator: default-blue with corporate-blue justification passes R1', () => {
  const r = validateDesignChoice({
    palette: { primary: '0070C0', secondary: 'CADCFC', accent: 'FFFFFF', ink: '000000', muted: '6B7280' },
    typography: DESIGN_IDEAS.typography_pairs[0],
    brief: { tone: 'corporate', topic: 'finance update' },
    designIdeas: DESIGN_IDEAS,
  });
  assert.ok(!r.violations.some(v => v.rule === 'R1-default-blue'));
});

test('design-validator: typography pair not in pinned list fires R2', () => {
  const r = validateDesignChoice({
    palette: DESIGN_IDEAS.palettes[0],
    typography: { heading: 'Comic Sans', body: 'Papyrus' },
    brief: SAMPLE_BRIEF,
    designIdeas: DESIGN_IDEAS,
  });
  assert.ok(r.violations.some(v => v.rule === 'R2-typography-pinned'));
});

test('design-validator: hex with leading "#" fires R3', () => {
  const r = validateDesignChoice({
    palette: { primary: '#FF0000', secondary: 'CADCFC', accent: 'FFFFFF', ink: '000000', muted: '6B7280' },
    typography: DESIGN_IDEAS.typography_pairs[0],
    brief: SAMPLE_BRIEF,
    designIdeas: DESIGN_IDEAS,
  });
  assert.ok(r.violations.some(v => v.rule === 'R3-hex-shape'));
});

test('design-validator: canonical fixture round-trip — every pinned palette+typography passes', () => {
  for (const palette of DESIGN_IDEAS.palettes) {
    for (const typography of DESIGN_IDEAS.typography_pairs) {
      const r = validateDesignChoice({
        palette, typography,
        brief: SAMPLE_BRIEF,
        designIdeas: DESIGN_IDEAS,
      });
      assert.equal(
        r.ok, true,
        `palette ${palette.name} + ${typography.heading}/${typography.body} expected ok, got ${JSON.stringify(r.violations)}`,
      );
    }
  }
});
