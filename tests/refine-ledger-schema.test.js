// tests/refine-ledger-schema.test.js — Phase 5 D-02 ledger schema validation.
// Mirrors tests/findings-schema.test.js field-enumeration style.

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const FIXTURE = path.join(__dirname, 'fixtures', 'sample-refine-ledger.jsonl');

const REQUIRED_LEDGER_FIELDS = [
  'cycle', 'timestamp',
  'findings_total', 'findings_genuine',
  'findings_fixed', 'findings_intentionally_skipped',
  'issue_set_hash',
  'skipped_finding_ids', 'fixed_finding_ids',
  'slides_changed', 'review_mode', 'ended_via',
];

const ALLOWED_REVIEW_MODES = new Set(['full', 'diff-only']);
const ALLOWED_ENDED_VIA = new Set([
  null, 'converged', 'oscillation',
  'soft-cap-accepted', 'soft-cap-stopped', 'interrupted',
]);

const entries = fs.readFileSync(FIXTURE, 'utf8')
  .split('\n').filter(Boolean).map((ln) => JSON.parse(ln));

test('sample-refine-ledger.jsonl honors D-02 schema', async (t) => {
  await t.test('every entry has all 12 REQUIRED_LEDGER_FIELDS', () => {
    for (const e of entries) {
      for (const k of REQUIRED_LEDGER_FIELDS) {
        assert.ok(Object.prototype.hasOwnProperty.call(e, k),
          `entry cycle=${e.cycle}: missing required field "${k}"`);
      }
    }
  });

  await t.test('cycle is positive integer in every entry', () => {
    for (const e of entries) {
      assert.ok(Number.isInteger(e.cycle) && e.cycle >= 1,
        `cycle must be positive integer (got ${e.cycle})`);
    }
  });

  await t.test('issue_set_hash matches /^sha1:[0-9a-f]{40}$/', () => {
    for (const e of entries) {
      assert.match(e.issue_set_hash, /^sha1:[0-9a-f]{40}$/);
    }
  });

  await t.test('review_mode in {full, diff-only}', () => {
    for (const e of entries) {
      assert.ok(ALLOWED_REVIEW_MODES.has(e.review_mode),
        `unknown review_mode "${e.review_mode}"`);
    }
  });

  await t.test('ended_via is null or one of the closed enum', () => {
    for (const e of entries) {
      assert.ok(ALLOWED_ENDED_VIA.has(e.ended_via),
        `unknown ended_via "${e.ended_via}"`);
    }
  });

  await t.test('skipped_finding_ids and fixed_finding_ids are arrays of strings', () => {
    for (const e of entries) {
      assert.ok(Array.isArray(e.skipped_finding_ids));
      assert.ok(Array.isArray(e.fixed_finding_ids));
      for (const id of e.skipped_finding_ids) assert.equal(typeof id, 'string');
      for (const id of e.fixed_finding_ids) assert.equal(typeof id, 'string');
    }
  });

  await t.test('slides_changed is array of positive integers', () => {
    for (const e of entries) {
      assert.ok(Array.isArray(e.slides_changed));
      for (const n of e.slides_changed) {
        assert.ok(Number.isInteger(n) && n >= 1, `slides_changed entry not pos int: ${n}`);
      }
    }
  });

  await t.test('fixture exercises ended_via: converged', () => {
    assert.ok(entries.some((e) => e.ended_via === 'converged'));
  });
});
