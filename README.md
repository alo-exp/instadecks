# Instadecks

Generate, review, and annotate polished presentation decks from any input.

[![CI](https://github.com/alo-exp/instadecks/actions/workflows/ci.yml/badge.svg)](https://github.com/alo-exp/instadecks/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](./tests/coverage-baseline.txt)
![Version](https://img.shields.io/badge/version-0.2.0-blue)
![License](https://img.shields.io/badge/license-Apache--2.0-green)

## Overview

Instadecks is a [Claude Code](https://docs.claude.com/en/docs/claude-code) marketplace plugin that ships four user-invocable slash skills for end-to-end deck work: authoring, design review, content/argument review, and findings annotation. It productizes the v8 BluePrestige deck-building workflow (calibrated palette, typography, eight slide types, and an auto-refine convergence loop) into a reusable plugin under [Alo Labs](https://github.com/alo-exp).

The pipeline composes naturally — `/instadecks-create` produces a deck; `/instadecks-review` and `/instadecks-content-review` emit findings JSON in a locked schema; `/instadecks-annotate` overlays those findings on the deck as a PPTX + PDF.

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

After install, run [`/instadecks-doctor`](#instadecksdoctor-self-check) to self-check that all system prerequisites (LibreOffice, Poppler, Node ≥ 18, pinned `pptxgenjs@4.0.1`, IBM Plex Sans) are present. The SessionStart hook (`hooks/check-deps.sh`) handles the npm install and font-unpack steps automatically on first run; the doctor surfaces any host-installed binaries that still need attention.

## Quick Start

```
/instadecks-create — "Build me a pitch deck from this brief: ..."
/instadecks-review — "Review my deck for design defects: deck.pptx"
/instadecks-content-review — "Is my deck persuasive? deck.pptx"
/instadecks-annotate — "Overlay these findings on my deck: deck.pptx findings.json"
```

## Skills

| Slash command                  | Description                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `/instadecks-create`           | Generate a polished deck from any input (markdown, PDF, transcript, brief, URL); auto-refined to convergence.                        |
| `/instadecks-review`           | Design critique using the DECK-VDA 4-pass methodology with finding-grammar output and AI-tell detection.                             |
| `/instadecks-content-review`   | Argument-structure and narrative critique (Pyramid Principle / MECE / standalone-readability), distinct from visual review.          |
| `/instadecks-annotate`         | Overlay design-review findings on a deck as PPTX + PDF, given a deck file and findings JSON in the locked schema.                    |
| `/instadecks-doctor`           | Self-check Instadecks system prerequisites (soffice, pdftoppm, node, pptxgenjs, IBM Plex Sans) and report green/red with install hints. |
| `/instadecks-update`           | Update the local Instadecks installation to the latest GitHub release — compares versions, shows changelog, clones and verifies the new release. |

## /instadecks-doctor Self-Check

The doctor skill probes every system prerequisite in one pass and reports a per-row OK / MISSING table with copy-pasteable install commands per OS. Run it after first install, after a host OS upgrade, or whenever any other skill fails with a missing-binary error.

Per-prerequisite install hints:

- **LibreOffice / `soffice`** — `brew install --cask libreoffice` (Mac) | `apt install libreoffice` (Linux) | `choco install libreoffice-fresh` (Windows)
- **Poppler / `pdftoppm`** — `brew install poppler` (Mac) | `apt install poppler-utils` (Linux) | `choco install poppler` (Windows)
- **Node ≥ 18** — `brew install node` (Mac) | `apt install nodejs` (Linux) | `choco install nodejs` (Windows)

The pinned `pptxgenjs@4.0.1` install and the bundled IBM Plex Sans font are handled automatically by the SessionStart hook; the doctor confirms both are reachable.

## Architecture

Instadecks is a Claude Code marketplace plugin shipping 6 user-invocable slash commands under `commands/`. The `/instadecks-annotate` command bundles `annotate.js` verbatim from v8 BluePrestige (SHA-pinned binary asset) and consumes findings JSON in the locked Instadecks schema (1.0 / 1.1). `/instadecks-review` and `/instadecks-content-review` produce findings in that schema; `/instadecks-create` composes a per-run `render-deck.cjs` from a curated pptxgenjs cookbook and wraps the output in an auto-refine convergence loop. `/instadecks-doctor` self-checks system prerequisites. `/instadecks-update` self-updates the plugin from GitHub releases. Single repo, single npm tree, pinned `pptxgenjs@4.0.1`.

## Requirements

- Node.js ≥ 18
- LibreOffice (`soffice` on `PATH`) — used for PPTX → PDF conversion
- Poppler (`pdftoppm` on `PATH`) — used for PDF → PNG rasterization

The SessionStart hook auto-installs npm dependencies (including pinned `pptxgenjs@4.0.1`) into the plugin data directory and unpacks IBM Plex Sans from the bundled archive. System binaries (`soffice`, `pdftoppm`) must be installed via the host package manager — the hook detects them and surfaces clear install hints if missing.

## Testing

```bash
# Full suite + 100% coverage gate (matches CI; per CONTEXT D-02):
npm test

# Coverage report (text + lcov; non-failing):
npm run coverage

# Smoke suite (<30s; runs in CI):
npm run test:smoke

# Bash-script suite (bats; runs in CI; install via `brew install bats-core`):
npm run test:bats

# E2E suite (local-only; requires soffice + pdftoppm; skipped silently otherwise):
npm run test:e2e

# Release automation (Phase 10):
npm run release:dry-run
```

For human end-to-end gating before release, see [tests/FRESH-INSTALL.md](tests/FRESH-INSTALL.md).

## License

Apache-2.0 — see [LICENSE](./LICENSE) for the full text and the bundled-software section.

Per-bundled-dep credits and the relicensing note for `annotate.js` are recorded in [NOTICE](./NOTICE); upstream license texts live under [`licenses/`](./licenses/).

## Contributing

Issues and PRs welcome at https://github.com/alo-exp/instadecks. Run `npm test` plus `bash tools/lint-paths.sh && node tools/audit-allowed-tools.js && node tools/license-audit.js` before opening a PR. CI runs the same gates on every commit.

## Acknowledgements

- DECK-VDA methodology — Shafqat Ullah / Sourcevo (see NOTICE)
- pptxgenjs by Brent Ely (MIT)
- IBM Plex Sans by IBM (SIL OFL 1.1)
- jszip by Stuart Knightley (MIT/GPL — used under MIT)
- image-size by Aditya Yadav (MIT)
