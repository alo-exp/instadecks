// tests/lib-create-design-validator-branches.test.js — Plan 08-02 Task 1 (Group B).
// Branch coverage for skills/create/scripts/lib/design-validator.js (R1/R2/R3 rules).

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  validateDesignChoice,
  _internal: { DEFAULT_BLUE_HEXES, BLUE_OVERRIDE_KEYWORDS, r1DefaultBlue, r2TypographyPinned, r3HexShape },
} = require('../skills/create/scripts/lib/design-validator');

const goodPalette = { name: 'plum', primary: '5E2A84', secondary: '24252A', accent: 'F2C14E' };
const goodTypography = { heading: 'IBM Plex Sans', body: 'IBM Plex Sans', rationale: 'r' };
const goodIdeas = {
  typography_pairs: [{ heading: 'IBM Plex Sans', body: 'IBM Plex Sans' }],
};
const goodBrief = { tone: 'punchy', topic: 'launch' };

test('validateDesignChoice: all-good inputs → ok:true, no violations', () => {
  const r = validateDesignChoice({
    palette: goodPalette,
    typography: goodTypography,
    designIdeas: goodIdeas,
    brief: goodBrief,
  });
  assert.equal(r.ok, true);
  assert.deepEqual(r.violations, []);
});

test('validateDesignChoice: empty input object returns violations (typography missing)', () => {
  const r = validateDesignChoice({});
  // R2 triggers (typography missing heading/body); palette has no fields so R3 outputs nothing.
  assert.equal(r.ok, false);
  assert.ok(r.violations.some(v => v.rule === 'R2-typography-pinned'));
});

test('validateDesignChoice: no args at all → defaults applied', () => {
  const r = validateDesignChoice();
  assert.equal(r.ok, false);
});

test('R1-default-blue: 0070C0 without justification → violation', () => {
  const v = r1DefaultBlue({ primary: '0070C0' }, { tone: 'modern', topic: 'launch' });
  assert.ok(v);
  assert.equal(v.rule, 'R1-default-blue');
});

test('R1-default-blue: 0070C0 with "corporate" tone → null (override)', () => {
  assert.equal(r1DefaultBlue({ primary: '0070C0' }, { tone: 'corporate', topic: 'q3' }), null);
});

test('R1-default-blue: each override keyword honored', () => {
  for (const kw of BLUE_OVERRIDE_KEYWORDS) {
    assert.equal(r1DefaultBlue({ primary: '1F4E79' }, { topic: `${kw} report` }), null);
  }
});

test('R1-default-blue: case-insensitive primary match', () => {
  const v = r1DefaultBlue({ primary: '2e75b6' }, { tone: 'modern', topic: 'x' });
  assert.ok(v);
});

test('R1-default-blue: non-default primary → null', () => {
  assert.equal(r1DefaultBlue({ primary: '5E2A84' }, { tone: 'whatever' }), null);
});

test('R1-default-blue: missing palette/brief → null (no false positive)', () => {
  assert.equal(r1DefaultBlue({}, {}), null);
});

test('DEFAULT_BLUE_HEXES set has the 3 expected entries', () => {
  assert.equal(DEFAULT_BLUE_HEXES.size, 3);
  for (const h of ['0070C0', '1F4E79', '2E75B6']) assert.ok(DEFAULT_BLUE_HEXES.has(h));
});

test('R2-typography-pinned: missing heading or body → violation with explanatory message', () => {
  const v1 = r2TypographyPinned({}, goodIdeas);
  assert.ok(v1);
  assert.match(v1.message, /must include heading and body/);
  const v2 = r2TypographyPinned({ heading: 'X' }, goodIdeas);
  assert.ok(v2);
});

test('R2-typography-pinned: pair not in pinned list → violation', () => {
  const v = r2TypographyPinned({ heading: 'Comic Sans', body: 'Papyrus' }, goodIdeas);
  assert.ok(v);
  assert.match(v.message, /not in pinned/);
});

test('R2-typography-pinned: pair in pinned list → null', () => {
  assert.equal(r2TypographyPinned({ heading: 'IBM Plex Sans', body: 'IBM Plex Sans' }, goodIdeas), null);
});

test('R2-typography-pinned: ideas without typography_pairs → violation (no match)', () => {
  const v = r2TypographyPinned({ heading: 'A', body: 'B' }, {});
  assert.ok(v);
});

test('R3-hex-shape: non-object palette → single violation', () => {
  const out = r3HexShape(null);
  assert.equal(out.length, 1);
  assert.equal(out[0].rule, 'R3-hex-shape');
});

test('R3-hex-shape: invalid hex value (with #) → violation per offending key', () => {
  const out = r3HexShape({ primary: '#FF0000', accent: 'F2C14E', name: 'plum', rationale: 'ok' });
  assert.equal(out.length, 1);
  assert.match(out[0].message, /palette\.primary/);
});

test('R3-hex-shape: ignores name + rationale fields', () => {
  const out = r3HexShape({ name: 'whatever', rationale: 'long story', primary: '5E2A84' });
  assert.deepEqual(out, []);
});

test('R3-hex-shape: non-string value → violation', () => {
  const out = r3HexShape({ primary: 123 });
  assert.equal(out.length, 1);
});

test('R3-hex-shape: 6-char hex (uppercase + lowercase) accepted', () => {
  const out = r3HexShape({ primary: 'aBcDeF' });
  assert.deepEqual(out, []);
});

test('validateDesignChoice: aggregates R1 + R2 + R3 violations', () => {
  const r = validateDesignChoice({
    palette: { primary: '0070C0', secondary: 'BAD' }, // R1 + R3
    typography: { heading: 'A', body: 'B' }, // R2
    designIdeas: {},
    brief: { tone: 'modern', topic: 'launch' },
  });
  assert.equal(r.ok, false);
  assert.ok(r.violations.length >= 3);
  const rules = new Set(r.violations.map(v => v.rule));
  assert.ok(rules.has('R1-default-blue'));
  assert.ok(rules.has('R2-typography-pinned'));
  assert.ok(rules.has('R3-hex-shape'));
});
