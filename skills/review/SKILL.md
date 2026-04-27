---
name: review
description: Review a presentation deck for design defects using DECK-VDA 4-pass methodology. This skill should be used when the user wants a design critique with finding-grammar output and AI-tell detection, optionally pipelined into annotation.
user-invocable: true
version: 0.1.0
---

# /instadecks:review — Design Critique with DECK-VDA 4-Pass Methodology

Review a presentation deck for design defects using DECK-VDA 4-pass methodology — produces a deterministic findings JSON, a fixed-template Markdown report, and an LLM-authored narrative report when given a `.pptx` deck, optionally piping into `/instadecks:annotate` for an overlaid PPTX + PDF.

## When to invoke

Use this skill when:
- The user supplies a `.pptx` (or `.pdf`) deck and asks for a design critique, design review, "review my deck", "find what's wrong with this deck", or similar natural-language framing.
- Another skill pipelines findings: `/instadecks:create` (Phase 4-5) imports `runReview` directly per D-04 to score iterations.
- The user explicitly asks for AI-tell detection, R18 audit, or "does this deck look AI-generated?".

Do NOT use this skill for argument-structure / claim-evidence / narrative-arc critique — that is `/instadecks:content-review` (Phase 6) territory. See §"Content-vs-design boundary" below.

## Inputs

- **`deckPath`** (required) — path to `.pptx` or `.pdf` deck.
- **Optional findings sidecar** — for re-review of an existing review pass; the agent reads it as the starting findings object instead of re-scanning from scratch.
- **`--annotate` flag** — gates the pipeline into `/instadecks:annotate` per D-03. Default = standalone (no annotation). Natural-language synonyms (`annotate`, `overlay`, `markup`) also trigger.
- **Optional `--run-id`** — override auto-generated run-id (`YYYYMMDD-HHMMSS-<6hex>`).
- **Optional `--out-dir`** — override default `.planning/instadecks/<runId>/`.

## Outputs

**Standalone** (default — 3 files, sibling-of-input):
- `<deck>.review.json` — findings JSON in the locked v1.0 schema (see `skills/review/references/findings-schema.md`).
- `<deck>.review.md` — fixed-template DECK-VDA report rendered by `skills/review/scripts/render-fixed.js`. Deterministic; same input → byte-identical output.
- `<deck>.review.narrative.md` — LLM-authored narrative report (≥200 words). Authored AFTER `runReview` returns; cites slide numbers and finding identifiers.

**With `--annotate`** (5 files): adds `<deck>.annotated.pptx` and `<deck>.annotated.pdf` via `/instadecks:annotate`.

A run-dir mirror at `.planning/instadecks/<runId>/` archives copies of the JSON + MD for audit.

## Invocation modes

**Standalone CLI** (RVW-07):
```bash
node skills/review/scripts/cli.js <deckPath> --findings <doc.json> [--out-dir <dir>] [--run-id <id>] [--annotate]
```
Prints the run summary as JSON to stdout.

**Structured handoff** (D-04) — for skills/scripts importing in-process:
```js
const { runReview } = require('skills/review/scripts/index');
const result = await runReview({
  deckPath, findings, mode: 'structured-handoff',
  outDir, runId, annotate: false,
});
// result === {
//   jsonPath, mdPath, narrativePath,    // sibling-of-input paths
//   runDir, runId,
//   findingCounts: { critical, major, minor, nitpick },
//   genuineCount,
//   // when annotate: true
//   annotatedPptx, annotatedPdf,
// }
```
The narrative MD path is returned but NOT written by `runReview` — the calling agent authors it post-call (see "Two-report architecture" below).

## The DECK-VDA methodology

DECK-VDA (Visual Design Audit) is a four-pass critique pattern. It was developed as the standalone `deck-design-review` skill by Shafqat Ullah / Sourcevo and is canonicalized here as first-class authored content under Apache-2.0 (see NOTICE). The four passes, the 4-tier severity grammar, the finding grammar, the §1–§5 reporting structure, and the maturity rubric are reproduced and re-expressed below.

### The 4-pass scan

Run these passes in order. Each pass widens the lens on a specific layer of the deck.

| # | Pass | Lens | Looks for |
|---|------|------|-----------|
| 1 | MACRO | Whole-deck system | Inferred design system: primary/secondary palette, type scale, grid, slide-master spine, recurring components. |
| 2 | TYPOGRAPHY | Type as system | Font families, weight ramp, size ramp, leading, tracking, hierarchy clarity, body-copy line-length, title-case vs sentence-case consistency. |
| 3 | DATA & OBJECTS | Charts, tables, diagrams | Chart-type fit, axis labels, legend placement, data-ink ratio, table grid weight, diagram arrow weight, alignment to grid. |
| 4 | MICRO | Per-slide polish | Alignment of individual elements, optical balance, kerning glitches, color drift, image cropping, accent-line drift. |

### 4-tier severity grammar

Findings are emitted at one of four tiers. **Producers (this skill, `/content-review`) ALWAYS emit the full 4-tier vocabulary. Pre-collapsing here is a contract violation — see §"Severity-collapse boundary" below.**

| Tier | Glyph | When to use |
|------|-------|-------------|
| Critical | 🔴 | Factual error, broken hierarchy, illegible text at presentation distance, accessibility failure (contrast <3:1 on body copy). |
| Major | 🟠 | Significant cognitive-load increase, distracting layout drift, multi-slide consistency break. |
| Minor | 🟡 | Localized polish issue: one slide, single element. |
| Nitpick | ⚪ | Sub-perceptual: kerning <1pt, half-pixel alignment. Often `genuine: false` after rationale review. |

**Calibration rule:** when uncertain between two tiers, choose the LOWER tier. Reviewers calibrate up via second pass, never down.

### Finding grammar

Every finding text MUST match this grammar:

```
[Severity] | [Category] — [Location] — [Defect] — [Standard violated] — [Fix]
```

Categories: `defect` (factual/visual error), `improvement` (could be better), `style` (R18 AI-tell or stylistic drift). The finding object also carries `severity_reviewer`, `genuine` (LLM judgment), `nx`/`ny` (normalized [0,1] coordinates), `text`, `rationale`, `location`, `standard`, `fix` per `skills/review/references/findings-schema.md` v1.0.

### Report structure (§1–§5, locked ordering)

The fixed Markdown report is divided into five numbered sections. `render-fixed.js` enforces ordering deterministically:

- **§1 Systemic findings** — issues that span ≥3 slides or apply deck-wide. `slideNum: null` findings live here.
- **§2 Inferred design system** — palette, typography ramp, grid, master spine inferred from MACRO pass. Carries forward to chunk handoff for large decks.
- **§3 Per-slide findings** — one block per slide that has findings, sorted by slide number ascending. Within each block, findings sort by severity then `text`.
- **§4 Maturity scoreboard** — single rubric score (see below), first-matching wins.
- **§5 Top-10 highest-leverage fixes** — cherry-picked from §1+§3 by severity × frequency × ease.

### Maturity rubric (first-matching wins)

Walk top to bottom; the first row that matches is the maturity score. Do not average.

| Score | Label | Match if |
|-------|-------|----------|
| 5 | Production | 0 Critical AND ≤2 Major AND ≤8 Minor AND a coherent inferred system. |
| 4 | Polish | 0 Critical AND ≤4 Major. |
| 3 | Functional | 0 Critical AND ≥5 Major. |
| 2 | Draft | 1–2 Critical. |
| 1 | Sketch | ≥3 Critical OR no inferred system. |

### Anti-hallucination rules

These seven rules constrain reviewer behavior. They have been re-expressed for first-class inclusion under Apache-2.0; rule #7 is preserved verbatim because it encodes the locked content-vs-design boundary.

1. **Cite, don't paraphrase.** Every Critical or Major finding must cite a concrete element you observed (slide number, location string). If you cannot cite it, downgrade to Minor or drop it.
2. **No invented standards.** The "Standard violated" field references real, named principles (Tufte, Norman, WCAG, Müller-Brockmann, etc.) or omit the field. Do not coin standards.
3. **Coordinates must be observable.** `nx`/`ny` are normalized to the rendered slide image you actually saw; do not guess at `(0.5, 0.5)` defaults when you didn't measure.
4. **Genuine ≠ severity.** A Nitpick can be `genuine: true`; a Critical can be `genuine: false` if the user's design rationale doc justifies it (P-08).
5. **No Critical without a Fix.** Every Critical finding has a concrete actionable fix. "Reconsider" is not a fix.
6. **Calibrate down on uncertainty.** If you are between Major and Minor, choose Minor. Reviewers add severity in pass 2, never subtract it.
7. **Do NOT flag argument structure, claim-evidence balance, or narrative-arc problems. That is `/content-review`'s territory. When you catch yourself writing "the argument would be stronger if..." — DELETE the line.**

### Large-deck chunking

Decks longer than ~20 slides are reviewed in chunks of 15-20. Chunk handoff payload carries:
- The §2 inferred system (so subsequent chunks score against the same baseline).
- Running per-tier finding counts (so the maturity rubric score is computed once at the end on the merged set).
- The deck-systemic candidate list (a finding becomes systemic when ≥3 slides have it).

## R18 AI-tell detection — code side (auto-applied)

`skills/review/scripts/ai-tells.js` runs three deterministic heuristics on the deck XML before the LLM passes start:

1. **Default-blue palette dominance** — fires when ≥30% of `<a:srgbClr>` values fall in the canonical PowerPoint default-blue set (`#0070C0`, `#1F4E79`, `#2E75B6`, `#4472C4`, `#5B9BD5`, `#8FAADC`).
2. **Accent-line-under-title** — thin full-width rectangle within ~12pt of the title baseline on ≥3 slides.
3. **Identical layouts repeated** — shape-graph SHA-256 collisions on ≥3 slides.

Each emitted finding is tagged `r18_ai_tell: true`, `category: 'style'`, `genuine: true`, with full 4-tier severity. The agent merges these findings into its findings array BEFORE calling `runReview`. Per P-08, the agent may flip `genuine: false` when the deck's design-rationale doc justifies the choice; the reviewer side never does.

## R18 AI-tell detection — fuzzy side (LLM judgment)

The LLM judges these residual fuzzy tells during the MACRO and TYPOGRAPHY passes. Each is emitted with `category: 'style'` and `r18_ai_tell: true`:

- **Vague jargon** — "synergize", "leverage", "unlock potential". Count per slide; flag if >2/slide.
- **Generic stock-photo vibes** — people-pointing-at-screens, abstract handshakes, faceless suits.
- **AI-flavored phrasing** — "In today's rapidly evolving landscape, …", "It's important to note that …".
- **Inconsistent voice** across speaker notes (formal on slide 3, casual on slide 7, no rationale).
- **Title-case shouting** — every word capitalized for emphasis instead of typographic hierarchy.

## Two-report architecture (D-06)

Two Markdown reports are produced per run:

- **`<deck>.review.md`** — the FIXED-TEMPLATE report. Rendered by `skills/review/scripts/render-fixed.js`. Pure function: same findings → byte-identical Markdown. This is the audit trail.
- **`<deck>.review.narrative.md`** — the NARRATIVE report. Authored by the calling agent AFTER `runReview` returns. Audience: a decision-maker who has not read §3 yet. Constraints: ≥200 words; MUST cite slide numbers and the finding text it is summarizing (do not invent finding IDs that are not in the JSON).

`runReview` writes the fixed MD to disk and returns `narrativePath` as the location where the agent should write the narrative — but does NOT write it. The integration test asserts `narrativePath` does not exist on `runReview` return.

## --annotate gating (D-03)

The annotate pipeline is gated. Default behavior is standalone (3 outputs only) — principle of least surprise.

Triggers:
- Explicit `--annotate` flag on the CLI.
- Natural-language mention in the user's prompt: `annotate`, `overlay`, `markup`, "show me the issues on the slides", or similar.

When triggered, the agent passes `annotate: true` to `runReview`, which lazy-loads `runAnnotate` from `/instadecks:annotate` and produces the two extra outputs.

## Severity-collapse boundary (P-01 — locked invariant)

**Producers (this skill, `/content-review`) emit FULL 4-tier severity (`Critical`, `Major`, `Minor`, `Nitpick`). The 4→3 collapse to `MAJOR` / `MINOR` / `POLISH` happens ONLY at the `/instadecks:annotate` adapter (Phase 2). Pre-collapsing here breaks `/content-review` and the future r18-only filter.**

The schema validator (`skills/review/scripts/lib/schema-validator.js`) rejects pre-collapsed severities at runtime; tests in Plan 03-02 assert this contract.

## Content-vs-design boundary

This skill flags **visual / typographic / layout** issues only. Argument structure, claim/evidence balance, narrative-arc problems are `/instadecks:content-review`'s territory (Phase 6). When you catch yourself writing "the argument would be stronger if..." — DELETE the line.

## Allowed tools

`Bash(soffice:*)`, `Bash(pdftoppm:*)`, `Bash(node:*)`, `Bash(npm:*)`, `Read`.

## Environment

`CLAUDE_PLUGIN_ROOT`, `CLAUDE_PLUGIN_DATA`, `CLAUDE_SESSION_ID` — consumed by `${CLAUDE_PLUGIN_ROOT}/scripts/pptx-to-images.sh` per D-05/RVW-09.

## Deferred (out of scope for this skill / this milestone)

- **Phase 7 DIST-02** — activation tuning to ≥8/10 on the description string. This skill ships the Phase 1 description verbatim; final tuning lands at distribution time.
- **Phase 5 auto-refine** — `/instadecks:create` will consume `runReview` in a convergence loop. The convergence rule (`genuine_findings == 0 AND cycle ≥ 2`) lives there, not here.
- **Phase 6 `/instadecks:content-review`** — separate skill for argument-structure critique. Boundary above.
- **Reviewer-of-reviewer evaluation** — out of v0.1.0 scope.
