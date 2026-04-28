// tests/lib-create-render-rationale-branches.test.js — Plan 08-02 Task 1 (Group B).
// Branch coverage for skills/create/scripts/lib/render-rationale.js.

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  render,
  _internal: {
    renderPalette, renderTypography, renderMotif,
    renderNarrativeArc, renderKeyTradeoffs, renderReviewerNotes,
    REVIEWER_NOTES_PLACEHOLDER,
  },
} = require('../skills/create/scripts/lib/render-rationale');

const goodBrief = {
  topic: 'Q3 launch',
  narrative_arc: ['hook', 'evidence', 'ask'],
};
const goodDC = {
  palette: { name: 'plum', primary: '5E2A84', secondary: '24252A', accent: 'F2C14E', rationale: 'punchy' },
  typography: { heading: 'IBM Plex Sans', body: 'IBM Plex Sans', rationale: 'utility-pair' },
  motif: 'soft-edge cards',
  tradeoffs: ['accent over contrast', 'serif over sans'],
};

test('render: throws if brief missing or non-object', () => {
  assert.throws(() => render({}), /brief must be an object/);
  assert.throws(() => render({ brief: null }), /brief must be an object/);
  assert.throws(() => render(), /brief must be an object/);
});

test('render: header includes brief.topic', () => {
  const out = render({ brief: goodBrief, designChoices: goodDC });
  assert.match(out, /^# Design Rationale — Q3 launch/);
});

test('render: header tolerates missing topic (renders header without it)', () => {
  const out = render({ brief: { narrative_arc: [] }, designChoices: goodDC });
  assert.match(out, /^# Design Rationale —/);
});

test('render: includes all 6 section headings in fixed order', () => {
  const out = render({ brief: goodBrief, designChoices: goodDC, reviewerNotes: 'all good' });
  const headings = ['## Palette', '## Typography', '## Motif', '## Narrative Arc', '## Key Tradeoffs', '## Reviewer Notes'];
  let lastIdx = -1;
  for (const h of headings) {
    const idx = out.indexOf(h);
    assert.ok(idx > lastIdx, `${h} must appear after previous heading`);
    lastIdx = idx;
  }
});

test('render: deterministic — identical inputs give byte-identical output', () => {
  const a = render({ brief: goodBrief, designChoices: goodDC, reviewerNotes: 'r' });
  const b = render({ brief: goodBrief, designChoices: goodDC, reviewerNotes: 'r' });
  assert.equal(a, b);
});

test('render: ends with trailing newline', () => {
  const out = render({ brief: goodBrief, designChoices: goodDC });
  assert.ok(out.endsWith('\n'));
});

test('renderPalette: empty designChoices → "(unnamed)" placeholder', () => {
  const out = renderPalette(undefined);
  assert.match(out, /\(unnamed\)/);
});

test('renderPalette: triple "primary, secondary, accent" rendered', () => {
  const out = renderPalette(goodDC);
  assert.match(out, /5E2A84, 24252A, F2C14E/);
});

test('renderPalette: filters falsy values from triple', () => {
  const out = renderPalette({ palette: { name: 'p', primary: '5E2A84', secondary: '', accent: 'F2C14E' } });
  assert.match(out, /5E2A84, F2C14E/);
});

test('renderTypography: empty designChoices → empty heading/body lines', () => {
  const out = renderTypography(undefined);
  assert.match(out, /## Typography/);
  assert.match(out, /Headings: \n/);
});

test('renderMotif: empty motif → "## Motif\\n" only', () => {
  const out = renderMotif(undefined);
  assert.equal(out.split('\n')[0], '## Motif');
});

test('renderMotif: motif text included', () => {
  const out = renderMotif({ motif: 'soft-edge' });
  assert.match(out, /soft-edge/);
});

test('renderNarrativeArc: empty / non-array → just heading', () => {
  assert.match(renderNarrativeArc(undefined), /^## Narrative Arc$/);
  assert.match(renderNarrativeArc({ narrative_arc: 'no' }), /^## Narrative Arc$/);
});

test('renderNarrativeArc: numbered 1-based list', () => {
  const out = renderNarrativeArc({ narrative_arc: ['hook', 'evidence', 'ask'] });
  assert.match(out, /1\. hook/);
  assert.match(out, /2\. evidence/);
  assert.match(out, /3\. ask/);
});

test('renderKeyTradeoffs: empty array → "(none recorded)" placeholder', () => {
  const out = renderKeyTradeoffs({ tradeoffs: [] });
  assert.match(out, /none recorded/);
});

test('renderKeyTradeoffs: missing field → "(none recorded)"', () => {
  const out = renderKeyTradeoffs({});
  assert.match(out, /none recorded/);
});

test('renderKeyTradeoffs: each tradeoff rendered as bullet', () => {
  const out = renderKeyTradeoffs({ tradeoffs: ['a', 'b'] });
  assert.match(out, /- a/);
  assert.match(out, /- b/);
});

test('renderReviewerNotes: empty notes → placeholder', () => {
  const out = renderReviewerNotes('');
  assert.match(out, new RegExp(REVIEWER_NOTES_PLACEHOLDER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('renderReviewerNotes: whitespace-only notes → placeholder', () => {
  const out = renderReviewerNotes('   \n\t');
  assert.match(out, /auto-refine converged/);
});

test('renderReviewerNotes: notes content rendered verbatim', () => {
  const out = renderReviewerNotes('Cycle 2: 3 fixes applied.');
  assert.match(out, /Cycle 2: 3 fixes applied\./);
});

test('REVIEWER_NOTES_PLACEHOLDER exposed for downstream-test reuse', () => {
  assert.equal(typeof REVIEWER_NOTES_PLACEHOLDER, 'string');
  assert.ok(REVIEWER_NOTES_PLACEHOLDER.length > 0);
});
