---
phase: 04
slug: instadecks-create-scaffold
status: draft
created: 2026-04-28
inherits_from: [01-CONTEXT.md, 02-CONTEXT.md, 03-CONTEXT.md]
---

# Phase 04 — `/instadecks:create` Scaffold + Render Cookbook — CONTEXT.md

> Implementation decisions for downstream researcher and planner. Decisions inherited from prior phases (Phase 1 contract, Phase 2 D-01..D-08, Phase 3 D-01..D-07) are not restated.

---

## Goal Recap (from ROADMAP)

Ship `/instadecks:create` (single-cycle, no auto-refine yet): ingest arbitrary input → generate per-run `render-deck.cjs` from pptxgenjs cookbook + bundled design-ideas guidance (10 palettes / 8 typography / 10 anti-patterns) → produce PPTX + PDF + design-rationale doc covering 8 slide types at 16:9 → every test deck opens cleanly in real Microsoft PowerPoint. Requirements CRT-01, CRT-02, CRT-03, CRT-04, CRT-05, CRT-06, CRT-15.

---

## Inherited Locked Decisions (no re-discussion)

- **Run dir**: `.planning/instadecks/<run-id>/` with `run-id = YYYYMMDD-HHMMSS-<6hex>` (Phase 2 D-01)
- **Sibling-of-input outputs**: writes to run dir with deterministic filenames (`deck.pptx`, `deck.pdf`, `design-rationale.md`); silent overwrite on rerun
- **soffice hardening**: invoke `${CLAUDE_PLUGIN_ROOT}/scripts/pptx-to-images.sh` (Phase 3 D-07); 60s timeout, 1 retry, magic-byte validation, isolated user-instance
- **No reaches outside plugin tree**: paths via `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_PLUGIN_DATA}`; lint-paths.sh enforces
- **pptxgenjs pinned 4.0.1**: ENUM constants (`pres.shapes.OVAL`) only — no string literals (CRT-15)
- **Apache-2.0**, IBM Plex Sans bundled
- **No auto-refine in this phase**: single-cycle generation only (loop is Phase 5)

---

## Phase 4 Gray-Area Decisions

### D-01 — Input Ingestion Strategy

**Decision:** **Agent-driven normalization to a single in-memory `DeckBrief`.**

Inputs (md / plain text / read-only PPTX / PDF / URL / image / transcript / freeform brief / multi-file) are normalized by the **agent itself** in the SKILL.md prompt body using existing tools (Read, WebFetch). The agent emits a structured `DeckBrief` object that downstream code consumes:

```js
{
  topic: string,            // one-line subject
  audience: string,         // who's reading
  tone: string,             // executive | analytical | playful | …
  narrative_arc: string[],  // 5–12 beat outline
  key_claims: [{slide_idx, claim, evidence?, source?}],
  asset_hints: {has_data?, has_quotes?, has_comparison?, has_stats?},
  source_files: string[]    // paths used for traceability
}
```

**Rationale:** Multi-format ingestion is precisely what an agent does well — pdftotext / image OCR / URL fetch / transcript parsing live as Read/WebFetch calls in the SKILL.md prompt, not as Node code. Code consumes the structured brief, not raw input.

**How to apply:**
- `skills/create/SKILL.md` body explicitly enumerates the input modes and instructs the agent to read+summarize each into the `DeckBrief` shape.
- `skills/create/scripts/lib/deck-brief.js` — JSON schema validator + JSDoc typedef; exported for reuse by Phase 5.
- No PDF/image/URL parser code in this phase — the agent does it via existing tools.

---

### D-02 — `render-deck.cjs` Generation Strategy

**Decision:** **Agent-authored per run, NOT a fixed template.** Agent reads cookbook + design-ideas from references, composes a fresh `render-deck.cjs` for each run, writes it to `.planning/instadecks/<run-id>/render-deck.cjs`, then executes it via `node` (CWD = run dir, `NODE_PATH=${CLAUDE_PLUGIN_DATA}/node_modules`).

**Rationale:** CRT-03 explicitly requires "per run, not from a fixed template." Per-run authorship lets the agent tune palette / typography / motif to the brief. Cookbook + design-ideas are reference inputs; the cjs file is generated output.

**How to apply:**
- `skills/create/references/cookbook.md` — pptxgenjs recipes for all 8 slide types (verbose, copy-pasteable into render-deck.cjs).
- `skills/create/references/design-ideas.md` — 10 palettes, 8 typography pairings, 10 anti-patterns (verbatim from Anthropic-bundled `pptx` skill's design-ideas guidance, attributed in NOTICE).
- `skills/create/SKILL.md` — instructs agent to (a) select palette+typography from design-ideas matching `DeckBrief.tone`, (b) compose render-deck.cjs from cookbook recipes per `narrative_arc`, (c) ENUM constants only (lint-enforced).
- `skills/create/scripts/index.js` exports `runCreate({brief, runId, outDir, mode})` that: writes brief.json, prompts agent to author render-deck.cjs (in standalone mode the SKILL.md flow does this), executes node on it, captures stdout/stderr, returns `{deckPath, pdfPath, rationalePath, slidesCount}`.

---

### D-03 — Cookbook Structure

**Decision:** **One markdown file per slide type, + a master index.** Each recipe is a self-contained pptxgenjs snippet with: imports/setup, slide.addText / addShape / addTable / addChart calls, layout constants (16:9 inches), enum-only shape constants, action-title example.

**Rationale:** Per-type files let the agent grep precisely (`title`, `2-column`, `data-chart`…) and copy a tight block. A monolithic cookbook would force the agent to load too much context per generation.

**How to apply:**
- `skills/create/references/cookbook.md` (master index) — pptxgenjs setup boilerplate + table linking 8 sub-files.
- `skills/create/references/cookbook/{title,section,2col,comparison,data-chart,data-table,stat-callout,quote,closing}.md` — one recipe each (closing is the 9th but considered a variant of title/section per CRT-04 so it's filed under `closing.md`).
- Each recipe includes a "DO" example, a "DON'T" anti-pattern (e.g., `addShape('rect', …)` ❌ → `addShape(pres.shapes.RECTANGLE, …)` ✅), and the action-title placeholder.

> **Note on slide-type count:** ROADMAP enumerates 9 names (title / section / 2-column / comparison / data-chart / data-table / stat-callout / quote / closing) but CRT-04 says "8 slide types." The cookbook ships 9 recipes; the "8 slide types" success criterion is satisfied by any single test deck demonstrating the 8 non-closing types (closing is variant). This is captured in the must-have plan acceptance.

---

### D-04 — Palette / Typography Selection

**Decision:** **Agent-driven, content-informed, with guardrails in code.**

The agent picks palette + typography from `design-ideas.md` based on `DeckBrief.tone` and `topic`. Code enforces guardrails:

1. **No default-blue** without explicit justification (R18 anti-tell): the chosen palette must NOT collapse to `#0070C0` / `#1F4E79` / `#2E75B6` family unless the brief explicitly says "corporate blue" or similar.
2. **Typography pair exists** in the curated 8-pair list (validated against a pinned JSON list in `references/design-ideas.json`).
3. **IBM Plex Sans is the body-text default** if any chosen pair includes "Plex" — already bundled.

**Rationale:** Selection is judgment (LLM territory); validation is determinism (code territory). Hybrid mirrors Phase 3 D-02 (R18 detection split between code and prompt).

**How to apply:**
- `skills/create/references/design-ideas.json` — pinned 10-palette + 8-typography list (machine-readable companion to design-ideas.md narrative).
- `skills/create/scripts/lib/design-validator.js` — `validateDesignChoice({palette, typography, brief})` returns `{ok, violations[]}`; SKILL.md instructs the agent to call it (or the renderer wraps it in a pre-flight check).
- Default-blue guardrail logged to design-rationale doc when triggered.

---

### D-05 — PowerPoint Compatibility Gate (CRT-15)

**Decision:** **Three-layer gate.**

| Layer | Mechanism | Blocks ship? |
|---|---|---|
| 1. Static lint (CI) | `tools/lint-pptxgenjs-enums.js` — greps render-deck.cjs and all generated samples for `addShape\(['"]\w+['"]` literal strings; fails build | YES — phase test gate |
| 2. Generation-time guard | `skills/create/scripts/lib/enum-lint.js` — same regex applied to agent-written render-deck.cjs before `node` execution; throws if violated | YES — runtime gate |
| 3. Real-PowerPoint open verification | Manual checklist in `tests/POWERPOINT-COMPATIBILITY.md` — Phase 7 release gate, NOT Phase 4 CI | NO in Phase 4; YES in Phase 7 |

**Rationale:** Layers 1+2 catch the most common failure (string-literal shape names) deterministically and ship in Phase 4. Layer 3 (actually opening files in PowerPoint Mac+Windows) is human-in-the-loop, deferred to Phase 7 release gate per ROADMAP success criterion #4 wording (which explicitly names the release gate). Phase 4 CI exit criterion is layers 1+2 green plus a sanity check that the generated PPTX passes basic OOXML schema validation via `unzip -p deck.pptx ppt/presentation.xml | xmllint --noout -`.

**How to apply:**
- `tools/lint-pptxgenjs-enums.js` runs in `npm test` and CI.
- `skills/create/scripts/lib/enum-lint.js` exported and called from `runCreate`.
- `tests/POWERPOINT-COMPATIBILITY.md` checklist created in Phase 4, executed in Phase 7.

---

### D-06 — Action-Title Generation

**Decision:** **Agent prompt-driven, with one assertion in code.**

The SKILL.md body instructs the agent: every slide title MUST be a claim (subject-verb-object), NOT a topic. Examples ship in the cookbook recipes. Code asserts: `slide_title.length >= 3 words AND slide_title contains a verb` via a tiny POS-tag heuristic in `lib/title-check.js` (a verb-list lookup, not full NLP).

**Rationale:** Action titles are a content-quality decision (LLM territory). Code can catch the laziest violations ("Overview", "Introduction", "Q&A") via a blocked-words list.

**How to apply:**
- Cookbook recipes show "Topic: ❌ 'Q3 Revenue' / Action: ✅ 'Q3 revenue grew 23% on enterprise expansion'."
- `skills/create/scripts/lib/title-check.js` exports `validateTitle(title)` returning `{ok, reason?}`; SKILL.md instructs agent to call before render; runtime warning (not hard fail) if violated.
- Blocked words: `Overview, Introduction, Outline, Agenda, Summary, Conclusion, Q&A, Thank You, Background` (case-insensitive). Override allowed via explicit `{action_title_override: true}` in the slide spec for genuine cases (e.g. closing "Thank You" slide is allowed).

---

### D-07 — Design-Rationale Doc Format

**Decision:** **Fixed-template Markdown, agent-authored sections.**

`design-rationale.md` ships as a deterministic structure populated by the agent post-render:

```
# Design Rationale — <topic>

## Palette
- Chosen: <name> (<hex codes>)
- Rationale: <2–3 sentences>

## Typography
- Headings: <font>
- Body: <font>
- Pair rationale: <2–3 sentences>

## Motif
<1 paragraph>

## Narrative Arc
1. <slide-1-title> — <beat>
2. ...

## Key Tradeoffs
- <tradeoff 1>
- <tradeoff 2>

## Reviewer Notes (Phase 5+ only)
(Empty in Phase 4; populated by auto-refine loop with non-genuine findings.)
```

**Rationale:** Fixed template is auditable and matches Phase 3 D-06 (fixed-template `.review.md`). LLM authorship preserves prose quality. Reviewer-Notes section is structurally present but empty in Phase 4 — Phase 5 fills it.

**How to apply:**
- `skills/create/scripts/lib/render-rationale.js` — emits the template scaffolding; agent (in SKILL.md flow) fills in each section before final write.
- Section presence is asserted in tests; section content is NOT byte-stable (LLM output).

---

### D-08 — `runCreate` Export Shape

**Decision:** Mirrors Phase 3 `runReview`:

```js
runCreate({
  brief,         // DeckBrief object (D-01)
  runId,         // YYYYMMDD-HHMMSS-<6hex>
  outDir,        // run-dir absolute path
  mode,          // "standalone" | "structured-handoff"
  designChoices  // { palette, typography, motif } — pre-selected by agent or null to defer
})
=> { deckPath, pdfPath, rationalePath, slidesCount, warnings: [] }
```

`structured-handoff` mode is reserved for Phase 5 (auto-refine calls `runCreate` per cycle). Phase 4 implements both modes; Phase 5 wires the loop.

**Rationale:** Parallel to `runReview` (Phase 3 D-04) — predictable agent ergonomics across skills.

**How to apply:**
- `skills/create/scripts/index.js` exports `runCreate`.
- `skills/create/scripts/cli.js` defaults to `standalone` mode.

---

## Canonical References (read in research)

| Artifact | Path | Purpose |
|---|---|---|
| Bundled `pptx` skill design-ideas | (identify in research — `~/.claude/plugins/cache/.../pptx/skills/SKILL.md` or co-located) | Source for 10 palettes / 8 typography / 10 anti-patterns (D-04) |
| pptxgenjs 4.0.1 docs | https://gitbrent.github.io/PptxGenJS/ | Cookbook recipes (D-03) |
| Phase 3 `runReview` shape | `skills/review/scripts/index.js` | API parallel for `runCreate` (D-08) |
| Phase 2 run-dir convention | `.planning/instadecks/<run-id>/` | Reused (D-08) |
| ROADMAP Phase 4 success criteria | `.planning/ROADMAP.md` §"Phase 4" | Acceptance bar |

---

## Code Context

- `skills/create/SKILL.md` (Phase 1 stub) → full body in this phase
- `skills/create/scripts/`: `index.js` (`runCreate`), `cli.js`, `lib/{deck-brief,design-validator,enum-lint,title-check,render-rationale}.js`
- `skills/create/references/`: `cookbook.md`, `cookbook/{title,section,2col,comparison,data-chart,data-table,stat-callout,quote,closing}.md`, `design-ideas.md`, `design-ideas.json`
- `tools/lint-pptxgenjs-enums.js` (CI gate)
- `tests/POWERPOINT-COMPATIBILITY.md` (Phase 7 checklist, created here)
- `tests/`: `create-runtime.test.js`, `create-cookbook-recipes.test.js`, `create-enum-lint.test.js`, `create-title-check.test.js`, `create-design-validator.test.js`, `create-integration.test.js`

---

## Out of Scope (deferred)

- **Auto-refine loop / convergence / oscillation / ledger / interrupt** — Phase 5
- **`/content-review` integration into `/create`** — explicitly v2 per PROJECT.md out-of-scope
- **Real-PowerPoint open gate (Mac + Windows)** — Phase 7 release checklist (D-05 layer 3)
- **Activation rate tuning ≥8/10** — Phase 7 DIST-02
- **Brand auto-detection from URL** — v2 deferred
- **In-deck image generation** — v2 deferred

---

## Open Questions for Researcher

- **Q-1:** Confirm canonical source for the 10 palettes / 8 typography pairings / 10 anti-patterns (Anthropic-bundled `pptx` skill location). Verify license compatibility for re-bundling under Apache-2.0 with NOTICE attribution.
- **Q-2:** pptxgenjs 4.0.1 ENUM coverage — confirm every shape needed for the 8 slide types is enumerated in `pres.shapes.*`. Edge cases: `LINE`, `RIGHT_ARROW`, `RECTANGLE`, `OVAL`, `ROUNDED_RECTANGLE`, `LEFT_BRACE`, etc. (D-05 lint blocks string fallbacks; need confirmation no shape forces a literal).
- **Q-3:** OOXML schema validation tool choice — `xmllint` is system-installed everywhere; is there a stricter PowerPoint-specific validator we should use as Phase 4's automated gate (D-05 layer 1+2)? Or is xmllint + ENUM lint sufficient for v0.1.0?
- **Q-4:** Action-title verb-detection heuristic — is a hardcoded blocked-words list + 3-word minimum sufficient (D-06), or should we add a tiny POS-tag dependency (e.g., `compromise` / `pos`)? Lean toward zero-deps unless the false-negative rate is unacceptable.
- **Q-5:** Existing tests in `tests/` for Phase 2/3 use `node:test` + `node:assert/strict` — confirm same pattern for Phase 4 (no test-framework dependency added).

---

**Approved:** 2026-04-28 (autonomous mode per user directive — proceed without per-decision approval)
