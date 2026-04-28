---
phase: 06-instadecks-content-review
plan: 04
subsystem: content-review
tags: [integration-test, lazy-require-invariant, activation-smoke, deterministic, mocked-prompt]
requires:
  - skills/content-review/scripts/index.js (runContentReview from 06-02)
  - skills/content-review/scripts/lib/* (4 code-side checks from 06-01)
  - tests/fixtures/cross-domain-test-deck.pptx (from 06-03)
  - skills/review/scripts/lib/schema-validator.js (v1.1 from 06-01)
provides:
  - end-to-end integration test (extract → 4 code-side checks → merge → runContentReview → stubbed /annotate)
  - tests/fixtures/content-review/integration-prompt-findings.json (deterministic mocked prompt-side fixture covering all 4 prompt-side check_ids)
  - lazy-require invariant verification end-to-end (CRV-11)
  - SKILL.md activation-anchor smoke (CRV-01 lightweight)
affects:
  - none (purely additive — no production code modified)
tech-stack:
  added: []
  patterns: [mocked-prompt-via-committed-json, stubbed-annotate-via-_test_setRunAnnotate, real-code-side-path, byte-identical-rerun-determinism, frontmatter-anchor-smoke]
key-files:
  created:
    - tests/content-review-integration.test.js
    - tests/fixtures/content-review/integration-prompt-findings.json
  modified: []
decisions:
  - "Used existing _test_setRunAnnotate hook (Phase 3 / Plan 06-02 export) instead of require.cache injection — cleaner, deterministic, and avoids brittle path-resolution dance"
  - "Merge function lives in the test (not in production code) — keeps the orchestrator surface unchanged; prompt+code merge is an agent concern per SKILL.md flow"
  - "Systemic prompt-side findings (pyramid-mece, narrative-arc) carry location='deck-systemic' on slide 2 block instead of slideNum:null — schema validator requires positive-integer slideNum at the slide block level (per Plan 06-02 renderer convention; 06-04 plan text said 'slideNum:null' but the renderer + schema use the location-marker pattern)"
  - "Activation-anchor smoke checks anchors as case-insensitive substrings of the description (Phase 7 DIST-02 will measure verbatim ≥8/10 panel activation; this is a sanity gate only)"
metrics:
  duration: ~10 min
  completed: 2026-04-28
  tasks_completed: 2
  commits: 2
  tests_added: 5 subtests (1 new test file)
  files_created: 2
  files_modified: 0
---

# Phase 6 Plan 04: End-to-End Integration Test Summary

Wave-3 closer for `/instadecks:content-review`: shipped the end-to-end integration test that proves the full pipeline composes correctly. Real code-side path (extract + 4 deterministic checks) on the cross-domain fixture deck from Plan 06-03; mocked prompt-side via committed JSON fixture covering all four prompt-side check_ids; stubbed `runAnnotate` via the `_test_setRunAnnotate` test hook (no soffice / pdftoppm / LLM). Asserts schema v1.1 validation, sibling+mirror outputs, lazy-require invariant (CRV-11), deterministic re-run, --annotate branch arg shape, and SKILL.md activation anchors (CRV-01 lightweight). Full repo suite 328 pass / 2 skip / 0 fail.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Pre-recorded prompt-side findings fixture (all 4 check_ids) | `946ad2a` | tests/fixtures/content-review/integration-prompt-findings.json |
| 2 | End-to-end integration test (real code-side + mocked prompt + stubbed annotate) | `bc70152` | tests/content-review-integration.test.js |

## Verification

- `node --test tests/content-review-integration.test.js`: 5/5 pass; runtime <200ms
- `npm test` (full suite): 328 pass / 2 skip / 0 fail (skips are Tier-2 visual regression — environmental, unchanged)
- `bash tools/lint-paths.sh`: OK
- `node tools/validate-manifest.js`: Manifest OK
- `git diff package.json`: empty (pptxgenjs still 4.0.1 pinned exact)
- `git diff skills/`: empty (no production code modified — pure test addition)
- Integration test exercises: extract-content + title-adapter + redundancy + jargon + length-check libs (all live-required); merged-doc validation via schema-validator v1.1; runContentReview round-trip; require.cache lazy-require gate; deterministic re-run (byte-identical MD); SKILL.md frontmatter parse + 6 D-06 anchors

## Requirements Status

| ID | Status | Notes |
|----|--------|-------|
| CRV-01 | ✅ activation surface (lightweight) | All 6 D-06 activation anchors verified present in description; ≤1024 chars; user-invocable: true. Full ≥8/10 panel measurement deferred to Phase 7 DIST-02 |
| CRV-09 | ✅ complete | runContentReview integration verified: sibling+mirror outputs round-trip; deterministic MD on re-run |
| CRV-11 | ✅ complete | Lazy-require gate verified end-to-end (require.cache clean when annotate=false; --annotate branch wires through stub correctly) |

## Phase 6 Success Criteria — Cross-Plan Coverage

| SC | Coverage | Notes |
|----|----------|-------|
| SC#1 (full pipeline + activation smoke) | ✅ | This plan covers integration; activation smoke covers CRV-01 lightweight |
| SC#2 (same schema → /annotate adapter consumes unmodified) | ✅ | Plan 06-01 patched VALID_CATEGORY; Plan 06-03 verified live round-trip; this plan verifies --annotate branch shape |
| SC#3 (boundary preserved bidirectionally via fixtures) | ✅ | Plan 06-03 (CRV-10 test green) |
| SC#4 (standalone v1, pipes into /annotate) | ✅ | Plan 06-02 + this plan's --annotate stubbed branch |

All eleven CRV requirements (CRV-01..CRV-11) green across plans 06-01..06-04.

## Deviations from Plan

**Schema-driven adjustment to systemic-finding placement (Rule 3 — auto-fix blocking issue):**

- **Found during:** Task 1 fixture authoring
- **Issue:** Plan 06-04 text says systemic findings (pyramid-mece, narrative-arc) should carry `slideNum: null`. The locked schema-validator v1.1 requires `slideNum` to be a positive integer on every slide block; null is rejected.
- **Fix:** Followed the Plan 06-02 renderer convention: systemic findings live on a slide-2 block with `location: "deck-systemic"`. The renderer (`render-content-fixed.js`) already keys systemic findings off this marker (lines 61, 71). Net behavior identical to the plan's intent.
- **Files modified:** `tests/fixtures/content-review/integration-prompt-findings.json` (authored to spec)
- **Commit:** `946ad2a`

**Stubbed runAnnotate via existing test hook instead of require.cache injection (Rule 2 — auto-improve):**

- **Found during:** Task 2 implementation
- **Issue:** Plan 06-04 prescribed pre-populating `require.cache` with a stub before `runContentReview`'s lazy require fires. The `runContentReview` orchestrator already exports `_test_setRunAnnotate(fn)` (Phase 3 + Plan 06-02 convention), which is cleaner, deterministic, and avoids brittle path-resolution.
- **Fix:** Used `_test_setRunAnnotate` for the --annotate branch test; require.cache cleanup in afterEach drops any annotate keys that might leak. Net invariant (lazy-require) verified equivalently — when annotate=false, require.cache stays clean (asserted on the standalone subtest); when annotate=true, the stub captures args + resolved value flows through to `result.annotated`.
- **Files modified:** `tests/content-review-integration.test.js`
- **Commit:** `bc70152`

## Threat Model — Mitigation Summary

| Threat ID | Mitigation Landed |
|-----------|-------------------|
| T-06-11 (Tampering — require.cache pollution between tests) | `t.after` cleans up annotate-related cache entries; `_test_setRunAnnotate(null)` restores override; lazy-require assertion runs in standalone subtest where stub never fires |
| T-06-12 (DoS — flaky test from real-PPTX extraction) | Pinned to committed `tests/fixtures/cross-domain-test-deck.pptx` (Plan 06-03); never authored on the fly in CI |

## Self-Check: PASSED

- `tests/content-review-integration.test.js`: FOUND
- `tests/fixtures/content-review/integration-prompt-findings.json`: FOUND
- Commits 946ad2a, bc70152: FOUND in `git log`
- `node --test tests/content-review-integration.test.js`: 5/5 pass
- `npm test`: 328/330 pass (2 environmental skips, 0 fail)
