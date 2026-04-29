'use strict';
// tests/cookbook-motif-library.test.js — Plan 9-01 (DV-04).
//
// Asserts skills/create/references/motifs.md library shape:
//   - All 9 D-04 motif names are H2 headings
//   - gradient-overlay section contains the "limited gradient support"
//     pptxgenjs 4.0.1 workaround comment.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const MOTIFS = path.join(
  __dirname, '..', 'skills', 'create', 'references', 'motifs.md');

const D04_MOTIFS = [
  'underline-accent',
  'geometric-block',
  'asymmetric-grid',
  'number-as-design',
  'diagonal-split',
  'editorial-rule',
  'minimalist-void',
  'gradient-overlay',
  'type-as-image',
];

test('motifs.md exists at the documented path', () => {
  assert.ok(fs.existsSync(MOTIFS), 'motifs.md must exist');
});

test('motifs.md has all 9 D-04 motif names as H2 headings', () => {
  const md = fs.readFileSync(MOTIFS, 'utf8');
  for (const name of D04_MOTIFS) {
    assert.ok(md.includes('## ' + name),
      `missing required motif H2: "## ${name}"`);
  }
});

test('motifs.md has ≥ 8 H2 motif blocks', () => {
  const md = fs.readFileSync(MOTIFS, 'utf8');
  const h2 = md.match(/^## /gm) || [];
  assert.ok(h2.length >= 8,
    `expected ≥ 8 H2 motif blocks, got ${h2.length}`);
});

test('gradient-overlay section contains "limited gradient support" workaround comment', () => {
  const md = fs.readFileSync(MOTIFS, 'utf8');
  const sections = md.split(/^## /gm).slice(1);
  const gradient = sections.find(s => s.startsWith('gradient-overlay'));
  assert.ok(gradient, 'gradient-overlay section must exist');
  assert.match(gradient, /limited gradient support/,
    'gradient-overlay must document the pptxgenjs 4.0.1 stepped-solid-block workaround');
});

test('every motif section includes a fenced javascript code block (working snippet)', () => {
  const md = fs.readFileSync(MOTIFS, 'utf8');
  const sections = md.split(/^## /gm).slice(1);
  for (const s of sections) {
    const name = s.split('\n', 1)[0].trim();
    if (!D04_MOTIFS.includes(name)) continue;
    assert.match(s, /```javascript[\s\S]+?```/,
      `motif "${name}" must include a fenced javascript code block`);
  }
});
