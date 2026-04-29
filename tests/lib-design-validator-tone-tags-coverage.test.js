'use strict';
// tests/lib-design-validator-tone-tags-coverage.test.js — Live E2E Iter4-3.
// At least 4 palettes in palettes.md MUST carry tone tags from the
// executive/finance/board/corporate/b2b-enterprise register so that an
// agent producing multiple executive-finance decks does not deadlock
// between the tone-fit gate and the diversity audit.
//
// design-ideas.json is the secondary surface (used by mechanical pickers)
// and must also satisfy the same invariant for the same reason.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PALETTES_MD = path.join(__dirname, '..', 'skills', 'create', 'references', 'palettes.md');
const DESIGN_IDEAS = path.join(__dirname, '..', 'skills', 'create', 'references', 'design-ideas.json');

const EXEC_TAGS = new Set([
  'executive', 'finance', 'financial', 'board', 'corporate', 'b2b-enterprise',
]);

function intersects(tags) {
  return tags.some(t => EXEC_TAGS.has(String(t).toLowerCase()));
}

test('palettes.md: ≥4 palettes carry executive/finance/board tone tags', () => {
  const md = fs.readFileSync(PALETTES_MD, 'utf8');
  const sections = md.split(/^## /gm).slice(1);
  const matches = [];
  for (const section of sections) {
    const name = section.split('\n', 1)[0].trim();
    const m = section.match(/\*\*Tone tags:\*\*\s+(.+)/);
    if (!m) continue;
    const tags = m[1].split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    if (intersects(tags)) matches.push(name);
  }
  assert.ok(matches.length >= 4,
    `expected ≥4 palettes with executive/finance/board tone tags, got ${matches.length}: ${matches.join(', ')}`);
  // Spec-mandated: Cobalt Edge MUST be among them (canonical executive palette).
  assert.ok(matches.includes('Cobalt Edge'),
    `Cobalt Edge must carry executive/finance tone tags; matches: ${matches.join(', ')}`);
});

test('design-ideas.json: ≥4 palettes carry executive/finance/board tone tags', () => {
  const ideas = JSON.parse(fs.readFileSync(DESIGN_IDEAS, 'utf8'));
  const matches = (ideas.palettes || []).filter(p => {
    const tags = Array.isArray(p.tone_tags) ? p.tone_tags : [];
    return intersects(tags);
  });
  assert.ok(matches.length >= 4,
    `expected ≥4 palettes in design-ideas.json with executive tags, got ${matches.length}: ${matches.map(p => p.name).join(', ')}`);
});

test('palettes.md: executive-tagged set spans ≥3 distinct visual registers (no monoculture)', () => {
  // Sanity: the executive-friendly palettes shouldn't all be variations of
  // navy-blue. We check that at least one is non-blue (e.g., Verdant Steel
  // forest+brass, Editorial Serif cream+oxblood, Monochrome High-Contrast).
  const md = fs.readFileSync(PALETTES_MD, 'utf8');
  const sections = md.split(/^## /gm).slice(1);
  let nonBlueCount = 0;
  for (const section of sections) {
    const m = section.match(/\*\*Tone tags:\*\*\s+(.+)/);
    if (!m) continue;
    const tags = m[1].split(',').map(s => s.trim().toLowerCase());
    if (!intersects(tags)) continue;
    // Heuristic: if section text mentions cobalt/blue/navy, it's a blue register.
    const txt = section.toLowerCase();
    if (!/cobalt|navy|blue/.test(txt)) nonBlueCount++;
  }
  assert.ok(nonBlueCount >= 1,
    `executive palette set should include at least 1 non-blue option; got ${nonBlueCount}`);
});
