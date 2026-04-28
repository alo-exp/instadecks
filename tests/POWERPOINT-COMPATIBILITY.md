# PowerPoint Compatibility Release Checklist (D-05 Layer 3)

> **Phase 7 release gate.** Created in Phase 4; executed in Phase 7 before v0.1.0 tag.
>
> Phase 4 ships D-05 Layers 1 (CI grep — `tools/lint-pptxgenjs-enums.js`) + 2 (runtime
> enum-lint via `lib/enum-lint.js`) + xmllint OOXML sanity. Layer 3 — actually opening
> test decks in real Microsoft PowerPoint on Mac + Windows — requires human-in-the-loop
> and is intentionally deferred to Phase 7.

## Canonical test fixtures

For each fixture, generate a deck via `/instadecks:create` and open in MS PowerPoint:

| # | Fixture brief | Run command | Expected slide types |
|---|---|---|---|
| 1 | `tests/fixtures/sample-brief.json` (canonical Q3 expansion) | `node skills/create/scripts/cli.js --brief tests/fixtures/sample-brief.json --out-dir <tmp>` | all 9 recipes (title / section / 2col / comparison / data-chart / data-table / stat-callout / quote / closing) |
| 2 | (executive Q3 results — Phase 7 fixture) | (Phase 7) | title / 2col / data-chart / data-table / closing |
| 3 | (analytical research summary — Phase 7 fixture) | (Phase 7) | title / section / 2col / quote / closing |
| 4 | (playful retrospective — Phase 7 fixture) | (Phase 7) | title / stat-callout / quote / closing |
| 5 | (multi-file digest — Phase 7 fixture) | (Phase 7) | title / section / 2col / data-table / closing |

## Per-deck manual checks

For each generated deck, verify on **MS PowerPoint Mac (latest)** and **MS PowerPoint Windows (latest)**:

- [ ] Deck opens without any error dialog ("Repair", "Some content was removed", etc.)
- [ ] All shapes render correctly (no missing OVAL / RECTANGLE / LEFT_BRACE / RIGHT_ARROW / LINE)
- [ ] Charts render (BAR / LINE / PIE / DOUGHNUT)
- [ ] Tables render with banding
- [ ] Fonts substitute cleanly (IBM Plex Sans → Calibri or Arial fallback acceptable; no `MS Mincho` or weird CJK fallback)
- [ ] Page numbers visible on every non-title/closing slide
- [ ] Source lines visible where present in `DeckBrief.key_claims`
- [ ] Speaker notes present on every slide (View → Notes Page)
- [ ] No string-literal `oval` / `rect` shape names in the underlying XML (re-run `npm run lint:enums` as a final sanity)
- [ ] No 8-character hex colors (no `FF000040` etc. — they corrupt OOXML)
- [ ] Alt-text on shapes where required (accessibility — Phase 7 polish)
- [ ] Print preview clean (no off-canvas overflow)

## Pass/fail

- **PASS:** All checks green on both Mac + Windows for all 5 fixtures.
- **FAIL:** Any check red → file blocking issue, do not tag v0.1.0.

## Failure log

Record any deviations here for Phase 7 closure:

- (empty in Phase 4)
