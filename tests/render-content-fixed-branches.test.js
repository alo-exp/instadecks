'use strict';
// tests/render-content-fixed-branches.test.js — branch-coverage gaps for
// skills/content-review/scripts/render-content-fixed.js. Complements
// content-review-render-fixed.test.js. Targets: throw on non-object, thesis-missing
// branch (Notes), resolution-missing branch (Notes), §3 empty (no slides), §3
// findings-empty per slide skip path, §5 empty findings, effortFor tiers,
// _internal.countBySeverity unknown-severity branch.

const test = require('node:test');
const assert = require('node:assert/strict');
const { render, _internal } = require('../skills/content-review/scripts/render-content-fixed');

function f(severity, overrides = {}) {
  return {
    severity_reviewer: severity,
    category: 'content',
    check_id: overrides.check_id || 'pyramid-mece',
    genuine: false,
    nx: 0.5, ny: 0.5,
    text: overrides.text || `t-${severity}-${overrides._tag || ''}`,
    rationale: 'r',
    location: overrides.location || 'loc',
    standard: 'std',
    fix: overrides.fix || `fix-${severity}-${overrides._tag || ''}`,
    ...overrides,
  };
}

function doc(slides, opts = {}) {
  return { schema_version: '1.1', deck: 'd.pptx', generated_at: 't', slides, ...opts };
}

test('render-content-fixed-branches', async (t) => {
  await t.test('throws on null input', () => {
    assert.throws(() => render(null), /findingsDoc must be an object/);
  });

  await t.test('throws on number input', () => {
    assert.throws(() => render(42), /findingsDoc must be an object/);
  });

  await t.test('thesis-missing systemic finding → Notes maturity', () => {
    const out = render(doc([
      { slideNum: 1, title: 'a', findings: [
        f('Minor', { _tag: 'a', check_id: 'pyramid-mece', location: 'deck-systemic',
          text: 'thesis is missing from the deck' }),
      ] },
    ]));
    assert.match(out, /maturity: \*\*Notes\*\*/);
  });

  await t.test('resolution-missing systemic finding → Notes maturity', () => {
    const out = render(doc([
      { slideNum: 1, title: 'a', findings: [
        f('Minor', { _tag: 'a', check_id: 'narrative-arc', location: 'deck-systemic',
          text: 'no resolution beat at end of deck' }),
      ] },
    ]));
    assert.match(out, /maturity: \*\*Notes\*\*/);
  });

  await t.test('§3: no slides at all → "No content findings emitted" placeholder', () => {
    const out = render(doc([]));
    const s3 = out.split('## §3')[1].split('## §4')[0];
    assert.match(s3, /No content findings emitted/);
  });

  await t.test('§3: slides exist but none has findings → "No content findings emitted"', () => {
    const out = render(doc([
      { slideNum: 1, title: 'a', findings: [] },
      { slideNum: 2, title: 'b', findings: [] },
    ]));
    const s3 = out.split('## §3')[1].split('## §4')[0];
    assert.match(s3, /No content findings emitted/);
  });

  await t.test('§5: empty findings doc shows placeholder', () => {
    const out = render(doc([]));
    const s5 = out.split('## §5')[1];
    assert.match(s5, /No content findings emitted/);
  });

  await t.test('§5 effort tiers: all 4 reachable (trivial/light/moderate/substantial)', () => {
    const out = render(doc([{ slideNum: 1, title: 'a', findings: [
      f('Minor', { _tag: 'a', fix: 'short' }),
      f('Minor', { _tag: 'b', fix: 'x'.repeat(80) }),
      f('Minor', { _tag: 'c', fix: 'x'.repeat(150) }),
      f('Minor', { _tag: 'd', fix: 'x'.repeat(220) }),
    ] }]));
    const s5 = out.split('## §5')[1];
    assert.match(s5, /trivial/);
    assert.match(s5, /light/);
    assert.match(s5, /moderate/);
    assert.match(s5, /substantial/);
  });

  await t.test('genuine count surfaces in §4', () => {
    const out = render(doc([
      { slideNum: 1, title: 'a', findings: [
        f('Minor', { _tag: 'a', genuine: true }),
        f('Minor', { _tag: 'b', genuine: false }),
      ] },
    ]));
    assert.match(out, /Genuine findings \| 1/);
  });

  await t.test('_internal.countBySeverity ignores unknown severity', () => {
    const c = _internal.countBySeverity(doc([
      { slideNum: 1, title: 'a', findings: [
        f('Minor', { _tag: 'a' }), { ...f('Major', { _tag: 'b' }), severity_reviewer: 'Bogus' },
      ] },
    ]));
    assert.equal(c.minor, 1);
    assert.equal(c.major, 0);
  });

  await t.test('computeMaturity: 0c/3M (no thesis flag) → Argued', () => {
    const m = _internal.computeMaturity(doc([]), { critical: 0, major: 3, minor: 0, nitpick: 0 });
    assert.equal(m, 'Argued');
  });

  await t.test('computeMaturity: 0c/5M → Informational', () => {
    const m = _internal.computeMaturity(doc([]), { critical: 0, major: 5, minor: 0, nitpick: 0 });
    assert.equal(m, 'Informational');
  });

  await t.test('computeMaturity: 1c → Draft', () => {
    const m = _internal.computeMaturity(doc([]), { critical: 1, major: 0, minor: 0, nitpick: 0 });
    assert.equal(m, 'Draft');
  });

  await t.test('computeMaturity: 3c → Notes', () => {
    const m = _internal.computeMaturity(doc([]), { critical: 3, major: 0, minor: 0, nitpick: 0 });
    assert.equal(m, 'Notes');
  });

  await t.test('§1: pyramid-mece text without "thesis" word does NOT flip maturity to Notes', () => {
    // Heuristic only fires when text matches /thesis/i; a generic pyramid-mece systemic finding
    // with non-thesis text leaves maturity at Persuasive (when no Critical/Major).
    const out = render(doc([
      { slideNum: 1, title: 'a', findings: [
        f('Minor', { _tag: 'a', check_id: 'pyramid-mece', location: 'deck-systemic',
          text: 'mece overlap detected' }),
      ] },
    ]));
    assert.match(out, /maturity: \*\*Persuasive\*\*/);
  });
});
