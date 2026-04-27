---
phase: 02-instadecks-annotate
plan: 01
subsystem: annotate
tags: [annotate, verbatim-asset, sha-pin, fixtures, atomic-commit]
requires: [phase-01-complete, pptxgenjs-4.0.1-pinned, tests/fixtures/v8-reference/]
provides:
  - skills/annotate/scripts/annotate.js (verbatim + 2 patches)
  - skills/annotate/scripts/samples.js (runtime override hook)
  - tests/fixtures/v8-reference/v8s-{01..10}.jpg (JPEG slide fixtures)
  - tests/fixtures/v8-reference/annotate.js.sha256 (POST-PATCH)
  - tests/annotate-integrity.test.js (unsuspended)
affects: [phase-02-plans-02..04]
tech-stack:
  added: []
  patterns: [verbatim-binary-asset, override-export-shim, atomic-commit-P-08]
key-files:
  created:
    - skills/annotate/scripts/annotate.js
    - skills/annotate/scripts/samples.js
    - tests/fixtures/v8-reference/v8s-01.jpg
    - tests/fixtures/v8-reference/v8s-02.jpg
    - tests/fixtures/v8-reference/v8s-03.jpg
    - tests/fixtures/v8-reference/v8s-04.jpg
    - tests/fixtures/v8-reference/v8s-05.jpg
    - tests/fixtures/v8-reference/v8s-06.jpg
    - tests/fixtures/v8-reference/v8s-07.jpg
    - tests/fixtures/v8-reference/v8s-08.jpg
    - tests/fixtures/v8-reference/v8s-09.jpg
    - tests/fixtures/v8-reference/v8s-10.jpg
  modified:
    - tests/fixtures/v8-reference/annotate.js.sha256
    - tests/annotate-integrity.test.js
decisions:
  - Banner comment in annotate.js paraphrases (not quotes verbatim) the pre-patch require line so grep -F acceptance criterion holds; original code is fully removed
metrics:
  duration: ~10 min
  completed: 2026-04-28
  tasks: 2
  files: 14
  commits: 1
---

# Phase 2 Plan 01: Verbatim annotate.js + Samples Shim + JPEG Fixtures Summary

Atomically landed the verbatim v8 BluePrestige `annotate.js` under `skills/annotate/scripts/` with the two authorized patches (require-path resolution via `PPTXGENJS_PATH` env + bareword fallback, and SAMPLES extraction via `require('./samples')`), published the runtime override hook `samples.js`, staged the 10 JPEG slide fixtures from the v5-blue-prestige tree, replaced the PRE-PATCH SHA with the POST-PATCH digest, and unsuspended `tests/annotate-integrity.test.js` — all in a single commit per Pitfall P-08.

## Confirmed Source Line Numbers (per plan <output> requirement)

- **Patch 1 (require-path):** Source line **6** of `/Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/annotate.js` — exactly as predicted by RESEARCH.md.
- **Patch 2 (SAMPLES block):** Source lines **107–150** (`const SAMPLES = [` … matching `];`) — exactly as predicted by RESEARCH.md.
- **Verbatim trailer preserved:** `main().catch(err => { console.error(err); process.exit(1); });` at file end (source line 513) retained byte-for-byte.

## Recorded Post-Patch SHA

```
186d881bbc200d695266ca5588a49c1a1a1dfc4ce70cc19563c1cfaf1050d545  annotate.js
```

Recorded to `tests/fixtures/v8-reference/annotate.js.sha256` with `POST-PATCH` banner comment. Verified by `node --test tests/annotate-integrity.test.js` → pass 1, skipped 0.

(An earlier digest `32f28eb9…` was computed from a banner that quoted the pre-patch require expression verbatim. To honour the plan acceptance criterion "annotate.js does NOT contain the original `require(path.join(__dirname, '..', 'node_modules', 'pptxgenjs'))` substring (grep -F returns no match)", the banner was reworded to paraphrase the pre-patch line. SHA was recomputed to `186d881b…` and the pin file updated within the same uncommitted working tree before the atomic commit landed — CI never observed the intermediate state.)

## JPEG Fixture Verification

All ten files at `tests/fixtures/v8-reference/v8s-{01..10}.jpg` confirmed via `file <each>` to be `JPEG image data` (NOT PNG renamed). Filenames are exact-lowercase `^v8s-\d{2}\.jpg$`.

## Atomic Commit

Single commit `e34ec30` lands all 14 files together (10 JPGs + annotate.js + samples.js + .sha256 + integrity test). `git log -1 --name-only` confirms the full set; CI cannot observe a half-state.

## Verification Results

| Gate | Command | Result |
|------|---------|--------|
| Integrity test | `node --test tests/annotate-integrity.test.js` | pass 1, skipped 0 |
| Full suite | `find tests -maxdepth 2 -name '*.test.js' -print0 \| xargs -0 node --test` | 61 tests, 60 pass, 1 skip (Tier 2 visual regression — Phase 2 later plans), 0 fail |
| Path lint | `bash tools/lint-paths.sh` | OK |
| pptxgenjs pin | `node tools/assert-pptxgenjs-pin.js` | OK: 4.0.1 |

## Acceptance Criteria — All Met

- annotate.js: exactly one `require(process.env.PPTXGENJS_PATH || 'pptxgenjs')` code line; exactly one `const { SAMPLES } = require('./samples');` code line; original sibling-node_modules require substring absent (grep -F → no match); inline `const SAMPLES = [` block absent; trailing `main().catch(...)` self-invocation retained verbatim.
- samples.js: exports getter-bound `SAMPLES` and `setSamples` setter.
- annotate.js.sha256: first non-comment digest equals `shasum -a 256 skills/annotate/scripts/annotate.js`.
- annotate-integrity.test.js: `skip:` option removed; test runs and passes.
- All 14 file changes in one git commit.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Specification conflict resolution] Banner reworded to satisfy acceptance criterion**

- **Found during:** Task 2 acceptance verification.
- **Issue:** The plan's prescribed banner block (Step A.2) literally contained the substring `` `require(path.join(__dirname, '..', 'node_modules', 'pptxgenjs'))` `` (inside backticks as documentation). The acceptance criterion required `grep -F` to return no match for that exact substring anywhere in the file. The two parts of the plan conflicted.
- **Fix:** Rewrote the banner to describe the original require by name ("the original sibling-node_modules pptxgenjs require at line 6") rather than quoting it verbatim. Intent of the banner (document both authorized modifications) preserved; both required substrings (the new patched code lines) remain present in code; the forbidden substring is now absent file-wide.
- **Files modified:** `skills/annotate/scripts/annotate.js` (banner only; geometry/code untouched), `tests/fixtures/v8-reference/annotate.js.sha256` (digest recomputed: `186d881b…`).
- **Commit:** `e34ec30` (same atomic commit; intermediate `32f28eb9…` digest never reached git).

No other deviations. Source line numbers matched RESEARCH.md predictions exactly (line 6 + lines 107–150). All ten JPGs were present at the expected source paths (no O-2 escalation needed).

## Self-Check: PASSED

- `[ -f skills/annotate/scripts/annotate.js ]` → FOUND
- `[ -f skills/annotate/scripts/samples.js ]` → FOUND
- `[ -f tests/fixtures/v8-reference/annotate.js.sha256 ]` → FOUND
- `[ -f tests/fixtures/v8-reference/v8s-01.jpg ]` … `v8s-10.jpg` → FOUND (×10)
- `git log --oneline | grep e34ec30` → FOUND
