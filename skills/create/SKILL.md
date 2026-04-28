---
name: create
description: |
  Generate a polished, presentation-grade slide deck (PPTX + PDF + design-rationale doc) from any input — markdown, plain text, read-only PPTX, PDF, URL, image, transcript, freeform brief, or multiple files combined. Composes a per-run render-deck.cjs from a curated pptxgenjs cookbook, picks palette and typography from bundled author-original design guidance (10 palettes / 8 typography pairings / 10 anti-patterns), and emits a deck covering the canonical 8 slide types at 16:9 widescreen. Action titles, page numbers, source lines, and speaker notes are emitted by default. Single-cycle in v0.1.0; Phase 5 ships the auto-refine loop.
allowed-tools:
  - Bash(node:*)
  - Bash(soffice:*)
  - Bash(unzip:*)
  - Bash(xmllint:*)
  - Read
  - Write
  - WebFetch
user-invocable: true
version: 0.1.0
---

# /instadecks:create — Generate a Polished Deck from Any Input

## What this skill does

Generate a polished presentation deck (PPTX + PDF + design-rationale doc) from arbitrary input. The agent normalizes input into a structured `DeckBrief`, picks a palette and typography pairing from bundled author-original design guidance, composes a per-run `render-deck.cjs` from a curated pptxgenjs cookbook (one recipe per slide type), executes it via `runCreate`, and writes a fixed-template `design-rationale.md`. Outputs cover the 8 canonical slide types at 16:9 widescreen with action titles, page numbers, source lines, and speaker notes by default. Single-cycle in v0.1.0; the auto-refine convergence loop ships in Phase 5.

## When to use this skill

- The user supplies a markdown / plain text / read-only PPTX / PDF / URL / image / transcript / freeform brief / multi-file bundle and asks for a "deck", "slides", "presentation", "pitch", or similar.
- The user wants a fresh deck authored from scratch (not a review or annotation of an existing deck — those are `/instadecks:review` and `/instadecks:annotate`).
- Another skill pipelines a brief into deck generation (Phase 5 auto-refine wraps `runCreate` in a convergence loop).

Do NOT use this skill for design critique (`/instadecks:review`), annotation overlay (`/instadecks:annotate`), or argument-structure / claim-evidence critique (`/instadecks:content-review`).

## Locked invariants (do not violate)

- Use `pres.shapes.*` ENUM constants only — never `addShape('oval', …)` (CRT-15). `lib/enum-lint.js` blocks string-literal shape names BEFORE spawn; `tools/lint-pptxgenjs-enums.js` enforces the same in CI.
- 6-character hex colors with no `#` prefix (CRT-15 sibling rule). 8-char hex (`FF000040`) corrupts OOXML.
- Action titles (claim, not topic) per D-06 — `lib/title-check.js` warns on blocked words ("Overview", "Introduction", "Outline", "Agenda", "Summary", "Conclusion", "Q&A", "Background"). Use `{action_title_override:true}` ONLY for legit cases like the closing "Thank You" slide.
- Fresh option object per `addShape` call (pptxgenjs mutates in place — sharing options across calls produces silent rendering bugs).
- Output paths: `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_PLUGIN_DATA}` only — no hardcoded user paths. `tools/lint-paths.sh` enforces.
- `references/design-ideas.md` is author-original (Q-1) — do NOT reference Anthropic pptx-skill palette/typography names. Sniff-grep gate is CI-armed.

## How to use

### Step 1 — Normalize input into a DeckBrief

For each input mode, read+summarize into the DeckBrief shape:

| Input | Tool | Notes |
|---|---|---|
| Markdown / plain text | Read | Parse front-matter and headings as `narrative_arc` beats |
| Read-only PPTX (template) | Bash(unzip) + Read | Extract `ppt/slides/slide*.xml`, summarize |
| PDF | Read | Claude reads PDFs natively |
| URL | WebFetch | Summarize page; cite as `source_files` entry |
| Image | Read | Multimodal — describe content; flag image-only slides |
| Transcript | Read | Parse speaker turns into narrative beats |
| Freeform brief | (in-context) | Use as-is |
| Multi-file | Read each | Merge into single DeckBrief |

DeckBrief shape (validated by `lib/deck-brief.js`):

```js
{
  topic: string,
  audience: string,
  tone: string,
  narrative_arc: string[],          // 5–12 beat outline
  key_claims: [{ slide_idx, claim, evidence?, source? }],
  asset_hints: { has_data?, has_quotes?, has_comparison?, has_stats? },
  source_files: string[]
}
```

### Step 2 — Pick palette and typography

Read `references/design-ideas.md` and `references/design-ideas.json`. Pick:

- **Palette** matching `DeckBrief.tone` (executive → cooler/darker; analytical → balanced; playful → warmer/saturated). **Avoid default-blue palettes** (`0070C0`, `1F4E79`, `2E75B6`) unless `tone`/`topic` explicitly references "corporate" / "blue" / "finance".
- **Typography pair** from the curated 8 — IBM Plex Sans is body anchor.

Validate the choice via `lib/design-validator.js`:

```js
const { validateDesignChoice } = require('${CLAUDE_PLUGIN_ROOT}/skills/create/scripts/lib/design-validator');
const designIdeas = require('${CLAUDE_PLUGIN_ROOT}/skills/create/references/design-ideas.json');
const r = validateDesignChoice({ palette, typography, brief, designIdeas });
if (!r.ok) throw new Error(r.violations.map(v => v.message).join('; '));
```

### Step 3 — Compose render-deck.cjs from the cookbook

Read `references/cookbook.md` (master) and the per-recipe files in `references/cookbook/*.md`. For each beat in `narrative_arc`, pick the recipe that matches the beat's intent (cookbook recipe-index table maps slide types → "When to use"). **Vary recipe across beats** — repeating the same recipe more than 3 consecutive slides triggers R18 in `/instadecks:review`.

Compose render-deck.cjs:

1. Setup boilerplate (verbatim from cookbook.md "Setup boilerplate" block).
2. Define PALETTE + TYPE constants from chosen design.
3. For each beat: copy the recipe code, instantiate the slide, fill params.
4. Always: ENUM constants (`pres.shapes.OVAL`, never `'oval'`); 6-char hex no `#`; `addNotes()` last per recipe.
5. Action titles: every slide title MUST be a claim. `lib/title-check.js` warns on blocked words — use `{action_title_override:true}` ONLY for legit cases like the closing "Thank You".

Write to `${runDir}/render-deck.cjs`.

### Step 4 — Call runCreate

```js
const { runCreate } = require('${CLAUDE_PLUGIN_ROOT}/skills/create/scripts/index');
const result = await runCreate({
  brief,
  runId,
  outDir,
  mode: 'standalone',
  designChoices: { palette, typography, motif, palette_rationale, typography_rationale, tradeoffs }
});
// result: { deckPath, pdfPath, rationalePath, runDir, runId, slidesCount, warnings }
```

runCreate will:

1. Validate brief (CRT-01).
2. Read render-deck.cjs and run `lib/enum-lint.js` (CRT-15 Layer 2).
3. Spawn `node` on the cjs with `NODE_PATH=${CLAUDE_PLUGIN_DATA}/node_modules`.
4. xmllint sanity-check the output PPTX (soft on missing tool — P-08).
5. soffice convert to PDF (soft on missing tool).
6. Return paths + warnings.

### Step 5 — Author design-rationale.md

If you passed `designChoices`, runCreate already wrote a baseline. Open `${runDir}/design-rationale.md` and confirm/refine the 6 sections:

- ## Palette — chosen + rationale
- ## Typography — chosen + pair rationale
- ## Motif — 1 paragraph
- ## Narrative Arc — numbered list of slides
- ## Key Tradeoffs — bullets
- ## Reviewer Notes — leave the Phase 4 placeholder (auto-refine ships in Phase 5)

### Step 6 — Surface warnings + outputs to the user

If `result.warnings.length > 0`, surface them (e.g., "xmllint missing — OOXML sanity skipped"). Print:

- Deck path: `${result.deckPath}`
- PDF: `${result.pdfPath}` (or "skipped — soffice missing")
- Design rationale: `${result.rationalePath}`
- Slides: `${result.slidesCount}`

## Output contract

| Artifact | Path | Required |
|---|---|---|
| PPTX | `${runDir}/deck.pptx` | yes |
| PDF | `${runDir}/deck.pdf` | yes (soft if soffice missing) |
| Design rationale | `${runDir}/design-rationale.md` | yes |
| render-deck.cjs (audit trail) | `${runDir}/render-deck.cjs` | yes |
| brief.json (audit trail) | `${runDir}/brief.json` | yes |

## Out of scope (deferred)

- Auto-refine loop / convergence — **Phase 5** (CRT-07..CRT-14).
- /content-review integration — **v2** (PROJECT.md).
- Real-PowerPoint open gate (Mac + Windows) — **Phase 7 release** (D-05 Layer 3; `tests/POWERPOINT-COMPATIBILITY.md`).
- Brand auto-detection from URL — **v2**.
- In-deck image generation — **v2**.

## See also

- `${CLAUDE_PLUGIN_ROOT}/skills/create/references/cookbook.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/create/references/design-ideas.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/create/references/design-ideas.json`
- `${CLAUDE_PLUGIN_ROOT}/skills/create/scripts/index.js` (runCreate)
- `${CLAUDE_PLUGIN_ROOT}/skills/create/scripts/lib/*.js` (validators)
- `${CLAUDE_PLUGIN_ROOT}/tests/POWERPOINT-COMPATIBILITY.md` (Phase 7 release gate)
