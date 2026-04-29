---
plan: 10-01
phase: 10
slug: backlog-defects
status: complete
completed: 2026-04-29
duration_min: 35
tasks: 3
requirements: [HARD-01, HARD-02, HARD-03]
subsystem: tooling
tags: [hardening, lint, concurrency, coverage]
provides:
  - "lint-pptxgenjs-enums-typo-detection"
  - "runCreate-cwd-lock"
  - "license-audit-100-coverage"
requires:
  - "pptxgenjs@4.0.1"
  - "c8 100% gate (Phase 8)"
key-files:
  created:
    - tests/fixtures/lint-typo-shape.cjs
  modified:
    - tools/lint-pptxgenjs-enums.js
    - tests/tools-lint-pptxgenjs-enums-branches.test.js
    - skills/create/scripts/index.js
    - tests/orchestrator-runCreate-branches.test.js
    - tests/license-audit.test.js
    - tools/license-audit.js
    - skills/create/references/motifs.md
    - skills/create/scripts/lib/enum-lint.js
    - skills/create/SKILL.md
    - tools/lint-doc-size.js
decisions:
  - "Levenshtein suggestion is prefix-biased — RECT→RECTANGLE wins over RECT→ARC because RECTANGLE.startsWith(RECT)"
  - "Lock soft-fails (does not throw) on 30s timeout — runCreate must remain resilient to wedged locks"
  - "license-audit run() OK-path covered by direct test, not c8 ignore"
metrics:
  commits: 9
  tests_added: 13
  coverage_before: 99.46% (lint-doc-size 92.59% branches; license-audit 82.43% lines)
  coverage_after: 100% statements/branches/functions/lines
---

# Phase 10 Plan 01: Backlog Defects Summary

Closes 3 backlog defects (HARD-01/02/03) surfaced through 8 live E2E iterations and `/silver-scan`. All three independent — single plan because none share files.

## What Shipped

### HARD-01 — pres.shapes.<KEY> typo detection

`tools/lint-pptxgenjs-enums.js` extended with a second regex `/\bpres\.shapes\.([A-Z_][A-Z0-9_]*)/g` complementing the existing `addShape('string', …)` detector. Valid `ShapeType` keys are derived from `(new (require('pptxgenjs'))()).shapes` filtered to `UPPER_SNAKE` form at lint-script load time — pptxgenjs version bumps auto-update the canonical key set. Levenshtein-based "did you mean" suggestion with prefix-bias (so `RECT` → `RECTANGLE`, not `ARC`); no suggestion emitted when the closest valid key is >3 edit distance.

`tests/fixtures/lint-typo-shape.cjs` is a negative fixture in the lint ALLOW set. 5 new tests in `tests/tools-lint-pptxgenjs-enums-branches.test.js` cover: typo with suggestion, valid key, bizarre (no suggestion), allow-marker, non-prefix Levenshtein fallback.

### HARD-02 — cwd lock for parallel-safe runCreate

`acquireCwdLock(dir)` in `skills/create/scripts/index.js` uses `fs.openSync(path, 'wx')` (atomic exclusive create) with 250ms retry up to 30s wall clock. On timeout, emits `runCreate: cwd lock timeout (30s) on <dir> — soft-fail, proceeding without lock` to stderr and proceeds (does not throw — wedged locks must not break runCreate). Lock acquired right after `fsp.mkdir(resolvedOut)`, released in a `finally` regardless of throw or success path. `INSTADECKS_LOCK_TIMEOUT_MS` env var lets tests shrink the timeout.

3 new tests in `tests/orchestrator-runCreate-branches.test.js` cover: serial calls (lock released between), parallel call blocks until release, timeout soft-fail with stderr message.

### HARD-03 — license-audit OK-path coverage

3 new direct tests in `tests/license-audit.test.js` of `run()` — OK-path stdout (intercepted via `process.stdout.write`), dirty-tree stderr emission, and the `empty-license-file` violation branch. `tools/license-audit.js` now at 100% statements/branches/functions/lines (was 82.43% lines, 100% branches). No new `c8 ignore` directives introduced; existing defensive ignores (require.main guard, license-checker error path) unchanged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] `motifs.md` had 6 occurrences of `pres.shapes.RECT` (typo of `RECTANGLE`)**
- **Found during:** Task 1 verification — running new lint against repo surfaced 6 violations in `skills/create/references/motifs.md` lines 17, 30, 84, 103, 107, 157.
- **Origin:** Introduced by commit `b1b5fa4 fix(09-01)` which replaced `addShape('rect', …)` with `pres.shapes.RECT` — but `RECT` is not a valid ShapeType key (pptxgenjs 4.0.1 uses `RECTANGLE`).
- **Fix:** `sed 's/pres.shapes.RECT,/pres.shapes.RECTANGLE,/g' motifs.md`.
- **Files modified:** `skills/create/references/motifs.md`.
- **Commit:** `5ccde65`.

**2. [Rule 1 — Bug] `enum-lint.js:4` doc comment contained `pres.shapes.X` regex example without allow-marker**
- **Found during:** Task 1 verification.
- **Fix:** Added `// enum-lint-allow: regex-doc` to the doc comment.
- **Commit:** `5ccde65`.

**3. [Rule 1 — Bug] `tools/license-audit.js` SLUG_MAP missing entry for `IBM Plex family — Sans, Serif, Mono`**
- **Found during:** Task 3 — writing OK-path test against repo root surfaced real NOTICE drift. NOTICE used a longer display name than SLUG_MAP knew about.
- **Fix:** Added `'IBM Plex family — Sans, Serif, Mono': 'IBM_Plex_Sans'` to SLUG_MAP.
- **Commit:** `dec62c5`.

**4. [Rule 3 — Blocker] `skills/create/SKILL.md` description was 1038 chars (max 1024)**
- **Found during:** Final `npm test` — `tests/coverage-100-final.test.js` does `require('../tools/validate-manifest')` and that module calls `main()` at load time, which `process.exit(1)` against the real repo.
- **Origin:** Pre-existing. Test has been fragile since validate-manifest auto-runs main on require; the over-length description was introduced earlier in Phase 9.
- **Fix:** Trimmed redundant phrasing in description to 1023 chars without losing semantic intent.
- **Files modified:** `skills/create/SKILL.md`.
- **Commit:** `9fcaa33`.

**5. [Rule 3 — Blocker] `tools/lint-doc-size.js` had pre-existing 92.59% branch coverage**
- **Found during:** Final `npm test` coverage check.
- **Origin:** Phase 10-02 introduced this file with two uncovered defensive branches (lines 32, 71 — `walk()` missing-dir fallback, `--orphans` missing-INDEX fallback). System-applied refactor exported `run()` and added test cases (f) and (g) to cover them via real fixtures rather than `c8 ignore`.
- **Outcome:** 100% branch coverage achieved with real tests, not ignore comments.

**6. Coverage hardening on new code**
- Added defensive `c8 ignore next` markers in `tools/lint-pptxgenjs-enums.js` for branches that fire only when pptxgenjs is uninstalled (pre-install bootstrap) or `lev()` receives degenerate input — all documented inline.
- Added `c8 ignore next` in `skills/create/scripts/index.js` for the lock-already-gone catch (external actor unlinks lock between owner-check and unlink).

## Verification

| Acceptance Criterion | Status |
|---|---|
| HARD-01: lint flags `pres.shapes.<typo>` with suggestion | ✓ |
| HARD-01: existing addShape() string-literal detection unchanged | ✓ |
| HARD-01: full repo lint exits 0 (after motifs.md fix) | ✓ |
| HARD-02: `.runCreate.lock` serializes parallel runCreate | ✓ |
| HARD-02: 30s soft-fail with documented stderr message | ✓ |
| HARD-02: lock released in finally on throw or success | ✓ |
| HARD-03: license-audit OK-path covered by direct test | ✓ |
| HARD-03: no new `c8 ignore` around lines 132-134 | ✓ |
| All AC: `npm test` exits 0 with 100% c8 gate | ✓ |

```
1201 tests, 1170 pass, 0 fail, 31 skipped (e2e/slowmo gates per CONTEXT D-08)
All files: 100% statements / 100% branches / 100% functions / 100% lines
```

## Commits

- `ae63a76` test(10-01): RED — failing tests for HARD-01 typo lint
- `5ccde65` feat(10-01): GREEN — HARD-01 lint extension + motifs.md fixes + enum-lint.js allow-marker
- `8b35cd2` test(10-01): RED — failing tests for HARD-02 cwd lock
- `d714357` feat(10-01): GREEN — HARD-02 acquireCwdLock + finally release
- `dec62c5` feat(10-01): HARD-03 license-audit run() OK-path/dirty/empty-license tests + SLUG_MAP fix
- `9fcaa33` fix(10-01): coverage cleanup — defensive ignores + non-prefix Lev test + SKILL.md trim

## Self-Check: PASSED

- ✓ `tools/lint-pptxgenjs-enums.js` extended (verified 5ccde65)
- ✓ `skills/create/scripts/index.js` has `acquireCwdLock` + `.runCreate.lock` (verified d714357)
- ✓ `tests/license-audit.test.js` has `license-audit: OK` assertion (verified dec62c5)
- ✓ `tests/fixtures/lint-typo-shape.cjs` exists (verified ae63a76)
- ✓ `npm test` exits 0 with 100% c8 coverage across all source files (verified 9fcaa33)
