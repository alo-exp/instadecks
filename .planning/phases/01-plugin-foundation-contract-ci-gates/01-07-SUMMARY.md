---
phase: 01-plugin-foundation-contract-ci-gates
plan: 07
subsystem: fonts
tags: [fonts, ibm-plex-sans, ofl, sessionstart-hook, foundation]
requires:
  - hooks/check-deps.sh (Plan 02 — font stub to replace)
provides:
  - assets/fonts/IBM_Plex_Sans/IBMPlexSans-Regular.ttf
  - assets/fonts/IBM_Plex_Sans/IBMPlexSans-Bold.ttf
  - assets/fonts/IBM_Plex_Sans/IBMPlexSans-Italic.ttf
  - assets/fonts/IBM_Plex_Sans/IBMPlexSans-BoldItalic.ttf
  - assets/fonts/IBM_Plex_Sans/OFL.txt
  - assets/fonts/IBM_Plex_Sans/README.md
  - hooks/check-deps.sh (full D-01 font flow)
affects:
  - Plan 08 (license layout) — copies OFL.txt to licenses/IBM_Plex_Sans/LICENSE
  - Phase 2 annotate.js — relies on Bold weight for charPts table
tech-stack:
  added:
    - IBM Plex Sans 1.1.0 (TTF, SIL OFL 1.1)
  patterns:
    - per-OS font dir resolution via uname -s
    - non-blocking install branch with INFO/WARN aggregation
key-files:
  created:
    - assets/fonts/IBM_Plex_Sans/IBMPlexSans-Regular.ttf
    - assets/fonts/IBM_Plex_Sans/IBMPlexSans-Bold.ttf
    - assets/fonts/IBM_Plex_Sans/IBMPlexSans-Italic.ttf
    - assets/fonts/IBM_Plex_Sans/IBMPlexSans-BoldItalic.ttf
    - assets/fonts/IBM_Plex_Sans/OFL.txt
    - assets/fonts/IBM_Plex_Sans/README.md
  modified:
    - hooks/check-deps.sh
    - tests/check-deps.test.js
decisions:
  - Bundled TTF (not OTF) variants from upstream IBM/plex @ibm/plex-sans@1.1.0 release zip — TTF is the canonical fc-cache target and matches the README/CLAUDE.md "ttf" filenames.
  - fc-list / fc-cache stubbing chosen as the test mock strategy (PATH-prepend + sandbox HOME) so the install branch is exercised on the real bash hook without polluting the user's font directory.
metrics:
  duration: ~6 min
  tasks: 2
  commits: 3
  completed: 2026-04-27
---

# Phase 1 Plan 07: IBM Plex Sans font bundle + auto-install flow Summary

Bundles four IBM Plex Sans TTF weights (Regular, Bold, Italic, BoldItalic) under SIL OFL 1.1 and replaces the Plan-02 font stub in `hooks/check-deps.sh` with the full D-01 detect+install flow (per-OS user font dir, `fc-cache -f`, non-blocking on failure, Windows skip with manual-install warning).

## What was built

**Bundled font files** (under `assets/fonts/IBM_Plex_Sans/`, verbatim from IBM/plex `@ibm/plex-sans@1.1.0` release):

| File                          | Bytes  | Why |
| ----------------------------- | ------ | --- |
| `IBMPlexSans-Regular.ttf`     | 200500 | Default body text |
| `IBMPlexSans-Bold.ttf`        | 200872 | Required by `annotate.js` `charPts` table |
| `IBMPlexSans-Italic.ttf`      | 207920 | Italic emphasis |
| `IBMPlexSans-BoldItalic.ttf`  | 208588 | Bold-italic emphasis |
| `OFL.txt`                     | 4456   | SIL Open Font License 1.1, verbatim upstream LICENSE.txt |
| `README.md`                   | —      | Source attribution + Windows manual-install steps |

**TTF (not OTF) was chosen** — upstream ships both, but TTF is the canonical fc-cache target and matches the filenames the plan and CLAUDE.md spec call out (`*.ttf`). Local `~/Library/Fonts` had OTF copies; we did not source from there.

**`hooks/check-deps.sh` font branch** now does the full D-01 sequence:

```
case uname -s in
  Darwin -> ~/Library/Fonts
  Linux  -> ~/.local/share/fonts
  MINGW/CYGWIN/MSYS, * -> "" (skip)
fc-list | grep -qi "IBM Plex Sans"  ← short-circuit if installed
  ↓ miss
mkdir -p $FONT_DIR && cp $PLUGIN_ROOT/assets/fonts/IBM_Plex_Sans/*.ttf $FONT_DIR/ && fc-cache -f
  success → INFO+=("fonts installed")
  failure → WARN+=("font install failed; see assets/fonts/IBM_Plex_Sans/README.md")
Windows / unknown OS → WARN+=("install IBM Plex Sans manually: see ${CLAUDE_PLUGIN_ROOT}/assets/fonts/IBM_Plex_Sans/README.md")
```

`set -euo pipefail` + `trap 'exit 0' ERR` from Plan 02 are preserved; the entire branch is `||`-defensive so `mkdir`, `cp`, or `fc-cache` failures fall through to the WARN path. The hook still always exits 0.

## Tests

`tests/check-deps.test.js` extended with a sixth subtest:

> *font install branch fires when fc-list reports IBM Plex Sans missing (D-01)*

The test prepends a tmp dir to `$PATH` containing stub `fc-list` (exits 0 with empty output) and stub `fc-cache` (no-op success), points `$HOME` at a sandbox `mkdtemp` dir, and asserts that:

1. The hook still exits 0.
2. Both `IBMPlexSans-Regular.ttf` and `IBMPlexSans-Bold.ttf` were copied into the per-platform sandbox font dir.
3. `stdout` contains the `fonts installed` INFO marker.

Subtest is skipped on non-macOS/non-Linux hosts. Final result on this dev box: **7/7 passing** (5 prior + 1 new font test + the previously-existing PC-04 test). Hook still always exits 0.

## Decisions Made

- **TTF over OTF** — match plan filenames, fc-cache canonical format, and upstream release zip layout (`fonts/complete/ttf/`).
- **Source = release zip, not raw GitHub paths** — IBM/plex restructured master; raw paths now 404 (return GitHub HTML). The signed `@ibm/plex-sans@1.1.0` release asset is the stable source.
- **Test mock strategy** — PATH-prepend stub binaries + sandbox HOME, rather than refactoring the hook to accept injected paths. Keeps the production code path identical to what runs at SessionStart.
- **OFL.txt mode fix** — upstream zip had `LICENSE.txt` at 0755; followed up with a small commit to drop the executable bit (license text shouldn't be executable).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] OFL.txt committed with executable bit**
- **Found during:** Task 1 verification (`ls -la` after first commit)
- **Issue:** Upstream zip `LICENSE.txt` had mode 0755; `cp` preserved it; the file landed in git as 100755 — incorrect for license text.
- **Fix:** `chmod 644` + `git update-index --chmod=-x` + a follow-up cleanup commit.
- **Files modified:** `assets/fonts/IBM_Plex_Sans/OFL.txt`
- **Commit:** `44560df`

No other deviations. Plan executed as written, including the documented Plan-02 stub replacement.

## Commits

| Hash      | Message |
| --------- | ------- |
| `21f6f19` | chore(01-07): bundle IBM Plex Sans (Regular/Bold/Italic/BoldItalic) + OFL |
| `44560df` | chore(01-07): drop executable bit on OFL.txt |
| `b03d0d0` | feat(01-07): replace font stub with full D-01 detect+install flow |

## Self-Check: PASSED

- ✅ `assets/fonts/IBM_Plex_Sans/IBMPlexSans-Regular.ttf` — FOUND
- ✅ `assets/fonts/IBM_Plex_Sans/IBMPlexSans-Bold.ttf` — FOUND
- ✅ `assets/fonts/IBM_Plex_Sans/IBMPlexSans-Italic.ttf` — FOUND
- ✅ `assets/fonts/IBM_Plex_Sans/IBMPlexSans-BoldItalic.ttf` — FOUND
- ✅ `assets/fonts/IBM_Plex_Sans/OFL.txt` — FOUND, contains "Open Font License"
- ✅ `assets/fonts/IBM_Plex_Sans/README.md` — FOUND
- ✅ `hooks/check-deps.sh` contains `IBM Plex Sans` and `fc-cache`
- ✅ Commits `21f6f19`, `44560df`, `b03d0d0` present in `git log`
- ✅ `node --test tests/check-deps.test.js`: 7/7 passing

## EXECUTION COMPLETE
