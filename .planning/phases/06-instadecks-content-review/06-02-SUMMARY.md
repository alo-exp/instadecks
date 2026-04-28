---
phase: 06-instadecks-content-review
plan: 02
subsystem: content-review
tags: [runContentReview, fixed-template-renderer, SKILL.md-body, user-invocable-flip, lazy-annotate]
requires:
  - skills/review/scripts/lib/schema-validator.js (v1.1 from 06-01)
  - skills/content-review/scripts/lib/* (4 code-side checks from 06-01)
  - skills/review/scripts/index.js (architectural analog)
  - skills/review/scripts/render-fixed.js (architectural analog)
provides:
  - runContentReview orchestrator (CRV-09, CRV-11)
  - skills/content-review/scripts/cli.js standalone CLI
  - deterministic 5-section content-review fixed-template renderer (D-04)
  - full /instadecks:content-review SKILL.md body + user-invocable: true (D-07)
  - 4 prompt-side check templates (CRV-02/03/05/08) embedded verbatim
  - skills/content-review/references/content-checks.md narrative reference
affects:
  - skills/content-review/SKILL.md (frontmatter + full body)
tech-stack:
  added: []
  patterns: [lazy-require-gate, sibling-of-input-plus-run-dir-mirror, first-match-wins-rubric, byte-identical-pure-renderer]
key-files:
  created:
    - skills/content-review/scripts/index.js
    - skills/content-review/scripts/cli.js
    - skills/content-review/scripts/render-content-fixed.js
    - skills/content-review/references/content-checks.md
    - tests/content-review-runtime.test.js
    - tests/content-review-render-fixed.test.js
    - tests/content-review-lazy-annotate.test.js
  modified:
    - skills/content-review/SKILL.md
decisions:
  - "Output stems specialized as <deck>.content-review.{json,md,narrative.md} per D-04 (mirrors /review's two-report convention)"
  - "Maturity rubric thesis/resolution heuristic uses systemic pyramid-mece + narrative-arc finding text (no separate flag in schema)"
  - "contentExtract param accepted on runContentReview but currently unused — reserved for v2 /create handoff (D-01); kept in API surface to avoid breaking change later"
  - "Renderer ships full implementation in Task 2 (replaces Task 1 stub); single-plan sequencing avoids cross-plan churn"
metrics:
  duration: ~8 min
  completed: 2026-04-28
  tasks_completed: 3
  commits: 5
  tests_added: 29 (3 new test files)
  files_created: 7
  files_modified: 1
---

# Phase 6 Plan 02: User-Facing Surface Summary

Wave-2 user-facing surface for `/instadecks:content-review`: shipped `runContentReview` orchestrator + CLI + deterministic 5-section fixed-template renderer + full SKILL.md body covering the four prompt-side checks (Pyramid/MECE, narrative-arc, claim/evidence, standalone-readability) and the hybrid agent-orchestration flow. Flipped `user-invocable: false → true` (D-07). Lazy-require gate for `/annotate` verified (P-07 / CRV-11) by both module-load and runtime-call subprocess assertions. Full repo suite 317 pass / 2 skip / 0 fail; `skills/annotate/` git-diff empty (binary-asset invariant ✔).

## Tasks Completed

| # | Task | Commits | Files |
|---|------|---------|-------|
| 1 | runContentReview orchestrator + CLI + lazy-annotate guard (TDD) | `ed312db` (RED) → `1c9f245` (GREEN) | index.js, cli.js, runtime.test.js, lazy-annotate.test.js |
| 2 | render-content-fixed.js deterministic 5-section renderer (TDD) | `3e0cd2b` (RED) → `d39844e` (GREEN) | render-content-fixed.js, render-fixed.test.js |
| 3 | SKILL.md full body + content-checks.md reference + user-invocable flip | `854cca4` | SKILL.md, content-checks.md |

## Verification

- `npm test`: 319 tests, 317 pass, 2 skipped (Tier-2 visual regression — environmental), 0 fail
- `node tools/validate-manifest.js`: Manifest OK
- `tools/lint-paths.sh`: Path lint OK
- `git diff skills/annotate/`: empty (binary-asset invariant ✔)
- SKILL.md activation phrases (D-06): all 6 anchors present (`grep` count 10 across 6 patterns including duplicate occurrences)
- SKILL.md `user-invocable: true`: confirmed (D-07 flip)
- SKILL.md verbatim boundary invariant: present ("DELETE the line — that is `/review`'s domain")
- Lazy-require gate (P-07 / CRV-11): subprocess `require.cache` inspection confirms `skills/annotate/scripts/index.js` not loaded on module require nor on `runContentReview({annotate:false})`

## SKILL.md plugin-dev 10-Item Conformance

| # | Item | Status |
|---|------|--------|
| 1 | frontmatter `name === 'content-review'` (matches dir) | ✅ |
| 2 | `user-invocable: true` (FLIPPED from false) | ✅ |
| 3 | description ≤1024 chars; front-loads 6 D-06 activation anchors | ✅ |
| 4 | allowed-tools scoped: Bash(node/npm/unzip), Read, Write, Glob, Grep | ✅ |
| 5 | body documents 4 prompt-side checks with verbatim templates from 06-RESEARCH | ✅ |
| 6 | locked CLAUDE.md boundary invariant verbatim | ✅ |
| 7 | hybrid agent-orchestration flow documented | ✅ |
| 8 | two-report output (D-04) documented | ✅ |
| 9 | --annotate flag pipeline documented (CRV-11) | ✅ |
| 10 | references/content-checks.md exists | ✅ |

## Requirements Status

| ID | Status | Notes |
|----|--------|-------|
| CRV-01 | ✅ activation surface | 6 D-06 activation anchors front-loaded (final ≥8/10 measurement is Phase 7 DIST-02) |
| CRV-02 | ✅ complete | Pyramid/MECE prompt-side check spec embedded verbatim |
| CRV-03 | ✅ complete | Narrative-arc prompt-side check spec embedded verbatim |
| CRV-05 | ✅ complete | Claim/evidence prompt-side check spec embedded verbatim |
| CRV-08 | ✅ complete | Standalone-readability prompt-side check spec embedded verbatim |
| CRV-09 | ✅ complete | sibling-of-input + run-dir mirror outputs verified by tests |
| CRV-11 | ✅ complete | Lazy-require gate verified by 2 subprocess assertions (module-load + runtime-call) |
| CRV-10 | ⏭ deferred | Boundary regression test moves to Plan 06-03 |

## Deviations from Plan

None — plan executed as written. Renderer Task 2 replaced a deliberate Task 1 stub (documented in stub file header); this is sequencing inside the same plan, not a deviation.

## Threat Model — Mitigation Summary

| Threat ID | Mitigation Landed |
|-----------|-------------------|
| T-06-05 (Tampering — output paths) | `path.resolve(outDir)` invoked before any write; sibling outputs derived via `path.join` from `path.dirname(deckPath)` (mirrors Phase 3) |
| T-06-06 (Spoofing — content findings without check_id) | `validate(findings)` called BEFORE any IO (line ordering enforced in index.js); v1.1 validator from 06-01 throws on missing/invalid check_id |
| T-06-07 (Info disclosure — speaker notes leakage) | accepted per plan (documented behavior; no PII filter in v1) |
| T-06-08 (Path traversal via deckPath through --annotate) | inherited Phase 2 D-07 hardened pptx-to-images.sh; lazy-require ensures path is consumed downstream only after validator passes |

## Self-Check: PASSED

- `skills/content-review/scripts/index.js`: FOUND
- `skills/content-review/scripts/cli.js`: FOUND
- `skills/content-review/scripts/render-content-fixed.js`: FOUND
- `skills/content-review/SKILL.md`: FOUND (frontmatter `user-invocable: true` ✔)
- `skills/content-review/references/content-checks.md`: FOUND
- `tests/content-review-runtime.test.js`: FOUND
- `tests/content-review-render-fixed.test.js`: FOUND
- `tests/content-review-lazy-annotate.test.js`: FOUND
- Commits ed312db, 1c9f245, 3e0cd2b, d39844e, 854cca4: FOUND in `git log`
- npm test: 317 pass / 2 skip / 0 fail
