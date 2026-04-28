'use strict';
// Phase 5 — Plan 05-04 Task 1: unit tests for CLI soft-cap helpers (D-05 / Q-5).
// Covers isInteractive, parseSoftCapFlag, resolveSoftCap. No subprocess; no soffice.

const test = require('node:test');
const assert = require('node:assert/strict');

const cli = require('../skills/create/scripts/cli');

function withEnv(overrides, fn) {
  const saved = {};
  for (const k of Object.keys(overrides)) saved[k] = process.env[k];
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
  try { return fn(); }
  finally {
    for (const k of Object.keys(overrides)) {
      if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k];
    }
  }
}

function captureStderr(fn) {
  const orig = process.stderr.write.bind(process.stderr);
  let captured = '';
  process.stderr.write = (s) => { captured += String(s); return true; };
  try { const ret = fn(); return { ret, captured }; }
  finally { process.stderr.write = orig; }
}

test('isInteractive: returns false when CI=1', () => {
  withEnv({ CI: '1', NON_INTERACTIVE: undefined }, () => {
    assert.strictEqual(cli.isInteractive(), false);
  });
});

test('isInteractive: returns false when NON_INTERACTIVE=1', () => {
  withEnv({ CI: undefined, NON_INTERACTIVE: '1' }, () => {
    assert.strictEqual(cli.isInteractive(), false);
  });
});

test('parseSoftCapFlag: accepts accept | stop | continue', () => {
  assert.strictEqual(cli.parseSoftCapFlag(['--soft-cap=accept']), 'accept');
  assert.strictEqual(cli.parseSoftCapFlag(['--soft-cap=stop']), 'stop');
  assert.strictEqual(cli.parseSoftCapFlag(['--soft-cap=continue']), 'continue');
});

test('parseSoftCapFlag: rejects invalid value with pinpoint error', () => {
  assert.throws(
    () => cli.parseSoftCapFlag(['--soft-cap=foo']),
    /accept, stop, continue/,
  );
});

test('parseSoftCapFlag: returns null when flag absent', () => {
  assert.strictEqual(cli.parseSoftCapFlag([]), null);
  assert.strictEqual(cli.parseSoftCapFlag(['--brief', 'x.json']), null);
});

test('resolveSoftCap: explicit flag wins over fallback', () => {
  withEnv({ CI: '1' }, () => {
    // Even in non-interactive mode, explicit flag should override.
    assert.strictEqual(cli.resolveSoftCap('stop'), 'stop');
    assert.strictEqual(cli.resolveSoftCap('continue'), 'continue');
  });
});

test('resolveSoftCap: CI=1 + no flag → accept with stderr warning', () => {
  withEnv({ CI: '1', NON_INTERACTIVE: undefined }, () => {
    const { ret, captured } = captureStderr(() => cli.resolveSoftCap(null));
    assert.strictEqual(ret, 'accept');
    assert.match(captured, /non-interactive mode/);
    assert.match(captured, /cycle 5/);
  });
});
