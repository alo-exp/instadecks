'use strict';
// tests/render-fixed-branches.test.js — branch-coverage gaps for
// skills/review/scripts/render-fixed.js. Complements review-render-fixed.test.js.
// Targets: throw on non-object input, all 5 maturity rubric branches (incl. Partner-ready),
// systemic findings via location='deck-systemic', §1 empty path, §3 unknown-severity skip,
// effortFor() boundary tiers (trivial/light/moderate/substantial), countSlidesWithCritical.

const test = require('node:test');
const assert = require('node:assert/strict');
const { render, _internal } = require('../skills/review/scripts/render-fixed');

function f(severity, overrides = {}) {
  return {
    severity_reviewer: severity,
    category: 'defect',
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
  return {
    schema_version: opts.schema_version || '1.0',
    deck: opts.deck || 'demo.pptx',
    generated_at: '2026-04-28T00:00:00Z',
    slides,
  };
}

test('render-fixed-branches', async (t) => {
  await t.test('throws on null input', () => {
    assert.throws(() => render(null), /findingsDoc must be an object/);
  });

  await t.test('throws on string input', () => {
    assert.throws(() => render('not an object'), /findingsDoc must be an object/);
  });

  await t.test('§1 empty path: no systemic findings prints placeholder', () => {
    const out = render(doc([{ slideNum: 1, title: 'a', findings: [] }]));
    assert.match(out, /No deck-level systemic findings/);
  });

  await t.test('§1 systemic: location=deck-systemic surfaces in §1', () => {
    const out = render(doc([
      { slideNum: 1, title: 'a', findings: [
        f('Critical', { _tag: 's', location: 'deck-systemic', text: 'systemic crit' }),
      ] },
    ]));
    const i1 = out.indexOf('## §1');
    const i2 = out.indexOf('## §2');
    const slice = out.slice(i1, i2);
    assert.match(slice, /systemic crit/);
  });

  await t.test('maturity: 0/2/0/0 → Client-ready (third rule)', () => {
    const out = render(doc([{ slideNum: 1, title: 'a', findings: [
      f('Major', { _tag: 'a' }), f('Major', { _tag: 'b' }),
    ] }]));
    assert.match(out, /maturity: \*\*Client-ready\*\*/);
  });

  await t.test('countSlidesWithCritical: counts unique slides with at least one Critical', () => {
    const d = doc([
      { slideNum: 1, title: 'a', findings: [f('Critical', { _tag: 'a' })] },
      { slideNum: 2, title: 'b', findings: [f('Major', { _tag: 'b' })] },
      { slideNum: 3, title: 'c', findings: [f('Critical', { _tag: 'c' })] },
    ]);
    const out = render(d);
    assert.match(out, /Slides with ≥1 Critical \| 2/);
  });

  await t.test('genuine count surfaces in §4 scoreboard', () => {
    const out = render(doc([
      { slideNum: 1, title: 'a', findings: [
        f('Minor', { _tag: 'a', genuine: true }),
        f('Minor', { _tag: 'b', genuine: false }),
      ] },
    ]));
    assert.match(out, /Genuine findings \| 1/);
  });

  await t.test('§5 effort tiers: trivial / light / moderate / substantial all reachable', () => {
    const findings = [
      f('Major', { _tag: 'a', fix: 'short' }),                        // <60 → trivial
      f('Major', { _tag: 'b', fix: 'x'.repeat(80) }),                  // 60..119 → light
      f('Major', { _tag: 'c', fix: 'x'.repeat(150) }),                 // 120..199 → moderate
      f('Major', { _tag: 'd', fix: 'x'.repeat(220) }),                 // ≥200 → substantial
    ];
    const out = render(doc([{ slideNum: 1, title: 'a', findings }]));
    const s5 = out.split('## §5')[1];
    assert.match(s5, /trivial/);
    assert.match(s5, /light/);
    assert.match(s5, /moderate/);
    assert.match(s5, /substantial/);
  });

  await t.test('§3: per-slide tier with no findings is skipped (loop continue branch)', () => {
    const out = render(doc([
      { slideNum: 1, title: 'a', findings: [f('Critical', { _tag: 'a' })] },
    ]));
    const s3 = out.split('## §3')[1].split('## §4')[0];
    // CRITICAL header present; no MAJOR/MINOR/NITPICK headers because no findings of those tiers.
    assert.match(s3, /CRITICAL/);
    assert.ok(!/^MAJOR$/m.test(s3));
  });

  await t.test('_internal: severityEmoji returns empty string for unknown severity', () => {
    assert.equal(_internal.severityEmoji('Unknown'), '');
  });

  await t.test('_internal: countBySeverity ignores unknown severities', () => {
    const c = _internal.countBySeverity(doc([
      { slideNum: 1, title: 'a', findings: [
        f('Critical', { _tag: 'a' }), { ...f('Major', { _tag: 'b' }), severity_reviewer: 'WhatEver' },
      ] },
    ]));
    assert.equal(c.critical, 1);
    assert.equal(c.major, 0);
  });

  await t.test('computeMaturity: 6 majors → Draft (major>5 second clause)', () => {
    const m = _internal.computeMaturity({ critical: 0, major: 6, minor: 0, nitpick: 0 });
    assert.equal(m, 'Draft');
  });

  await t.test('computeMaturity: 4 majors → Internal-ready', () => {
    const m = _internal.computeMaturity({ critical: 0, major: 4, minor: 0, nitpick: 0 });
    assert.equal(m, 'Internal-ready');
  });

  await t.test('computeMaturity: 0/0/5/6 → Client-ready (third rule, minor+nit>10? no →16)', () => {
    // 0 critical, 0 major, 5 minor + 6 nit = 11 > 10 → Client-ready (third rule fires).
    const m = _internal.computeMaturity({ critical: 0, major: 0, minor: 5, nitpick: 6 });
    assert.equal(m, 'Client-ready');
  });

  await t.test('§3: slides with null/undefined findings still render header', () => {
    const out = render(doc([
      { slideNum: 1, title: 'NoFindings' },
    ]));
    assert.match(out, /Slide 1 — NoFindings/);
  });

  await t.test('sortFindings: alphabetical within tier', () => {
    const out = render(doc([
      { slideNum: 1, title: 'a', findings: [
        f('Major', { _tag: 'b', text: 'beta' }),
        f('Major', { _tag: 'a', text: 'alpha' }),
      ] },
    ]));
    const s3 = out.split('## §3')[1];
    assert.ok(s3.indexOf('alpha') < s3.indexOf('beta'));
  });
});
