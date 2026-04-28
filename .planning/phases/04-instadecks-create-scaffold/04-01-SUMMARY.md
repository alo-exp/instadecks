---
phase: 04-instadecks-create-scaffold
plan: 01
status: complete
completed: 2026-04-28
requirements: [CRT-01, CRT-02, CRT-05, CRT-06, CRT-15]
artifacts:
  created:
    - skills/create/scripts/lib/deck-brief.js
    - skills/create/scripts/lib/enum-lint.js
    - skills/create/scripts/lib/title-check.js
    - skills/create/scripts/lib/design-validator.js
    - skills/create/scripts/lib/render-rationale.js
    - tests/create-deck-brief.test.js
    - tests/create-enum-lint.test.js
    - tests/create-title-check.test.js
    - tests/create-design-validator.test.js
    - tests/create-render-rationale.test.js
    - tests/fixtures/sample-brief.json
    - tests/fixtures/sample-render-deck.cjs
    - tests/fixtures/sample-design-ideas.json
    - tests/fixtures/bad-render-deck.cjs
commits:
  - bdf8108: test(04-01) fixtures
  - ea50ea0: feat(04-01) deck-brief + enum-lint
  - 9eaaf01: feat(04-01) title-check + design-validator + render-rationale
---

# Phase 4 Plan 01: /instadecks:create scaffold libs — SUMMARY

Five pure-function libraries anchoring `/instadecks:create` shipped with TDD red-green coverage: DeckBrief schema validator (D-01), generation-time ENUM guard (D-05 layer 2 / CRT-15), action-title heuristic (D-06), palette+typography guardrails (D-04), and byte-stable design-rationale renderer (D-07).

## Lib Surfaces

| File | Export | Role |
|------|--------|------|
| `lib/deck-brief.js` | `validateBrief(brief)` | Hand-rolled DeckBrief shape validator; pinpoint errors `path.to.field: detail` |
| `lib/enum-lint.js` | `lintCjs(src, {filename})` | Regex throws on string-literal `addShape('foo',…)`; allows `pres.shapes.X` |
| `lib/title-check.js` | `validateTitle(title, opts)` | Blocked-words + 3-word min + verb lookup; `{action_title_override:true}` bypass |
| `lib/design-validator.js` | `validateDesignChoice({palette,typography,brief,designIdeas})` | R1 default-blue / R2 pinned typography pair / R3 hex shape; returns `{ok, violations[]}` |
| `lib/render-rationale.js` | `render({brief,designChoices,reviewerNotes})` | Byte-stable 6-section markdown |

All libs are pure (no fs / no clock / no spawn).

## Test Counts

| Test file | Subtests |
|-----------|----------|
| `tests/create-deck-brief.test.js` | 5 |
| `tests/create-enum-lint.test.js` | 4 |
| `tests/create-title-check.test.js` | 6 |
| `tests/create-design-validator.test.js` | 5 |
| `tests/create-render-rationale.test.js` | 5 |
| **Total** | **25** |

All green (`node --test` 160ms total). Zero new npm dependencies.

## Fixtures

- `tests/fixtures/sample-brief.json` — canonical DeckBrief (Q3 enterprise expansion: 8-beat narrative_arc, 3 key_claims).
- `tests/fixtures/sample-render-deck.cjs` — full 9-recipe pptxgenjs cjs (title/section/2col/comparison/data-chart/data-table/stat-callout/quote/closing); ENUM-only; self-contained; reused by Plan 04-02/03/04.
- `tests/fixtures/sample-design-ideas.json` — 4 palettes + 4 typography pairs.
- `tests/fixtures/bad-render-deck.cjs` — negative fixture; line 14 has `slide.addShape('oval', …)` for enum-lint test.

## Downstream Consumers

- **Plan 04-02** — cookbook recipes will be lint-checked by `enum-lint.js`; sample-design-ideas.json round-tripped by `design-validator.js`.
- **Plan 04-03** — `runCreate` orchestrator composes `validateBrief` → `lintCjs` → spawn `node render-deck.cjs` → `render-rationale.render(...)`.
- **Plan 04-04** — integration test imports `validateBrief` + asserts `render-rationale` byte-stability across runs.

## Deviations from Plan

None — plan executed exactly as written. The fixture line counts matched the plan: bad-render-deck.cjs has the banned `addShape` on line 14 verbatim; sample-render-deck.cjs ships all 9 recipes.

## Verification

- `node --test tests/create-{deck-brief,enum-lint,title-check,design-validator,render-rationale}.test.js` → 25/25 pass.
- `bash tools/lint-paths.sh` → green.
- `node tools/assert-pptxgenjs-pin.js` → 4.0.1 OK.

## Self-Check: PASSED

- All 5 libs exist at planned paths.
- All 5 test files exist + pass.
- All 4 fixtures exist.
- Commits bdf8108, ea50ea0, 9eaaf01 in `git log --oneline`.
