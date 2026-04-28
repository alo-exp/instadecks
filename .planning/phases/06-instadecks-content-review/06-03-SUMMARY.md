---
phase: 06-instadecks-content-review
plan: 03
subsystem: content-review
tags: [boundary-regression, cross-domain-fixture, pptxgenjs-author, schema-v1.1, CRV-10]
requires:
  - skills/review/scripts/lib/schema-validator.js (v1.1 from 06-01)
  - skills/annotate/scripts/adapter.js (VALID_CATEGORY=content; 06-01 patch)
  - pptxgenjs 4.0.1 (locked invariant)
provides:
  - tests/fixtures/cross-domain-test-deck.pptx (committed binary fixture)
  - cross-domain-design-findings.json + cross-domain-content-findings.json fixtures
  - bidirectional content-vs-design boundary regression test (CRV-10)
affects:
  - none (purely additive — no existing files modified)
tech-stack:
  added: []
  patterns: [committed-pptxgenjs-fixture, hand-authored-paired-fixtures, pure-json-in-asserts-out, live-adapter-roundtrip]
key-files:
  created:
    - tools/build-cross-domain-fixture.js
    - tests/fixtures/cross-domain-test-deck.pptx
    - tests/fixtures/cross-domain-design-findings.json
    - tests/fixtures/cross-domain-content-findings.json
    - tests/content-vs-design-boundary.test.js
  modified: []
decisions:
  - "PPTX is committed (not regenerated in CI) — avoids requiring pptxgenjs to author at test time; mirrors tools/build-tiny-deck-fixture.js posture"
  - "Test imports fixtures via require() (synchronous, no fs setup); pure JSON-in / asserts-out for offline-deterministic CI"
  - "Adapter round-trip is live (not mocked) — proves Plan 06-01 VALID_CATEGORY patch holds for hand-authored content findings, not just synthetic ones"
  - "Boundary intersection assertion checks slide BLOCKS present in both docs (not finding presence), since both fixtures place findings on slide 2"
metrics:
  duration: ~10 min
  completed: 2026-04-28
  tasks_completed: 3
  commits: 3
  tests_added: 6 subtests (1 new test file)
  files_created: 5
  files_modified: 0
---

# Phase 6 Plan 03: Cross-Domain Fixture + Boundary Regression Summary

Wave-3 boundary lock for `/instadecks:content-review`: authored a deterministic 4-slide pptxgenjs fixture deck (clean / both-defects / visual-only / content-only), hand-authored paired findings JSONs (visual-only DECK-VDA + content-only 8-check), and shipped a bidirectional regression test that locks the CLAUDE.md content-vs-design invariant into CI as 6 subtests covering all five invariant categories (a-e). Adapter round-trip live (not mocked) — confirms Plan 06-01's VALID_CATEGORY patch handles real hand-authored content findings.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Cross-domain fixture deck builder + committed PPTX | `ecacb8e` | tools/build-cross-domain-fixture.js, tests/fixtures/cross-domain-test-deck.pptx |
| 2 | Paired findings JSON fixtures (design + content) | `1b40d57` | cross-domain-design-findings.json, cross-domain-content-findings.json |
| 3 | Bidirectional boundary regression test | `a20af58` | tests/content-vs-design-boundary.test.js |

## Verification

- `node --test tests/content-vs-design-boundary.test.js`: 6/6 pass, 0 fail
- `node tools/build-cross-domain-fixture.js`: writes 62686-byte PPTX cleanly
- `bash tools/lint-paths.sh`: OK
- `validate(designDoc) && validate(contentDoc)`: both return true (schema v1.1)
- `adaptFindings(designDoc)` + `adaptFindings(contentDoc)`: both produce non-empty SAMPLES with collapsed severities ∈ {major, minor, polish}
- `git diff skills/`: empty (no skill code touched)
- `git diff package.json`: empty (no dep change; pptxgenjs still 4.0.1 pinned exact)
- Extractor round-trip on the committed fixture: all 4 slides parsed cleanly (titles + bullets + slide_type) — fixture is realistic for downstream Plan 06-04

## Requirements Status

| ID | Status | Notes |
|----|--------|-------|
| CRV-10 | ✅ complete | Bidirectional fixture-based regression test green; covers (a) design-no-content, (b) content-no-design, (c) v1.1 validation, (d) cross-set invariants, (e) live adapter round-trip |

## Deviations from Plan

None — plan executed as written. The plan's must_haves.truths invariant (a-e) maps directly onto the 6 subtests (one for each invariant + an explicit (c) validator pass).

## Threat Model — Mitigation Summary

| Threat ID | Mitigation Landed |
|-----------|-------------------|
| T-06-09 (Tampering — boundary test loosened over time) | Test header comment cites CLAUDE.md locked invariant + 06-RESEARCH §D-05 verbatim; assertion messages name CRV-10 + the invariant category they protect |
| T-06-10 (Repudiation — fixture provenance) | Both fixtures tagged via build-cross-domain-fixture.js header pointing to D-05 spec; regenerable from script + spec table in 06-RESEARCH.md |

## Self-Check: PASSED

- `tools/build-cross-domain-fixture.js`: FOUND
- `tests/fixtures/cross-domain-test-deck.pptx`: FOUND (62686 bytes)
- `tests/fixtures/cross-domain-design-findings.json`: FOUND
- `tests/fixtures/cross-domain-content-findings.json`: FOUND
- `tests/content-vs-design-boundary.test.js`: FOUND
- Commits ecacb8e, 1b40d57, a20af58: FOUND in `git log`
