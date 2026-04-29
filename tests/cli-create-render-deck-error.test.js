'use strict';
// tests/cli-create-render-deck-error.test.js — Live E2E Iteration 1 Fix #3.
//
// When standalone runCreate fails to find render-deck.cjs at the run-dir,
// the error must guide the user to (a) agent mode, (b) cookbook-driven manual
// authoring, or (c) the --design-choices structured-handoff path. Not just
// "render-deck.cjs not found at ...".

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { runCreate } = require('../skills/create/scripts/index');

const SAMPLE_BRIEF = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'fixtures', 'sample-brief.json'), 'utf8'));

test('runCreate cold-user error: render-deck.cjs missing → actionable guidance', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'create-cold-'));
  try {
    let caught = null;
    try {
      await runCreate({ brief: SAMPLE_BRIEF, outDir: tmp, mode: 'standalone' });
    } catch (e) {
      caught = e;
    }
    assert.ok(caught, 'runCreate should throw when render-deck.cjs is missing');
    const msg = caught.message;
    assert.match(msg, /render-deck\.cjs not found/);
    assert.match(msg, /agent mode|Claude Code/i);
    // Iter3-2: revised error mentions --scaffold + cookbook; --design-choices is
    // explicitly clarified as NOT a bypass (still mentioned, not as alternative).
    assert.match(msg, /--scaffold/);
    assert.match(msg, /cookbook/);
    assert.match(msg, /--design-choices/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
