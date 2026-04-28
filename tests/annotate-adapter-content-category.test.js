'use strict';
// Phase 6 Plan 06-01 Task 1 — adapter accepts category:'content' (Q-3 / Pitfall 1).

const test = require('node:test');
const assert = require('node:assert/strict');

const { adaptFindings, SEV_MAP } = require('../skills/annotate/scripts/adapter');

function doc(findings) {
  return {
    schema_version: '1.1',
    deck: 'd.pptx',
    generated_at: '2026-04-28T00:00:00Z',
    slides: [{ slideNum: 1, title: 't', findings }],
  };
}

function f(overrides = {}) {
  return Object.assign({
    severity_reviewer: 'Major',
    category: 'content',
    check_id: 'jargon',
    genuine: true,
    nx: 0.5,
    ny: 0.6,
    text: 'sample',
    rationale: 'r',
    location: 'l',
    standard: 's',
    fix: 'fx',
  }, overrides);
}

test('adapter accepts category:content + emits major sev (orange)', () => {
  const samples = adaptFindings(doc([f({ severity_reviewer: 'Major' })]));
  assert.equal(samples.length, 1);
  assert.equal(samples[0].annotations[0].sev, 'major');
});

test('adapter accepts mixed defect + content findings in one doc', () => {
  const samples = adaptFindings(doc([
    f({ category: 'defect', check_id: undefined, severity_reviewer: 'Critical' }),
    f({ category: 'content', check_id: 'redundancy', severity_reviewer: 'Minor', ny: 0.5 }),
  ]));
  // Both genuine; both should appear
  assert.equal(samples[0].annotations.length, 2);
});

test('SEV_MAP collapse for content findings is unchanged', () => {
  assert.equal(SEV_MAP.Critical, 'major');
  assert.equal(SEV_MAP.Major, 'major');
  assert.equal(SEV_MAP.Minor, 'minor');
  assert.equal(SEV_MAP.Nitpick, 'polish');
});

test('content + Critical → major; content + Nitpick → polish', () => {
  const samples = adaptFindings(doc([
    f({ severity_reviewer: 'Critical' }),
    f({ severity_reviewer: 'Nitpick' }),
  ]));
  const sevs = samples[0].annotations.map(a => a.sev).sort();
  assert.deepEqual(sevs, ['major', 'polish']);
});
