---
phase: 01-plugin-foundation-contract-ci-gates
plan: 06
subsystem: tests/fixtures + visual-regression harness
tags: [visual-regression, sha-baseline, fixtures, pre-patch-sha, FOUND-09, D-06]
requires: []
provides:
  - tests/fixtures/v8-reference/Annotations_Sample.pptx
  - tests/fixtures/v8-reference/Annotations_Sample.pptx.sha256
  - tests/fixtures/v8-reference/annotate.js.sha256 (PRE-PATCH)
  - tests/fixtures/v8-reference/samples.js
  - tests/fixtures/v8-reference/slide-01.png
  - tests/fixtures/v8-reference/slide-02.png
  - tests/fixtures/v8-reference/slide-03.png
  - tests/visual-regression.test.js (Tier 1 active, Tier 2 skipped)
  - tests/annotate-integrity.test.js (it.skip per D-06)
affects:
  - Phase 2 (ANNO-*): owns copy of annotate.js + require-path patch + post-patch SHA replacement + integrity-test unsuspend
  - Phase 4 (CRT-*): consumes Tier 1 SHA gate as parity guard once /annotate regenerates PPTX
tech-stack:
  added:
    - node:test (zero-dep test runner)
    - node:crypto (SHA-256)
  patterns:
    - SHA-256 byte-level baseline (Tier 1)
    - pixelmatch ≤0.5% per-slide diff (Tier 2, scaffolded)
    - PRE-PATCH/POST-PATCH SHA handoff between Phase 1 and Phase 2
key-files:
  created:
    - tests/fixtures/v8-reference/Annotations_Sample.pptx
    - tests/fixtures/v8-reference/Annotations_Sample.pptx.sha256
    - tests/fixtures/v8-reference/annotate.js.sha256
    - tests/fixtures/v8-reference/samples.js
    - tests/fixtures/v8-reference/slide-01.png
    - tests/fixtures/v8-reference/slide-02.png
    - tests/fixtures/v8-reference/slide-03.png
    - tests/visual-regression.test.js
    - tests/annotate-integrity.test.js
  modified: []
decisions:
  - Selected /Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/Annotations_Sample.pptx as the canonical 3-slide v8 reference deck (only PPTX in v5-blue-prestige tree matching the "Annotations_Sample" naming convention; other PPTX files there are full Agentic_Disruption_v5/v6/v7/v8_BluePrestige decks, not the 3-slide annotation reference).
  - SAMPLES is inlined in v8 annotate.js (no separate samples.js exists upstream). Extracted lines 107-150 verbatim and wrapped with the documented Phase-1 banner + `module.exports = { SAMPLES }`. Geometry / charPts / drawing logic NOT extracted — those remain bound to annotate.js per the locked-invariant verbatim rule.
  - PRE-PATCH SHA recorded with NO in-memory transformation: `c21aa66dc7e6563d425cd4739a31a68693e6d4a386e9605a7b91f1bde99d239e`. Phase 2 will overwrite this file with the post-patch SHA after applying the require-path patch.
  - PNG @ 150 dpi locked over JPG (RESEARCH.md Open Question #2): pixelmatch requires PNG; SHA stability favors lossless. PNGs generated locally with macOS Homebrew soffice + pdftoppm.
metrics:
  duration: ~4 minutes
  tasks_completed: 2
  files_created: 9
  files_modified: 0
  completed_date: 2026-04-27
---

# Phase 01 Plan 06: Visual Regression Baseline + Harness Summary

**One-liner:** Committed v8 BluePrestige reference baselines (PPTX + SHA + per-slide PNGs at 150 dpi + extracted SAMPLES) and Tier 1-active / Tier 2-skipped visual-regression harness plus annotate-integrity it.skip stub holding the PRE-PATCH SHA for Phase 2 handoff.

## Outcome

- **Tier 1 SHA gate (active)** on `tests/fixtures/v8-reference/Annotations_Sample.pptx` — passes against committed `.sha256`.
- **Tier 2 pixelmatch (skipped)** with documented unsuspend-in-Phase-2 reason; per-slide PNG baselines at 150 dpi committed as Tier 2 reference (NOT in Tier 1 SHA scope).
- **annotate-integrity.test.js (it.skip)** carries D-06 banner; reads the PRE-PATCH SHA file and will assert against `skills/annotate/scripts/annotate.js` once Phase 2 unsuspends it.
- **PRE-PATCH annotate.js SHA recorded:** `c21aa66dc7e6563d425cd4739a31a68693e6d4a386e9605a7b91f1bde99d239e` (banner-prefixed in `tests/fixtures/v8-reference/annotate.js.sha256`).

## Source PPTX Selected

`Annotations_Sample.pptx` from `/Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/` (503,145 bytes, 3 slides, slideNums 7/9/10 per inlined SAMPLES). This is the unambiguous canonical reference — the only PPTX in that tree matching the `Annotations_Sample` naming convention.

## Verification

```
$ node --test tests/visual-regression.test.js tests/annotate-integrity.test.js
﹣ annotate.js post-patch SHA matches v8 baseline  # skipped (Phase 2)
✔ Tier 1: Annotations_Sample.pptx SHA matches v8 baseline
﹣ Tier 2: per-slide pixel-diff < 0.5%             # skipped (Phase 2)
ℹ tests 3   ℹ pass 1   ℹ fail 0   ℹ skipped 2
```

PPTX SHA file matches actual file SHA (Task 1 plan-verify command returned `VERIFY_OK`).

## Phase 2 Handoff (locked)

Phase 2 owns, in order:
1. Copy `/Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/annotate.js` → `skills/annotate/scripts/annotate.js`.
2. Apply the documented one-line require-path patch (pptxgenjs require resolves out of `${CLAUDE_PLUGIN_DATA}/node_modules`).
3. Recompute SHA-256 of the patched file; overwrite `tests/fixtures/v8-reference/annotate.js.sha256` with the post-patch hex (preserve banner — update to `# POST-PATCH SHA — applied require-path patch per CLAUDE.md Locked Invariants §1`).
4. Unsuspend `tests/annotate-integrity.test.js` by removing the `skip` option from the `test(...)` call.
5. Optionally unsuspend Tier 2 in `tests/visual-regression.test.js` once `/annotate` regenerates the PPTX in CI with LibreOffice available.

## Deviations from Plan

None — plan executed exactly as written. SAMPLES was confirmed inlined in v8 annotate.js (not a separate file upstream); the plan explicitly anticipates and accommodates this case.

## Commits

- `a1dde18` chore(01-06): commit v8 reference baselines + PRE-PATCH annotate.js SHA
- `3417dad` feat(01-06): add visual-regression + annotate-integrity test harness

## Self-Check: PASSED

- FOUND: tests/fixtures/v8-reference/Annotations_Sample.pptx
- FOUND: tests/fixtures/v8-reference/Annotations_Sample.pptx.sha256
- FOUND: tests/fixtures/v8-reference/annotate.js.sha256 (PRE-PATCH banner present)
- FOUND: tests/fixtures/v8-reference/samples.js
- FOUND: tests/fixtures/v8-reference/slide-01.png, slide-02.png, slide-03.png
- FOUND: tests/visual-regression.test.js
- FOUND: tests/annotate-integrity.test.js
- FOUND commit: a1dde18
- FOUND commit: 3417dad
- node --test: 1 pass / 2 skipped / 0 fail

## EXECUTION COMPLETE
