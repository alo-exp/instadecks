'use strict';
// tests/lib-render-rationale-shorthand.test.js — Live E2E Iteration 1 Fix #2.
//
// design-rationale.md MUST include `**Palette:** <name>`, `**Typography:** <name>`,
// `**Motif:** <name>` shorthand lines so SKILL.md-documented regex tooling
// (and the visual-diversity test that verifies DNA distinctness across runs)
// can extract the rolled DNA without parsing markdown sections.

const test = require('node:test');
const assert = require('node:assert/strict');

const { render, _internal } =
  require('../skills/create/scripts/lib/render-rationale');

const BRIEF = {
  topic: 'Q3 Strategy',
  audience: 'board',
  tone: 'executive',
  narrative_arc: ['One', 'Two', 'Three'],
};

test('render-rationale: emits **Palette:** shorthand line at top', () => {
  const md = render({
    brief: BRIEF,
    designChoices: {
      palette: { name: 'Cobalt Edge', primary: '0B2A6B', secondary: '2E4A8C', accent: 'F59E0B',
                 rationale: 'auth' },
      typography: { heading: 'IBM Plex Sans', body: 'IBM Plex Sans', rationale: 'r' },
      motif: 'Quiet diagonals as section bookends; no decorative imagery on data slides.',
    },
  });
  assert.match(md, /\*\*Palette:\*\* Cobalt Edge/);
});

test('render-rationale: emits **Typography:** shorthand line (heading+body)', () => {
  const md = render({
    brief: BRIEF,
    designChoices: {
      palette: { name: 'P', rationale: '' },
      typography: { heading: 'IBM Plex Serif', body: 'IBM Plex Sans', rationale: '' },
      motif: 'm',
    },
  });
  assert.match(md, /\*\*Typography:\*\* IBM Plex Serif\+IBM Plex Sans/);
});

test('render-rationale: **Typography:** prefers explicit pairing field if present', () => {
  const md = render({
    brief: BRIEF,
    designChoices: {
      palette: { name: 'P' },
      typography: { pairing: 'Plex Serif Display + Plex Sans Body',
                    heading: 'X', body: 'Y', rationale: '' },
      motif: 'm',
    },
  });
  assert.match(md, /\*\*Typography:\*\* Plex Serif Display \+ Plex Sans Body/);
});

test('render-rationale: emits **Motif:** shorthand line (first phrase)', () => {
  const md = render({
    brief: BRIEF,
    designChoices: {
      palette: { name: 'P' },
      typography: { heading: 'A', body: 'B' },
      motif: 'Rule-of-thirds composition with generous whitespace; numerals foregrounded.',
    },
  });
  // First phrase before semicolon.
  assert.match(md, /\*\*Motif:\*\* Rule-of-thirds composition with generous whitespace/);
});

test('render-rationale: shorthand lines appear BEFORE ## Palette section', () => {
  const md = render({
    brief: BRIEF,
    designChoices: {
      palette: { name: 'Tech Noir' },
      typography: { heading: 'Plex Mono', body: 'Plex Sans' },
      motif: 'Terminal aesthetic',
    },
  });
  const idxShort = md.indexOf('**Palette:** Tech Noir');
  const idxSection = md.indexOf('## Palette');
  assert.ok(idxShort > -1 && idxSection > -1, 'both lines must exist');
  assert.ok(idxShort < idxSection, 'shorthand must precede section heading');
});

test('render-rationale: shorthand falls back gracefully on empty designChoices', () => {
  const md = render({ brief: BRIEF, designChoices: {} });
  assert.match(md, /\*\*Palette:\*\* \(unnamed\)/);
  assert.match(md, /\*\*Typography:\*\* \(unnamed\)/);
  assert.match(md, /\*\*Motif:\*\* \(unnamed\)/);
});

test('render-rationale: motif as object with name field is supported', () => {
  const md = render({
    brief: BRIEF,
    designChoices: {
      palette: { name: 'P' },
      typography: { heading: 'A', body: 'B' },
      motif: { name: 'editorial-rule' },
    },
  });
  assert.match(md, /\*\*Motif:\*\* editorial-rule/);
});

test('renderShorthand: typography heading-only fallback', () => {
  const out = _internal.renderShorthand({
    palette: { name: 'P' },
    typography: { heading: 'Plex Mono' },
    motif: 'm',
  });
  assert.match(out, /\*\*Typography:\*\* Plex Mono/);
});

test('renderShorthand: typography body-only fallback', () => {
  const out = _internal.renderShorthand({
    palette: { name: 'P' },
    typography: { body: 'Plex Sans' },
    motif: 'm',
  });
  assert.match(out, /\*\*Typography:\*\* Plex Sans/);
});

test('renderShorthand: typography missing-object fallback', () => {
  const out = _internal.renderShorthand({
    palette: { name: 'P' },
    motif: 'm',
  });
  assert.match(out, /\*\*Typography:\*\* \(unnamed\)/);
});

test('renderShorthand: empty-object typography hits unnamed branch', () => {
  const out = _internal.renderShorthand({
    palette: { name: 'P' },
    typography: {},
    motif: 'm',
  });
  assert.match(out, /\*\*Typography:\*\* \(unnamed\)/);
});

test('renderShorthand: empty motif string falls back to unnamed', () => {
  const out = _internal.renderShorthand({
    palette: { name: 'P' },
    typography: { heading: 'A', body: 'B' },
    motif: '',
  });
  assert.match(out, /\*\*Motif:\*\* \(unnamed\)/);
});

test('renderShorthand: motif object without name → unnamed', () => {
  const out = _internal.renderShorthand({
    palette: { name: 'P' },
    typography: { heading: 'A', body: 'B' },
    motif: { foo: 'bar' },
  });
  assert.match(out, /\*\*Motif:\*\* \(unnamed\)/);
});

test('renderShorthand: motif with leading punctuation still emits something', () => {
  // After splitting on `.;—` the first segment may be empty — fall back to full motif.
  const out = _internal.renderShorthand({
    palette: { name: 'P' },
    typography: { heading: 'A', body: 'B' },
    motif: '. leading dot',
  });
  assert.match(out, /\*\*Motif:\*\* \. leading dot/);
});

test('renderShorthand: undefined designChoices entirely', () => {
  const out = _internal.renderShorthand(undefined);
  assert.match(out, /\*\*Palette:\*\* \(unnamed\)/);
  assert.match(out, /\*\*Typography:\*\* \(unnamed\)/);
  assert.match(out, /\*\*Motif:\*\* \(unnamed\)/);
});
