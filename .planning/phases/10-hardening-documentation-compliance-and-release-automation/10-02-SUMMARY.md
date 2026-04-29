---
phase: 10
plan: 10-02
slug: doc-scheme-compliance
subsystem: docs + ci
tags: [docs, ci, lint, hardening]
status: complete
completed: 2026-04-29
duration_min: 35
requirements: [HARD-04, HARD-05, HARD-06, HARD-07, HARD-08, HARD-09]
provides:
  - tools/lint-doc-size.js
  - CI Gate 7 (Doc size caps)
  - docs/SECURITY.md
  - docs/CONTRIBUTING.md
  - populated knowledge/2026-04.md (10 entries)
  - populated lessons/2026-04.md (6 entries)
requires:
  - docs/doc-scheme.md (size caps + portability rules)
  - .github/workflows/ci.yml (gate insertion point)
key-files:
  created:
    - tools/lint-doc-size.js
    - tests/tools-lint-doc-size-branches.test.js
    - docs/SECURITY.md
    - docs/CONTRIBUTING.md
  modified:
    - .github/workflows/ci.yml
    - docs/ARCHITECTURE.md
    - docs/TESTING.md
    - docs/CICD.md
    - docs/CHANGELOG.md
    - docs/knowledge/INDEX.md
    - docs/knowledge/2026-04.md
    - docs/lessons/2026-04.md
    - README.md
decisions:
  - Excluded docs/workflows/ + docs/sessions/ from lint-doc-size scope
  - Refactored lint-doc-size.js to export run() so c8 instruments branches
metrics:
  tasks: 5
  commits: 7
  files_touched: 13
---

# Phase 10 Plan 02: Documentation Scheme Compliance Summary

Brought project docs to 100% compliance with `docs/doc-scheme.md`: populated knowledge/lessons with concrete Phase 1-10 history, scaffolded SECURITY.md + CONTRIBUTING.md, and added `tools/lint-doc-size.js` + CI Gate 7 to enforce size caps and INDEX.md orphan-freeness automatically.

## What Shipped

**Task 1 — `tools/lint-doc-size.js` + CI Gate 7 (HARD-07).** New Node CLI that walks `docs/**/*.md`, enforces size caps from `docs/doc-scheme.md` (`docs/*.md ≤ 500`, `docs/knowledge|lessons/*.md ≤ 300`), and with `--orphans` asserts every in-scope doc is referenced from `docs/knowledge/INDEX.md`. Wired into `.github/workflows/ci.yml` as "Gate 7 — Doc size caps" immediately before Gate 6 (coverage). Commits: `9138a67`, `e60a1b5` (refactor).

**Task 2 — `docs/knowledge/2026-04.md` (HARD-05).** 10 concrete entries spanning all 10 phases: JSON contract first, severity collapse at adapter, annotate.js verbatim + SHA pin, soffice race fix, auto-refine convergence rule, c8 100% gate, bats local-only, cookbook variants, polymorphic brief intake, cwd lock. 81 lines. Commit: `489f32c`.

**Task 3 — `docs/lessons/2026-04.md` (HARD-06).** 6 portable lessons (`stack:pptxgenjs`, `practice:tdd-with-mocked-llm`, `practice:auto-refine-loop`, `design:cookbook-variants`, `devops:c8-100-gate`, `design:design-dna-picker`) — body content portable, project-specific paths only in trailing **Reference:** lines. 61 lines. Commit: `9221a80`.

**Task 4 — `docs/SECURITY.md` + `docs/CONTRIBUTING.md` (HARD-09).** SECURITY.md scaffolded with Threat Model / Bundled-software CVE policy / Reporting (`shafqat@sourcevo.com`) / Known limitations. CONTRIBUTING.md scaffolded with Development setup / Test discipline / Locked invariants (cites CLAUDE.md) / Commit + PR conventions / Adding new cookbook variants. Commit: `87e0079`.

**Task 5 — INDEX/ARCHITECTURE/TESTING/CICD/CHANGELOG/README updates (HARD-04, HARD-08).** INDEX.md rewritten to link every in-scope doc; ARCHITECTURE.md gained "## Release pipeline" H2 summarizing the 7-gate chain; TESTING.md gained "Local commands" + "Phase-10 release-automation gates" forward-references; CICD.md rewritten as gate-sequence + local-commands tables; CHANGELOG.md gained the Phase 10 entry. README.md added `npm run release:dry-run` to the Testing block. Commit: `5903d32`.

## Verification

- `node tools/lint-doc-size.js` → `lint-doc-size: OK (11 files clean)`
- `node tools/lint-doc-size.js --orphans` → `lint-doc-size: OK (11 files clean)`
- `node --test tests/tools-lint-doc-size-branches.test.js` → 10/10 pass
- `tools/lint-doc-size.js` c8 coverage: **100/100/100/100** (lines/branches/funcs/stmts)
- 10 knowledge entries (`### ` count = 10), file ≤ 300 lines
- 6 lessons entries with all 6 required category prefixes, body has no project-specific paths
- All HARD-04..HARD-09 acceptance criteria from the plan satisfied

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking issue] Excluded `docs/workflows/` and `docs/sessions/` from lint scope**
- **Found during:** Task 1 (initial repo lint run)
- **Issue:** `docs/workflows/devops-cycle.md` (815 lines) and `docs/workflows/full-dev-cycle.md` (711 lines) — pre-existing GSD/silver-bullet scaffolded reference files — exceeded the 500-line cap. They are not Instadecks-authored and are not covered by `docs/doc-scheme.md`'s size-cap table (which lists `docs/*.md`, `docs/knowledge/*.md`, `docs/lessons/*.md`). `docs/sessions/` is per-session logs, append-only, not indexed.
- **Fix:** `lint-doc-size.js` filters out `docs/(workflows|sessions)/` from both the size-cap walk and the `--orphans` reachability check. Documented in the file header.
- **Files modified:** `tools/lint-doc-size.js`
- **Commit:** `9138a67`

**2. [Rule 1 — Bug] c8 branch coverage gap on tools/lint-doc-size.js**
- **Found during:** Task 5 final verification (`npm test`)
- **Issue:** Initial Task 1 implementation's tests invoked the tool via `spawnSync`, which c8 does not instrument. Branches at `walk()`'s `!existsSync` early-return and the `--orphans` empty-INDEX fallback were uncovered, dropping branch coverage to 99.46% and failing the c8 100% gate (Phase 8 hard rule).
- **Fix:** Refactored `tools/lint-doc-size.js` to export `run/main/parseArgs/walk/capFor`; main() retained behind `if (require.main === module)` guard. Added 5 in-process branch tests (cases f/g/h plus parseArgs + capFor unit tests) on top of the original 5 spawnSync E2E cases. `lint-doc-size.js` now reports 100/100/100/100. No code-path semantics changed.
- **Files modified:** `tools/lint-doc-size.js`, `tests/tools-lint-doc-size-branches.test.js`
- **Commit:** `e60a1b5`

## Deferred Issues

**Out-of-scope c8 gap on `tools/lint-pptxgenjs-enums.js` (line 83).** During Plan 10-02 execution, a parallel agent (working on Plan 10-01 HARD-01) added new branches to `tools/lint-pptxgenjs-enums.js` and `c8 ignore` annotations. After Plan 10-02's edits the overall c8 branch coverage was 99.95% with the residual gap entirely inside `lint-pptxgenjs-enums.js` (one branch). This file is **outside Plan 10-02 scope** (Plan 10-01 owns it). Per `<scope_boundary>` in execute-plan.md, I did not fix it. Owner: Plan 10-01 verifier. Plan 10-02's own files (`tools/lint-doc-size.js`) are at 100/100/100/100.

## TDD Gate Compliance

Task 1 followed the TDD cycle: RED commit `d293dfe` (failing tests) → GREEN commit `9138a67` (implementation + CI wire-up) → REFACTOR commit `e60a1b5` (export internals to close branch coverage gap from spawnSync). Both `test(...)` and `feat(...)` gate commits present in `git log`.

## Self-Check: PASSED

All claimed files exist:
- `tools/lint-doc-size.js` — found
- `tests/tools-lint-doc-size-branches.test.js` — found
- `docs/SECURITY.md` — found
- `docs/CONTRIBUTING.md` — found
- `docs/knowledge/2026-04.md` — found (10 entries verified)
- `docs/lessons/2026-04.md` — found (6 entries verified)

All claimed commits exist (verified via `git log --oneline`):
- `d293dfe` test (RED)
- `9138a67` Task 1 feat
- `489f32c` Task 2 docs
- `9221a80` Task 3 docs
- `87e0079` Task 4 docs
- `5903d32` Task 5 docs
- `e60a1b5` refactor + branch tests
