---
name: content-review
description: Critique a presentation deck's content review, argument quality, story flow, claim-evidence balance, and standalone-readability — answer "is my deck persuasive". This skill should be used when the user asks for content review, argument review, narrative review, story flow critique, Pyramid Principle / MECE structural check, narrative arc audit, action-title quality, or claim/evidence audit — distinct from `/instadecks:review` which covers visual design defects. Runs four code-side mechanical checks (action-title / redundancy / jargon / length) plus four prompt-side judgment checks (Pyramid/MECE, narrative-arc, claim-evidence, standalone-readability), emits findings JSON v1.1 + fixed-template Markdown + narrative report, and optionally pipelines into `/instadecks:annotate`.
allowed-tools:
  - Bash(node:*)
  - Bash(npm:*)
  - Bash(unzip:*)
  - Read
  - Write
  - Glob
  - Grep
user-invocable: true
version: 0.1.0
---

# /instadecks:content-review — Argument Quality, Story Flow, Claim/Evidence Critique

Critique a presentation deck's argument structure, story flow, and claim/evidence balance — NOT visual design. Produces a deterministic findings JSON (schema v1.1), a fixed-template Markdown report, and an LLM-authored narrative report. Optionally pipelines into `/instadecks:annotate` for an overlaid PPTX + PDF.

## When to invoke

Use this skill when:

- The user asks for **content review**, **argument review**, **narrative review**, **story flow critique**, or "is my deck persuasive?".
- The user asks for a **Pyramid Principle / MECE** structural check, **narrative arc** audit, **action-title quality** review, or **claim/evidence** audit.
- The user asks "would a stranger reading this deck without me get the message?" (standalone-readability).
- Another skill pipelines a content findings doc into `/instadecks:annotate` (the same handoff `/instadecks:review` uses).

Do NOT use this skill for visual / typographic / layout critique — that is `/instadecks:review`'s territory (DECK-VDA 4-pass methodology). See "Content-vs-design boundary" below.

## Locked invariant — content-vs-design boundary

> **If you catch yourself writing about color, font, alignment, or layout, DELETE the line — that is `/review`'s domain.**

This is a CLAUDE.md hard invariant. Visual / typographic / layout findings belong to `/instadecks:review`. The boundary is enforced by `tests/content-vs-design-boundary.test.js` (CRV-10, lands in Plan 06-03). Crossover is a defect.

## Inputs

- **`deckPath`** (required) — path to `.pptx` deck. PDF input is NOT supported in v1 (text extraction is lossy).
- **Optional `contentExtract`** — pre-extracted content object (saves re-parsing when called from `/instadecks:create` in v2).
- **`--annotate` flag** — gates the pipeline into `/instadecks:annotate` per inherited Phase 3 D-03. Default = standalone (no annotation). Natural-language synonyms (`annotate`, `overlay`, `markup`) also trigger.
- **Optional `--run-id`** — override auto-generated run-id (`YYYYMMDD-HHMMSS-<6hex>`).
- **Optional `--out-dir`** — override default `.planning/instadecks/<runId>/`.

## Outputs

**Standalone** (default — 3 files, sibling-of-input — D-04):

- `<deck>.content-review.json` — findings JSON in the locked v1.1 schema (`category: "content"` + `check_id` per finding). See `skills/review/references/findings-schema.md`.
- `<deck>.content-review.md` — fixed-template report rendered by `skills/content-review/scripts/render-content-fixed.js`. Deterministic; same input → byte-identical output.
- `<deck>.content-review.narrative.md` — LLM-authored narrative on argument flow / persuasiveness (≥200 words, cites slide numbers + finding text). Authored AFTER `runContentReview` returns; the orchestrator returns the path but does NOT write the file.

**With `--annotate`** (5 files): adds `<deck>.annotated.pptx` and `<deck>.annotated.pdf` via `/instadecks:annotate`.

A run-dir mirror at `.planning/instadecks/<runId>/` archives copies of the JSON + MD for audit.

## Invocation modes

**Standalone CLI:**

```bash
node skills/content-review/scripts/cli.js <deckPath> --findings <doc.json> [--out-dir <dir>] [--run-id <id>] [--annotate]
```

Prints the run summary as JSON to stdout.

**Structured handoff** — for skills/scripts importing in-process:

```js
const { runContentReview } = require('skills/content-review/scripts');
const result = await runContentReview({
  deckPath, findings, mode: 'structured-handoff',
  outDir, runId, annotate: false,
});
// result === {
//   jsonPath, mdPath, narrativePath,    // sibling-of-input paths
//   runDir, runId,
//   findingCounts: { critical, major, minor, nitpick },
//   genuineCount,
//   annotated,                          // null if annotate:false
//   // when annotate: true
//   annotatedPptx, annotatedPdf,
// }
```

The narrative MD path is RETURNED but NOT written by `runContentReview` — the calling agent authors it post-call.

## The Eight Content Checks — hybrid orchestration

Four checks run in code (mechanical, deterministic, fast). Four checks run as prompts (judgment — require reading meaning across slides). The agent merges both sets into a single findings doc honoring schema v1.1, then calls `runContentReview`.

### Agent orchestration flow

1. **Extract content** — `const { extractContent } = require('skills/content-review/scripts/lib/extract-content');` returns `{slides: [{slideNum, title, bullets, body, notes, sources, slide_type}]}`.
2. **Run code-side checks** programmatically:
   - `validateTitle(slide.title)` from `skills/create/scripts/lib/title-check.js` (Check 1 — action-title)
   - `checkRedundancy(extract)` from `skills/content-review/scripts/lib/redundancy.js` (Check 2)
   - `checkJargon(slide)` from `skills/content-review/scripts/lib/jargon.js` (Check 3)
   - `checkLength(slide)` from `skills/content-review/scripts/lib/length-check.js` (Check 4)
3. **Run prompt-side checks** — apply the four templates in the next subsections to the extracted content; emit findings honoring the same schema (`category: "content"`, `check_id` ∈ {pyramid-mece, narrative-arc, claim-evidence, standalone-readability}).
4. **Merge** code-side and prompt-side findings into one findings doc (`schema_version: "1.1"`, slides[] keyed by slideNum).
5. **Call** `runContentReview({deckPath, findings, mode, annotate})`. Validator throws if any finding is malformed.
6. **Author the narrative MD** at `result.narrativePath` (≥200 words; cites slide numbers and finding text verbatim).

See `skills/content-review/references/content-checks.md` for the one-paragraph narrative reference covering all eight checks.

### Check 5 — Pyramid Principle / MECE (`check_id: "pyramid-mece"`)

Read all slide titles in order. The deck should follow Pyramid Principle:

1. **Top of pyramid:** the very first content slide (slide 2 — slide 1 is title) states the deck's GOVERNING THESIS as a single claim.
2. **Pyramid level 2:** the next 2-5 slide titles (or section headers) are the SUPPORTING ARGUMENTS for the governing thesis. They MUST be Mutually Exclusive (no overlap) AND Collectively Exhaustive (cover the thesis without gaps).
3. **Pyramid level 3:** under each supporting argument, the slides provide the EVIDENCE (data, example, source).

Emit a finding when:

- The first content slide does not state a thesis (it labels a topic, or it is an agenda). → `Critical` if no thesis surfaces in the first 3 slides; `Major` if delayed but eventually present.
- Two supporting arguments overlap (violates ME). → `Major`.
- A claim made in level 2 is never substantiated at level 3. → `Major`.
- A relevant supporting argument is missing (violates CE — the deck claims X depends on A,B but only covers A and B without addressing the implicit C). → `Minor` (subjective).

**Finding shape:**

- `category`: `"content"`, `check_id`: `"pyramid-mece"`
- `severity_reviewer`: per above
- `genuine`: agent's judgment; default true unless the deck's design-rationale doc justifies
- `nx, ny`: `(0.5, 0.5)` for whole-deck systemic findings; specific slide coordinates for per-slide
- `slideNum`: `null` for whole-deck systemic findings (lives in §1 of the report); else the specific slide number
- `text`: full grammar — `"[Severity] | content — [location] — [defect] — Pyramid/MECE — [fix]"`
- `standard`: `"Pyramid Principle (Minto 1987)"` or `"MECE (Minto 1987)"`
- `fix`: a CONCRETE rewrite, e.g., `"Insert a thesis slide stating: 'Enterprise SaaS will consolidate to 3 vendors by 2030 because of ...'"`

### Check 6 — Narrative-arc (`check_id: "narrative-arc"`)

Read the deck end-to-end. A persuasive deck follows a setup → tension → resolution shape:

1. **Setup** (first 20-30%): establish the world / status-quo / audience's current belief.
2. **Tension** (middle 40-50%): introduce the disruption / problem / counter-evidence that makes the status-quo untenable.
3. **Resolution** (last 20-30%): present the answer / new framing / call-to-action that resolves the tension.

Emit a finding when:

- Setup is missing or absent — the deck dives directly into solution without establishing why the audience should care. → `Major`. `slideNum: null` (deck-systemic).
- Tension is missing — the deck presents facts without an antagonist (no "but...", no "however...", no counter-evidence). The audience doesn't know what's at stake. → `Critical` if the deck has zero tension; `Major` if tension is present but underdeveloped.
- Resolution is missing — the deck stops at the problem without naming the answer or the ask. → `Critical`.
- Arc inversion — resolution comes BEFORE tension (e.g., recommendations slide at slide 3 out of 12). → `Major`.

**Finding shape:** same as Pyramid/MECE check; `standard`: `"Narrative arc (Duarte, Resonate 2010)"`.

### Check 7 — Claim/evidence balance (`check_id: "claim-evidence"`)

For each non-section slide, identify the slide's PRIMARY CLAIM (the action title's assertion). Then look for SUPPORTING EVIDENCE on the same slide: a number, a source citation, an example, a quote, a chart, a screenshot.

Emit a finding when:

- A slide states a claim with NO supporting evidence on the slide. → `Major`. (Subjective — flag `genuine: false` if speaker notes contain the evidence and the slide is intentionally visual.)
- A slide has evidence but no claim (e.g., a chart with no action title summarizing what the chart shows). → `Minor`. (Already partially caught by Check 1; this is the deeper version.)
- Evidence cited but not sourced (a number with no source line). → `Minor`. `check_id` still `"claim-evidence"` but `text` says `"unsourced number"`.
- Hyperbolic claim ("the most important shift in the last decade") with no quantified evidence. → `Minor`.

**Finding shape:** same; `standard`: `"Claim-evidence balance (Heath, Made to Stick 2007)"`. `fix` MUST cite the slide and propose a concrete addition: `"Add source line citing 'Gartner 2025 forecast, accessed 2026-04-15' under the 80% retention claim"`.

### Check 8 — Standalone-readability (`check_id: "standalone-readability"`)

Read each slide AS IF you are seeing the deck for the first time, with NO presenter narration. Ask: "Does this slide make sense without a human in the room explaining it?"

Emit a finding when:

- A slide depends on the presenter to make sense. Symptoms: a chart with no action title, a list of names with no context, a single image with no caption, a number with no surrounding sentence. → `Major`.
- A slide has speaker notes that are CRITICAL to understanding the on-slide content (i.e., removing them breaks the slide). → `Minor`. (Speaker notes should ENRICH, not COMPLETE.)
- A slide uses an internal abbreviation, project codename, or person's first name without introduction. → `Minor`.
- A slide assumes prior context from a slide ≥3 slides earlier ("as we discussed on slide 3..."). → `Nitpick` unless it's load-bearing.

**Finding shape:** same; `standard`: `"Standalone readability (Reynolds, Presentation Zen 2008; audience-fit per Knaflic 2015)"`.

> **Boundary reminder:** standalone-readability is about WHETHER THE WORDS / DATA make sense alone — NOT about visual readability (contrast, font size, alignment). If you catch yourself writing about color, font, alignment, or layout, DELETE the line — that is `/review`'s domain.

## Severity grammar (4-tier producer side)

| Tier | Glyph | When to use |
|------|-------|-------------|
| Critical | 🔴 | No thesis in first 3 slides; missing resolution; deck has zero tension. |
| Major | 🟠 | MECE violation; missing setup; claim without on-slide evidence; standalone-readability failure. |
| Minor | 🟡 | Unsourced number; hyperbolic claim; missing introduction of internal codename. |
| Nitpick | ⚪ | "As discussed on slide 3..." backreference (non-load-bearing). |

**Producers (this skill, `/instadecks:review`) ALWAYS emit the full 4-tier vocabulary.** The 4→3 collapse to MAJOR / MINOR / POLISH happens ONLY at the `/instadecks:annotate` adapter. Pre-collapsing here is a contract violation (P-01).

**Calibration rule:** when uncertain between two tiers, choose the LOWER tier. Reviewers calibrate up via second pass, never down.

## Finding grammar

Every finding `text` MUST match this grammar:

```
[Severity] | [Category] — [Location] — [Defect] — [Standard violated] — [Fix]
```

For content findings: `category` is always `"content"`; `check_id` is one of `{action-title, redundancy, jargon, length, pyramid-mece, narrative-arc, claim-evidence, standalone-readability}`.

Example: `"Major | content — slide 2 body — claim "40% retention" lacks source citation — Heath, Made to Stick 2007 — Add source line citing 'Gartner 2025 forecast, accessed 2026-04-15'"`.

## Report structure (§1–§5, locked ordering)

`render-content-fixed.js` produces a deterministic 5-section Markdown report:

- **§1 Deck-Level Argument Structure** — Pyramid/MECE/narrative findings with `slideNum: null`.
- **§2 Inferred Argument Architecture** — thesis statement + supporting points + tension/resolution beats. The agent declares this in the narrative MD.
- **§3 Slide-by-Slide Content Findings** — one block per slide that has findings.
- **§4 Content Maturity Scoreboard** — first-match-wins rubric below.
- **§5 Top 10 Content Fixes** — highest-leverage fixes by severity × frequency.

### Content maturity rubric (first-match-wins)

| Score | Label | Match if |
|-------|-------|----------|
| 5 | Persuasive | 0 Critical AND ≤2 Major AND coherent thesis surfaces in first 3 slides |
| 4 | Argued | 0 Critical AND ≤4 Major |
| 3 | Informational | 0 Critical AND ≥5 Major (deck states facts but doesn't persuade) |
| 2 | Draft | 1–2 Critical |
| 1 | Notes | ≥3 Critical OR no thesis OR no resolution |

## --annotate gating

The annotate pipeline is gated. Default behavior is standalone (3 outputs only) — principle of least surprise.

Triggers:

- Explicit `--annotate` flag on the CLI.
- Natural-language mention in the user's prompt: `annotate`, `overlay`, `markup`, "show me the issues on the slides", or similar.

When triggered, the agent passes `annotate: true` to `runContentReview`, which lazy-loads `runAnnotate` from `/instadecks:annotate` (P-07 / CRV-11) and produces the two extra outputs. The `/annotate` adapter accepts `category: "content"` (Plan 06-01 lockstep patch) and applies the standard severity collapse: Critical/Major content → MAJOR (orange); Minor → MINOR (blue); Nitpick → POLISH (grey).

## Two-report architecture (D-04)

Two Markdown reports are produced per run:

- **`<deck>.content-review.md`** — the FIXED-TEMPLATE report. Rendered by `render-content-fixed.js`. Pure function: same findings → byte-identical Markdown. This is the audit trail.
- **`<deck>.content-review.narrative.md`** — the NARRATIVE report. Authored by the calling agent AFTER `runContentReview` returns. Audience: a decision-maker who has not read §3 yet. Constraints: ≥200 words; MUST cite slide numbers and the finding text it is summarizing (do not invent finding IDs that are not in the JSON).

## Anti-hallucination rules

1. **Cite, don't paraphrase.** Every Critical or Major finding must cite a concrete slide number / location. If you cannot cite it, downgrade to Minor or drop it.
2. **No invented standards.** The "Standard violated" field references real, named principles (Minto, Duarte, Heath, Reynolds, Knaflic) or omit the field. Do not coin standards.
3. **Stay in your lane.** Do NOT flag visual / typographic / layout issues. That is `/instadecks:review`'s territory. **If you catch yourself writing about color, font, alignment, or layout, DELETE the line — that is `/review`'s domain.**
4. **No Critical without a Fix.** Every Critical finding has a concrete actionable fix. "Reconsider" is not a fix.
5. **Calibrate down on uncertainty.** If you are between Major and Minor, choose Minor. Reviewers add severity in pass 2, never subtract it.

## Allowed tools

`Bash(node:*)`, `Bash(npm:*)`, `Bash(unzip:*)` (for content extraction), `Read`, `Write`, `Glob`, `Grep`. The annotate pipeline (`Bash(soffice:*)`, `Bash(pdftoppm:*)`) is loaded transitively only when `--annotate` is set.

## Environment

`CLAUDE_PLUGIN_ROOT`, `CLAUDE_PLUGIN_DATA`, `CLAUDE_SESSION_ID` — consumed transitively by `/instadecks:annotate` when piped.

## Deferred (out of scope for this skill / this milestone)

- **CRV-10 boundary regression test** — fixture deck + cross-domain test, lands in Plan 06-03.
- **Content-review integration into `/create`'s loop** — v2 (PROJECT.md).
- **PDF input** — v1.x.
- **Phase 7 DIST-02** — activation-rate tuning ≥8/10 on the description string.
- **Per-check accuracy metrics dashboard** — v1.x.
