---
phase: 03-instadecks-review
plan: 01
subsystem: scripts/pptx-to-images.sh
tags: [pptx-pipeline, soffice, pdftoppm, hardening, RVW-09, RVW-10, RVW-11]
requires: [pptxgenjs@4.0.1, system soffice, system pdftoppm]
provides: [scripts/pptx-to-images.sh — PPTX → PDF → per-slide JPG @ 150 DPI]
affects: [Phase 3-02..04 (review pipeline), Phase 4 (content-review), Phase 5 (auto-refine), Phase 6 (create)]
tech-stack:
  added: []
  patterns: [bash set -euo pipefail, umask 0077, EXIT/INT/TERM trap, per-PID UserInstallation, wc -c portable size, head -c magic bytes]
key-files:
  created:
    - scripts/pptx-to-images.sh
    - tools/build-tiny-deck-fixture.js
    - tests/fixtures/tiny-deck.pptx
    - tests/pptx-to-images.test.js
  modified: []
decisions:
  - "Added macOS timeout/gtimeout probe at script start (no-op shim with warning if neither present); preserves literal `timeout 60 soffice` form for static assertions and keeps the script runnable on dev laptops without coreutils. CI images SHOULD provide GNU coreutils for real wall-clock cap."
  - "Cleanup-trap leak test pins CLAUDE_SESSION_ID to a per-test value so /tmp/lo-* leak detection ignores concurrent test files."
metrics:
  duration: ~12 min
  completed: 2026-04-28
---

# Phase 3 Plan 01: scripts/pptx-to-images.sh + smoke fixture Summary

Hardened plugin-level PPTX→PDF→JPG conversion script (D-07) with per-call `-env:UserInstallation` (RVW-09), 60s timeout + 1 retry (RVW-10), post-call existence/size/magic-bytes validation (RVW-10), and EXIT/INT/TERM cleanup trap (RVW-11). Wave 1 serial — unblocks every other Phase 3 plan and Phases 4-6 callers.

## What Shipped

| File                                | Purpose                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------ |
| `scripts/pptx-to-images.sh`         | Plugin-level PPTX → PDF → per-slide JPG @ 150 DPI (D-07; RVW-09/10/11)   |
| `tools/build-tiny-deck-fixture.js`  | Deterministic 1-slide pptxgenjs fixture generator                        |
| `tests/fixtures/tiny-deck.pptx`     | 44.8 KB smoke fixture (< 50 KB cap)                                      |
| `tests/pptx-to-images.test.js`      | 10 subtests: 5 static-content + 2 negative + 1 executable + 1 positive E2E + 1 missing-args |

## Verification Results

- **`node --test tests/pptx-to-images.test.js`**: 10/10 pass on dev host (LibreOffice 26.2.2.2, pdftoppm available).
- **Full suite (`find tests -maxdepth 2 -name '*.test.js' -print0 | xargs -0 node --test`)**: 86 total → **84 pass, 2 pre-existing skips, 0 fail**.
- **`bash tools/lint-paths.sh`**: green.
- **`node tools/assert-pptxgenjs-pin.js`**: pptxgenjs pin OK at 4.0.1.
- **Positive subtest result on dev host**: PASS — soffice produced 22 KB+ PDF with `%PDF` magic; pdftoppm produced `slide-1.jpg` with `FF D8 FF` JPEG magic; cleanup trap fired (no `/tmp/lo-<sessionId>-*` leak).
- **soffice version verified locally**: LibreOffice 26.2.2.2 1f77d10d6938fd34972958f64b2bcfa54f8b1ba5.

## Confirmed Exit-Code Map

| Exit | Meaning                                        | Tested by                                      |
| ---- | ---------------------------------------------- | ---------------------------------------------- |
| 0    | Success — PDF + JPGs produced                  | Positive E2E subtest                           |
| 1    | Invalid args / input not a file                | Two negative subtests (missing args, missing input) |
| 2    | soffice failed twice                           | Static assertion on retry-loop body            |
| 3    | soffice produced empty/missing/non-PDF output  | Static assertions on size + magic-bytes checks |
| 4    | pdftoppm failed twice                          | Static assertion on retry pattern              |
| 5    | pdftoppm produced no JPGs / failed JPEG checks | Static assertion on per-JPG validation loop    |

## Commits

- `444112e` — `test(03-01): add tiny-deck.pptx smoke fixture + generator`
- `df5a4bb` — `feat(03-01): add hardened scripts/pptx-to-images.sh + smoke tests`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] macOS dev hosts lack `timeout` / `gtimeout`**
- **Found during:** Task 2 (manual smoke test of script)
- **Issue:** `which timeout` and `which gtimeout` both empty on dev macOS; verbatim research example would `set -e`-fail at the first soffice call before the cleanup trap could fire (and before any test could exercise the positive path).
- **Fix:** Added a probe at the top of `scripts/pptx-to-images.sh` (before the trap is installed) that defines a bash function named `timeout` ONLY if neither `timeout` nor `gtimeout` is present in PATH. The function either delegates to `gtimeout` or runs the command without a wall-clock cap (with a stderr warning). The literal `timeout 60 soffice ...` invocation form below remains byte-identical, so all five static assertions (RVW-09/10/11 coverage) still match.
- **Files modified:** `scripts/pptx-to-images.sh`
- **Commit:** `df5a4bb`
- **Note:** Production CI images SHOULD install GNU coreutils so the 60s cap is enforced in the wild. The shim is a dev-host-only safety valve and is documented as such inline.

**2. [Rule 1 - Bug] Cleanup-trap leak detection produced false positives under parallel test execution**
- **Found during:** Task 2 (full-suite test run)
- **Issue:** Initial test compared `/tmp/lo-*` directory listing before/after the spawn; concurrent test files (`annotate-runtime.test.js`, etc.) also create `/tmp/lo-<their-session>-*` dirs in parallel, and those would be captured as leaks.
- **Fix:** Pin a unique `CLAUDE_SESSION_ID` per positive subtest invocation and grep ONLY `/tmp/lo-${sessionId}-*` for residue. RVW-11 trap coverage is unchanged — actual cleanup is still verified end-to-end.
- **Files modified:** `tests/pptx-to-images.test.js`
- **Commit:** `df5a4bb`

## Auth Gates

None.

## Known Stubs

None.

## TDD Gate Compliance

Plan type: `execute` (not `tdd`). Standard atomic commits per task. Both commits present in `git log`.

## Self-Check: PASSED

- FOUND: `scripts/pptx-to-images.sh` (executable)
- FOUND: `tools/build-tiny-deck-fixture.js`
- FOUND: `tests/fixtures/tiny-deck.pptx` (44803 bytes, PK magic)
- FOUND: `tests/pptx-to-images.test.js`
- FOUND commit: `444112e`
- FOUND commit: `df5a4bb`
