// tests/lib-content-review-title-adapter.test.js — Plan 08-02 Task 1 (Group A).
// Branch coverage for skills/content-review/scripts/lib/title-adapter.js.

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const { checkTitles } = require('../skills/content-review/scripts/lib/title-adapter');

test('checkTitles: null / non-object input → []', () => {
  assert.deepEqual(checkTitles(null), []);
  assert.deepEqual(checkTitles({}), []);
  assert.deepEqual(checkTitles({ slides: null }), []);
});

test('checkTitles: empty slides → []', () => {
  assert.deepEqual(checkTitles({ slides: [] }), []);
});

test('checkTitles: claim-shaped action title passes (no finding)', () => {
  const extract = {
    slides: [{ slideNum: 1, title: 'Revenue grew 40% in Q3', slide_type: 'content' }],
  };
  assert.deepEqual(checkTitles(extract), []);
});

test('checkTitles: blocked phrase ("Agenda") → Major finding', () => {
  const extract = {
    slides: [{ slideNum: 2, title: 'Agenda', slide_type: 'content' }],
  };
  const out = checkTitles(extract);
  assert.equal(out.length, 1);
  assert.equal(out[0].severity_reviewer, 'Major');
  assert.equal(out[0].check_id, 'action-title');
  assert.equal(out[0].slideNum, 2);
  assert.match(out[0].text, /Agenda/);
});

test('checkTitles: short topic-shaped title → Minor finding', () => {
  const extract = {
    slides: [{ slideNum: 3, title: 'Q3 Numbers', slide_type: 'content' }],
  };
  const out = checkTitles(extract);
  assert.equal(out.length, 1);
  assert.equal(out[0].severity_reviewer, 'Minor');
  assert.match(out[0].text, /label, not a claim/);
});

test('checkTitles: closing slide bypasses via action_title_override', () => {
  const extract = {
    slides: [{ slideNum: 9, title: 'Thank You', slide_type: 'closing' }],
  };
  assert.deepEqual(checkTitles(extract), []);
});

test('checkTitles: empty title is skipped (no finding emitted)', () => {
  const extract = {
    slides: [{ slideNum: 4, title: '', slide_type: 'content' }],
  };
  assert.deepEqual(checkTitles(extract), []);
});

test('checkTitles: each slide independently evaluated', () => {
  const extract = {
    slides: [
      { slideNum: 1, title: 'Revenue grew 40% in Q3', slide_type: 'content' },
      { slideNum: 2, title: 'Agenda', slide_type: 'content' },
      { slideNum: 3, title: 'Costs decreased significantly', slide_type: 'content' },
    ],
  };
  const out = checkTitles(extract);
  assert.equal(out.length, 1);
  assert.equal(out[0].slideNum, 2);
});
