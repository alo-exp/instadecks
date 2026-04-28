---
phase: 08
plan: 08-03
slug: annotate-geometry
status: complete
completed: 2026-04-28
wave: 2
depends_on: [08-01]
requirements: [TEST-02]
tags: [tests, coverage, annotate, geometry]
dependency_graph:
  requires:
    - skills/annotate/scripts/annotate.js (verbatim source-of-truth)
    - tests/fixtures/v8-reference/Annotations_Sample.pptx.normalized.sha256
    - tests/fixtures/v8-reference/samples.js
  provides:
    - tests/helpers/annotate-vm.js (vm-loader for annotate.js internals)
    - tests/annotate-{polygon,charpts,miter,overflow,color,geometry}.test.js
  affects:
    - c8 coverage on skills/annotate/scripts/annotate.js — closed at 100% across all four metrics
tech-stack:
  added: [vm.runInContext (test-only escape hatch)]
  patterns: [stub-pptxgenjs recording-pres for shape-call assertions]
key-files:
  created:
    - tests/helpers/annotate-vm.js
    - tests/annotate-polygon.test.js
    - tests/annotate-charpts.test.js
    - tests/annotate-miter.test.js
    - tests/annotate-overflow.test.js
    - tests/annotate-color.test.js
    - tests/annotate-geometry.test.js
  modified: []
decisions:
  - "annotate.js source NOT modified — vm.runInContext used as test-only escape hatch to extract internal helpers without exporting them (per CONTEXT D-01 reversal allows tests, plan §interfaces specifies vm path)."
  - "Recording-pres pattern: a fake pres/slide that captures every addShape/addText/addImage call lets tests assert shape coordinates, colors, and transparencies analytically without rendering a real PPTX."
  - "Geometry integration test ships in two tiers: Tier A stubs pptxgenjs and exercises main()→buildSlide for c8 attribution under any environment (no soffice); Tier B mirrors annotate-visual-regression.test.js Tier 1 for the normalized-SHA assertion (skip-guarded on soffice)."
metrics:
  duration: ~50 minutes
  tasks_completed: 2
  files_created: 7
  tests_added: 48
---

# Phase 8 Plan 3: annotate.js Geometry Coverage Summary

**One-liner:** Direct unit tests on annotate.js's polygon math, charPts table, miter-join, MAX_SIDE overflow, severity colors, and layout constants drive c8 coverage to **100% statements / 100% branches / 100% functions / 100% lines** with zero source modification.

## What Shipped

**6 new test files + 1 shared helper, 48 passing tests:**

| File | Tests | Coverage Target |
|------|-------|-----------------|
| `tests/helpers/annotate-vm.js` | (helper) | Loads annotate.js into vm context; exposes internals + recording pres factory |
| `tests/annotate-polygon.test.js` | 10 | vector-normalize, perpendicular, polygon-from-line, seg, circleDot |
| `tests/annotate-charpts.test.js` | 10 | charPts (95-char ASCII), wordWrapLineCount, estimateBoxH, COLUMN_PT |
| `tests/annotate-miter.test.js` | 7 | acute/right-angle/obtuse + bevel-fallback + LEFT/RIGHT mirror branches in drawBarArrowMerged |
| `tests/annotate-overflow.test.js` | 7 | MAX_SIDE constant + exactly-MAX_SIDE / MAX_SIDE+1 / +2 / heavy / dual-side / empty annotation paths in buildSlide |
| `tests/annotate-color.test.js` | 12 | C palette, ARROW_TRANS, SEV table, annotBox/annotBoxTB severity-color round-trips, arrowTB short-distance + below-variant branches |
| `tests/annotate-geometry.test.js` | 3 | Tier A in-process main() exercise (no soffice); Tier B normalized-SHA against v8 baseline (soffice-guarded); layout-constants invariant |

## Source-of-Truth Constants (read from annotate.js, NOT invented)

| Constant | Value | Where used |
|----------|-------|------------|
| `MAX_SIDE` | `3` | overflow cap per side in `buildSlide` |
| `ARROW_TRANS` | `50` | merged-arrow CUSTOM_GEOMETRY transparency |
| `C.major` | `'D97706'` | MAJOR severity color (orange) |
| `C.minor` | `'2563EB'` | MINOR severity color (blue) |
| `C.polish` | `'8896A7'` | POLISH severity color (slate) |
| `C.arrow` | `'A0AEC0'` | arrow polygon + endpoint dot fill |
| `C.bodyText` | `'1E2A4A'` | body-text navy |
| `BAR_W` | `0.055` | severity bar width (used as TB-bar discriminator vs mini-slide border) |
| `LINE_H` / `LINE_H_BAR` / `BAR_TOP_OFFSET` | `0.130` / `0.110` / `0.027` | layout constants verified via `estimateBoxH` formula |
| `COLUMN_PT` | `165` | word-wrap simulation column width |

## Top-Level Function Coverage Map (W-2)

`grep -E '^function ' skills/annotate/scripts/annotate.js` enumerates 11 named functions; every one has ≥1 covering test:

| Function | Lines | Covering Test File(s) |
|----------|-------|------------------------|
| `charPts` | 68-83 | annotate-charpts.test.js |
| `wordWrapLineCount` | 123-139 | annotate-charpts.test.js |
| `estimateBoxH` | 142-146 | annotate-charpts.test.js |
| `seg` | 150-160 | annotate-polygon.test.js (LINE shape, flipV, degenerate clamp, default trans) |
| `circleDot` | 162-168 | annotate-polygon.test.js + annotate-color.test.js |
| `drawBarArrowMerged` | 176-275 | annotate-polygon.test.js (LEFT/RIGHT) + annotate-miter.test.js (4 angle classes) + annotate-color.test.js |
| `arrowTB` | 278-293 | annotate-color.test.js (3 branches: vertical+diag, short-distance, below-variant) |
| `annotBox` | 300-337 | annotate-color.test.js (major/minor/polish) |
| `annotBoxTB` | 340-369 | annotate-color.test.js (above-zone bar+label) + annotate-overflow.test.js (counted via BAR_W rect) |
| `buildSlide` | 372-464 | annotate-overflow.test.js (LR/TB layout + overflow); annotate-geometry.test.js (Tier A integration over v8 SAMPLES) |
| `main` | 467-478 | annotate-geometry.test.js (Tier A invokes main with stubbed pptxgenjs) |

No orphans.

## Testing Approach Per Primitive

| Primitive | Approach |
|-----------|----------|
| Polygon math (inside drawBarArrowMerged) | Recording-pres captures CUSTOM_GEOMETRY; assertions on vertex count, bbox dimensions, finiteness, tolerance ≤1e-9 |
| charPts / wordWrapLineCount / estimateBoxH | Direct vm-extracted function calls with synthetic strings; numeric assertions |
| Miter / bevel fallback | drawBarArrowMerged invoked with synthetic 3-point geometries spanning 4 angle classes; non-degenerate bbox + finite vertex assertions |
| MAX_SIDE overflow | buildSlide invoked with synthetic SAMPLES; TB-bar count derived from BAR_W-height rect filter |
| Color/transparency | annotBox / annotBoxTB / drawBarArrowMerged / arrowTB invoked; addText.opts.color and addShape.opts.fill compared against EXPECTED_C / ARROW_TRANS |
| Layout integration | Tier A: stubbed pptxgenjs + real main() over v8 SAMPLES (no soffice). Tier B: real `_runAnnotateWithRawSamples` + normalize-pptx-sha → matches Phase 1 baseline |

## Targeted c8 Coverage Result

```
-------------|---------|----------|---------|---------|-------------------
File         | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------|---------|----------|---------|---------|-------------------
 annotate.js |     100 |      100 |     100 |     100 |
-------------|---------|----------|---------|---------|-------------------
```

`npm run coverage` confirms: **100% / 100% / 100% / 100%.** Zero residual.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Test bug] charPts narrow-letter exhaustive sweep included 'I' and 'J' in the IFJL branch**
- **Found during:** Task 1 (annotate-charpts.test.js author + first run).
- **Issue:** Initial test asserted `charPts('I') === 3.8` because 'I' appears in the IFJL caps regex, but annotate.js's earlier `'iIl|!1j'` branch matches first and returns 2.3 — same for 'J'.
- **Fix:** Restricted the IFJL exhaustive sweep to 'FL' only (the two letters that actually reach that branch). Documented the precedence inline.
- **Files modified:** tests/annotate-charpts.test.js
- **Commit:** 1bb3962

**2. [Rule 1 — Test bug] Initial overflow test counted rect shapes by x-coordinate proximity to mini-slide border**
- **Found during:** Task 2 (annotate-overflow.test.js first run).
- **Issue:** The mini-slide border rect and the above/below severity bar rects sit within ~0.1" of one another on x; my x-distance filter let the mini-slide border slip past, but excluded the actual TB bars too.
- **Fix:** Switched the discriminator to `Math.abs(opts.h - BAR_W) < 1e-9` (TB-bar height = `0.055`; mini-slide border height ≈ `4.486`). Clean, deterministic, source-constant-driven.
- **Files modified:** tests/annotate-overflow.test.js
- **Commit:** bae51fd

### Added Test (Rule 2 — Closure)

**3. [Rule 2 — Branch closure] circleDot default-transparency branch (annotate.js line 165)**
- **Found during:** First targeted c8 probe (99.12% branch on annotate.js, line 165 uncovered).
- **Issue:** circleDot's `trans !== undefined ? trans : 0` ternary's else-side never fired — every caller passes `trans`.
- **Fix:** Added `circleDot primitive — default transparency=0 when trans omitted` test to annotate-polygon.test.js. Branch coverage now 100%.
- **Files modified:** tests/annotate-polygon.test.js
- **Commit:** bae51fd (rolled into Task 2 commit; the test was authored after the targeted-c8 probe in Step E exposed the residual branch — same commit window).

### Tier B Soffice Flake

The geometry Tier B test (normalized-SHA assertion) is **environment-sensitive on the local mac**: a stale soffice instance from a prior test run can lock the LibreOffice user installation directory and time out the convert-to-pdf invocation. Mitigation in this run was `pkill -9 soffice && rm -rf /tmp/lo-s*` between c8 probes. The test passes cleanly when soffice has no stale lock; CI environments use a fresh `-env:UserInstallation=...` per process so flake risk is bounded to local re-runs. Documented as a flag, not a regression.

## Verification

- [x] 6 new test files exist; all pass `node --test`.
- [x] All 48 tests pass green.
- [x] `git diff main -- skills/annotate/scripts/annotate.js` is empty (no source change).
- [x] Targeted c8 (`--include 'skills/annotate/scripts/annotate.js'`) reports 100% / 100% / 100% / 100%.
- [x] `npm run coverage` confirms annotate.js at 100% across all metrics.
- [x] Every top-level named function (W-2 enumeration) has ≥1 covering test (no orphans).
- [x] 2 atomic commits landed: 1bb3962 (Task 1) + bae51fd (Task 2).

## Self-Check: PASSED

- File `tests/helpers/annotate-vm.js`: FOUND.
- File `tests/annotate-polygon.test.js`: FOUND.
- File `tests/annotate-charpts.test.js`: FOUND.
- File `tests/annotate-miter.test.js`: FOUND.
- File `tests/annotate-overflow.test.js`: FOUND.
- File `tests/annotate-color.test.js`: FOUND.
- File `tests/annotate-geometry.test.js`: FOUND.
- Commit 1bb3962: FOUND.
- Commit bae51fd: FOUND.
