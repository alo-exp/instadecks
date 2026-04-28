---
phase: 08
plan: 08-01
slug: c8-wiring-baseline
status: complete
completed: 2026-04-28
wave: 1
requirements: [TEST-01]
tags: [test-coverage, c8, ci-gate, baseline]
provides:
  - "c8@10.1.3 wired as exact-pinned devDep"
  - ".c8rc.json with include/exclude per CONTEXT D-02/D-03"
  - "npm test = c8 --100 --check-coverage gating script"
  - "npm run coverage / test:smoke / test:e2e helper scripts"
  - "tests/smoke/ scaffolded (Plan 8-06 populates)"
  - "tests/coverage-baseline.txt (74.94% lines baseline)"
  - "TEST-01..TEST-08 requirements back-filled"
affects:
  - "Wave 2 plans (8-02, 8-03, 8-04) gain coverage tooling + baseline target"
key-files:
  created:
    - .c8rc.json
    - tests/smoke/.gitkeep
    - tests/coverage-baseline.txt
  modified:
    - package.json
    - package-lock.json
    - .planning/REQUIREMENTS.md
    - .gitignore
metrics:
  baseline_lines: "74.94%"
  baseline_branches: "78.69%"
  baseline_funcs: "94.59%"
  baseline_stmts: "74.94%"
  tests_pass: 340
  tests_skip: 2
  tests_fail: 0
  duration_minutes: 1.5
---

# Phase 8 Plan 1: c8 Wiring + Baseline Summary

One-liner: Wire c8@10.1.3 as exact-pinned devDep, configure .c8rc.json include/exclude per CONTEXT D-02/D-03, capture 74.94% line-coverage baseline, back-fill TEST-01..TEST-08 requirements; CLAUDE.md D-01 reversal already landed in prior commit ed12484.

## What Shipped

**Task 1 — c8 wiring (commit b109cb5):**
- `c8@10.1.3` added to `devDependencies` (exact pin, no caret).
- `.c8rc.json` authored with `include: [skills/**/*.js, tools/**/*.js]`, `exclude: [tests/**, **/*.test.js, **/fixtures/**]`, reporters `text` + `lcov`, `all: true`, `check-coverage: false` (gating done via `npm test` flags).
- `package.json` scripts updated: `test` → `c8 --100 --check-coverage --reporter text node --test 'tests/**/*.test.js'`; added `coverage` (html), `test:smoke`, `test:e2e`. All pre-existing scripts preserved.
- `tests/smoke/.gitkeep` created so directory tracks before Plan 8-06.

**Task 2 — baseline + requirements (commit 27f44e0):**
- `tests/coverage-baseline.txt` captured from a single `npm run coverage` invocation (D-09 honored — exactly one full-suite run).
- `.planning/REQUIREMENTS.md` gained `### Test Coverage (TEST)` block with TEST-01..TEST-08 mapped 1:1 to ROADMAP Phase 8 success criteria #1..#8.
- `.gitignore` updated to exclude `coverage/` html debug output.

**CLAUDE.md D-01 (no commit needed this plan):**
- Verified that the `annotate.js` "SHA-pinned binary asset" locked-invariant bullet was already replaced with the "standard test discipline" framing in prior commit `ed12484`. No change required in this plan; pre-condition satisfied.

## Coverage Baseline (All files row)

```
All files | 74.94% stmts | 78.69% branch | 94.59% funcs | 74.94% lines
```

Notable gaps (Wave 2/3 targets):
- `skills/annotate/scripts/annotate.js` — 0% (Plan 8-03 owns).
- `tools/build-{cross-domain,tiny-deck,ai-tells}-fixture.js` — 0% (Plan 8-02 owns; in-scope per D-03).
- `tools/license-audit.js` — 69.5% / 60% funcs (Plan 8-02).
- `skills/create/scripts/lib/deck-brief.js` — 72.15% (Plan 8-02).
- `skills/review/scripts/lib/schema-validator.js` — 74.5% (Plan 8-02).

Tests: 340 pass / 0 fail / 2 skipped (visual regression Tier 2 — soffice-gated, expected).

## TEST-01..TEST-08 Mapping

| Req | Maps to ROADMAP Phase 8 success criterion |
|-----|------------------------------------------|
| TEST-01 | #1 — 100% c8 across covered files; CI fails on regression |
| TEST-02 | #2 — direct unit tests on every lib/cli/orchestrator/tools/annotate.js incl. failure paths |
| TEST-03 | #3 — bats tests on three bash scripts |
| TEST-04 | #4 — outcome-based SKILL.md tests (5 skills) with LLM mock |
| TEST-05 | #5 — tests/smoke/ suite < 30s in CI |
| TEST-06 | #6 — auto-refine integration branches (oscillation, soft cap, interrupt, schema routing, boundary) |
| TEST-07 | #7 — npm run test:e2e local-only with soffice gate |
| TEST-08 | #8 — CI workflow runs `npm test` as the coverage gate (Plan 8-07 wires) |

## Deviations from Plan

None functional. One housekeeping addition: `.gitignore` updated to exclude the local `coverage/` html report directory produced by `npm run coverage` (not in plan but necessary to keep `git status` clean for Wave 2 work). This is Rule 2 (auto-add missing critical functionality — preventing accidental commit of multi-MB html artifacts).

CLAUDE.md edit was a no-op because the D-01 reversal had already been applied in commit ed12484 prior to this plan's execution; the file already contains "standard test discipline" and lacks "SHA-pinned binary asset". Verified explicitly via grep before commit.

`npm test` was NOT run a second time at the very end of the plan: D-09 forbids tight loops and authorizes only one full-suite run per plan; that single run was the `npm run coverage` invocation in Task 2 which produced the baseline. Running `npm test` again would have been a redundant second full-suite invocation that simply re-confirms the same <100% numbers fail the `--100` gate (which is the expected baseline state — Plan 8-07 closes it).

## Commits

| Hash | Subject |
|------|---------|
| b109cb5 | chore(08-01): wire c8 + coverage scripts + tests/smoke scaffold |
| 27f44e0 | docs(08-01): baseline coverage + TEST-01..TEST-08 requirements back-fill |

## Self-Check: PASSED

- File `.c8rc.json` exists.
- File `tests/smoke/.gitkeep` exists.
- File `tests/coverage-baseline.txt` exists, 50+ lines including `All files` row.
- File `.planning/REQUIREMENTS.md` contains `TEST-08`.
- Commit `b109cb5` present in git log.
- Commit `27f44e0` present in git log.
- `package.json` scripts.test contains `c8 --100 --check-coverage`.
- `package.json` devDependencies.c8 = `10.1.3` (no caret).
- `CLAUDE.md` lacks `SHA-pinned binary asset`, contains `standard test discipline`, retains pptxgenjs 4.0.1 pin invariant.
