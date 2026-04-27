---
phase: 03-instadecks-review
plan: 02
subsystem: skills/review/scripts (runReview orchestrator)
tags: [runReview, schema-validator, structured-handoff, RVW-04, RVW-05, RVW-06, RVW-07, RVW-08]
requires: [scripts/pptx-to-images.sh (Plan 03-01), findings-schema v1.0]
provides: [runReview orchestrator, hand-rolled schema validator, render-fixed.js stub, standalone CLI]
affects: [Plan 03-04 (real renderer replaces stub), Plan 03-05 (integration test), Phase 5 (auto-refine consumes runReview)]
tech-stack:
  added: []
  patterns: [structured-handoff vs standalone mode, lazy-require for annotate (P-07), pinpoint validation errors (RVW-04 mirroring Phase 2 adapter), sibling-of-input + run-dir mirror (D-04)]
key-files:
  created:
    - skills/review/scripts/index.js
    - skills/review/scripts/lib/schema-validator.js
    - skills/review/scripts/render-fixed.js (stub — replaced by Plan 03-04)
    - skills/review/scripts/cli.js
    - tests/review-runtime.test.js
    - tests/review-pipeline.test.js
    - tests/review-schema-emission.test.js
  modified: []
decisions:
  - "runReview signature: ({deckPath, runId, outDir, mode, findings, annotate}) per D-04. Standalone mode prints JSON to stdout; structured-handoff returns the rich object silently."
  - "Schema validator hand-rolled (no ajv) to keep zero net deps; mirrors Phase 2 adapter pinpoint-error format for RVW-04 parity."
  - "P-07 lazy-require: runAnnotate is required INSIDE the if(annotate) branch; tests/review-pipeline.test.js asserts the require-cache stays clean when annotate is false."
  - "_test_setRunAnnotate hook exposes a clean stub seam for integration tests without spawning soffice."
metrics:
  duration: ~25 min
  completed: 2026-04-28
---

# Phase 3 Plan 02: runReview Orchestrator + Schema Validator + CLI Summary

Wave 2 entry point. Lands the `runReview` orchestrator (D-04 contract), the hand-rolled schema validator (RVW-04, mirrors the Phase 2 adapter format), a stub `render-fixed.js` (replaced wholesale by Plan 03-04), the standalone CLI (RVW-07), and the runtime / pipeline / schema-emission test trio. Closes RVW-04 / RVW-05 / RVW-06 / RVW-07 / RVW-08 at the module-surface level; the integration ribbon arrives in Plan 03-05.

## What Shipped

| File                                              | Purpose                                                              |
| ------------------------------------------------- | -------------------------------------------------------------------- |
| `skills/review/scripts/index.js`                  | runReview orchestrator + sibling-output resolver + counts utility    |
| `skills/review/scripts/lib/schema-validator.js`   | findings-schema v1.0 validator with pinpoint Error messages (RVW-04) |
| `skills/review/scripts/render-fixed.js`           | Stub — replaced by Plan 03-04 with the real DECK-VDA renderer        |
| `skills/review/scripts/cli.js`                    | Standalone CLI; pure JSON to stdout, logs to stderr (RVW-07)         |
| `tests/review-runtime.test.js`                    | runReview integration tests (sibling outputs, run-dir mirror, modes) |
| `tests/review-pipeline.test.js`                   | --annotate gating (D-03) + P-07 require-cache cleanliness            |
| `tests/review-schema-emission.test.js`            | 4-tier severity preserved at producer (P-01); rejects pre-collapsed  |

## Verification Results

- `node --test tests/review-runtime.test.js tests/review-pipeline.test.js tests/review-schema-emission.test.js`: all green at commit time.
- Full repo suite at end of plan: 120 pass / 2 skip / 0 fail.
- `bash tools/lint-paths.sh`: green.
- `node tools/assert-pptxgenjs-pin.js`: pin 4.0.1 OK.

## Commits

- `d5e40a9` — feat(03-02): add runReview orchestrator + schema validator + render-fixed stub
- `a00b1a3` — test(03-02): add CLI + runtime + pipeline + schema-emission tests for runReview

## Deviations from Plan

None — plan executed as written.

## Requirements Closed

- RVW-04 (schema validator with pinpoint errors)
- RVW-05 (fixed-MD emission obligation; renderer surface)
- RVW-06 (annotate gating)
- RVW-07 (standalone CLI)
- RVW-08 (structured-handoff mode)

## Self-Check: BACKFILLED

This SUMMARY was authored post-hoc in Plan 03-05 because the original execution session hit a Silver Bullet hook gate before SUMMARY emission. Both commits (`d5e40a9`, `a00b1a3`) are durable on `main` and verified via `git log`.
