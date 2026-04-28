---
phase: 04-instadecks-create-scaffold
plan: 02
status: complete
completed: 2026-04-28
requirements: [CRT-02, CRT-03, CRT-04, CRT-05, CRT-15]
artifacts:
  created:
    - skills/create/references/cookbook.md
    - skills/create/references/cookbook/title.md
    - skills/create/references/cookbook/section.md
    - skills/create/references/cookbook/2col.md
    - skills/create/references/cookbook/comparison.md
    - skills/create/references/cookbook/data-chart.md
    - skills/create/references/cookbook/data-table.md
    - skills/create/references/cookbook/stat-callout.md
    - skills/create/references/cookbook/quote.md
    - skills/create/references/cookbook/closing.md
    - skills/create/references/design-ideas.md
    - skills/create/references/design-ideas.json
    - tests/create-cookbook-recipes.test.js
commits:
  - 8ad76eb: docs(04-02) cookbook master + 9 recipes
  - d6fe45f: docs(04-02) design-ideas (md+json) + cookbook test
license_compliance: "Q-1 author-original — zero verbatim Anthropic content; sniff-grep gate green"
---

# Phase 4 Plan 02: /instadecks:create cookbook + design-ideas — SUMMARY

Reference content layer for `/instadecks:create` shipped: 9 per-slide-type cookbook recipes + master index, plus author-original `design-ideas.md`/`design-ideas.json` (10 palettes, 8 typography pairs, 10 anti-patterns) — all gated by a 12-assertion test that lints every JS code-fence through `lib/enum-lint.js` and round-trips every (palette × typography_pair) cross-product through `lib/design-validator.js`.

## File Inventory

| File | Lines | Role |
|------|-------|------|
| `skills/create/references/cookbook.md` | 78 | Master index + setup boilerplate + global DO/DON'T |
| `skills/create/references/cookbook/title.md` | 41 | Recipe 1 — title slide |
| `skills/create/references/cookbook/section.md` | 41 | Recipe 2 — section divider |
| `skills/create/references/cookbook/2col.md` | 56 | Recipe 3 — two-column |
| `skills/create/references/cookbook/comparison.md` | 56 | Recipe 4 — comparison cards |
| `skills/create/references/cookbook/data-chart.md` | 44 | Recipe 5 — chart |
| `skills/create/references/cookbook/data-table.md` | 49 | Recipe 6 — table |
| `skills/create/references/cookbook/stat-callout.md` | 47 | Recipe 7 — stat callout |
| `skills/create/references/cookbook/quote.md` | 43 | Recipe 8 — quote |
| `skills/create/references/cookbook/closing.md` | 47 | Recipe 9 — closing |
| `skills/create/references/design-ideas.md` | 75 | 10 palettes / 8 typography / 10 anti-patterns (author-original) |
| `skills/create/references/design-ideas.json` | 25 | Machine-readable companion (10 palettes + 8 pairs) |
| `tests/create-cookbook-recipes.test.js` | 100 | 12-assertion gate |

## Recipe → Function → ENUM Constants

| # | Slug | Render fn | ENUMs used |
|---|------|-----------|------------|
| 1 | title | `renderTitle` | (none — text only; background color) |
| 2 | section | `renderSection` | `pres.shapes.LINE` |
| 3 | 2col | `render2Col` | (none — text + bullets only) |
| 4 | comparison | `renderComparison` | `pres.shapes.RECTANGLE` (×2 per card) |
| 5 | data-chart | `renderDataChart` | `pres.charts[chartType]` (BAR/LINE/PIE/DOUGHNUT) |
| 6 | data-table | `renderDataTable` | (none — `slide.addTable`) |
| 7 | stat-callout | `renderStatCallout` | (none — text only) |
| 8 | quote | `renderQuote` | `pres.shapes.LEFT_BRACE` |
| 9 | closing | `renderClosing` | `pres.shapes.RIGHT_ARROW` |

All ENUM accesses are `pres.shapes.X` / `pres.charts[X]` — zero string literals (CRT-15 enforced by `lib/enum-lint.lintCjs()` in the test gate).

## design-ideas.json Inventory

**10 palettes** (all author-original names + author-original hex values; no Anthropic names): Indigo Dawn, Slate Forest, Crimson Atelier, Plex Mono Noir, Verdant Steel, Saffron Brief, Glacier Ridge, Copper Field, Cobalt Plex, Cerulean Plex.

**8 typography pairs** (IBM Plex Sans body anchor): Inter+Plex, Plex Serif+Plex, Cambria+Plex, Calibri+Plex, Plex+Plex, Plex Mono+Plex, Georgia+Plex, Helvetica Neue+Plex.

**10 anti-patterns**: layout repetition (R18), body-text centering, insufficient size contrast, default-blue, mixed paragraph spacing, partial styling, text-only past slide 3, padding violations, low-contrast palettes, accent-line-under-title (R18).

## Test Results

```
node --test tests/create-cookbook-recipes.test.js
ℹ tests 12
ℹ pass 12
ℹ fail 0
ℹ duration_ms ~140
```

12 assertions:
- 9 × per-recipe: code-fence parses, passes `lintCjs`, instantiates a callable `render<Type>` against mock `pres` (Proxy ENUMs).
- 1 × design-ideas.json round-trip: 10 × 8 = 80 cross-product validations, all `r.ok === true`.
- 1 × cookbook hygiene: every recipe md has `## DO / DON'T` heading + `addNotes` call.
- 1 × palette-name parity: every JSON palette name appears as `**<name>**` in `design-ideas.md`.

## Deviations from Plan

**[Rule 3 — Blocking issue] Adjusted Task-1 verify scope**

- **Found during:** Task 1 verify (`! grep -RE "addShape\s*\(\s*['\"]" skills/create/references/cookbook/`).
- **Issue:** The plan's per-task verify command is too coarse — it scans the entire markdown body, but the recipe DO/DON'T tables intentionally include `addShape('rect', …)` etc. as **negative examples** (the plan's own acceptance criteria require an "ENUM vs string" contrast row). The intent of CRT-15 is that the **JS code body** uses ENUMs only, not the anti-pattern table cells.
- **Fix:** Treated the JS code-fence as the canonical surface. Verified all 9 code-fences through `lib/enum-lint.lintCjs()` directly (the same gate Task 2's test runs in CI). Result: every recipe code-fence passes lint with zero string-literal `addShape`. This matches the plan's `key_links.pattern: "addShape\\s*\\(\\s*pres\\.shapes\\."` — code body is ENUM, anti-pattern tables are documentation.
- **Files modified:** none (the ambiguity was in the verify command, not the artifacts).
- **Commit:** N/A — fix was procedural.

No other deviations. Plan executed as written.

## Auth Gates

None.

## License Compliance (Q-1)

- `design-ideas.md` is 100% author-original — original palette names ("Indigo Dawn", "Slate Forest", "Crimson Atelier", "Plex Mono Noir", "Verdant Steel", "Saffron Brief", "Glacier Ridge", "Copper Field", "Cobalt Plex", "Cerulean Plex"), original hex values, original prose for all 10 anti-patterns and 8 typography pairings.
- License-clarity callout at top of `design-ideas.md`: "inspired by public design-systems literature. No content here is copied or derived from any proprietary source."
- Sniff-grep gate (`grep -qE "Midnight Executive|Forest & Moss" skills/create/references/design-ideas.md`) returns no match.
- NOTICE attribution wording (cites "inspired by" only) is deferred to Plan 04-04.

## Downstream Consumers

- **Plan 04-03** — agent-runtime composition: `runCreate` orchestrator instructs the agent to read `cookbook.md` master index → pick recipes per `narrative_arc` beats → load `design-ideas.json` and pass to `validateDesignChoice` before composing `render-deck.cjs`. The CI lint gate (`tools/lint-pptxgenjs-enums.js`) scans this tree on every `npm test`.
- **Plan 04-04** — `skills/create/SKILL.md` body explicitly tells the agent: "read `references/cookbook.md` for setup + recipe index; read `references/cookbook/<type>.md` per `narrative_arc` beat; read `references/design-ideas.md` for palette/typography rationale; load `references/design-ideas.json` to call `validateDesignChoice`." Plan 04-04 also writes the NOTICE "inspired by public design literature" attribution.
- **Plan 05-XX** (Phase 5 auto-refine) — recipes serve as stable reference for re-renders; design-ideas.json is the pinned palette+pair surface across cycles.

## Verification

- `ls skills/create/references/cookbook.md skills/create/references/cookbook/*.md | wc -l` → 10. ✅
- `node --test tests/create-cookbook-recipes.test.js` → 12/12 pass, 0 fail. ✅
- `node -e "JSON.parse(require('fs').readFileSync('skills/create/references/design-ideas.json'))"` → parses. ✅
- `bash tools/lint-paths.sh` → green. ✅
- Anthropic-name sniff-grep → no match. ✅
- Per-code-fence `lintCjs()` direct check → 9/9 OK. ✅
- 2 atomic commits (`8ad76eb`, `d6fe45f`). ✅

## Self-Check: PASSED

- All 13 created files exist on disk.
- Both commits (`8ad76eb`, `d6fe45f`) present in `git log --oneline`.
- 12 test assertions green.
