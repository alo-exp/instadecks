'use strict';
// tests/cookbook-photo-led-recipe.test.js — Live E2E Iteration 1 Fix #9.
//
// references/cookbook/photo-led.md must exist with ≥3 variants and a
// safeAddImage placeholder-treatment guard so agents don't emit raw
// `pres.addImage({path})` against unresolvable paths.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RECIPE = path.join(
  __dirname, '..', 'skills', 'create', 'references', 'cookbook', 'photo-led.md');

test('photo-led.md exists', () => {
  assert.ok(fs.existsSync(RECIPE), 'cookbook/photo-led.md must exist');
});

test('photo-led.md declares ≥3 variants', () => {
  const md = fs.readFileSync(RECIPE, 'utf8');
  const variantHeadings = md.match(/^## Variant /gm) || [];
  assert.ok(variantHeadings.length >= 3,
    `expected ≥3 variant headings, got ${variantHeadings.length}`);
});

test('photo-led.md provides a safeAddImage placeholder guard', () => {
  const md = fs.readFileSync(RECIPE, 'utf8');
  assert.match(md, /safeAddImage/);
  assert.match(md, /placeholder/i);
  // Ensure existence check is documented.
  assert.match(md, /existsSync|existence/);
});

test('photo-led.md variant IDs follow `photo-led-[A-E]-shorthand` convention', () => {
  const md = fs.readFileSync(RECIPE, 'utf8');
  const ids = md.match(/photo-led-[A-E]-[a-z0-9-]+/g) || [];
  assert.ok(ids.length >= 3,
    `expected ≥3 variant IDs, got ${ids.length}: ${ids.join(', ')}`);
});

test('photo-led.md documents image-object shape (path?/alt/label)', () => {
  const md = fs.readFileSync(RECIPE, 'utf8');
  assert.match(md, /alt/);
  assert.match(md, /label/);
  assert.match(md, /path\?/);
});
