---
phase: 09
slug: design-variety-and-brief-polymorphism
status: ready
created: 2026-04-28
inherits_from: [01-CONTEXT.md, 02-CONTEXT.md, 04-CONTEXT.md, 05-CONTEXT.md, 06-CONTEXT.md, 07-CONTEXT.md, 08-CONTEXT.md]
---

# Phase 09 — Design Variety & Modern Aesthetics + Brief-Shape Polymorphism — CONTEXT.md

> Eliminates the "every deck looks the same" defect surfaced by 5 live E2E rounds.

---

## Goal Recap (from ROADMAP)

After Phase 8 closed, 5 live E2E rounds with structurally-different domain briefs produced visually-similar decks (same earth-tone palette, same action-title-with-underline header, same hero-stat layout, same dark-card closing). User flagged: "very important to maintain creativity and thoroughly modern slide designs" + "source content's structure also needs to be varied — source content were similarly structured, too, even though on various domains."

Two root causes:
1. **Cookbook samey** — one template per slide type (no variants, no palette library, no typography library, no motif library)
2. **Brief samey** — `runCreate` accepts only one rigid JSON shape (`{title, audience, purpose, key_messages[], data_points[], tone}`), so test methodology and real users alike feed the same input structure → identical output structure

Phase 9 makes both surfaces deeply varied.

Requirements: DV-01..DV-12 (defined in §"Requirements" below).

---

## Inherited Locked Decisions (no re-discussion)

- **pptxgenjs 4.0.1 pinned exact** (Phase 1)
- **Findings JSON schema v1.1** (Phase 1, extended Phase 6)
- **Severity 4-tier at producer; 4→3 collapse at adapter only** (Phase 2)
- **Plugin-relative paths only** (Phase 1; CLAUDE.md)
- **Run-dir convention** `.planning/instadecks/<run-id>/` (Phase 3)
- **DI hook contract** (`_test_setLlm`, `_test_setRenderImages`, `INSTADECKS_LLM_STUB`, `INSTADECKS_RENDER_STUB`) — Phase 8
- **c8 100% coverage gate** (Phase 8)
- **annotate.js no longer SHA-pinned binary asset** — under standard test discipline (Phase 8 commit ed12484)

---

## CLAUDE.md Invariant Reversal — RECORDED IN PROJECT.md

The Phase 1-7 invariant **"v8 BluePrestige output is the spec — match it"** is RELAXED in Phase 9. Replacement framing: **"v8 BluePrestige is one valid design DNA among many. Decks must vary palette / typography / motif / layout per brief — never default to the v8 visual register."**

This is recorded as a Key Decision in `.planning/PROJECT.md` (executor must add the entry as the first action of plan 09-05, before design-validator changes land).

CLAUDE.md "Don't get cute" section will be updated to remove the v8-match prohibition; behavior changes to annotate.js geometry/colors/transparency/fonts/SAMPLES contract still require visual-regression sign-off (annotate.js is the locked OVERLAY system, not the deck-generation system; its visual-regression baseline is preserved).

---

## Phase 9 Gray-Area Decisions (locked autonomously per user directive)

### D-01 — Cookbook Variant ID Convention

**Decision:** Each cookbook recipe gets ≥3 documented variants. Variant IDs follow `{recipe}-{letter}-{shorthand}`:
- `title-A-centered-classic`, `title-B-asymmetric-block`, `title-C-oversized-numeral`, `title-D-type-as-image`
- `stat-callout-A-centered-hero`, `stat-callout-B-asymmetric-grid`, `stat-callout-C-vertical-stack`, `stat-callout-D-full-bleed-numeral`, `stat-callout-E-side-by-side`
- (and so on for each recipe)

Each variant block in the recipe MD has: VARIANT_ID heading, 1-line visual description, code block (working pptxgenjs 4.0.1, enum-lint clean), "When to use", "When NOT to use".

**Rationale:** Predictable IDs let SKILL.md instruct agents to "pick variant `title-C` for this deck"; tests can grep recipes for ≥3 variants.

---

### D-02 — Palette Library Format

**Decision:** New `skills/create/references/palettes.md` lists ≥14 named palettes. Each palette block:
- Name (e.g., `Editorial Mono`, `Magazine Bold`, `Tech Noir`, `Pastel Tech`, `Silicon Valley`, `Editorial Serif`, `Carbon Neon`, `Cobalt Edge`, `Terracotta Editorial`, plus 4 existing earth-tone palettes + 1 high-contrast monochrome)
- 4-6 hex colors with role labels (`bg`, `primary`, `secondary`, `accent`, `ink`, `muted`)
- 1-line use-case (when this palette serves the brief tone)
- DO/DON'T notes (e.g., "Carbon Neon: don't use for executive/financial briefs — too aggressive")
- AI-tells exemption note (so design-validator.js doesn't false-positive on saturated primaries)

Palettes are NOT bundled as data files — they live as markdown reference. Agents copy hex values into the render-deck.cjs they author. Validator reads the palettes.md file at lint time to recognize legitimate palettes.

**Rationale:** Markdown is the agent's primary surface. Adding a JSON registry adds infrastructure without reader benefit.

---

### D-03 — Typography Library

**Decision:** New `skills/create/references/typography.md` with ≥8 type pairings. Each: pair name, headings font, body font, weight strategy, use-case, example pres.layout assignment in pptxgenjs.

Bundled fonts: IBM Plex Sans + IBM Plex Serif + IBM Plex Mono (already shipped Phase 1). Other recommended pairings (Inter, etc.) marked "user-installed — falls back to IBM Plex if absent."

**Rationale:** Font-bundling beyond Plex would inflate plugin size + license complexity; keep Plex as the bundled default and document alternatives.

---

### D-04 — Motif Library

**Decision:** New `skills/create/references/motifs.md` with ≥8 motifs. Each: motif name, 1-line visual description, 1-line "when this motif works", code snippet showing how to apply.

Motifs:
- `underline-accent` (current default — keep, but as ONE option)
- `geometric-block` (color blocks behind sections)
- `asymmetric-grid` (off-center compositions, intentional negative space)
- `number-as-design` (oversized section numbers as visual anchor)
- `diagonal-split` (color-block diagonals as backgrounds)
- `editorial-rule` (thick + thin rule combo, magazine-style)
- `minimalist-void` (no decoration, type carries everything)
- `gradient-overlay` (gradient backgrounds — implemented via solid color blocks since pptxgenjs 4.0.1 gradient support is limited; document the workaround)
- `type-as-image` (oversized type at hero scale, near-full-slide)

**Rationale:** Motifs are the highest-leverage diversity lever — different motif transforms a deck's feel even with same palette/typography.

---

### D-05 — Design DNA Picker (SKILL.md instruction)

**Decision:** SKILL.md `/instadecks:create` step "Choose design DNA" gets a new mandatory sub-step:

> **Before authoring render-deck.cjs:** Roll a design DNA from `palettes.md`, `typography.md`, `motifs.md`. Resist defaulting to verdant-steel + Plex Serif + underline. Different decks must look meaningfully different.
>
> **Diversity audit:** If `.planning/instadecks/` contains prior runs, READ the last 3 design-rationale.md files. Explicitly DO NOT pick the same palette / typography / motif combination as any of the last 3.
>
> **Suggested rotation:** Use a hash of the brief's audience+tone to deterministically seed the picker, so the same brief produces the same DNA on re-run, but different briefs roll different DNAs.

**Rationale:** Hash-seeded picker gives deterministic-per-brief variety without requiring a randomness source. Users running the same brief twice get the same deck; users with different briefs get different decks.

---

### D-06 — Brief Polymorphism: 4 Input Shapes

**Decision:** `runCreate` accepts brief in 4 shapes; new `lib/brief-normalizer.js` extracts the canonical internal shape from any:

1. **Structured JSON** (current shape — preserved for backward compat)
2. **Free-form Markdown narrative** — title in H1; agent extracts audience/tone/purpose/messages from the prose
3. **Raw text (paste-from-anywhere)** — meeting transcript, Slack thread, email, strategy doc; normalizer infers structure via prompt-driven extraction (LLM step) OR heuristic chunking (deterministic fallback)
4. **Attached files list** — array of `{path, type}` (pdf/docx/transcript); normalizer extracts text via existing pptx-to-images patterns + new `lib/extract-doc.js` for pdf/docx

`brief-normalizer.js` exports:
- `normalizeBrief(input) → canonical brief shape`
- `detectBriefShape(input) → 'json' | 'markdown' | 'raw' | 'files'`
- `_test_setExtractor(stub)` DI hook for the extraction step

CLI gains `--brief-text`, `--brief-md`, `--brief-files <comma-list>` alongside existing `--brief <path.json>`.

**Rationale:** Brief polymorphism is the user's explicit second concern. Hash-seeded design DNA + polymorphic input together break the homogeneity at both ends.

---

### D-07 — design-validator.js Update

**Decision:** Update `skills/create/scripts/lib/design-validator.js` (or wherever AI-tell detection lives) to:

- Read `palettes.md` at startup; build a registry of recognized hex values per role
- A render-deck.cjs using a recognized palette is NOT flagged for "saturated primary" or "non-default-blue" — those are deliberately design-y
- Asymmetric layouts (off-center title, full-bleed treatments) are NOT flagged
- Still catch: default Calibri, Office-blue (#0070C0 with no other accent), 3+ slides identical layout, generic stock-photo placeholder filenames
- Add a NEW check: "diversity violation" — if 3+ slides use the same `recipe-variant` ID, flag it

**Rationale:** Validator currently rejects modern bold design as "AI tell." Modern decks legitimately use saturated colors, asymmetric layouts, and full-bleed treatments. The fix is to recognize the curated palettes as legitimate.

---

### D-08 — Live E2E Verification: Structurally-Varied Inputs

**Decision:** 6 new live E2E rounds with structurally DIFFERENT input shapes (not just different domains):

1. **Round V1: Structured JSON** (current shape — verifies backward compat)
2. **Round V2: Free-form Markdown narrative** — paste a real strategy doc as prose
3. **Round V3: Raw meeting transcript** — pseudo-realistic transcript of a planning meeting, Speaker A / Speaker B turns
4. **Round V4: One-line ask** — single-sentence brief ("Make a deck for the Tuesday board meeting about the Q2 numbers")
5. **Round V5: Research-paper paragraph** — academic abstract + key tables
6. **Round V6: Photo + caption list** — 5 captioned images in markdown

Visual diversity gate: pairwise visual diff (perceptual hash) across the 6 outputs ≥80% layout/palette variation. If any 2 decks share the same palette, typography, AND motif → fail.

2 consecutive clean rounds required (same as Phase 8 live E2E pattern).

**Rationale:** The user's specific concern was that even "different domain" briefs produced same-shape decks. The verification has to actually exercise different input SHAPES, not just different content.

---

### D-09 — Plan Decomposition (6 plans, 3 waves)

**Decision:**

- **Wave 1:**
  - **9-01** Reference libraries (palettes.md + typography.md + motifs.md) — independent
  - **9-02** Cookbook variant additions (≥3 variants per 9 recipes) — independent

- **Wave 2:**
  - **9-03** SKILL.md design-DNA picker + cookbook.md restructure (depends on 9-01, 9-02)
  - **9-04** Brief normalizer + polymorphic intake — independent of cookbook

- **Wave 3:**
  - **9-05** design-validator.js update + CLAUDE.md invariant reversal + PROJECT.md key decision (depends on 9-01)
  - **9-06** Live E2E with 6 varied input shapes + 2-clean-rounds verification (depends on all)

**Rationale:** Wave 1 deliverables are pure additive content (no behavior change). Wave 2 wires them in. Wave 3 verifies + reverses the invariant.

---

## Requirements

| ID | Requirement |
|---|---|
| DV-01 | Cookbook offers ≥3 variants per slide type with VARIANT_IDs and working code |
| DV-02 | `references/palettes.md` exists with ≥14 named modern palettes |
| DV-03 | `references/typography.md` exists with ≥8 type pairings |
| DV-04 | `references/motifs.md` exists with ≥8 motifs |
| DV-05 | SKILL.md instructs agent to roll design DNA + diversity audit |
| DV-06 | `lib/brief-normalizer.js` accepts 4 brief shapes (json, markdown, raw, files) |
| DV-07 | `runCreate` accepts polymorphic brief; CLI gains `--brief-text`, `--brief-md`, `--brief-files` |
| DV-08 | `design-validator.js` recognizes palette library; doesn't false-positive on bold modern |
| DV-09 | CLAUDE.md "match v8" invariant reversed; PROJECT.md Key Decision recorded |
| DV-10 | 6 live E2E rounds with structurally-varied inputs; ≥80% pairwise visual diversity |
| DV-11 | 2 consecutive clean live E2E rounds (no new defects) |
| DV-12 | 100% c8 coverage maintained; all 909+ existing tests pass |

---

## Code Context

- `skills/create/references/cookbook/*.md` — variants added (DV-01)
- `skills/create/references/palettes.md` — NEW (DV-02)
- `skills/create/references/typography.md` — NEW (DV-03)
- `skills/create/references/motifs.md` — NEW (DV-04)
- `skills/create/SKILL.md` — design-DNA picker section added (DV-05)
- `skills/create/scripts/lib/brief-normalizer.js` — NEW (DV-06)
- `skills/create/scripts/lib/extract-doc.js` — NEW (DV-06 file extraction)
- `skills/create/scripts/cli.js` — new flags (DV-07)
- `skills/create/scripts/index.js` — accepts polymorphic brief, wires normalizer (DV-07)
- `skills/create/scripts/lib/design-validator.js` — palette library awareness (DV-08)
- `CLAUDE.md` — invariant reversal (DV-09)
- `.planning/PROJECT.md` — Key Decision entry (DV-09)
- `tests/cookbook-variant-coverage.test.js` — NEW
- `tests/cookbook-palette-library.test.js` — NEW
- `tests/cookbook-typography-library.test.js` — NEW
- `tests/cookbook-motif-library.test.js` — NEW
- `tests/cookbook-design-diversity.test.js` — NEW
- `tests/lib-brief-normalizer.test.js` — NEW
- `tests/lib-extract-doc.test.js` — NEW
- `tests/cli-create-polymorphic-brief.test.js` — NEW

---

## Out of Scope (deferred)

- **Bundling additional fonts beyond IBM Plex** (Inter, Söhne, etc.) — license complexity; v1.x.
- **Real gradient backgrounds** (pptxgenjs 4.0.1 has limited gradient support; using solid color blocks as gradient stand-in is documented; full gradient support is v1.x or pptxgenjs upgrade).
- **Image-based motifs requiring user-supplied imagery** (full-bleed photo-led) — placeholder areas defined; users supply images. Auto-image-search is v2.
- **Adaptive design DNA based on user feedback** (learning from past decks) — v2.

---

## Open Questions for Researcher (none — all resolved by autonomous decisions above)

---

**Approved:** 2026-04-28 (autonomous mode per user directive — see commit history)
