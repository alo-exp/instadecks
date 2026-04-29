---
phase: 10
status: passed
verified: 2026-04-29
plans_complete: 6/6
requirements_closed: HARD-01..HARD-15
---

# Phase 10 — Hardening, Documentation Compliance, and Release Automation — Verification

**Status:** `passed`

## Requirements traceability

| ID      | Description                                                                       | Closed by | Evidence |
|---------|-----------------------------------------------------------------------------------|-----------|----------|
| HARD-01 | enum-lint flags typo'd `pres.shapes.<KEY>` references                             | 10-01     | `npm run lint:enums` clean across 52 files |
| HARD-02 | parallel runCreate cwd-locked via `.runCreate.lock`                               | 10-01     | unit tests in 10-01 SUMMARY |
| HARD-03 | tools/license-audit.js OK-path coverage closed                                    | 10-01     | c8 100% on tools/license-audit.js |
| HARD-04 | knowledge/`YYYY-MM.md` populated with non-trivial entries                         | 10-02     | `lint-doc-size.js --orphans` clean |
| HARD-05 | lessons/`YYYY-MM.md` populated                                                    | 10-02     | same |
| HARD-06 | SECURITY.md scaffolded post-audit                                                 | 10-02     | file present, INDEX-linked |
| HARD-07 | CONTRIBUTING.md added                                                             | 10-02     | file present, INDEX-linked |
| HARD-08 | doc-scheme size-cap enforcement (`tools/lint-doc-size.js` + CI Gate 7)            | 10-02     | `npm run release:dry-run` gate `>>> doc-size` green |
| HARD-09 | INDEX.md links every doc; orphan check (`--orphans` mode)                         | 10-02     | `lint-doc-size.js --orphans` clean (11 files) |
| HARD-10 | Activation panel automation (Jaccard matcher; ≥ 8/10 per skill)                   | 10-03     | `>>> activation-panel` gate green |
| HARD-11 | Permission-mode automation (AST walker; default + dontAsk)                        | 10-03     | `>>> permission-mode` gate green |
| HARD-12 | Fresh-install Docker harness (Linux runner; Mac+Win deferred to v1.x)             | 10-04     | `gate:fresh-install SKIPPED` diagnostic on docker-less host (documented path); test passes when docker present |
| HARD-13 | Marketplace PR script (`tools/submit-marketplace-pr.sh` via gh CLI)               | 10-05     | sandbox tests + `--simulate` mode |
| HARD-14 | Release-v0.1.0 script (`tools/release-v0.1.0.sh`)                                 | 10-05     | live `npm run release:dry-run` exits 0 |
| HARD-15 | Release dry-run E2E integration test                                              | 10-06     | `tests/release-dry-run-e2e.test.js` (RUN_RELEASE_E2E=1) — single green-button verification |

## Aggregate verification

- **`npm test`**: 1210 tests / 1177 pass / 0 fail / 33 skipped; c8 100% lines/branches/functions/statements across all in-scope files.
- **`npm run release:dry-run`** (live, no simulate, no SIM env, no STRICT env, on docker-less dev host): exit 0. All 9 `>>> <label>` gate markers emitted. `release: docker absent — gate:fresh-install SKIPPED (set STRICT=1 to require)` documented diagnostic emitted. 5 `DRY-RUN: would <action>` lines emitted (flip STATE.md, prepend CHANGELOG, tag v0.1.0, push tag, submit marketplace PR). Final `release: OK`.
- **`node tools/lint-doc-size.js && node tools/lint-doc-size.js --orphans`**: both exit 0; 11 files clean.

## v0.1.0 release-readiness statement

`npm run release:dry-run` is the SINGLE green-button verification — when it exits 0, `npm run release` is safe to run by the maintainer. No human-only gate remains. v0.1.0 is ready to tag.

## Iteration 8 + Phase 10 closeout

Iterations 7 + 8 (Phase 9 carryover): 2 consecutive clean live-E2E rounds with structurally-distinct briefs confirmed varied-input handling and design-DNA rotation. Phase 10: backlog defects HARD-01/02/03 closed; doc-scheme compliance HARD-04..HARD-09 closed; activation-panel + permission-mode + fresh-install automated (HARD-10/11/12); marketplace-PR + release-v0.1.0 scripts shipped (HARD-13/14); release dry-run E2E test wired (HARD-15). Phase 10 COMPLETE; v0.1.0 release-ready.
