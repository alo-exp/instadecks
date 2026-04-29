'use strict';
// tests/cookbook-2col-valign-top.test.js — Live E2E Iteration 1 Fix #7.
//
// 2col bullet boxes default to vertical-center alignment when only a few
// bullets are present, leaving whitespace under the subheader. All bullet
// text-box options in 2col variants must carry `valign: 'top'`.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RECIPE = path.join(__dirname, '..',
  'skills', 'create', 'references', 'cookbook', '2col.md');

test('2col.md: every bullet body addText carries valign:"top"', () => {
  const md = fs.readFileSync(RECIPE, 'utf8');
  // Every line that styles bullet bodies (`fontFace: TYPE.body, fontSize: ...`)
  // MUST also include `valign: 'top'`.
  const lines = md.split('\n');
  let bulletStyleLines = 0;
  for (const line of lines) {
    if (/fontFace:\s*TYPE\.body,\s*fontSize:/.test(line)) {
      bulletStyleLines++;
      assert.match(line, /valign:\s*['"]top['"]/,
        `bullet style line missing valign:'top': ${line.trim()}`);
    }
  }
  // Sanity: 2col has 6 bullet bodies (3 variants × 2 columns).
  assert.ok(bulletStyleLines >= 6,
    `expected ≥6 bullet-body style lines, found ${bulletStyleLines}`);
});
