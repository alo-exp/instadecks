---
phase: 05-instadecks-create-auto-refine
plan: 02
subsystem: review
tags: [auto-refine, runReview, slidesToReview, scoped-review, findings-triaged-schema, CRT-13, Q-1]
requires:
  - skills/review/scripts/index.js (runReview)
  - skills/review/scripts/lib/schema-validator.js
  - tests/fixtures/sample-findings.json
provides:
  - runReview slidesToReview filter (NON-BREAKING; null|'all'|int[])
  - findings-triaged-schema.md reference doc
  - sample-findings-triaged.json fixture
  - Scoped Review Mode prose in skills/review/SKILL.md
affects:
  - Plan 05-03 (SKILL.md cycle pseudocode invokes runReview with diff-only slide list)
  - Plan 05-04 (integration test mocks runReview, uses param shape verbatim)
tech-stack:
  added: []
  patterns:
    - filter helper between validate() and output composition (preserves P-01)
    - additive named param with sentinel default (null = "all" passthrough)
    - stable-id rule `${slideNum}-${sha1(text).slice(0,8)}` for cross-cycle threading
key-files:
  created:
    - tests/slides-to-review.test.js
    - tests/fixtures/sample-findings-triaged.json
    - skills/review/references/findings-triaged-schema.md
  modified:
    - skills/review/scripts/index.js
    - skills/review/SKILL.md
decisions:
  - filterSlides applied AFTER validate() so input integrity is preserved before filtering
  - severity counts (findingCounts, genuineCount) recompute naturally from filtered slides[]
  - triaged-fixture validates against the BASE schema (additive-only fields are tolerated)
  - SKILL.md frontmatter description NOT modified (Plan 05-03 owns create-side description)
metrics:
  duration_minutes: ~12
  completed: 2026-04-28
  tasks_completed: 2/2
  commits: 3
---

# Phase 5 Plan 02: runReview slidesToReview + Scoped-Review Prose Summary

**One-liner:** Additive `slidesToReview` filter on `runReview` (Q-1 NON-BREAKING; ~20 LOC) plus agent-facing `findings-triaged-schema.md` reference and `Scoped Review Mode` prose for the auto-refine loop's two-files-per-cycle output.

## What Shipped

### Code change — runReview signature delta

**Before:**
```js
async function runReview({ deckPath, runId, outDir, mode = 'standalone', findings, annotate = false } = {}) {
```

**After:**
```js
async function runReview({
  deckPath, runId, outDir, mode = 'standalone', findings,
  annotate = false,
  slidesToReview = null,  // null|'all' = full review; int[] = filter
} = {}) {
```

**Filter helper** (private, module-scope) — validates input then drops `findings.slides[]` entries whose `slideNum` is not in the keep-set. Throws pinpoint `Error` on non-array, float, or negative integer.

**Insertion point:** between `validate(findings)` and run-dir resolve (line 1b) — input integrity preserved; downstream `countFindings` traversal naturally consumes the filtered shape.

**LOC:** 20 lines added (1 named param + JSDoc block + 16-line filterSlides helper + 2-line filter call). Zero lines removed.

### Documentation deliverables

| File | Lines | Purpose |
| --- | --- | --- |
| `skills/review/references/findings-triaged-schema.md` | 113 | 7 sections: purpose / file location / schema delta / stable-ID rule / example / ledger cross-ref / out-of-scope. Documents `id`, `genuine`, `triage_rationale` additive fields (D-08 / Q-4). Base schema UNCHANGED. |
| `skills/review/SKILL.md` (appended) | 22-line subsection | "Scoped Review Mode" — imperative-voice prose for cycle 2+ diff-only review (D-03 / CRT-13). Cross-references the triaged-schema doc. |
| `tests/fixtures/sample-findings-triaged.json` | 105 | Canonical triaged-findings fixture; clone of `sample-findings.json` with each finding gaining `id` (computed via stable-ID rule), `genuine` (mix of true/false), `triage_rationale`. Validates against base schema-validator. |

### Test deliverable

`tests/slides-to-review.test.js` — 8 subtests: null passthrough, 'all' passthrough, [7,9] filter, [] empty, float reject, negative reject, non-'all' string reject, genuineCount/findingCounts recomputation. **All 8 pass.**

## Regression Guard (Q-1 NON-BREAKING proof)

| Suite | Pre-change tests | Post-change tests | Status |
| --- | --- | --- | --- |
| `review-pipeline.test.js` | 3 | 3 | green |
| `review-integration.test.js` | (per file) | (per file) | green |
| `review-render-fixed.test.js` | (per file) | (per file) | green |
| `review-ai-tells.test.js` | (per file) | (per file) | green |
| `findings-schema.test.js` | (per file) | (per file) | green |
| `review-schema-emission.test.js` | (per file) | (per file) | green |
| `review-runtime.test.js` | (per file) | (per file) | green |
| **Total Phase 3 review suite** | **56** | **56** | **all green, unchanged** |
| `slides-to-review.test.js` (NEW) | 0 | 8 | new + green |

`bash tools/lint-paths.sh` → green. `tests/path-lint.test.js` → green.

## Deviations from Plan

None — plan executed as written. The plan estimated ~12 LOC; actual is 20 LOC (added a JSDoc block and a more thorough validation loop than the inline `.some(...)` sketch). Behaviorally identical to the plan's interface.

## Downstream Consumers

- **Plan 05-03 (Wave 2 — SKILL.md auto-refine pseudocode):** cycle pseudocode now has a working `runReview` filter API to invoke; cycle-2+ diff-only review is implementable. SKILL.md "Scoped Review Mode" subsection is the agent-facing reference.
- **Plan 05-04 (Wave 3 — integration test):** mocks `runReview` returning scripted findings sequences but uses the `slidesToReview` param shape verbatim (`null | 'all' | int[]`). Triaged fixture is the known-good shape for asserting triaged-document handling.
- **Plan 05-01 (Wave 1 parallel — loop primitives):** `skipped_finding_ids[]` / `fixed_finding_ids[]` ledger fields cross-reference the stable IDs documented in `findings-triaged-schema.md` §6.

## Commits

| Hash | Message |
| --- | --- |
| `2ed10b3` | test(05-02): add failing tests for runReview slidesToReview filter (Q-1) |
| `a12f27d` | feat(05-02): add runReview slidesToReview filter (Q-1; CRT-13) |
| `46e3d10` | docs(05-02): add findings-triaged-schema + scoped-review prose for auto-refine loop |

## Acceptance Criteria — All Met

- [x] runReview accepts `slidesToReview` param; default `null` behaves identically to pre-change.
- [x] Filter drops slide entries by slideNum without mutating finding shape (P-01 invariant preserved).
- [x] Invalid inputs (non-array, float, negative, string-other-than-'all') throw pinpoint Errors.
- [x] All existing Phase 3 tests green (regression guard — 56/56).
- [x] `sample-findings-triaged.json` validates against base schema-validator.
- [x] `findings-triaged-schema.md` exists, 113 lines, 7 sections, includes example + stable-ID rule.
- [x] SKILL.md gains "Scoped Review Mode" subsection in imperative voice with See-also reference.
- [x] `tools/lint-paths.sh` green.
- [x] 3 atomic commits in git log (test/feat/docs).
- [x] CRT-13 (slide-diff API half) covered.

## TDD Gate Compliance

- RED: `2ed10b3` (`test(05-02): add failing tests...`) — verified failing locally before GREEN.
- GREEN: `a12f27d` (`feat(05-02): add runReview slidesToReview filter`) — all 8 new tests + 56 regression tests pass.
- REFACTOR: skipped (no cleanup needed — additive code, no duplication).

## Self-Check: PASSED

- [x] `skills/review/scripts/index.js` exists and contains `slidesToReview`
- [x] `tests/slides-to-review.test.js` exists
- [x] `tests/fixtures/sample-findings-triaged.json` exists, validates against base schema
- [x] `skills/review/references/findings-triaged-schema.md` exists, 113 lines
- [x] `skills/review/SKILL.md` contains "Scoped Review Mode"
- [x] Commits `2ed10b3`, `a12f27d`, `46e3d10` all in git log
