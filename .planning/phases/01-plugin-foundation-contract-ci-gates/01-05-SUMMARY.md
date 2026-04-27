---
phase: 01-plugin-foundation-contract-ci-gates
plan: 05
subsystem: ci-gates
tags: [lint, version-pin, ci, hermetic-tests]
requires:
  - .planning/phases/01-plugin-foundation-contract-ci-gates/01-01-SUMMARY.md
provides:
  - tools/lint-paths.sh
  - tools/assert-pptxgenjs-pin.js
  - tests/path-lint.test.js
  - tests/assert-pin.test.js
affects:
  - .github/workflows/ci.yml
tech-stack:
  added: []
  patterns:
    - hermetic-spawnSync-with-temp-git-repo
    - per-commit-hermetic-git-identity-via--c-flags
    - github-actions-error-annotations
key-files:
  created:
    - tools/lint-paths.sh
    - tools/assert-pptxgenjs-pin.js
    - tests/path-lint.test.js
    - tests/assert-pin.test.js
  modified:
    - .github/workflows/ci.yml
decisions:
  - Exclude self-referential files (tools/lint-paths.sh, tests/path-lint.test.js, .silver-bullet.json) from the lint sweep — these files exist to contain the patterns by purpose
  - Replace inline grep step in ci.yml with `bash tools/lint-paths.sh` (interim swap; full CI rewire lands in Plan 09)
metrics:
  duration: ~25min
  completed: 2026-04-27
requirements: [FOUND-02, FOUND-05, FOUND-08]
---

# Phase 1 Plan 05: Hardcoded-path lint + pptxgenjs version-pin assertion Summary

Implemented the two remaining day-1 CI lint gates — `tools/lint-paths.sh` (hardcoded-path lint per D-02) and `tools/assert-pptxgenjs-pin.js` (exact-pin assertion per FOUND-05) — with hermetic `node --test` coverage for both, using per-commit `-c user.email/-c user.name` flags so tests never mutate global git config (PC-12 option a).

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | tools/lint-paths.sh + tests/path-lint.test.js (8 hermetic subtests) | `8a491f2` |
| 1.1 | Self-exclusion fix (lint script + its own test file) | `75368b9` |
| 2 | tools/assert-pptxgenjs-pin.js + tests/assert-pin.test.js (6 subtests) | `0e498b6` |

## Files Created / Modified

**Created:**
- `tools/lint-paths.sh` — `git ls-files`-driven grep for `/Users/`, `~/.claude`, `/home/`, `C:\\\\`. Uses `grep -HInE` (`-H` forces filenames; `-I` skips binaries; `-n` line numbers; `-E` extended regex). Excludes `tests/fixtures/**`, `tests/path-lint.test.js`, `tools/lint-paths.sh`, `.silver-bullet.json`, `*.md`, and lines bearing `# lint-allow:hardcoded-path`. Failures use `::error::` GitHub Actions annotation prefix.
- `tools/assert-pptxgenjs-pin.js` — Reads `package.json` (default `../package.json`, or first CLI arg), exits 0 iff `dependencies.pptxgenjs === "4.0.1"` (string-equality, no semver tolerance). Failure prints `::error::` referencing FOUND-05 invariant.
- `tests/path-lint.test.js` — 8 subtests: clean repo, `/Users/` hit, `~/.claude` hit, `/home/` hit, `tests/fixtures/` exempt, `*.md` exempt, allowlist-token exempt, escaped-`C:\\\\Users` hit. Each test creates a temp git repo and invokes `bash <abs-path>/tools/lint-paths.sh` with `cwd: tmpRepo` (PC-06).
- `tests/assert-pin.test.js` — 6 subtests: `4.0.1` exact passes; `^4.0.1`, `~4.0.1`, `4.0.0`, missing dep, `" 4.0.1 "` (surrounding spaces) all fail.

**Modified:**
- `.github/workflows/ci.yml` — Replaced inline `grep -rE` step with `bash tools/lint-paths.sh`. The inline grep's regex literally contains the forbidden substrings, conflicting with the new lint; the full CI workflow rewire (with all gates wired together) is owned by Plan 09.

## Verification

```
$ bash tools/lint-paths.sh
Path lint OK

$ node tools/assert-pptxgenjs-pin.js
pptxgenjs pin OK: 4.0.1

$ node --test tests/path-lint.test.js tests/assert-pin.test.js
ℹ tests 14
ℹ pass 14
ℹ fail 0
```

All 14 subtests pass; both gates green against the live repo state.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Lint self-references and binary fixture broke initial sweep**

- **Found during:** Task 1 verification (`bash tools/lint-paths.sh` against the live repo)
- **Issue:** Three classes of false-positives blocked `bash tools/lint-paths.sh` from passing on the live repo:
  1. `tests/fixtures/v8-reference/Annotations_Sample.pptx` (binary) matched as `Binary file ... matches` — different output format than text matches, slipped past the prefix-anchored exclude regex.
  2. `.silver-bullet.json` legitimately points at `~/.claude/.silver-bullet/state` (third-party tool config; JSON cannot host inline `#` comments for the allowlist token).
  3. `.github/workflows/ci.yml` line 19 contained the very pattern strings inside an inline `grep` — the line continuation `\` prevented appending an inline allowlist comment.
- **Fix:**
  - Added `-I` flag to grep to skip binary files (covers fixture binaries cleanly).
  - Added `.silver-bullet.json:` to the exclusion regex (analogous to fixtures — by-purpose content; not project-authored source).
  - Replaced the inline grep step in `.github/workflows/ci.yml` with `bash tools/lint-paths.sh` (single source of truth; full CI rewire is Plan 09's scope).
- **Files modified:** `tools/lint-paths.sh`, `.github/workflows/ci.yml`
- **Commit:** `8a491f2`

**2. [Rule 3 — Blocking] Self-referential lint script and its test file**

- **Found during:** Final verification after Task 2 commit
- **Issue:** Once `tools/lint-paths.sh` and `tests/path-lint.test.js` were committed, both became tracked files containing the very substrings the lint searches for (the script's regex literally names the patterns; the test file's negative-case fixtures ARE the patterns). Adding the `# lint-allow:hardcoded-path` token wasn't viable: in the shell script, the offending line ends in `\` (pipeline continuation), so a trailing `#` comment would either break the continuation or sit on a different line than the match.
- **Fix:** Extended the exclusion regex to skip `tools/lint-paths.sh:` and `tests/path-lint.test.js:` (same rationale as `tests/fixtures/` and `.silver-bullet.json`: files whose contents-by-purpose contain the patterns). Header comment block expanded to document each exclusion's rationale.
- **Files modified:** `tools/lint-paths.sh`
- **Commit:** `75368b9`

### Auth Gates

None.

## Known Stubs

None.

## Threat Flags

None — no new security surface introduced. Both threats in the plan's threat register (`T-05-01` lint-allow bypass abuse → `accept`; `T-05-02` lockfile drift → `mitigate` via assert script reading `package.json` source-of-truth) are addressed as designed.

## Self-Check: PASSED

- `tools/lint-paths.sh` exists, executable, exits 0 against live repo
- `tools/assert-pptxgenjs-pin.js` exists, executable, prints `pptxgenjs pin OK: 4.0.1`
- `tests/path-lint.test.js` exists, 8/8 subtests pass
- `tests/assert-pin.test.js` exists, 6/6 subtests pass
- Commits `8a491f2`, `0e498b6`, `75368b9` all present in `git log`
- `.github/workflows/ci.yml` modified to call `bash tools/lint-paths.sh`

## EXECUTION COMPLETE
