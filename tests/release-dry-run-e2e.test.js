'use strict';

// HARD-15 — release dry-run end-to-end integration test.
//
// Spawns `npm run release:dry-run` against the current clean repo (after
// Plans 10-01..10-05 have landed) and asserts the entire automated chain
// runs green: every gate marker (`>>> <label>`) is emitted and every
// DRY-RUN action line (`DRY-RUN: would <action>`) is printed. This is the
// single green-button verification that `npm run release` is safe to run.
//
// Gating:
//   - Without RUN_RELEASE_E2E=1: skipped silently (this is a slow
//     integration test — it runs the full c8 100% suite, bats, activation-
//     panel, permission-mode, optionally fresh-install. Runtime budget
//     4-15 minutes).
//   - With RUN_RELEASE_E2E=1: real spawn, real assertions.
//
// Locally:
//   RUN_RELEASE_E2E=1 node --test tests/release-dry-run-e2e.test.js
//
// This test does NOT execute `npm run release` (no --dry-run): the real
// tag-pushing release path is exercised manually by the maintainer.

const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');

const enabled = process.env.RUN_RELEASE_E2E === '1';

const expectedGates = [
  '>>> lint:paths',
  '>>> lint:enums',
  '>>> license-audit',
  '>>> manifest-validator',
  '>>> doc-size',
  '>>> test (c8 100%)',
  '>>> bats',
  '>>> activation-panel',
  '>>> permission-mode',
];

const expectedActions = [
  'DRY-RUN: would flip STATE.md',
  'DRY-RUN: would prepend CHANGELOG',
  'DRY-RUN: would tag v0.1.0',
  'DRY-RUN: would push tag',
  'DRY-RUN: would submit marketplace PR',
];

test(
  'release:dry-run runs the full automated chain green',
  { skip: enabled ? false : 'set RUN_RELEASE_E2E=1 to run the release dry-run E2E (4-15 min)', timeout: 16 * 60 * 1000 },
  (t) => {
    const start = Date.now();
    const r = spawnSync('npm', ['run', 'release:dry-run'], {
      encoding: 'utf8',
      timeout: 15 * 60 * 1000,
    });
    t.diagnostic(`release:dry-run took ${((Date.now() - start) / 1000) | 0}s`);

    assert.strictEqual(
      r.status,
      0,
      `release:dry-run exited non-zero (status=${r.status}); stderr=${r.stderr}\nstdout-tail=${(r.stdout || '').slice(-2000)}`
    );

    const out = (r.stdout || '') + '\n' + (r.stderr || '');

    for (const g of expectedGates) {
      assert.ok(out.includes(g), `missing gate marker: ${g}`);
    }

    // fresh-install: either ran (`>>> fresh-install`) or was explicitly
    // skipped on a host without docker (`gate:fresh-install SKIPPED`).
    assert.ok(
      out.includes('>>> fresh-install') || out.includes('gate:fresh-install SKIPPED'),
      'missing fresh-install gate marker or documented SKIPPED diagnostic'
    );

    for (const a of expectedActions) {
      assert.ok(out.includes(a), `missing DRY-RUN action: ${a}`);
    }
  }
);
