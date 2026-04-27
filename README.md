# Instadecks

Generate, review, and annotate polished presentation decks from any input.

## Overview

Instadecks is a [Claude Code](https://docs.claude.com/en/docs/claude-code) marketplace plugin that ships four user-invocable slash skills for end-to-end deck work: authoring, design review, content/argument review, and findings annotation. It productizes the v8 BluePrestige deck-building workflow (calibrated palette, typography, eight slide types, and an auto-refine convergence loop) into a reusable plugin under [Alo Labs](https://github.com/alo-exp).

The pipeline composes naturally — `/instadecks:create` produces a deck; `/instadecks:review` and `/instadecks:content-review` emit findings JSON in a locked schema; `/instadecks:annotate` overlays those findings on the deck as a PPTX + PDF.

## Install

From inside Claude Code:

```
/plugin marketplace add alo-exp/instadecks
/plugin install instadecks
```

For local development:

```
git clone https://github.com/alo-exp/instadecks.git
cd instadecks
npm ci
```

The SessionStart hook (`hooks/check-deps.sh`) auto-installs npm dependencies and unpacks the bundled IBM Plex Sans font on first run, and is non-blocking on subsequent sessions.

## Skills

| Slash command                  | Description                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `/instadecks:create`           | Generate a polished deck from any input (markdown, PDF, transcript, brief, URL); auto-refined to convergence.                        |
| `/instadecks:review`           | Design critique using the DECK-VDA 4-pass methodology with finding-grammar output and AI-tell detection.                             |
| `/instadecks:content-review`   | Argument-structure and narrative critique (Pyramid Principle / MECE / standalone-readability), distinct from visual review.          |
| `/instadecks:annotate`         | Overlay design-review findings on a deck as PPTX + PDF, given a deck file and findings JSON in the locked schema.                    |

Full skill playbooks land progressively across Phases 2–6; Phase 1 ships scaffold SKILL.md files.

## Requirements

- Node.js ≥ 18
- LibreOffice (`soffice` on `PATH`) — used for PPTX → PDF conversion
- Poppler (`pdftoppm` on `PATH`) — used for PDF → PNG rasterization

The SessionStart hook auto-installs npm dependencies (including pinned `pptxgenjs@4.0.1`) into the plugin data directory and unpacks IBM Plex Sans from the bundled archive. System binaries (`soffice`, `pdftoppm`) must be installed via the host package manager — the hook detects them and surfaces clear install hints if missing.

## License

Apache-2.0 — see [LICENSE](./LICENSE) for the full text and the bundled-software section.

Per-bundled-dep credits and the relicensing note for `annotate.js` are recorded in [NOTICE](./NOTICE); upstream license texts live under [`licenses/`](./licenses/).
