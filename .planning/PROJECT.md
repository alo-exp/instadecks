# Instadecks

## Current Milestone: v0.1.0 Plugin v0.1.0 Public Release

**Goal:** Ship Instadecks v0.1.0 as a publicly installable Claude Code plugin via the alo-labs marketplace, with the four user-invocable slash skills end-to-end (`/create`, `/review`, `/content-review`, `/annotate`) producing v8-pixel-parity output and full Apache-2.0 license compliance.

**Target features:**
- Plugin Foundation, Contract & CI Gates (Phase 1)
- `/instadecks:annotate` verbatim wired to locked contract (Phase 2)
- `/instadecks:review` with DECK-VDA + R18 AI-tell detection (Phase 3)
- `/instadecks:create` scaffold + render cookbook + 8 slide types (Phase 4)
- `/instadecks:create` auto-refine loop with convergence rule (Phase 5)
- `/instadecks:content-review` with Pyramid Principle / MECE / narrative-arc (Phase 6)
- Marketplace publication, license compliance, v0.1.0 release tag (Phase 7)

**Phase numbering / scope:** The existing 7-phase ROADMAP.md created during `/gsd-new-project` IS the v0.1.0 milestone roadmap. 67 requirements (FOUND/ANNO/RVW/CRT/CRV/DIST) map 1:1 to the 7 phases. Development uses Silver Bullet's `full-dev-cycle` composable workflow per phase.

## What This Is

A Claude Code plugin that productizes a refined deck-building workflow into four slash skills — `/instadecks:create`, `/instadecks:review`, `/instadecks:content-review`, and `/instadecks:annotate` — so anyone using Claude Code can generate, critique, and visually mark up PowerPoint decks with the same approach we developed across the *Agentic Disruption v8 BluePrestige* iterations. Distributed publicly via the alo-labs marketplace; aimed at any Claude Code user who builds presentations.

## Core Value

A user can hand Claude Code arbitrary input material and end up with a polished, design-reviewed, annotated PPTX + PDF — without having to know about pptxgenjs, custom-geometry arrows, or our deck-design-review skill — and the output quality matches what we ship by hand today.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

- [ ] `/instadecks:create` accepts any input the agent can read (markdown, PPTX, PDF, URL, freeform brief, image, transcript, etc.) and produces a PPTX + PDF + design rationale doc in the project directory
- [ ] `/instadecks:create` uses pptxgenjs as the rendering engine (matches the existing v8 toolchain)
- [ ] `/instadecks:create` carries forward the "Design Ideas" guidelines (curated palettes, typography pairings, layout patterns, "Avoid" list) so generated decks reflect the refined design language — no template library
- [ ] `/instadecks:create` runs the auto-refine loop: generate → invoke `/instadecks:review` internally → regenerate fixes → repeat until the reviewer reports no genuine issues
- [ ] `/instadecks:review` bundles and supersedes the standalone `deck-design-review` skill, accepting either a deck file path or a structured deck-spec handoff (when pipelined from `/create`)
- [ ] `/instadecks:review` pipelines into `/instadecks:annotate` by default, while still being invocable standalone
- [ ] `/instadecks:content-review` ships in v1 alongside design-review (separate skill, content-focused critique)
- [ ] `/instadecks:annotate` consumes the existing `deck-design-review` output format and produces an annotated overlay PPTX + PDF
- [ ] `/instadecks:annotate` reuses the existing `annotate.js` algorithm verbatim (no rewrites of the merged-polygon arrow geometry, color/transparency choices, or alignment math)
- [ ] Plugin self-contains all scripts (annotate.js, review skill content, etc.) — no dependencies on user-machine paths
- [ ] Plugin manifests (`plugin.json`, marketplace metadata) ready for inclusion in the alo-labs marketplace
- [ ] Apache-2.0 license, README, and usage docs sufficient for public users

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Bundled visual templates / template library — palette + design-ideas guidance is the contract; generated decks are fresh each time, not template-driven
- python-pptx or any non-pptxgenjs rendering engine — keeps the toolchain consistent with the v8 work and the bundled `annotate.js`
- Internal Sourcevo branding or single-user customization — public marketplace plugin, no Sourcevo-specific assumptions
- Editing existing PPTX in place (modifying user-supplied decks) — `/instadecks:create` only authors new decks; templates can inform style but the plugin doesn't mutate existing files
- Rewriting the v8 annotation algorithm — `annotate.js` is locked verbatim
- Standalone `deck-design-review` skill — superseded by the bundled review inside the plugin
- A fixed cap on auto-refine cycles — refinement runs until the reviewer reports no genuine issues; user can interrupt
- Web UI / GUI — slash-skill CLI surface only

## Context

- **Origin work**: Built directly on the *Agentic Disruption v8 BluePrestige* deck and `annotate.js` from `/Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/`. The v8 work refined: 50%-transparent merged-polygon annotation arrows with miter-join elbows, IBM Plex Sans 7.5pt body / per-line layout, navy + orange severity palette, pixel-level bar/text alignment.
- **Design guidance source**: The "Design Ideas" section of the bundled `pptx` skill (curated color palettes, font pairings, layout options, "Avoid" list) is the canonical style guide we want to carry forward into `/instadecks:create`.
- **Review workflow**: Existing `deck-design-review` skill is the basis for `/instadecks:review`. A future `deck-content-review` skill is in scope for v1 — the plugin will ship both.
- **Annotation tooling**: `annotate.js` already produces PPTX + PDF annotation overlays. It is to be bundled and called from `/instadecks:annotate` as-is.
- **Distribution channel**: alo-labs Claude Code marketplace (alongside Silver Bullet, Topgun, etc.).
- **Repo**: `https://github.com/alo-exp/instadecks` (public).

## Constraints

- **Tech stack**: Node.js + pptxgenjs for rendering. LibreOffice (`soffice`) + Poppler (`pdftoppm`) for PPTX→PDF→images conversion (already required by the v8 review pipeline).
- **Compatibility**: Plugin must run wherever Claude Code runs (macOS / Linux primary; Windows nice-to-have if pptxgenjs supports it).
- **Output quality**: Annotation visuals must match v8 BluePrestige output pixel-for-pixel — `annotate.js` is reused verbatim.
- **Code reuse**: All required scripts/skills bundled inside the plugin. No reaching into `~/.claude/skills/` or absolute user-machine paths.
- **License**: Apache-2.0.
- **Distribution**: Listed in alo-labs marketplace; installable via `/plugin install`.
- **Marketplace readiness**: Public plugin needs onboarding docs, generic input handling, and no Sourcevo-specific defaults baked in.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Bundle scripts inside plugin (vs. reference user paths) | Self-contained, version-locked with plugin releases, marketplace-friendly | — Pending |
| pptxgenjs (vs. python-pptx or polyglot) | Matches the existing v8 toolchain and `annotate.js`; keeps custom-geometry control | — Pending |
| No bundled template library, palette guidance only | Avoids template-debt; design language is principle-based, not artifact-based | — Pending |
| Pipeline `/review` → `/annotate` by default | Matches the user's actual workflow; standalone invocation still supported | — Pending |
| Auto-refine until clean (no fixed cycle cap) | User wants real quality; rely on reviewer convergence; user can interrupt | — Pending |
| `/instadecks:content-review` in v1 (not v2) | Both review dimensions ship together so the plugin's review surface is complete on day one | — Pending |
| Bundle + supersede the standalone `deck-design-review` skill | One canonical home for the review logic; avoids drift between skill and plugin | — Pending |
| Reuse `annotate.js` verbatim | Locked output quality; no risk of regression from refactoring the geometry math | — Pending |
| alo-labs marketplace for distribution | Existing channel already trusted by users of Silver Bullet / Topgun | — Pending |
| Apache-2.0 license | Permissive, explicit patent grant, fits open distribution intent | — Pending |

### KD-09: v8 BluePrestige is one design DNA among many — invariant reversed (2026-04-28)

**Decision:** The Phase 1-7 invariant "v8 BluePrestige output is the spec — match it" is RELAXED. Replacement: "v8 BluePrestige is one valid design DNA among many. Decks must vary palette / typography / motif / layout per brief — never default to the v8 visual register."

**Trigger:** Phase 9 CONTEXT D-09 + 5 live E2E rounds where structurally-different domain briefs produced visually-similar decks.

**Scope:** Applies to the deck-generation system (cookbook recipes + design-validator.js). Does NOT apply to annotate.js — its geometry/colors/transparency/fonts/SAMPLES contract continues to require visual-regression sign-off (Phase 8 ed12484 moved annotate.js to standard test discipline; this Key Decision does not alter that).

**Recorded by:** Plan 09-05 (Phase 09 — Design Variety & Modern Aesthetics + Brief-Shape Polymorphism).

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-27 after milestone v0.1.0 formalization*
