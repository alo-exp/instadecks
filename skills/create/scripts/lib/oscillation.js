'use strict';
// oscillation.js — Phase 5 D-02/D-09 oscillation detector. Pure: no fs, no clock.
// Returns true iff ledger[N].issue_set_hash === ledger[N-2].issue_set_hash AND
// ledger[N].findings_genuine > 0 (D-09 / Pitfall 2 refinement: strict hash equality
// on the unfixed-genuine set, not subset — avoids false-flagging steady shrinkage).

function detectOscillation(ledger) {
  if (!Array.isArray(ledger)) {
    throw new Error('detectOscillation: ledger must be array');
  }
  if (ledger.length < 3) return false;
  const N = ledger[ledger.length - 1];
  const Nm2 = ledger[ledger.length - 3];
  if (!N || !Nm2) return false;
  if ((N.findings_genuine || 0) === 0) return false; // converged → not oscillation
  return Boolean(N.issue_set_hash && N.issue_set_hash === Nm2.issue_set_hash);
}

module.exports = { detectOscillation };
