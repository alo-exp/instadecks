'use strict';
// tests/cookbook-palette-tone-tags.test.js — Live E2E Iteration 1 Fix #8.
//
// Each palette in references/palettes.md MUST declare a `**Tone tags:**`
// line so the hash-seed DNA picker can avoid landing on tone-mismatched
// palettes (e.g. Burnt Sienna for a finance brief). Tags are
// comma-separated keywords used by the SKILL.md Step 2.5 advance-seed rule.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PALETTES = path.join(
  __dirname, '..', 'skills', 'create', 'references', 'palettes.md');

test('palettes.md: every palette declares a **Tone tags:** line', () => {
  const md = fs.readFileSync(PALETTES, 'utf8');
  // Sections start at H2.
  const sections = md.split(/^## /gm).slice(1);
  assert.ok(sections.length >= 14);
  for (const section of sections) {
    const name = section.split('\n', 1)[0].trim();
    assert.match(section, /\*\*Tone tags:\*\*\s+\S/,
      `palette "${name}" must declare a non-empty **Tone tags:** line`);
  }
});

test('palettes.md: Cobalt Edge tone tags include finance/executive register', () => {
  const md = fs.readFileSync(PALETTES, 'utf8');
  const section = md.split(/^## /gm).find(s => s.startsWith('Cobalt Edge'));
  assert.ok(section, 'Cobalt Edge section must exist');
  const m = section.match(/\*\*Tone tags:\*\*\s+(.+)/);
  assert.ok(m, 'Cobalt Edge must have tone-tags line');
  const tags = m[1].toLowerCase();
  assert.match(tags, /(finance|executive)/);
});

test('palettes.md: Burnt Sienna tone tags include travel/hospitality', () => {
  const md = fs.readFileSync(PALETTES, 'utf8');
  const section = md.split(/^## /gm).find(s => s.startsWith('Burnt Sienna'));
  assert.ok(section, 'Burnt Sienna section must exist');
  const m = section.match(/\*\*Tone tags:\*\*\s+(.+)/);
  assert.ok(m);
  const tags = m[1].toLowerCase();
  assert.match(tags, /(travel|hospitality|artisanal)/);
});

test('palettes.md: Tech Noir tone tags do NOT overlap with Cobalt Edge finance', () => {
  // Sanity check: the two palettes serve different audiences.
  const md = fs.readFileSync(PALETTES, 'utf8');
  const sec = (n) => md.split(/^## /gm).find(s => s.startsWith(n));
  const tags = (s) => (s.match(/\*\*Tone tags:\*\*\s+(.+)/) || [, ''])[1]
    .toLowerCase().split(',').map(x => x.trim()).filter(Boolean);
  const noir = new Set(tags(sec('Tech Noir')));
  const cobalt = new Set(tags(sec('Cobalt Edge')));
  // Allow incidental overlap, but the headline finance tag must NOT be in Tech Noir.
  assert.equal(noir.has('finance'), false, 'Tech Noir must not be tagged "finance"');
  assert.equal(cobalt.has('dev-tools'), false, 'Cobalt Edge must not be tagged "dev-tools"');
});
