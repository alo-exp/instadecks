'use strict';
// tests/cookbook-stat-callout-supporting-text.test.js — Live E2E Round 3 MAJOR N2.
//
// The stat-callout sizing table must include a paired "Supporting-text x ≥"
// column so authors don't ship overlap defects when hero box w > 4.5″.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RECIPE = path.join(
  __dirname, '..', 'skills', 'create', 'references',
  'cookbook', 'stat-callout.md');

test('stat-callout sizing table contains paired Supporting-text x column', () => {
  const md = fs.readFileSync(RECIPE, 'utf8');
  assert.match(md, /Supporting-text x/i,
    'sizing table must include a Supporting-text x column');
  // For 4-char hero (w ≥ 6.5), supporting-text x must be ≥ 7.3 (overlap-free).
  assert.match(md, /7\.3/,
    'sizing table must show supporting-text x ≥ 7.3″ for 4-char hero @ fontSize 110');
});

test('stat-callout has explicit anti-pattern about default x: 5.3 with wide hero', () => {
  const md = fs.readFileSync(RECIPE, 'utf8');
  assert.match(md, /DON'T.*5\.3|5\.3.*overlap|overlap.*5\.3|x:\s*5\.3.*hero/is,
    'recipe must call out the x: 5.3 + wide-hero overlap anti-pattern');
});
