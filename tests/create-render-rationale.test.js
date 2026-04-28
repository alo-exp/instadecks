'use strict';
// create-render-rationale.test.js — D-07 byte-stable rationale renderer (Plan 04-01 Task 2).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { render } = require('../skills/create/scripts/lib/render-rationale');

const SAMPLE_BRIEF = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'sample-brief.json'), 'utf8'),
);

const DESIGN_CHOICES = {
  palette: { name: 'Midnight Plex', primary: '1E2761', secondary: 'CADCFC', accent: 'FFFFFF',
             rationale: 'Deep indigo signals authority while staying off the corporate-blue rail.' },
  typography: { heading: 'IBM Plex Sans', body: 'IBM Plex Sans',
                rationale: 'Single-family pairing keeps cognitive load low for a board audience.' },
  motif: 'Rule-of-thirds composition with generous whitespace; numerals foregrounded.',
  tradeoffs: [
    'Single-family typography reduces visual hierarchy; offset by weight + size contrast.',
    'Indigo background limits sticker-color palette; neutralized via white accents.',
  ],
};

test('render-rationale: output contains all 6 fixed section headers', () => {
  const md = render({ brief: SAMPLE_BRIEF, designChoices: DESIGN_CHOICES });
  for (const h of ['## Palette', '## Typography', '## Motif', '## Narrative Arc', '## Key Tradeoffs', '## Reviewer Notes']) {
    assert.ok(md.includes(h), `expected section header ${h}`);
  }
});

test('render-rationale: output starts with "# Design Rationale — <topic>"', () => {
  const md = render({ brief: SAMPLE_BRIEF, designChoices: DESIGN_CHOICES });
  assert.ok(md.startsWith(`# Design Rationale — ${SAMPLE_BRIEF.topic}`), 'header line mismatch');
});

test('render-rationale: byte-stable across two calls with identical args', () => {
  const a = render({ brief: SAMPLE_BRIEF, designChoices: DESIGN_CHOICES });
  const b = render({ brief: SAMPLE_BRIEF, designChoices: DESIGN_CHOICES });
  assert.equal(a, b);
});

test('render-rationale: empty reviewerNotes uses clean-converge placeholder', () => {
  const md = render({ brief: SAMPLE_BRIEF, designChoices: DESIGN_CHOICES });
  assert.match(md, /no reviewer findings/);
});

test('render-rationale: brief is required', () => {
  assert.throws(() => render({}), /brief must be an object/);
});
