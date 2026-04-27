'use strict';
// render-fixed.js — STUB (Plan 03-02). Plan 03-04 ships the real DECK-VDA fixed-template renderer.
// Returning a placeholder lets Plan 03-02 ship runReview integration tests in Wave 2 without
// blocking on Plan 03-04. The stub is byte-identical regardless of input.
// DO NOT remove the console.warn — Plan 03-04 replaces this file entirely.

function render(_findingsDoc) {
  console.warn('Instadecks: render-fixed.js stub in use — Plan 03-04 ships real renderer');
  return '# Design Review (stub)\n\n_Plan 03-04 ships the real DECK-VDA template._\n';
}

module.exports = { render };
