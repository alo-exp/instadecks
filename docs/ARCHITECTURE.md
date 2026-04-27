# Architecture and Design

This document captures high-level architecture and general design principles only.
Detailed phase-level designs live in `docs/specs/YYYY-MM-DD-<topic>-design.md`.

The full architecture spec is in `.planning/research/ARCHITECTURE.md`. This file is the maintained, evolving summary.

## System Overview

Multi-skill, single-plugin layout (topgun pattern). One plugin shipping four user-invocable slash skills plus shared scripts:

```
/instadecks:create  ──┐
                      ├──→ /instadecks:review  ──→ /instadecks:annotate  ──→ annotated PPTX + PDF
                      └──→ /instadecks:content-review  ──→ /instadecks:annotate
```

`/instadecks:create` runs the auto-refine loop (calling `/review` internally each cycle). All four user skills can also be invoked standalone.

## Core Components

| Component | Responsibility |
|-----------|----------------|
| `/instadecks:create` skill | Input ingestion, agent-generated `render-deck.cjs`, auto-refine loop control, default pipelining |
| `/instadecks:review` skill | DECK-VDA 4-pass design review, JSON output in locked schema, R18 AI-tell detection |
| `/instadecks:content-review` skill | Pyramid Principle / MECE / narrative-arc / claim-evidence; same finding grammar as `/review` |
| `/instadecks:annotate` skill | Reads findings JSON, severity normalization, slide-image symlinking, invokes `annotate.js` verbatim |
| `scripts/render-deck.cjs` (per-run) | One-shot pptxgenjs PPTX rendering using cookbook patterns + design-ideas guidance |
| `scripts/pptx-to-images.sh` | soffice → PDF → pdftoppm → JPGs at 150 DPI; isolated `-env:UserInstallation` per call |
| `skills/annotate/scripts/annotate.js` | VERBATIM v8 BluePrestige; SHA-pinned; lint-excluded; only one-line require-path patch |
| `skills/annotate/scripts/samples.js` | Extracted SAMPLES data so annotate.js geometry stays unmodified |
| `scripts/lib/run-state.js` | Atomic state.json read/write, run-id generation |
| `hooks/check-deps.sh` | SessionStart non-blocking dep check (soffice / pdftoppm / node) + first-run npm install |

## Design Principles

- **Self-contained.** All paths via `${CLAUDE_PLUGIN_ROOT}` or `${CLAUDE_PLUGIN_DATA}`. No reaches into `~/.claude/skills/` or absolute user-machine paths.
- **Contract-first.** The `/review → /annotate` JSON schema is locked in Phase 1 and every later component triangulates on it.
- **Consumer-before-producer.** `/annotate` (smallest, most-locked component) ships first; validates the contract before any producer is built.
- **Verbatim where calibrated.** `annotate.js` is treated as a SHA-pinned binary asset; only a documented one-line require-path patch is permitted.
- **Thin skills, thick scripts.** SKILL.md files are agent playbooks (Bash invocations + decision logic); heavy Node logic lives in `scripts/`.
- **Filesystem-state handoff between skills.** Inter-skill communication is via JSON files in `.planning/instadecks/<run-id>/` — debuggable, crash-survivable.
- **Agent runs the loop.** The auto-refine loop owner is `/create` itself (the agent); each "is this finding genuine?" decision is a judgment call.

## Technology Choices

- **Node.js ≥ 18** for `annotate.js` and per-run `render-deck.cjs` runtime (pptxgenjs 4.x dual ESM/CJS via `exports`)
- **pptxgenjs 4.0.1** (exact pin, no caret) — the calibrated baseline for `annotate.js` geometry; bumping requires visual-regression sign-off
- **LibreOffice ≥ 7.4 (`soffice`)** — system-installed; PPTX → PDF via `--headless --convert-to pdf`; isolated user profile per call to prevent races
- **Poppler ≥ 22 (`pdftoppm`)** — system-installed; PDF → JPG rasterization at 150 DPI
- **IBM Plex Sans (bundled, SIL OFL)** — the calibrated font for `annotate.js`'s text-width math; missing/substituted font destroys pixel alignment
- **`node --test`** — zero-dep test runner matching silver-bullet/topgun in-house precedent
- **Apache-2.0** with bundled-software section (pptxgenjs MIT, IBM Plex Sans OFL)
