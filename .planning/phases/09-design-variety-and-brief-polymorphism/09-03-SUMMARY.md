---
phase: 09
plan: 09-03
slug: skill-md-design-dna
status: complete
completed: 2026-04-29
subsystem: skills/create
tags: [agent-surface, design-dna, diversity-audit, cookbook]
requires: [09-01, 09-02]
provides: [DV-05]
affects: [skills/create/SKILL.md, skills/create/references/cookbook.md, tests/cookbook-design-diversity.test.js]
tech_stack:
  added: []
  patterns: [hash-seed deterministic picker, prior-run diversity audit]
key_files:
  created:
    - tests/cookbook-design-diversity.test.js
  modified:
    - skills/create/SKILL.md
    - skills/create/references/cookbook.md
decisions: [D-05 (Phase 9 CONTEXT)]
metrics:
  duration_min: 8
  task_count: 3
  file_count: 3
---

# Phase 09 Plan 09-03: SKILL.md Design DNA Summary

Wires the Phase 9 reference libraries (Plan 9-01) and cookbook variants (Plan 9-02) into the `/instadecks:create` agent surface via a new mandatory "Choose design DNA" sub-step plus a top-level Variant IDs / Reference Libraries index in cookbook.md. Pure documentation/agent-surface change — no script or runtime behavior altered.

## What changed

- **`skills/create/SKILL.md`** — inserted new `### Step 2.5 — Choose design DNA` immediately before Step 3 (render-deck.cjs authoring). The sub-step encodes all 5 D-05 directives:
  1. Roll DNA from the 3 reference libraries (`references/palettes.md`, `references/typography.md`, `references/motifs.md`); copy values verbatim, do not invent.
  2. Hash-seed picker keyed on `audience+tone` for deterministic-per-brief variety.
  3. Diversity audit reads the **last 3 prior runs**' `design-rationale.md` under `.planning/instadecks/<run-id>/` and forbids picking the same palette/typography/motif combination as any of them.
  4. Defaults prohibition: **NEVER** default to verdant-steel + Plex Serif + underline-accent.
  5. Variant ID guidance pointing at the cookbook `{recipe}-[A-E]-{shorthand}` convention.

- **`skills/create/references/cookbook.md`** — added two new top-level H2 sections immediately above the Recipe Index:
  - `## Variant IDs` — explains the convention and provides a per-recipe expected-count table (stat-callout ≥5; 8 others ≥3).
  - `## Reference Libraries` — markdown links to `palettes.md`, `typography.md`, `motifs.md` with 1-line role descriptions.

- **`tests/cookbook-design-diversity.test.js`** — 3 tests asserting (1) the 16 required SKILL.md directive substrings, (2) the 6 required cookbook.md substrings, (3) paranoid line-scoped check that any reintroduction of "default to verdant-steel" carries the NEVER prefix.

## Verification

- All 3 new diversity tests green.
- SKILL.md required-substring check: 16/16 present.
- cookbook.md required-substring check: 6/6 present.
- No deterministic-pipeline scripts altered (per plan scope: `index.js`, `cli.js`, `design-validator.js`, `brief-normalizer.js` untouched).

## Deviations from Plan

None — plan executed exactly as written.

## Deferred / Out-of-Scope Issues

The full `npm test` run currently has 11 pre-existing failures and a coverage drop unrelated to Plan 09-03:
- 9 `recipe X: code-fence parses + uses ENUM constants` failures in cookbook recipe code-fences (Plan 09-02 territory).
- 1 `production tree → exit 0` enum-lint failure tied to those same recipes.
- 1 `create-enum-lint-cli` failure tied to those same recipes.
- Coverage threshold drops are caused by **untracked** in-flight Plan 09-05 files (`skills/create/scripts/lib/design-validator.js` modifications + `tests/lib-design-validator-{palette-aware,diversity-violation}.test.js`).

These are explicitly out of Plan 09-03 scope ("DO NOT touch design-validator.js — Plan 9-05"). Logged here for the verifier and deferred to Plan 09-02 follow-up / Plan 09-05 close-out. **Plan 09-03's own surface (SKILL.md, cookbook.md, new test) is fully green and self-contained.**

## Self-Check: PASSED

- FOUND: skills/create/SKILL.md (modified — design-DNA sub-step present)
- FOUND: skills/create/references/cookbook.md (modified — Variant IDs + Reference Libraries sections present)
- FOUND: tests/cookbook-design-diversity.test.js (created — 3 tests green)
- FOUND commit 60a8a7c (SKILL.md sub-step)
- FOUND commit 52f0323 (cookbook.md sections)
- FOUND commit 9e48ef8 (diversity test)
