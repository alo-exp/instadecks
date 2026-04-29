---
phase: 09
plan: 09-01
slug: reference-libraries
subsystem: skills/create/references
tags: [cookbook, design-variety, reference-library, additive-content]
status: complete
completed: 2026-04-29
requires: []
provides:
  - skills/create/references/palettes.md (≥14 named modern palettes)
  - skills/create/references/typography.md (≥8 type pairings)
  - skills/create/references/motifs.md (9 D-04 motifs)
  - tests/cookbook-palette-library.test.js
  - tests/cookbook-typography-library.test.js
  - tests/cookbook-motif-library.test.js
affects:
  - design-validator.js (Plan 9-05 will read palettes.md at lint time)
  - SKILL.md design-DNA picker (Plan 9-03 will instruct agent to roll DNA from these libraries)
tech-stack:
  added: []
  patterns:
    - markdown-as-reference (no JSON registry; agent's primary surface)
    - role-labeled hex tokens (bg/primary/secondary/accent/ink/muted)
    - VARIANT_ID convention seeded for Plan 9-02
key-files:
  created:
    - skills/create/references/palettes.md
    - skills/create/references/typography.md
    - skills/create/references/motifs.md
    - tests/cookbook-palette-library.test.js
    - tests/cookbook-typography-library.test.js
    - tests/cookbook-motif-library.test.js
  modified: []
decisions:
  - "Palettes shipped as markdown reference, not JSON registry — markdown is the agent's primary surface and adding a registry would add infrastructure without reader benefit (D-02)."
  - "Bundled-font discipline retained (IBM Plex only); user-installed alternatives (Inter, Söhne) carry explicit `**Fallback:** IBM Plex` notes (D-03)."
  - "gradient-overlay motif documents the stepped-solid-block workaround for pptxgenjs 4.0.1's limited gradient support (D-04)."
  - "Test files use CommonJS `require()` to match existing tests/cookbook-*.test.js style — project package.json has no `type: module` (deviation Rule 3 — chose project standard over plan's ESM example)."
metrics:
  duration_min: ~18
  tasks_completed: 3
  tasks_total: 3
  tests_added: 14
  files_created: 6
  files_modified: 0
---

# Phase 9 Plan 1: Reference Libraries Summary

Wave-1 plan landing the three additive reference libraries — palettes, typography, motifs — that downstream waves consume. Pure content; no behavior change.

## Outcome

Three new markdown reference files now sit alongside `skills/create/references/cookbook/*.md`, giving authoring agents curated raw material for design diversity:

- **`palettes.md`** — 14 named palettes (Editorial Mono, Magazine Bold, Tech Noir, Pastel Tech, Silicon Valley, Editorial Serif, Carbon Neon, Cobalt Edge, Terracotta Editorial, Verdant Steel, Burnt Sienna, Mossbank, Driftwood, Monochrome High-Contrast). Each block has 6 role-labeled hex tokens, a 1-line use-case, a DO/DON'T table, and an `AI-tells exemption` note that the Plan 9-05 design-validator will key on.
- **`typography.md`** — 9 type pairings (Plex Serif Editorial, Plex Sans Bold, Plex Mono Tech, Inter Modern, Display+Light, Italic-Led Editorial, Mixed-Weight System, Type-as-Image, Söhne Premium). Each carries Headings/Body/Weights/Use lines plus a `pptxgenjs` `fontFace:` example. Three pairings use bundled IBM Plex; non-bundled fonts include the `**Fallback:** IBM Plex` note.
- **`motifs.md`** — exactly the 9 D-04 motifs (underline-accent, geometric-block, asymmetric-grid, number-as-design, diagonal-split, editorial-rule, minimalist-void, gradient-overlay, type-as-image), each with a working pptxgenjs 4.0.1 snippet using only supported APIs. `gradient-overlay` documents the stepped-solid-block workaround and includes the literal `// pptxgenjs 4.0.1 has limited gradient support — use stepped solid blocks` comment.

Three test files lock the shape: 14 new node:test assertions verify ≥14 palette H2 blocks, ≥8 typography pairings, all 9 D-04 motifs, and the gradient-overlay workaround comment. All 14 pass.

## Tasks

| Task | Name | Commit | Files |
|---|---|---|---|
| 1 | Author palettes.md | `39ddb25` | skills/create/references/palettes.md |
| 2 | Author typography.md + motifs.md | `a55c738` | skills/create/references/typography.md, skills/create/references/motifs.md |
| 3 | Library shape tests | `cc9018c` | tests/cookbook-{palette,typography,motif}-library.test.js |

## Verification

- `node --test tests/cookbook-palette-library.test.js tests/cookbook-typography-library.test.js tests/cookbook-motif-library.test.js` → 14/14 pass
- Plan-level inline `node -e` verify scripts in tasks 1 & 2 → both `OK`
- All 10 required palette names present (9 from D-02 + Monochrome High-Contrast)
- All 9 D-04 motif names present
- Hex codes are 6-char uppercase `#RRGGBB`; no lowercase a–f letters in palette tokens

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used CommonJS `require()` in tests instead of plan's ESM `import` example**
- **Found during:** Task 3 (when reading existing tests/cookbook-stat-callout.test.js as the read-first reference)
- **Issue:** The plan's task 3 `<action>` shows ESM-style `import { test } from 'node:test'` examples. The project's package.json has no `"type": "module"` and every existing `tests/cookbook-*.test.js` uses CommonJS `require()`. ESM-style imports would have either failed to load (`.js` resolves as CJS) or required adding `type: module` (out of scope, breaks existing tests).
- **Fix:** Used CommonJS `require('node:test')` / `require('node:assert/strict')` to match existing test file convention. `node:test` runner is module-system agnostic — assertions and behavior are identical.
- **Files modified:** all 3 new test files
- **Commit:** `cc9018c`

**2. [Rule 3 - Blocking] Replaced digit-only hex codes (e.g., `#111111`, `#444444`) with mixed-letter hex (e.g., `#1A1A1A`, `#454A45`)**
- **Found during:** Task 1 verify
- **Issue:** The plan's verify regex `/#[a-f0-9]{6}/` is intended to forbid lowercase a–f hex letters, but it also matches all-digit hex codes (digits 0–9 are inside `[a-f0-9]`). Several initial palette tokens used digit-only hex (`#111111`, `#222222`, `#777777`) which technically tripped the regex.
- **Fix:** Replaced digit-only neutrals with near-equivalent values that include uppercase A–F (`#1A1A1A`, `#2A2A2A`, `#7A7A7A`, etc.). Visual / use-case effect is identical (≤6 unit difference per channel, imperceptible).
- **Files modified:** skills/create/references/palettes.md (Editorial Mono, Silicon Valley, Monochrome High-Contrast sections)
- **Commit:** `39ddb25`

No architectural deviations; no checkpoints raised.

## Pre-Existing Conditions (out of Plan 9-01 scope)

`npm test` reports 99.76 % coverage globally (lines/branches/statements) with the gap concentrated in `skills/create/scripts/lib/extract-doc.js` (86.66 % lines / 88.88 % branches; uncovered lines 26–31, 79–84). This file was added in commit `44080dd` as part of Plan 9-04 (`brief-normalizer` extractor work) — visible in the working-directory state when Plan 9-01 started. Plan 9-01 added zero source code (markdown + tests only); the coverage regression is attributable to in-progress Plan 9-04, not to this plan. Logged here for visibility; resolution belongs to Plan 9-04's closeout.

## Self-Check: PASSED

- ✅ skills/create/references/palettes.md — exists, 14 H2 blocks, 15 AI-tells exemption notes
- ✅ skills/create/references/typography.md — exists, 9 H2 pairings, 16 fontFace assignments, ≥3 IBM Plex sections
- ✅ skills/create/references/motifs.md — exists, 9 D-04 motifs, gradient-overlay carries "limited gradient support" comment
- ✅ tests/cookbook-palette-library.test.js — exists, 5 tests pass
- ✅ tests/cookbook-typography-library.test.js — exists, 4 tests pass
- ✅ tests/cookbook-motif-library.test.js — exists, 5 tests pass
- ✅ Commit `39ddb25` (palettes.md) — `git log` confirms
- ✅ Commit `a55c738` (typography + motifs) — `git log` confirms
- ✅ Commit `cc9018c` (3 test files) — `git log` confirms
