---
phase: 06-instadecks-content-review
plan: 01
subsystem: content-review
tags: [schema-v1.1, content-checks, jszip-extract, additive-non-breaking]
requires:
  - skills/review/scripts/lib/schema-validator.js (v1.0)
  - skills/review/scripts/lib/read-deck-xml.js (loadSlides)
  - skills/create/scripts/lib/title-check.js (validateTitle — REUSED verbatim)
  - skills/annotate/scripts/adapter.js (VALID_CATEGORY)
provides:
  - findings-schema v1.1 (additive: category=content + optional check_id)
  - 4 deterministic content checks (action-title/redundancy/jargon/length)
  - jszip-based PPTX text extractor preserving bullet hierarchy
  - canonical sample-extract.json fixture for downstream plans
affects:
  - skills/review/references/findings-schema.md (header bump 1.0→1.1)
  - skills/review/scripts/lib/schema-validator.js (extended; back-compat preserved)
  - skills/annotate/scripts/adapter.js (one-line VALID_CATEGORY patch — Pitfall 1 fixed)
tech-stack:
  added: []
  patterns: [hand-rolled-bag-of-words-cosine, regex-XML-paragraph-grouping, locked-validator-extension]
key-files:
  created:
    - skills/content-review/scripts/lib/extract-content.js
    - skills/content-review/scripts/lib/title-adapter.js
    - skills/content-review/scripts/lib/redundancy.js
    - skills/content-review/scripts/lib/jargon.js
    - skills/content-review/scripts/lib/length-check.js
    - tests/findings-schema-v11.test.js
    - tests/annotate-adapter-content-category.test.js
    - tests/content-review-extract.test.js
    - tests/content-review-checks.test.js
    - tests/fixtures/content-review/sample-extract.json
  modified:
    - skills/review/references/findings-schema.md
    - skills/review/scripts/lib/schema-validator.js
    - skills/annotate/scripts/adapter.js
decisions:
  - "Schema bump 1.0→1.1 is fully additive: existing v1.0 fixtures + Phase 3/5 tests remain green"
  - "VALID_CATEGORY in adapter.js patched in lockstep with validator (Pitfall 1 prevention)"
  - "validate() now also rejects unknown check_id when explicitly provided on non-content findings (defensive)"
  - "Extractor reuses Phase 3 loadSlides — does NOT extend the path filter; T-06-01 mitigation inherited"
  - "Hand-rolled cosine (no NLP dep) — matches title-check.js precedent; zero new npm deps"
metrics:
  duration: ~25 min
  completed: 2026-04-28
  tasks_completed: 3
  commits: 3
  tests_added: 26 (4 new test files)
  files_created: 10
  files_modified: 3
---

# Phase 6 Plan 01: Schema v1.1 + Code-Side Content Checks Foundation Summary

Wave-1 foundation for `/instadecks:content-review`: bumped the locked findings schema 1.0→1.1 additively (added `category:"content"` + optional `check_id` enforced iff content), patched the `/annotate` adapter in lockstep (Pitfall 1), shipped the four deterministic content checks (action-title/redundancy/jargon/length) plus the jszip-based PPTX text extractor, all with zero new npm deps. 26 new subtests green; full repo suite 288 pass / 2 skip / 0 fail; `title-check.js` and `annotate.js` untouched on disk (locked invariants verified).

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Schema bump v1.1 + validator + adapter patch | `81172ba` | findings-schema.md, schema-validator.js, adapter.js, +2 tests |
| 2 | PPTX text extractor (extract-content.js) | `fdfbeca` | extract-content.js, content-review-extract.test.js, sample-extract.json |
| 3 | Four code-side content checks | `da92891` | title-adapter.js, redundancy.js, jargon.js, length-check.js, content-review-checks.test.js |

## Verification

- `node --test`: 290 tests, 288 pass, 2 skipped (Tier-2 visual regression — environmental), 0 fail
- `git diff skills/create/scripts/lib/title-check.js`: empty (REUSE invariant ✔)
- `git diff skills/annotate/scripts/annotate.js`: empty (binary-asset invariant ✔)
- `tools/lint-paths.sh`: OK (no hardcoded absolute paths)
- `package.json` / `package-lock.json`: unchanged (zero new deps ✔)
- Phase 1/3/5 back-compat: `tests/findings-schema.test.js`, `tests/review-schema-emission.test.js` still green against patched validator

## Requirements Status

| ID | Status | Notes |
|----|--------|-------|
| CRV-04 | ✅ complete | action-title check via title-adapter.js wrapping validateTitle |
| CRV-06 | ✅ complete | redundancy.js cosine ≥0.85 with whitelist + slide_type skip |
| CRV-07 | ✅ complete | jargon.js + length-check.js (audience-fit) |
| CRV-09 | ✅ complete | schema v1.1 + adapter accept content; SEV_MAP unchanged |

## Deviations from Plan

**Defensive validator check beyond spec (Rule 2 — auto-add):**

- **Found during:** Task 1 implementation
- **Issue:** Schema spec says `check_id` is required iff `category==='content'` but is otherwise undefined for other categories. Allowing arbitrary string values for `check_id` on non-content findings would silently let typos like `check_id:"redundancy"` on a `category:"defect"` finding flow through. This is the exact spoofing surface T-06-04 calls out.
- **Fix:** When `check_id` is explicitly provided on a non-content finding, validator now also enforces it against `VALID_CHECK_IDS`. Findings without the field on non-content categories pass (back-compat preserved — existing v1.0 fixture has none).
- **Files modified:** `skills/review/scripts/lib/schema-validator.js`
- **Commit:** `81172ba`

**Test threshold calibration (clarification, not deviation):**

- The plan's `behavior` for redundancy lists "9/10 shared → Major (cos≥0.95)" but the actual cosine of two 10-token vectors sharing 9 tokens is exactly 0.9. Tests were updated to reflect mathematical reality: identical token sets (cos=1.0) → Major; 9/10 shared (cos=0.9) → Minor; 5/10 shared (cos=0.5) → no finding. Severity calibration in the lib (≥0.95 Major, [0.85,0.95) Minor, <0.85 skip) matches the plan spec exactly — only test fixtures changed to land in the correct buckets.

## Threat Model — Mitigation Summary

| Threat ID | Mitigation Landed |
|-----------|-------------------|
| T-06-01 (path traversal in PPTX zip) | Inherited Phase 3 `loadSlides` path filter `^ppt/slides/slide[0-9]+\.xml$`; not extended |
| T-06-02 (zip bomb) | Accepted (developer-controlled input; same posture as Phase 3) |
| T-06-03 (adapter/validator enum drift) | `tests/annotate-adapter-content-category.test.js` asserts both accept content category in lockstep |
| T-06-04 (check_id spoofing) | Validator extended to also reject unknown check_id when explicitly set on non-content findings (deviation, see above) |

## Self-Check: PASSED

- `skills/content-review/scripts/lib/extract-content.js`: FOUND
- `skills/content-review/scripts/lib/title-adapter.js`: FOUND
- `skills/content-review/scripts/lib/redundancy.js`: FOUND
- `skills/content-review/scripts/lib/jargon.js`: FOUND
- `skills/content-review/scripts/lib/length-check.js`: FOUND
- `tests/findings-schema-v11.test.js`: FOUND
- `tests/annotate-adapter-content-category.test.js`: FOUND
- `tests/content-review-extract.test.js`: FOUND
- `tests/content-review-checks.test.js`: FOUND
- `tests/fixtures/content-review/sample-extract.json`: FOUND
- Schema header reads "Schema version: 1.1": FOUND
- Commits 81172ba, fdfbeca, da92891: FOUND in `git log`
