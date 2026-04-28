# Add instadecks plugin v0.1.0

## Summary

- Adds the **Instadecks** plugin: 4 user-invocable slash skills (`/instadecks:create`, `/instadecks:review`, `/instadecks:content-review`, `/instadecks:annotate`) plus a `/instadecks:doctor` self-check. Generates polished decks from arbitrary input (markdown, PDF, transcript, brief, URL), runs DECK-VDA design review with R18 AI-tell detection, runs Pyramid Principle / MECE / claim-evidence content review, and overlays findings on decks as annotated PPTX + PDF.
- Ships verbatim v8 BluePrestige `annotate.js` (SHA-pinned binary asset, relicensed Apache-2.0 by author) plus a curated pptxgenjs cookbook, author-original DECK-VDA methodology, and an auto-refine convergence loop.
- Apache-2.0 licensed end-to-end. All bundled deps are MIT or SIL OFL 1.1; zero GPL/AGPL transitive deps.

## Marketplace JSON entry

```json
{
  "name": "instadecks",
  "source": { "source": "github", "repo": "alo-exp/instadecks" },
  "category": "productivity",
  "version": "0.1.0",
  "description": "Generate, review, and annotate polished presentation decks. Four slash skills powered by pptxgenjs + DECK-VDA design review + auto-refine convergence loop."
}
```

## Testing evidence

- `tests/activation-results.md` — 40 prompts × 4 skills, ≥ 8/10 per skill (D-01 / SC#1)
- `tests/PERMISSION-MODE.md` — 5 skills × 2 modes (default + dontAsk) = 10/10 (D-02 / SC#2)
- `tests/FRESH-INSTALL.md` — 6 steps × 2 OS (Mac + Windows) = 12/12 (D-06 / SC#4)
- `.planning/RELEASE.md` — v0.1.0 sign-off log

## License compliance

- `node tools/license-audit.js` exits 0 — `license-checker` reports zero GPL/AGPL on production deps.
- NOTICE BUNDLED SOFTWARE ATTRIBUTION block matches `licenses/<dep>/LICENSE` subdir set (drift-checked in CI).
- LICENSE bundled-software section mirrors NOTICE.
- Per-dep upstream license texts in `licenses/pptxgenjs/`, `licenses/jszip/`, `licenses/image-size/`, `licenses/IBM_Plex_Sans/`.

## Reviewer notes

- **annotate.js relicensing:** the renderer in `skills/annotate/scripts/annotate.js` was developed for internal Sourcevo v8 BluePrestige work; the original author has relicensed it under Apache-2.0 for inclusion here (see NOTICE RELICENSING NOTE + `## annotate.js binary-asset note`). It is bundled VERBATIM with one documented modification: a require-path patch so pptxgenjs resolves out of `${CLAUDE_PLUGIN_DATA}/node_modules`.
- **DECK-VDA methodology:** the 4-pass scan, 4-tier severity grammar, finding grammar, §1–§5 reporting structure, and maturity rubric were authored by Shafqat Ullah / Sourcevo as the standalone `deck-design-review` skill and are re-expressed here as first-class authored content under Apache-2.0 (no upstream files vendored).
- **Author-original design-ideas:** `skills/create/references/design-ideas.{md,json}` — palette/typography curation original to this project; structural pattern inspired by public design-systems literature.

## Tag

References v0.1.0 — https://github.com/alo-exp/instadecks/releases/tag/v0.1.0

🤖 Generated with [Claude Code](https://claude.com/claude-code)
