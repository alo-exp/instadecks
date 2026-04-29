'use strict';
// tests/cookbook-design-diversity.test.js — Phase 9 Plan 9-03 (DV-05).
//
// Asserts that skills/create/SKILL.md carries the design-DNA picker directives
// (hash-seed picker, diversity audit, defaults prohibition, variant-ID convention)
// and that skills/create/references/cookbook.md links the 3 reference libraries.
//
// These are content directives at the agent surface — without them, agents have
// no instruction to vary palette/typography/motif and decks default to v8.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SKILL_MD = path.join(
  __dirname, '..', 'skills', 'create', 'SKILL.md');
const COOKBOOK_MD = path.join(
  __dirname, '..', 'skills', 'create', 'references', 'cookbook.md');

const SKILL_REQUIRED = [
  'Choose design DNA',
  'Before authoring render-deck.cjs',
  'references/palettes.md',
  'references/typography.md',
  'references/motifs.md',
  'hash-seed',
  'Diversity audit',
  '.planning/instadecks/',
  'design-rationale.md',
  'last 3 prior runs',
  'DO NOT pick the same palette',
  'NEVER',
  'verdant-steel',
  'Plex Serif',
  'underline-accent',
  '{recipe}-[A-E]-',
];

const COOKBOOK_REQUIRED = [
  '## Variant IDs',
  '{recipe}-[A-E]-',
  '## Reference Libraries',
  '[Palette Library](palettes.md)',
  '[Typography Library](typography.md)',
  '[Motif Library](motifs.md)',
];

test('SKILL.md carries the design-DNA picker directives (DV-05)', () => {
  const text = fs.readFileSync(SKILL_MD, 'utf8');
  for (const phrase of SKILL_REQUIRED) {
    assert.ok(
      text.includes(phrase),
      `SKILL.md missing required directive substring: ${JSON.stringify(phrase)}`,
    );
  }
});

test('cookbook.md surfaces variant IDs + reference library links', () => {
  const text = fs.readFileSync(COOKBOOK_MD, 'utf8');
  for (const phrase of COOKBOOK_REQUIRED) {
    assert.ok(
      text.includes(phrase),
      `cookbook.md missing required substring: ${JSON.stringify(phrase)}`,
    );
  }
});

test('SKILL.md does not reintroduce defaults without the NEVER prefix', () => {
  // Paranoid check: any occurrence of "default to verdant-steel" must be
  // preceded (in the same line) by the bolded NEVER directive.
  const text = fs.readFileSync(SKILL_MD, 'utf8');
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (line.includes('default to verdant-steel')) {
      assert.ok(
        line.includes('NEVER'),
        `SKILL.md line reintroduces defaults without NEVER prefix: ${line}`,
      );
    }
  }
});
