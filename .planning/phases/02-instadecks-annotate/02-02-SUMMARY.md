---
phase: 02-instadecks-annotate
plan: 02
subsystem: annotate-adapter
tags: [adapter, validation, severity-collapse, fail-loud]
requires: [findings-schema-v1.0]
provides: [adaptFindings, SEV_MAP]
affects: [skills/annotate]
tech-stack:
  added: []
  patterns: [validate-then-transform, fail-loud-structured-errors, two-pass-traversal]
key-files:
  created:
    - skills/annotate/scripts/adapter.js
    - tests/annotate-adapter.test.js
  modified: []
decisions:
  - Validation traversal completes before filter/collapse traversal (P-09) — protects against silently passing malformed-but-non-genuine findings
  - Severity collapse 4→3 lives only at adapter boundary; reviewers continue emitting full 4-tier JSON
metrics:
  duration: ~10 min
  completed: 2026-04-28
  tasks_completed: 2
  subtests: 16
requirements: [ANNO-05, ANNO-06]
---

# Phase 2 Plan 02: Findings Adapter (Validate → Filter → Collapse) Summary

**One-liner:** Pure-Node adapter that validates findings JSON against schema v1.0, filters `genuine === true`, and collapses 4-tier reviewer severity to the 3-tier SAMPLES contract — fail-loud with structured error messages.

## What Shipped

- **`skills/annotate/scripts/adapter.js`** — exports `adaptFindings(doc)` and `SEV_MAP`. Validates schema_version `/^1\./`, top-level slides array, per-slide `slideNum`/`title`/`findings`, and per-finding all 10 required fields with type/range/allow-set checks. After full validation pass, builds SAMPLES `[{slideNum, title, annotations:[{sev, nx, ny, text}]}]` filtering `genuine === true` and collapsing severity. Slides with zero genuine annotations are omitted entirely.
- **`tests/annotate-adapter.test.js`** — 16 subtests covering schema rejection, missing-field detection (looped over the 10-field list), allow-set violations, numeric range checks, boolean type check, SEV_MAP correctness, genuine filter, slide omission, P-09 ordering (validation before filter; validation before collapse), and the canonical fixture happy path.

## Error Message Format Examples

- Presence: `slides[0].findings[0] missing required field "nx"`
- Type: `slides[0].findings[0].genuine: must be boolean`
- Range: `slides[0].findings[0].nx: must be number in [0,1] (got 1.5)`
- Allow-set: `slides[0].findings[0].severity_reviewer: Blocker not in {Critical,Major,Minor,Nitpick}`
- Schema: `Unsupported findings schema version 2.0. /annotate supports 1.x.`
- Top-level: `findings.slides: must be array`

## Verification Results

- `node --test tests/annotate-adapter.test.js` → **16 pass, 0 fail, 0 skip** (122 ms).
- `find tests -maxdepth 2 -name '*.test.js' -print0 | xargs -0 node --test` → **59 pass, 0 fail, 2 expected skip** (Phase 2 visual-regression Tier 2 + an existing staged skip).
- `bash tools/lint-paths.sh` → **Path lint OK**.
- Happy-path: `tests/fixtures/sample-findings.json` adapts to a 3-slide samples array (slideNum 7, 8, 9), drops the single `genuine: false` Nitpick on slide 8, collapses Critical/Major→`major`, Minor→`minor`.

## Deviations from Plan

None — plan executed exactly as written. SEV_MAP, REQUIRED_FINDING_FIELDS, error formats, and order-of-operations all match the locked spec.

## Commits

- `98229dc` feat(02-02): implement findings adapter with validate-filter-collapse
- `6cee0db` test(02-02): add unit tests for findings adapter

## Parallel-Plan Note

Plan 02-01 runs concurrently and creates `skills/annotate/scripts/samples.js`. No file overlap with this plan's `adapter.js` or `tests/annotate-adapter.test.js`, and no test imports samples.js — execution was conflict-free.

## Self-Check: PASSED

- skills/annotate/scripts/adapter.js: FOUND
- tests/annotate-adapter.test.js: FOUND
- commit 98229dc: FOUND
- commit 6cee0db: FOUND
