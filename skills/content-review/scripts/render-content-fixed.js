'use strict';
// render-content-fixed.js — STUB (full deterministic 5-section renderer ships in Plan 06-02 Task 2).
// This stub exists so runContentReview can wire its dependency from Task 1 onward without forcing
// a circular task ordering. The Task 2 implementation replaces this file in the same plan.

function render(findingsDoc) {
  if (!findingsDoc || typeof findingsDoc !== 'object') {
    throw new Error('render: findingsDoc must be an object');
  }
  return `# Content Review — ${findingsDoc.deck}\n\n_stub renderer; full template ships in Task 2._\n`;
}

module.exports = { render };
