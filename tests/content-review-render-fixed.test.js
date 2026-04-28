'use strict';
// content-review-render-fixed.test.js — determinism + 5-section ordering + maturity rubric
// (Plan 06-02 Task 2). Mirrors tests/review-render-fixed.test.js property tests, specialized for
// the content-review section labels + content maturity rubric (Persuasive/Argued/Informational/
// Draft/Notes — first-match-wins per 06-RESEARCH §"Render-content-fixed structure").

const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../skills/content-review/scripts/render-content-fixed');

function makeFinding(severity, overrides = {}) {
  return {
    severity_reviewer: severity,
    category: 'content',
    check_id: overrides.check_id || 'pyramid-mece',
    genuine: true,
    nx: 0.5,
    ny: 0.5,
    text: overrides.text || `text-${severity}-${overrides._tag || 'a'}`,
    rationale: 'r',
    location: 'loc',
    standard: overrides.standard || 'Pyramid Principle (Minto 1987)',
    fix: overrides.fix || `fix-${severity}-${overrides._tag || 'a'}`,
    ...overrides,
  };
}

function makeDoc(slidesFindings, opts = {}) {
  // slidesFindings: [{ slideNum, title, findings: [] }]
  return {
    schema_version: '1.1',
    deck: opts.deck || 'demo.pptx',
    generated_at: '2026-04-28T00:00:00Z',
    slides: slidesFindings,
  };
}

test('content-review-render-fixed: determinism + sections + rubric', async (t) => {
  await t.test('determinism: 10 calls produce byte-identical output', () => {
    const doc = makeDoc([
      { slideNum: 2, title: 'Thesis', findings: [makeFinding('Major', { _tag: 'a' })] },
      { slideNum: 3, title: 'Support', findings: [makeFinding('Minor', { _tag: 'b' })] },
    ]);
    const outputs = [];
    for (let i = 0; i < 10; i++) outputs.push(render(doc));
    for (let i = 1; i < 10; i++) {
      assert.strictEqual(outputs[i], outputs[0], `call ${i} diverged from call 0`);
    }
  });

  await t.test('section ordering 1→5 stable', () => {
    const doc = makeDoc([
      { slideNum: 2, title: 'A', findings: [makeFinding('Major', { _tag: 'a' })] },
    ]);
    const out = render(doc);
    const i1 = out.indexOf('## §1');
    const i2 = out.indexOf('## §2');
    const i3 = out.indexOf('## §3');
    const i4 = out.indexOf('## §4');
    const i5 = out.indexOf('## §5');
    assert.ok(i1 >= 0 && i2 > i1 && i3 > i2 && i4 > i3 && i5 > i4,
      `§1..§5 must appear in order; got ${[i1, i2, i3, i4, i5]}`);
    assert.match(out, /§1 — Deck-Level Argument Structure/);
    assert.match(out, /§2 — Inferred Argument Architecture/);
    assert.match(out, /§3 — Slide-by-Slide Content Findings/);
    assert.match(out, /§4 — Content Maturity Scoreboard/);
    assert.match(out, /§5 — Top 10 Content Fixes/);
  });

  await t.test('renders code-side check_ids', () => {
    const doc = makeDoc([
      { slideNum: 2, title: 'A', findings: [
        makeFinding('Minor', { _tag: 'a', check_id: 'jargon', text: 'acronym density' }),
      ] },
    ]);
    const out = render(doc);
    assert.match(out, /acronym density/);
  });

  await t.test('renders prompt-side check_ids', () => {
    const doc = makeDoc([
      { slideNum: 2, title: 'A', findings: [
        makeFinding('Major', { _tag: 'a', check_id: 'standalone-readability', text: 'slide depends on presenter' }),
      ] },
    ]);
    const out = render(doc);
    assert.match(out, /slide depends on presenter/);
  });

  await t.test('empty findings doc → valid output with placeholders', () => {
    const doc = makeDoc([]);
    const out = render(doc);
    assert.match(out, /No content findings emitted/);
    assert.match(out, /## §1/);
    assert.match(out, /## §5/);
  });

  // Maturity rubric (first-match-wins):
  // 5 Persuasive — 0 Critical AND ≤2 Major AND coherent thesis (slideNum:null pyramid-mece finding NOT present in first 3 slides means thesis exists)
  //   Note: heuristic — "thesis present" = no pyramid-mece systemic finding flagging missing thesis
  // 4 Argued — 0 Critical AND ≤4 Major
  // 3 Informational — 0 Critical AND ≥5 Major
  // 2 Draft — 1-2 Critical
  // 1 Notes — ≥3 Critical OR no thesis OR no resolution

  await t.test('maturity: 0 Critical / 0 Major (clean) → Persuasive', () => {
    const doc = makeDoc([
      { slideNum: 2, title: 'Thesis', findings: [] },
    ]);
    const out = render(doc);
    assert.match(out, /maturity: \*\*Persuasive\*\*/);
  });

  await t.test('maturity: 0 Critical / 4 Major → Argued', () => {
    const findings = [];
    for (let i = 0; i < 4; i++) findings.push(makeFinding('Major', { _tag: `${i}`, fix: `fix-${i}`, text: `t-${i}` }));
    const doc = makeDoc([{ slideNum: 2, title: 'A', findings }]);
    const out = render(doc);
    assert.match(out, /maturity: \*\*Argued\*\*/);
  });

  await t.test('maturity: 0 Critical / 5 Major → Informational', () => {
    const findings = [];
    for (let i = 0; i < 5; i++) findings.push(makeFinding('Major', { _tag: `${i}`, fix: `fix-${i}`, text: `t-${i}` }));
    const doc = makeDoc([{ slideNum: 2, title: 'A', findings }]);
    const out = render(doc);
    assert.match(out, /maturity: \*\*Informational\*\*/);
  });

  await t.test('maturity: 1 Critical → Draft', () => {
    const doc = makeDoc([
      { slideNum: 2, title: 'A', findings: [makeFinding('Critical', { _tag: 'a' })] },
    ]);
    const out = render(doc);
    assert.match(out, /maturity: \*\*Draft\*\*/);
  });

  await t.test('maturity: 3 Critical → Notes', () => {
    const findings = [];
    for (let i = 0; i < 3; i++) findings.push(makeFinding('Critical', { _tag: `${i}`, fix: `fix-${i}`, text: `t-${i}` }));
    const doc = makeDoc([{ slideNum: 2, title: 'A', findings }]);
    const out = render(doc);
    assert.match(out, /maturity: \*\*Notes\*\*/);
  });

  await t.test('within-tier sort by text ascending (Phase 3 invariant)', () => {
    const doc = makeDoc([
      { slideNum: 2, title: 'A', findings: [
        makeFinding('Major', { _tag: 'b', text: 'beta finding' }),
        makeFinding('Major', { _tag: 'a', text: 'alpha finding' }),
      ] },
    ]);
    const out = render(doc);
    const iAlpha = out.indexOf('alpha finding');
    const iBeta = out.indexOf('beta finding');
    assert.ok(iAlpha >= 0 && iBeta > iAlpha, 'alpha must precede beta within Major tier');
  });

  await t.test('§5 caps at 10 rows', () => {
    const findings = [];
    for (let i = 0; i < 25; i++) {
      findings.push(makeFinding('Minor', {
        _tag: `${i}`,
        text: `t-${String(i).padStart(2, '0')}`,
        fix: `unique-fix-${String(i).padStart(2, '0')}`,
      }));
    }
    const doc = makeDoc([{ slideNum: 2, title: 'A', findings }]);
    const out = render(doc);
    const section5 = out.split('## §5')[1];
    const dataRows = (section5.match(/^\| \d+ \|/gm) || []).length;
    assert.ok(dataRows <= 10, `§5 has ${dataRows} rows (>10)`);
  });

  await t.test('no clock leak: outputs identical across 1.1s gap', async () => {
    const doc = makeDoc([
      { slideNum: 2, title: 'A', findings: [makeFinding('Major', { _tag: 'a' })] },
    ]);
    const a = render(doc);
    await new Promise(r => setTimeout(r, 1100));
    const b = render(doc);
    assert.strictEqual(a, b, 'clock leak suspected');
  });
});
