---
phase: 09
plan: 09-05
subsystem: design-validation
tags: [validator, palette-library, invariant-reversal, design-variety]
requires: [09-01]
provides: [palette-aware-validator, diversity-violation-rule, kd-09-recorded]
affects: [skills/create/scripts/lib/design-validator.js, CLAUDE.md, .planning/PROJECT.md, .planning/REQUIREMENTS.md]
tech_stack_added: []
patterns: [module-init-fs-read, hex-registry, render-source-string-validator]
key_files_created:
  - tests/lib-design-validator-palette-aware.test.js
  - tests/lib-design-validator-diversity-violation.test.js
key_files_modified:
  - skills/create/scripts/lib/design-validator.js
  - CLAUDE.md
  - .planning/PROJECT.md
  - .planning/REQUIREMENTS.md
decisions:
  - "Added validateRenderSource(src) as a NEW exported API (string-based render-source rules); preserved validateDesignChoice({...}) legacy structured API unchanged so 909+ existing tests keep passing"
  - "Hex registry parsed from palettes.md `## <Name>` H2 boundaries + `| role | \`#RRGGBB\` |` table rows — no JSON registry, no schema duplication"
  - "Office-blue rule: fires only when #0070C0 is the sole accent (no other RECOGNIZED_HEX present); allows palettes like Cobalt Edge that intentionally pair cobalt with non-Office-blue accents"
  - "diversity-violation threshold ≥3 (not ≥2) per CONTEXT D-07 — 2 same-variant slides is acceptable, 3 is over-use"
metrics:
  duration_min: 8
  date: 2026-04-29
  tasks: 2
  commits: 2
requirements_satisfied: [DV-08, DV-09]
---

# Phase 09 Plan 05: Validator + Invariant Reversal Summary

**One-liner:** Palette-aware design-validator (recognizes 14 curated palettes from `palettes.md`, removes asymmetric-layout false-positive, adds diversity-violation rule for ≥3 same-variant slides) + CLAUDE.md "match v8" prohibition removed + KD-09 recorded in PROJECT.md + DV-01..DV-12 added to REQUIREMENTS.md traceability.

## What Shipped

### Task 1 — Documentation invariant reversal (commit `50d48a3`)
- `CLAUDE.md` "Don't get cute" section: removed "v8 BluePrestige output is the spec — match it"; replaced with KD-09 framing. Added a new locked invariant bullet: "v8 BluePrestige is one valid design DNA among many." annotate.js visual-regression baseline preserved as the SOLE remaining locked-visual-baseline asset.
- `.planning/PROJECT.md`: appended `### KD-09: v8 BluePrestige is one design DNA among many — invariant reversed (2026-04-28)` Key Decision entry.
- `.planning/REQUIREMENTS.md`: added `### Design Variety & Brief Polymorphism (DV)` section with DV-01..DV-12 rows + Phase 9 traceability table row.

### Task 2 — Palette-aware validator (commit `0909062`)
- `skills/create/scripts/lib/design-validator.js`:
  - At module init, reads `skills/create/references/palettes.md` and parses `## <Name>` blocks + `| role | \`#RRGGBB\` |` table rows into:
    - `RECOGNIZED_PALETTES: Map<name, {bg, primary, secondary, accent, ink, muted}>` — 14 palettes
    - `RECOGNIZED_HEX: Set<string>` — every hex from every palette (uppercased, no `#`)
  - New exported function `validateRenderSource(src) → {ok, findings}` operating on a render-deck source string:
    - `default-calibri` — fires when `fontFace: 'Calibri'` literal appears
    - `office-blue` — fires only when `#0070C0` is the only accent and no other `RECOGNIZED_HEX` are present
    - `stock-placeholder` — fires on filenames matching `/(stock|placeholder|sample|untitled|img\d+)/i`
    - `diversity-violation` — fires when ≥3 slides share the same `// VARIANT: <id>` marker (severity `major`, includes slide indices in message + `slides` field)
  - `asymmetric-layout` rule REMOVED entirely (per CONTEXT D-07).
  - Saturated-primary / non-default-blue checks SKIP when offending hex ∈ `RECOGNIZED_HEX`.
  - Legacy `validateDesignChoice({palette, typography, brief, designIdeas})` API + `_internal` exports preserved verbatim — no breakage of existing tests.
- 13 new tests across 2 files: `tests/lib-design-validator-palette-aware.test.js` (9 cases), `tests/lib-design-validator-diversity-violation.test.js` (4 cases). All pass.

## Verification

- `node -e` Task 1 verifier: **OK** (KD-09 + framing + DV-01..DV-12 all present).
- New tests: 13/13 pass.
- `design-validator.js` c8 coverage: **100% lines / 100% branches / 100% functions / 100% statements**.

### Acceptance criteria
- ✅ `grep -c 'diversity-violation' skills/create/scripts/lib/design-validator.js` → 6 (≥1)
- ✅ `grep 'asymmetric-layout' skills/create/scripts/lib/design-validator.js` → 0 (rule removed)
- ✅ `grep 'palettes.md' skills/create/scripts/lib/design-validator.js` → ≥1
- ✅ Both new test files pass
- ✅ design-validator.js at 100% c8

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — API design] Added `validateRenderSource(src)` as a separate export instead of repurposing `validateDesignChoice`**
- **Found during:** Task 2 read-first.
- **Issue:** The plan describes new behavior on render-source strings (`validator(carbonNeonRenderSrc)`). The existing `validateDesignChoice({palette, typography, brief, designIdeas})` takes a structured object — repurposing it would break 5+ existing test files (`create-design-validator.test.js`, `lib-create-design-validator-branches.test.js`, `create-cookbook-recipes.test.js`, `coverage-100-final.test.js`).
- **Fix:** Added `validateRenderSource(src)` as a NEW exported function for the string-based render-source rules. Legacy `validateDesignChoice` API unchanged. Plan acceptance criteria are met under the new symbol.
- **Files modified:** `skills/create/scripts/lib/design-validator.js`
- **Commit:** `0909062`

## Deferred Issues / Tests Needing Attention from 9-06

**Pre-existing failing tests (not in 9-05's scope):**

11 tests fail at full-suite run; all are pre-existing 9-02 cookbook/enum-lint regressions confirmed by stashing 9-05 changes and re-running:

- `create-cookbook-recipes.test.js` — 9 cases: "recipe {title, section, 2col, comparison, data-chart, data-table, stat-callout, quote, closing}: code-fence parses + uses ENUM constants"
- `create-enum-lint-cli.test.js` — 1 case: "create-enum-lint-cli"
- `tools-validate-cookbook.test.js` (or equivalent) — 1 case: "production tree → exit 0 (cookbook + recipes are ENUM-clean)"

These are cookbook-content failures: 9-02 added new variant code blocks but did not pass the strict ENUM-constants check. Out of scope for 9-05 (validator + invariant reversal); flagged for **Plan 9-06's attention** — 9-06 should either (a) fix the cookbook code blocks to use ENUM constants, (b) add a deferred-issues record, or (c) escalate to Rule 4 if the variants need a richer enum-lint exemption.

**Coverage gate impact:** With these failures, full-suite c8 is 99.94% branches (single uncovered branch unrelated to 9-05). 9-05's own surface — `design-validator.js` — is at 100% across all four metrics.

## Self-Check

- [x] `CLAUDE.md` contains "one valid design DNA among many" — verified (count: 2)
- [x] `CLAUDE.md` no longer contains "v8 BluePrestige output is the spec"
- [x] `.planning/PROJECT.md` contains "KD-09" — verified (count: 1)
- [x] `.planning/REQUIREMENTS.md` contains DV-01..DV-12 — verified by node script
- [x] `skills/create/scripts/lib/design-validator.js` exists with `validateRenderSource` + `RECOGNIZED_HEX` + `RECOGNIZED_PALETTES` exports
- [x] `tests/lib-design-validator-palette-aware.test.js` exists (9 cases, all pass)
- [x] `tests/lib-design-validator-diversity-violation.test.js` exists (4 cases, all pass)
- [x] Commit `50d48a3` (Task 1) present in `git log`
- [x] Commit `0909062` (Task 2) present in `git log`

## Self-Check: PASSED
