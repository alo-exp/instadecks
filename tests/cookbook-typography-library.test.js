'use strict';
// tests/cookbook-typography-library.test.js — Plan 9-01 (DV-03).
//
// Asserts skills/create/references/typography.md library shape:
//   - ≥8 H2 pair blocks
//   - ≥8 fontFace: assignments (one per pairing)
//   - ≥3 sections mention "IBM Plex" (bundled-font discipline)

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const TYPO = path.join(
  __dirname, '..', 'skills', 'create', 'references', 'typography.md');

test('typography.md exists at the documented path', () => {
  assert.ok(fs.existsSync(TYPO), 'typography.md must exist');
});

test('typography.md has ≥ 8 H2 pairing blocks', () => {
  const md = fs.readFileSync(TYPO, 'utf8');
  const h2 = md.match(/^## /gm) || [];
  assert.ok(h2.length >= 8,
    `expected ≥ 8 H2 pairing blocks, got ${h2.length}`);
});

test('typography.md has ≥ 8 fontFace: assignments', () => {
  const md = fs.readFileSync(TYPO, 'utf8');
  const ff = md.match(/fontFace:/g) || [];
  assert.ok(ff.length >= 8,
    `expected ≥ 8 fontFace: assignments, got ${ff.length}`);
});

test('typography.md has ≥ 3 sections mentioning IBM Plex', () => {
  const md = fs.readFileSync(TYPO, 'utf8');
  const sections = md.split(/^## /gm).slice(1);
  const plexSections = sections.filter(s => /IBM Plex/.test(s));
  assert.ok(plexSections.length >= 3,
    `expected ≥ 3 sections referencing "IBM Plex", got ${plexSections.length}`);
});
