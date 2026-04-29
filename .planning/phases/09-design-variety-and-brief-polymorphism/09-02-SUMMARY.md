---
phase: 09
plan: 09-02
subsystem: cookbook
tags: [cookbook, design-variety, variants, DV-01]
requires: []
provides:
  - cookbook-variants-A-through-E
  - variant-id-convention-D-01
affects:
  - skills/create/references/cookbook/title.md
  - skills/create/references/cookbook/section.md
  - skills/create/references/cookbook/2col.md
  - skills/create/references/cookbook/comparison.md
  - skills/create/references/cookbook/data-chart.md
  - skills/create/references/cookbook/data-table.md
  - skills/create/references/cookbook/quote.md
  - skills/create/references/cookbook/closing.md
  - skills/create/references/cookbook/stat-callout.md
tech-stack:
  added: []
  patterns: [pres.shapes.* enums, PALETTE.* tokens, TYPE.* tokens, fit:'shrink' overflow guard]
key-files:
  created:
    - tests/cookbook-variant-coverage.test.js
  modified:
    - skills/create/references/cookbook/title.md (4 variants A-D)
    - skills/create/references/cookbook/section.md (3 variants A-C)
    - skills/create/references/cookbook/2col.md (3 variants A-C)
    - skills/create/references/cookbook/comparison.md (3 variants A-C)
    - skills/create/references/cookbook/data-chart.md (3 variants A-C)
    - skills/create/references/cookbook/data-table.md (3 variants A-C)
    - skills/create/references/cookbook/quote.md (3 variants A-C)
    - skills/create/references/cookbook/closing.md (3 variants A-C)
    - skills/create/references/cookbook/stat-callout.md (5 variants A-E)
decisions:
  - Adopted D-01 variant ID convention `{recipe}-{LETTER}-{shorthand}` literally — verified by per-recipe regex test
  - Test uses negative lookbehind `(?<![a-z])align:` to allow `valign: 'middle'` while flagging bare `align: 'middle'` (verifier regex in plan was buggy; corrected in test)
metrics:
  duration: ~25 min
  completed: 2026-04-29
  tasks: 3/3
  files_modified: 9
  files_created: 1
  total_variant_ids: 30
---

# Phase 09 Plan 09-02: Cookbook Variants Summary

Cookbook surface now offers **30 distinct slide composition variants** across 9 recipes (target: ≥27 / ≥30; achieved 30 — exactly the floor of the D-01 spec) — moving the deck-design DNA from "1 way per slide type" to a real menu the design-DNA picker (Plan 9-03) will consume.

## What was built

| Recipe | Variants | New IDs |
|---|---|---|
| title | 4 | A-centered-classic, B-asymmetric-block, C-oversized-numeral, D-type-as-image |
| section | 3 | A-numbered-rail, B-numbered-anchor, C-full-bleed-color |
| 2col | 3 | A-equal-bullets, B-asymmetric-7030, C-stacked-with-rule |
| comparison | 3 | A-cards, B-versus-split, C-three-column |
| data-chart | 3 | A-clean, B-annotated-line, C-small-multiples |
| data-table | 3 | A-zebra, B-banded-emphasis, C-heatmap-cells |
| quote | 3 | A-brace-italic, B-pull-quote-mega, C-attribution-card |
| closing | 3 | A-cta-arrow, B-question-prompt, C-contact-card |
| stat-callout | **5** | A-centered-hero, B-asymmetric-grid, C-vertical-stack, D-full-bleed-numeral, E-side-by-side |

Each variant block carries: H2 heading, **Variant ID** line, **Visual** description, fenced ```javascript code block (working pptxgenjs 4.0.1, enum-lint clean), **When to use**, **When NOT to use**.

All variants use `PALETTE.*` / `TYPE.*` tokens (no literal hex, no `'Calibri'`), `pres.shapes.*` enums (CRT-15), and end with `slide.addNotes(...)`. Bold-modern motifs introduced: oversized-numeral, type-as-image, asymmetric-block, full-bleed-color, versus-split, pull-quote-mega, KPI-strip, heatmap-cells, small-multiples.

## Tests

`tests/cookbook-variant-coverage.test.js` (5 assertions):
1. Each of 9 recipes has ≥3 distinct variant IDs
2. stat-callout has ≥5
3. Total distinct IDs ≥30
4. No `fontFace: 'Calibri'` literal anywhere in cookbook
5. No bare `align: 'middle'` (negative lookbehind preserves `valign: 'middle'`)

All 5 pass. `npm run lint:enums` shows the cookbook subset clean (a pre-existing motifs.md violation belongs to Plan 9-01 / not mine — verified). `npm run lint:cookbook` resolves all 9 link targets.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Plan verify regex was over-broad**
- **Found during:** Task 1 verify step
- **Issue:** Plan-supplied regex `/align:\s*'middle'/` matches `valign: 'middle'` too (substring overlap). Plan acceptance text says "use `valign`" — confirming valign IS allowed and the regex was intended for bare `align`.
- **Fix:** Test uses negative lookbehind `(?<![a-z])align:\s*'middle'`. The regex correctly distinguishes the prohibited horizontal-axis misuse from the canonical `valign: 'middle'` form already used in the original quote.md.
- **Files affected:** tests/cookbook-variant-coverage.test.js
- **Commit:** 471b557

## Deferred Issues (out of scope for 9-02)

- `c8 100%` global gate currently shows 99.76% lines/branches/statements due to gaps in `skills/create/scripts/lib/extract-doc.js` (lines 26-31, 79-84). These belong to Plan 9-04 (brief-normalizer / extract-doc) which is in-flight on the same wave. Pre-existing in `086660f` (Plan 9-01 sign-off) — not introduced by 9-02. Plan 9-04 will close the gap.

## Commits

- `33b913c` — feat(09-02): extend 5 cookbook recipes (title/section/2col/comparison/quote)
- `5b4188c` — feat(09-02): extend 4 remaining recipes (data-chart/data-table/closing/stat-callout)
- `471b557` — test(09-02): assert cookbook variant coverage (DV-01)

## Self-Check: PASSED

- All 9 recipe files exist with required variant IDs (verified by counting script)
- tests/cookbook-variant-coverage.test.js exists and passes (5/5)
- Commits 33b913c, 5b4188c, 471b557 present in `git log`
- Total distinct variant IDs: 30 (≥30 target met)
- stat-callout: 5 variants (≥5 target met)
- All cookbook files enum-lint clean
