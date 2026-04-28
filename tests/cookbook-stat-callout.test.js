'use strict';
// tests/cookbook-stat-callout.test.js — MINOR #3 fix verification.
//
// The stat-callout recipe used to ship without a width-vs-fontSize rule, so
// authoring agents would routinely produce overflow on 3-char stats at 110pt
// in narrow boxes. This test pins the presence of an explicit sizing guide.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RECIPE = path.join(
  __dirname, '..', 'skills', 'create', 'references',
  'cookbook', 'stat-callout.md');

test('stat-callout recipe contains an explicit width-vs-fontSize sizing rule', () => {
  const md = fs.readFileSync(RECIPE, 'utf8');
  // The recipe must call out the relationship between hero number width and fontSize
  // so authors can pick a non-overflowing box.
  assert.match(md, /Sizing|sizing rule|Width-to-fontSize|width-to-fontsize/i,
    'stat-callout.md must contain a sizing/width rule heading or phrase');
  // It must mention shrink-to-fit OR an explicit width recommendation.
  assert.match(md, /shrink|fit:\s*['"]shrink['"]|autoFit/,
    'stat-callout.md must mention pptxgenjs shrink/autoFit overflow guard');
});
