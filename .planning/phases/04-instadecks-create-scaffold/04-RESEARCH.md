---
phase: 04
slug: instadecks-create-scaffold
type: research
created: 2026-04-28
inherits_from: [01-RESEARCH.md, 02-RESEARCH.md, 03-RESEARCH.md]
research_date: 2026-04-28
valid_until: 2026-05-28
confidence: HIGH
---

# Phase 04 — `/instadecks:create` Scaffold + Render Cookbook — RESEARCH

## Summary

Phase 4 ships the single-cycle generator: agent normalizes arbitrary input into a `DeckBrief`, picks palette+typography from the bundled `design-ideas.md` (curated, **author-original**, NOT copied from Anthropic's pptx skill — see Q-1 finding), composes a per-run `render-deck.cjs` from a 9-recipe cookbook, executes it under `node` with `NODE_PATH=${CLAUDE_PLUGIN_DATA}/node_modules`, and emits PPTX + PDF + design-rationale. CRT-15 (PowerPoint compatibility) is enforced by a 3-layer gate: static lint (CI grep for `addShape\(['"]\w+['"]`), generation-time guard (same regex on agent-written cjs before exec), real-PowerPoint open (deferred to Phase 7 release gate).

The dominant research finding is a **license blocker**: Anthropic's bundled pptx skill (`~/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin/.../skills/pptx/`) carries `LICENSE.txt: © 2025 Anthropic, PBC. All rights reserved. ... users may not: Reproduce or copy these materials ... Create derivative works ... Distribute, sublicense`. Bundling the 10-palette + 8-typography + Avoid-list prose verbatim under Apache-2.0 with NOTICE attribution — as assumed in `.planning/research/SUMMARY.md` and Phase 4 D-04 — **violates this license**. We must author original guidance: keep the same *factual structure* (~10 palettes, ~8 type pairs, ~10 anti-patterns), but write fresh prose, choose original palette names + hex values, and cite "inspired by" rather than "verbatim from" in NOTICE.

**Primary recommendation:** Adopt 4 plans (Plan 04-01 fixtures + pure-function libs → Plan 04-02 cookbook + author-original design-ideas → Plan 04-03 `runCreate` orchestrator + CLI + CI lint gate → Plan 04-04 `SKILL.md` full body + integration test + `POWERPOINT-COMPATIBILITY.md` checklist). Mirror Phase 3's plan layout (4–5 plans, ~10–13 tests) and `node:test`/`node:assert` pattern. Pin no new runtime deps; `tools/lint-pptxgenjs-enums.js` is shell+node only.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Inherited from prior phases (do not re-discuss):**
- Run dir: `.planning/instadecks/<run-id>/` with `run-id = YYYYMMDD-HHMMSS-<6hex>` (Phase 2 D-01).
- Sibling-of-input outputs: writes to run dir with deterministic filenames (`deck.pptx`, `deck.pdf`, `design-rationale.md`); silent overwrite on rerun.
- soffice hardening: invoke `${CLAUDE_PLUGIN_ROOT}/scripts/pptx-to-images.sh` (Phase 3 D-07); 60s timeout, 1 retry, magic-byte validation, isolated user-instance.
- No reaches outside plugin tree: paths via `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_PLUGIN_DATA}`; `lint-paths.sh` enforces.
- pptxgenjs pinned 4.0.1: ENUM constants (`pres.shapes.OVAL`) only — no string literals (CRT-15).
- Apache-2.0; IBM Plex Sans bundled under SIL OFL.
- No auto-refine in this phase: single-cycle only (Phase 5).

**Phase 4 D-01..D-08 (locked 2026-04-28, autonomous mode):**
- **D-01 — Input ingestion:** Agent-driven normalization to in-memory `DeckBrief` `{topic, audience, tone, narrative_arc[], key_claims[{slide_idx, claim, evidence?, source?}], asset_hints, source_files[]}`. No PDF/image/URL parser code in this phase.
- **D-02 — `render-deck.cjs` generation:** Agent-authored per run (NOT a fixed template). Written to `.planning/instadecks/<run-id>/render-deck.cjs`, executed via `node` with CWD=run-dir, `NODE_PATH=${CLAUDE_PLUGIN_DATA}/node_modules`.
- **D-03 — Cookbook:** One markdown file per slide type + master index. `skills/create/references/cookbook/{title,section,2col,comparison,data-chart,data-table,stat-callout,quote,closing}.md` (9 files); master at `skills/create/references/cookbook.md`.
- **D-04 — Palette/typography selection:** Agent-driven content-informed choice; code guardrails (no default-blue without justification; typography pair must exist in pinned JSON list; IBM Plex Sans is body default if "Plex" present).
- **D-05 — PowerPoint-compat gate (CRT-15):** Three layers — (1) static lint `tools/lint-pptxgenjs-enums.js` greps for `addShape\(['"]\w+['"]` literals → CI fail; (2) generation-time guard `lib/enum-lint.js` runs same regex on cjs before `node` exec → throws; (3) real-PPT-open Phase 7. Phase 4 also runs `xmllint --noout` on `unzip -p deck.pptx ppt/presentation.xml` for OOXML sanity.
- **D-06 — Action-title:** Prompt-driven; code asserts `≥3 words AND contains a verb` via blocked-words list (Overview, Introduction, Outline, Agenda, Summary, Conclusion, Q&A, Thank You, Background) + tiny verb-list lookup. Override via `{action_title_override: true}` slide-spec field. Runtime warning, NOT hard fail.
- **D-07 — Design-rationale doc:** Fixed-template Markdown (Palette / Typography / Motif / Narrative Arc / Key Tradeoffs / Reviewer Notes — empty in P4). Section presence asserted; content NOT byte-stable.
- **D-08 — `runCreate` export shape:** `runCreate({brief, runId, outDir, mode, designChoices}) => {deckPath, pdfPath, rationalePath, slidesCount, warnings: []}`. Modes: `'standalone' | 'structured-handoff'`. Both implemented in P4; P5 wires the loop.

### Claude's Discretion

- Wave decomposition + plan count (target 4–5, mirroring Phase 3).
- Test file naming (follow `tests/create-*.test.js` pattern).
- Verb-list size for `lib/title-check.js` (D-06 — see Q-4 finding).
- Cookbook recipe code style (verbose vs terse) — recommend verbose for copy-paste-ability.
- Default palette / typography selection if `DeckBrief.tone` is empty.

### Deferred Ideas (OUT OF SCOPE)

- Auto-refine loop / convergence / oscillation / ledger / interrupt — **Phase 5**.
- `/content-review` integration into `/create` — **v2** per PROJECT.md.
- Real-PowerPoint open gate (Mac + Windows) — **Phase 7** release checklist (D-05 layer 3).
- Activation rate tuning ≥8/10 — **Phase 7** DIST-02.
- Brand auto-detection from URL — **v2**.
- In-deck image generation — **v2**.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CRT-01 | Multi-format input → PPTX + PDF + design-rationale | D-01 (agent-driven `DeckBrief`); §"Cookbook recipes" + §"runCreate API" below |
| CRT-02 | Agent-generated `render-deck.cjs` per run, palette/typography content-informed | D-02 + D-04; §"design-ideas.md authoring" below |
| CRT-03 | "Per run, not from fixed template" | D-02; §"render-deck.cjs flow" below |
| CRT-04 | All 8 slide types render at 16:9 (title, section, 2-column, comparison, data-chart, data-table, stat-callout, quote — closing as variant) | §"9 cookbook recipes" below; pptxgenjs 4.0.1 verified API |
| CRT-05 | Action titles, page numbers, source lines, speaker notes default | D-06 (action titles); §"Recipe boilerplate" includes page#/source/notes |
| CRT-06 | PowerPoint compatibility release gate; lint forbids string-literal shape names | D-05 three-layer gate |
| CRT-15 | `pres.shapes.OVAL` enum, never `addShape('oval', ...)` | D-05; §"Enum verification" below — 184 enums confirmed |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| Input normalization (md/PDF/URL/image/transcript → `DeckBrief`) | Agent (SKILL.md prompt) | — | Multi-format judgment; no Node parser ships in P4 (D-01) |
| `DeckBrief` schema validation | Plugin Node lib | — | Deterministic; reusable by P5 |
| Palette/typography selection | Agent (SKILL.md) | Plugin guardrails (`design-validator.js`) | Selection is judgment; validation is determinism (parallels Phase 3 D-02) |
| `render-deck.cjs` authoring | Agent (SKILL.md, per run) | Cookbook references (read-only) | Per-run authorship; cookbook is reference, not template (D-02) |
| `render-deck.cjs` execution | Plugin Node (`runCreate` spawns `node`) | — | Deterministic; CWD + NODE_PATH set correctly |
| PPTX→PDF | `${CLAUDE_PLUGIN_ROOT}/scripts/pptx-to-images.sh` (Phase 3 D-07) reused | — | Shared hardened wrapper; no soffice changes in P4 |
| Enum lint (CRT-15) | Plugin Node (`lib/enum-lint.js` + `tools/lint-pptxgenjs-enums.js`) | — | Static regex; deterministic |
| Action-title check | Plugin Node (`lib/title-check.js`) | Agent (SKILL.md asks for claim titles) | Hybrid: code blocks the obvious, prompt does the rest |
| Design-rationale assembly | Plugin Node (`lib/render-rationale.js` template) | Agent fills sections | Mirrors Phase 3 D-06 fixed-MD pattern |
| OOXML sanity check | Plugin (`xmllint --noout` shell call wrapped in `runCreate`) | — | Free, system-installed; catches gross corruption |

---

## Standard Stack

### Core (already pinned, no new deps)

| Library | Version | Purpose | Source |
|---|---|---|---|
| `pptxgenjs` | `4.0.1` exact | PPTX rendering | `[VERIFIED: package.json + npm view pptxgenjs version → 4.0.1]` |
| `node:test` + `node:assert/strict` | built-in | Test runner (matches Phase 2/3) | `[VERIFIED: tests/review-runtime.test.js]` |
| `node:fs/promises`, `node:path`, `node:child_process` | built-in | Run-dir IO + spawn `node` for cjs | `[VERIFIED]` |
| LibreOffice `soffice` ≥ 7.4 | system | PPTX→PDF (via `pptx-to-images.sh`) | `[VERIFIED: Phase 3 D-07]` |
| `xmllint` | system (libxml2) | OOXML sanity | `[VERIFIED: macOS ships libxml2 by default; Q-3 below]` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|---|---|---|
| Hand-rolled blocked-word title check | `compromise` / `pos` POS-tagger | +200KB dep; false-positive rate of blocked-words is ~0 for the 9 listed words; **reject** (Q-4) |
| `xmllint` for OOXML sanity | `officegen-validator` | Not maintained; xmllint catches gross corruption (the cases that matter); **keep xmllint** |
| `ajv` for `DeckBrief` schema validation | hand-rolled validator (Phase 3 pattern) | Phase 3 chose hand-rolled; consistency wins; **hand-roll** |

### Version Verification

```bash
$ npm view pptxgenjs version
4.0.1
$ node -e "const p=new (require('pptxgenjs'))(); console.log(Object.keys(p.shapes).length, Object.keys(p.charts).length)"
184 10
```

**Verified:** pptxgenjs 4.0.1 is the current `latest`; 184 shape ENUMs, 10 chart ENUMs. No version drift since Phase 1 lock. `[VERIFIED: live npm registry + local node_modules introspection 2026-04-28]`

---

## Architecture Patterns

### System Architecture Diagram

```
                                    ┌──────────────────────────────────┐
   user input ──────────────────────│ /instadecks:create  (SKILL.md)   │
   (md / PDF / PPTX / URL / image / │  Agent normalizes → DeckBrief    │
    transcript / brief / multi)     │  Agent reads cookbook + design-  │
                                    │  ideas; picks palette+type;       │
                                    │  authors render-deck.cjs to       │
                                    │  run-dir; calls runCreate()       │
                                    └────────────────┬─────────────────┘
                                                     │
                                  ┌──────────────────┴──────────────────┐
                                  │                                     │
                  ┌───────────────▼──────────────┐         ┌────────────▼────────────┐
                  │ skills/create/scripts/index  │         │ skills/create/scripts/  │
                  │   runCreate(brief,runId,…)   │         │ lib/                    │
                  │   1. validate brief          │         │   deck-brief.js         │
                  │   2. enum-lint cjs           │◄────────│   enum-lint.js          │
                  │   3. spawn node cjs          │         │   title-check.js        │
                  │   4. xmllint --noout PPTX    │         │   design-validator.js   │
                  │   5. soffice → PDF (P3 sh)   │         │   render-rationale.js   │
                  │   6. assemble rationale.md   │         └─────────────────────────┘
                  │   7. return {…paths…}        │
                  └───────────────┬──────────────┘
                                  │ spawn
                                  ▼
                ┌──────────────────────────────────────┐
                │ .planning/instadecks/<run-id>/       │
                │   render-deck.cjs   (agent-authored) │
                │   brief.json                          │
                │   deck.pptx        ◄── pptxgenjs      │
                │   deck.pdf         ◄── soffice        │
                │   design-rationale.md                 │
                └──────────────────────────────────────┘
                                  │
                                  ▼
              ┌────────────────────────────────────────┐
              │ scripts/pptx-to-images.sh  (Phase 3)   │
              │ -env:UserInstallation per call,        │
              │ 60s timeout, 1 retry, magic-byte check │
              └────────────────────────────────────────┘
```

### Recommended Project Structure (Phase 4 additions)

```
skills/create/
├── SKILL.md                          # Full body (Phase 1 stub → P4 final)
├── scripts/
│   ├── index.js                      # runCreate({brief, runId, outDir, mode, designChoices})
│   ├── cli.js                        # Standalone CLI surface
│   └── lib/
│       ├── deck-brief.js             # DeckBrief schema validator + JSDoc typedef
│       ├── enum-lint.js              # Generation-time guard (D-05 layer 2)
│       ├── title-check.js            # Action-title heuristic (D-06)
│       ├── design-validator.js       # Palette/typography guardrails (D-04)
│       └── render-rationale.js       # Fixed-template MD scaffold (D-07)
└── references/
    ├── cookbook.md                   # Master index + setup boilerplate
    ├── cookbook/
    │   ├── title.md                  # Recipe 1
    │   ├── section.md                # Recipe 2
    │   ├── 2col.md                   # Recipe 3
    │   ├── comparison.md             # Recipe 4
    │   ├── data-chart.md             # Recipe 5
    │   ├── data-table.md             # Recipe 6
    │   ├── stat-callout.md           # Recipe 7
    │   ├── quote.md                  # Recipe 8
    │   └── closing.md                # Recipe 9 (variant)
    ├── design-ideas.md               # Author-original prose (NOT verbatim Anthropic; Q-1)
    └── design-ideas.json             # Pinned 10-palette + 8-typography list

tools/
└── lint-pptxgenjs-enums.js           # CI gate (D-05 layer 1) — npm test + CI

tests/
├── create-deck-brief.test.js         # DeckBrief schema validator unit tests
├── create-enum-lint.test.js          # enum-lint regex coverage
├── create-title-check.test.js        # blocked-words + verb heuristic
├── create-design-validator.test.js   # palette/typography guardrails
├── create-render-rationale.test.js   # fixed-template assertions
├── create-cookbook-recipes.test.js   # static parse-and-eval of all 9 recipes
├── create-runtime.test.js            # runCreate orchestrator integration
├── create-cli.test.js                # standalone CLI surface
├── create-enum-lint-cli.test.js      # tools/lint-pptxgenjs-enums.js CI gate
└── create-integration.test.js        # end-to-end: brief → cjs → pptx → pdf → rationale

POWERPOINT-COMPATIBILITY.md            # Phase 7 release checklist (created in P4, run in P7)
```

### Pattern: Agent-authors-cjs, Code-executes-cjs (D-02)

**What:** Agent reads cookbook + design-ideas, composes a fresh `render-deck.cjs` per run, writes it to run-dir; `runCreate` spawns `node` with the right env to execute it.
**When:** Every `/instadecks:create` invocation.
**Why:** Per-run authorship lets palette/typography/motif track the brief; cookbook is REFERENCE not TEMPLATE (CRT-03).

```javascript
// runCreate sketch — skills/create/scripts/index.js
async function runCreate({ brief, runId, outDir, mode = 'standalone', designChoices = null } = {}) {
  if (!brief) throw new Error('runCreate: brief required');
  const { validateBrief } = require('./lib/deck-brief');
  validateBrief(brief);

  runId = runId || generateRunId();   // YYYYMMDD-HHMMSS-<6hex>
  outDir = outDir || path.join(process.cwd(), '.planning', 'instadecks', runId);
  await fsp.mkdir(outDir, { recursive: true });

  const cjsPath = path.join(outDir, 'render-deck.cjs');
  // Agent has already written cjsPath in standalone mode; in structured-handoff
  // (P5), the loop calls runCreate after re-authoring cjs.

  // D-05 layer 2: generation-time enum guard
  const { lintCjs } = require('./lib/enum-lint');
  const cjsSrc = await fsp.readFile(cjsPath, 'utf8');
  lintCjs(cjsSrc);   // throws Error with line:col on first violation

  // Spawn node with NODE_PATH so verbatim require('pptxgenjs') resolves
  const env = { ...process.env, NODE_PATH: pluginDataNodeModules() };
  const deckPath = path.join(outDir, 'deck.pptx');
  await spawnNode(cjsPath, { cwd: outDir, env });

  // Sanity: OOXML well-formed?
  await xmllintOoxml(deckPath);

  // PPTX → PDF via Phase 3's hardened script
  const pdfPath = await soffice2pdf(deckPath, outDir);

  // Rationale doc (template + agent-filled sections — agent writes in standalone mode)
  const rationalePath = path.join(outDir, 'design-rationale.md');

  return { deckPath, pdfPath, rationalePath, slidesCount, warnings };
}
```

### Pattern: Three-Layer ENUM Gate (D-05 / CRT-15)

```javascript
// tools/lint-pptxgenjs-enums.js  (Layer 1 — CI grep over the whole tree)
const FORBIDDEN = /addShape\s*\(\s*['"]\w+['"]/g;
// Walk skills/**/*.{js,cjs,md} and tests/fixtures/**/*.cjs; fail on match.

// skills/create/scripts/lib/enum-lint.js  (Layer 2 — runtime, applied to agent-authored cjs)
function lintCjs(src, { filename = 'render-deck.cjs' } = {}) {
  const m = src.match(/addShape\s*\(\s*['"](\w+)['"]/);
  if (m) {
    const line = src.slice(0, m.index).split('\n').length;
    throw new Error(
      `[enum-lint] ${filename}:${line} — addShape() called with string literal "${m[1]}". ` +
      `Use pres.shapes.${m[1].toUpperCase()} instead (CRT-15 / D-05).`,
    );
  }
}
```

### Anti-Patterns to Avoid

- **Bundling Anthropic pptx-skill prose verbatim** — proprietary license forbids reproduction (Q-1). Author original prose.
- **`addShape('oval', ...)` string literal** — risk in MS PowerPoint's strict ShapeType parser. Always `pres.shapes.OVAL`.
- **Reusing option objects across `addShape` calls** — pptxgenjs mutates objects in-place (verified in Anthropic pptxgenjs.md cookbook tip #7). Use a factory or fresh literal each call.
- **`#FF0000` hex colors** — corrupt files. Always 6-char no-prefix.
- **8-char hex for transparency** — corrupt files. Use `transparency` / `opacity` field.
- **Unicode bullet `"•"`** — creates double bullets. Use `bullet: true`.
- **`lineSpacing` with bullets** — gappy. Use `paraSpaceAfter`.
- **Authoring `render-deck.cjs` from a fixed template** — violates CRT-03. Cookbook is reference; the cjs is generated output, content-tuned per brief.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| PPTX writing | Custom OOXML | `pptxgenjs@4.0.1` | Already pinned; geometry calibrated against `annotate.js`. |
| PPTX→PDF | Bundle Chromium / headless browser | system `soffice` via `scripts/pptx-to-images.sh` | Phase 3 already hardened — race-free, magic-byte validated. |
| Test framework | Mocha / Jest / Vitest | `node:test` + `node:assert/strict` | Matches Phase 2/3 (Q-5 confirms). Zero new deps. |
| YAML/JSON schema | `ajv` / `joi` / `zod` | Hand-rolled validator (Phase 3 `schema-validator.js` pattern) | Tiny shape, consistent with prior phases. |
| Action-title NLP | `compromise` / `pos` | Blocked-words list + 3-word minimum (D-06) | False-positive rate negligible for 9 listed words; zero deps (Q-4). |
| OOXML schema validation | Custom XSD checker | `xmllint --noout` on `ppt/presentation.xml` | System-installed; catches gross corruption (Q-3). |
| Run-id generation | UUID lib | `crypto.randomBytes(3).toString('hex')` + date format | Already used in Phase 2/3 `generateRunId`. Reuse identical fn. |

**Key insight:** Phase 4 introduces ZERO new runtime or dev dependencies. All five lib files are pure-Node + pinned pptxgenjs. CI gate is shell+node only.

---

## Runtime State Inventory

> **Greenfield phase — no rename/refactor; section retained for completeness.**

| Category | Items Found | Action Required |
|---|---|---|
| Stored data | None — Phase 4 is greenfield additions; no existing run-state to migrate | None |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets/env vars | `NODE_PATH=${CLAUDE_PLUGIN_DATA}/node_modules` set at spawn time only | Document in SKILL.md; no global env mutation |
| Build artifacts | `node_modules/pptxgenjs` already installed (Phase 1); SHA-pinned | None — already verified by `tools/assert-pptxgenjs-pin.js` |

---

## ENUM Verification (Q-2 — exhaustive shape coverage)

**Verified by reading `node_modules/pptxgenjs/types/index.d.ts` lines 405–589 (the `pres.shapes` enum, exported as `enum shapes`):** 184 named constants confirmed. The 9 cookbook recipes use only the following shapes — every one has a `pres.shapes.*` ENUM:

| Shape needed by recipe | ENUM constant | OOXML name |
|---|---|---|
| Page background overlay | `pres.shapes.RECTANGLE` | `rect` |
| Stat-callout circle | `pres.shapes.OVAL` | `ellipse` |
| Section divider line | `pres.shapes.LINE` | `line` |
| Quote attribution bracket | `pres.shapes.LEFT_BRACE` (also `RIGHT_BRACE`) | `leftBrace` / `rightBrace` |
| Comparison rounded card | `pres.shapes.ROUNDED_RECTANGLE` | `roundRect` |
| Closing arrow / next-step | `pres.shapes.RIGHT_ARROW` | `rightArrow` |
| Highlight chevron (optional motif) | `pres.shapes.CHEVRON` | `chevron` |
| Triangle accent (optional motif) | `pres.shapes.RIGHT_TRIANGLE` / `ISOSCELES_TRIANGLE` | `rtTriangle` / `triangle` |

**Charts:** `pres.charts.BAR | LINE | PIE | DOUGHNUT | SCATTER | BUBBLE | RADAR | AREA | BAR3D` (10 total) — `[VERIFIED: types/index.d.ts enum charts + introspection]`.

**No shape forces a string-literal fallback.** Every visual element across all 9 recipes is reachable via the ENUM. CRT-15 is enforceable with no escape hatches.

---

## Q-1 — Anthropic `pptx` Skill License Findings (CRITICAL)

**Located the skill** at:
```
~/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin/
  24b0a82f-d5b9-4c4e-af22-8a11df3e9b68/73143668-db8e-4ee6-823c-d7a566b7a617/
  skills/pptx/
    SKILL.md  (10618 bytes, mtime 2026-04-26)
    LICENSE.txt  (1467 bytes)
    editing.md
    pptxgenjs.md
    scripts/
```

**LICENSE.txt verbatim excerpt:** `[VERIFIED: read 2026-04-28]`

> © 2025 Anthropic, PBC. All rights reserved.
> ... users may not:
> - Extract these materials from the Services or retain copies of these materials outside the Services
> - **Reproduce or copy these materials**, except for temporary copies created automatically during authorized use of the Services
> - **Create derivative works** based on these materials
> - **Distribute, sublicense, or transfer** these materials to any third party

**Conflict:** `.planning/research/SUMMARY.md` lines 35, 343, and Phase 4 D-04 say the 10 palettes / 8 typography / 10 anti-patterns ship "verbatim from Anthropic-bundled `pptx` skill's design-ideas guidance, attributed in NOTICE." This is **incompatible** with Apache-2.0 redistribution. Bundling the prose, palette names, hex values, font-pair names, or Avoid-list wording verbatim would violate Anthropic's terms.

**Recommendation (LOCK):**
1. **Author-original `design-ideas.md` and `design-ideas.json`.** Use the *factual structure* (≈10 named palettes with primary/secondary/accent hexes; ≈8 header+body font pairings; ≈10 anti-patterns covering: layout repetition, body-text centering, size contrast, default blue, mixed spacing, partial styling, text-only slides, padding, low contrast, AI-tell accent lines).
2. **Pick original palette names** (do NOT reuse "Midnight Executive", "Forest & Moss", etc.). Pick original hex values (commission a fresh palette set tuned for IBM Plex Sans body).
3. **Pick original font pairings.** IBM Plex Sans (already bundled, OFL) becomes the body anchor; pair with widely-installed open or system headers (Cambria/Calibri are MS proprietary but they're font *names* requested at render — not redistributed assets, so naming them is fine).
4. **NOTICE attribution:** "Design-ideas guidance is original to this project; the structural pattern (curated palettes + curated typography pairings + anti-patterns list) is inspired by the public design-systems literature." — *NOT* "carried verbatim from."
5. **R18 AI-tell detection in `/review`** (already shipped Phase 3) DOES correctly detect the "accent lines under titles" pattern. That detection code is original — no license issue. The Anti-pattern *concept* (AI accent lines) is unprotectable; the *prose* that describes it is.
6. **Update `.planning/research/SUMMARY.md` and `.planning/research/FEATURES.md`** in a follow-up doc-fix commit (out of scope for P4 plan execution but flagged here so planner can include a "Phase 4 corrects prior research"-style note in design-rationale).

**Confidence:** HIGH `[VERIFIED: read LICENSE.txt directly 2026-04-28]`

---

## The 9 Cookbook Recipes (concrete pptxgenjs 4.0.1 snippets)

All recipes use `pres.layout = 'LAYOUT_16x9'` (10″ × 5.625″). Inches throughout. ENUM constants only. Each recipe ends with the standard footer (page number + source line) and emits speaker notes via `slide.addNotes(...)` (CRT-05).

### Setup boilerplate (top of every render-deck.cjs)

```javascript
'use strict';
const pptxgen = require('pptxgenjs');
const fs = require('node:fs');
const path = require('node:path');

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';            // 10" × 5.625"
pres.author = 'Instadecks';
pres.title  = brief.topic;              // brief loaded from brief.json

// Palette tokens (chosen by agent from design-ideas.json — example shape)
const PALETTE = { primary: '1E2761', secondary: 'CADCFC', accent: 'FFFFFF',
                  ink: '0B1020', muted: '6B7280' };
const TYPE = { heading: 'IBM Plex Sans', body: 'IBM Plex Sans', mono: 'IBM Plex Mono' };

// Layout constants (16:9 inches)
const W = 10, H = 5.625;
const MARGIN_X = 0.5, MARGIN_Y = 0.4;
const TITLE_Y = 0.3, TITLE_H = 0.7;
const FOOTER_Y = H - 0.3;

function addFooter(slide, { pageNum, total, source }) {
  slide.addText(`${pageNum} / ${total}`, {
    x: W - 1.0, y: FOOTER_Y, w: 0.6, h: 0.2,
    fontFace: TYPE.body, fontSize: 9, color: PALETTE.muted, align: 'right', margin: 0,
  });
  if (source) {
    slide.addText(`Source: ${source}`, {
      x: MARGIN_X, y: FOOTER_Y, w: W - 2.0, h: 0.2,
      fontFace: TYPE.body, fontSize: 9, color: PALETTE.muted, italic: true, margin: 0,
    });
  }
}
```

### Recipe 1 — Title Slide (`cookbook/title.md`)

```javascript
function renderTitle(slide, { title, subtitle, attribution, pageNum, total }) {
  slide.background = { color: PALETTE.primary };

  slide.addText(title, {                    // ✅ action-title (claim, not topic)
    x: MARGIN_X, y: 1.6, w: W - 1.0, h: 1.6,
    fontFace: TYPE.heading, fontSize: 40, bold: true,
    color: PALETTE.accent, align: 'left', valign: 'top', margin: 0,
  });
  if (subtitle) slide.addText(subtitle, {
    x: MARGIN_X, y: 3.3, w: W - 1.0, h: 0.6,
    fontFace: TYPE.body, fontSize: 18, color: PALETTE.secondary, margin: 0,
  });
  if (attribution) slide.addText(attribution, {
    x: MARGIN_X, y: H - 0.9, w: W - 1.0, h: 0.3,
    fontFace: TYPE.body, fontSize: 11, color: PALETTE.secondary, margin: 0,
  });
  // No footer page-num on title slide (convention).
  slide.addNotes(`Title slide — establish topic + voice.`);
}
// DO: action-title 'Q3 revenue grew 23% on enterprise expansion'
// DON'T: topic-title 'Q3 Revenue'   ← title-check.js fails this.
```

### Recipe 2 — Section Divider (`cookbook/section.md`)

```javascript
function renderSection(slide, { sectionNum, sectionTitle, pageNum, total }) {
  slide.background = { color: PALETTE.primary };
  slide.addText(String(sectionNum).padStart(2, '0'), {
    x: MARGIN_X, y: 1.8, w: 2, h: 1.0,
    fontFace: TYPE.heading, fontSize: 60, bold: true, color: PALETTE.secondary, margin: 0,
  });
  slide.addText(sectionTitle, {
    x: MARGIN_X + 1.8, y: 2.1, w: W - 2.5, h: 1.4,
    fontFace: TYPE.heading, fontSize: 28, color: PALETTE.accent, margin: 0,
  });
  // Decorative thin line at section-number rail — NOT under the title (R18 anti-tell).
  slide.addShape(pres.shapes.LINE, {
    x: MARGIN_X, y: 3.7, w: 1.5, h: 0,
    line: { color: PALETTE.secondary, width: 2 },
  });
  addFooter(slide, { pageNum, total });
  slide.addNotes(`Section ${sectionNum}: ${sectionTitle}.`);
}
```

### Recipe 3 — Two-Column (`cookbook/2col.md`)

```javascript
function render2Col(slide, { title, leftHeader, leftBody, rightHeader, rightBody, source, pageNum, total }) {
  slide.background = { color: PALETTE.accent };
  slide.addText(title, {
    x: MARGIN_X, y: TITLE_Y, w: W - 1.0, h: TITLE_H,
    fontFace: TYPE.heading, fontSize: 24, bold: true, color: PALETTE.ink, margin: 0,
  });
  const COL_W = (W - MARGIN_X * 2 - 0.4) / 2;
  // Left column
  slide.addText(leftHeader, {
    x: MARGIN_X, y: 1.3, w: COL_W, h: 0.5,
    fontFace: TYPE.heading, fontSize: 16, bold: true, color: PALETTE.primary, margin: 0,
  });
  slide.addText(leftBody.map((s, i) => ({
    text: s, options: { bullet: true, breakLine: i < leftBody.length - 1 },
  })), {
    x: MARGIN_X, y: 1.9, w: COL_W, h: H - 2.6,
    fontFace: TYPE.body, fontSize: 14, color: PALETTE.ink, paraSpaceAfter: 6, margin: 0,
  });
  // Right column
  const RIGHT_X = MARGIN_X + COL_W + 0.4;
  slide.addText(rightHeader, {
    x: RIGHT_X, y: 1.3, w: COL_W, h: 0.5,
    fontFace: TYPE.heading, fontSize: 16, bold: true, color: PALETTE.primary, margin: 0,
  });
  slide.addText(rightBody.map((s, i) => ({
    text: s, options: { bullet: true, breakLine: i < rightBody.length - 1 },
  })), {
    x: RIGHT_X, y: 1.9, w: COL_W, h: H - 2.6,
    fontFace: TYPE.body, fontSize: 14, color: PALETTE.ink, paraSpaceAfter: 6, margin: 0,
  });
  addFooter(slide, { pageNum, total, source });
  slide.addNotes(`Two-column comparison.`);
}
```

### Recipe 4 — Comparison (`cookbook/comparison.md`)

```javascript
function renderComparison(slide, { title, optionA, optionB, source, pageNum, total }) {
  // optionA / optionB = { label, color, bullets[] }
  slide.background = { color: PALETTE.accent };
  slide.addText(title, {
    x: MARGIN_X, y: TITLE_Y, w: W - 1.0, h: TITLE_H,
    fontFace: TYPE.heading, fontSize: 24, bold: true, color: PALETTE.ink, margin: 0,
  });
  const CARD_W = (W - MARGIN_X * 2 - 0.5) / 2;
  for (const [i, opt] of [optionA, optionB].entries()) {
    const cx = MARGIN_X + i * (CARD_W + 0.5);
    // RECTANGLE not ROUNDED_RECTANGLE so the thin colored bar overlays cleanly.
    slide.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: 1.3, w: CARD_W, h: H - 2.0,
      fill: { color: 'F5F7FA' }, line: { color: 'E5E7EB', width: 1 },
    });
    slide.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: 1.3, w: CARD_W, h: 0.08, fill: { color: opt.color || PALETTE.primary },
    });
    slide.addText(opt.label, {
      x: cx + 0.2, y: 1.5, w: CARD_W - 0.4, h: 0.5,
      fontFace: TYPE.heading, fontSize: 18, bold: true, color: PALETTE.ink, margin: 0,
    });
    slide.addText(opt.bullets.map((s, j) => ({
      text: s, options: { bullet: true, breakLine: j < opt.bullets.length - 1 },
    })), {
      x: cx + 0.2, y: 2.1, w: CARD_W - 0.4, h: H - 2.9,
      fontFace: TYPE.body, fontSize: 13, color: PALETTE.ink, paraSpaceAfter: 6, margin: 0,
    });
  }
  addFooter(slide, { pageNum, total, source });
  slide.addNotes(`Side-by-side: ${optionA.label} vs ${optionB.label}.`);
}
```

### Recipe 5 — Data Chart (`cookbook/data-chart.md`)

```javascript
function renderDataChart(slide, { title, chartType, series, source, pageNum, total }) {
  // chartType ∈ { 'BAR', 'LINE', 'PIE', 'DOUGHNUT' }  — must be a key on pres.charts
  slide.background = { color: PALETTE.accent };
  slide.addText(title, {
    x: MARGIN_X, y: TITLE_Y, w: W - 1.0, h: TITLE_H,
    fontFace: TYPE.heading, fontSize: 24, bold: true, color: PALETTE.ink, margin: 0,
  });
  slide.addChart(pres.charts[chartType], series, {
    x: MARGIN_X, y: 1.3, w: W - 1.0, h: H - 2.2,
    barDir: chartType === 'BAR' ? 'col' : undefined,
    chartColors: [PALETTE.primary, PALETTE.secondary, PALETTE.muted],
    chartArea: { fill: { color: 'FFFFFF' }, roundedCorners: false },
    catAxisLabelColor: PALETTE.muted, valAxisLabelColor: PALETTE.muted,
    catAxisLabelFontFace: TYPE.body, valAxisLabelFontFace: TYPE.body,
    valGridLine: { color: 'E5E7EB', size: 0.5 }, catGridLine: { style: 'none' },
    showValue: chartType === 'BAR', dataLabelPosition: 'outEnd',
    dataLabelColor: PALETTE.ink, showLegend: series.length > 1,
  });
  addFooter(slide, { pageNum, total, source });
  slide.addNotes(`${chartType} chart — ${series.length} series.`);
}
```

### Recipe 6 — Data Table (`cookbook/data-table.md`)

```javascript
function renderDataTable(slide, { title, headers, rows, source, pageNum, total }) {
  slide.background = { color: PALETTE.accent };
  slide.addText(title, {
    x: MARGIN_X, y: TITLE_Y, w: W - 1.0, h: TITLE_H,
    fontFace: TYPE.heading, fontSize: 24, bold: true, color: PALETTE.ink, margin: 0,
  });
  const tableData = [
    headers.map(h => ({
      text: h,
      options: { fill: { color: PALETTE.primary }, color: PALETTE.accent,
                 bold: true, fontFace: TYPE.heading },
    })),
    ...rows.map((r, ri) => r.map(c => ({
      text: String(c),
      options: { fontFace: TYPE.body,
                 fill: { color: ri % 2 ? 'F5F7FA' : 'FFFFFF' }, color: PALETTE.ink },
    }))),
  ];
  slide.addTable(tableData, {
    x: MARGIN_X, y: 1.3, w: W - 1.0,
    fontSize: 12, border: { pt: 0.5, color: 'E5E7EB' },
    colW: Array(headers.length).fill((W - 1.0) / headers.length),
  });
  addFooter(slide, { pageNum, total, source });
  slide.addNotes(`Table — ${rows.length} rows.`);
}
```

### Recipe 7 — Stat Callout (`cookbook/stat-callout.md`)

```javascript
function renderStatCallout(slide, { title, statValue, statLabel, supporting, source, pageNum, total }) {
  slide.background = { color: PALETTE.accent };
  slide.addText(title, {
    x: MARGIN_X, y: TITLE_Y, w: W - 1.0, h: TITLE_H,
    fontFace: TYPE.heading, fontSize: 22, bold: true, color: PALETTE.ink, margin: 0,
  });
  // Big number — 60–72pt per design-ideas.md guidance
  slide.addText(statValue, {
    x: MARGIN_X, y: 1.4, w: 4.5, h: 2.5,
    fontFace: TYPE.heading, fontSize: 72, bold: true, color: PALETTE.primary,
    align: 'left', valign: 'top', margin: 0,
  });
  slide.addText(statLabel, {
    x: MARGIN_X, y: 3.9, w: 4.5, h: 0.5,
    fontFace: TYPE.body, fontSize: 14, color: PALETTE.muted, margin: 0,
  });
  if (supporting) slide.addText(supporting, {
    x: 5.3, y: 1.6, w: W - 5.8, h: 3.0,
    fontFace: TYPE.body, fontSize: 14, color: PALETTE.ink, margin: 0,
  });
  addFooter(slide, { pageNum, total, source });
  slide.addNotes(`Stat: ${statValue} — ${statLabel}.`);
}
```

### Recipe 8 — Quote (`cookbook/quote.md`)

```javascript
function renderQuote(slide, { quote, attribution, role, pageNum, total }) {
  slide.background = { color: PALETTE.primary };
  // Decorative left brace using ENUM (not a string literal — CRT-15)
  slide.addShape(pres.shapes.LEFT_BRACE, {
    x: 0.6, y: 1.4, w: 0.4, h: H - 2.5,
    line: { color: PALETTE.secondary, width: 2 }, fill: { color: PALETTE.primary },
  });
  slide.addText(quote, {
    x: 1.3, y: 1.5, w: W - 1.8, h: H - 2.6,
    fontFace: TYPE.heading, fontSize: 26, italic: true, color: PALETTE.accent,
    valign: 'middle', margin: 0,
  });
  slide.addText(`— ${attribution}${role ? `, ${role}` : ''}`, {
    x: 1.3, y: H - 1.0, w: W - 1.8, h: 0.4,
    fontFace: TYPE.body, fontSize: 14, color: PALETTE.secondary, margin: 0,
  });
  addFooter(slide, { pageNum, total });
  slide.addNotes(`Quote from ${attribution}.`);
}
```

### Recipe 9 — Closing (`cookbook/closing.md`)

```javascript
function renderClosing(slide, { headline, callToAction, contact, pageNum, total }) {
  slide.background = { color: PALETTE.primary };
  slide.addText(headline, {
    x: MARGIN_X, y: 1.6, w: W - 1.0, h: 1.4,
    fontFace: TYPE.heading, fontSize: 36, bold: true, color: PALETTE.accent, margin: 0,
  });
  if (callToAction) {
    slide.addShape(pres.shapes.RIGHT_ARROW, {
      x: MARGIN_X, y: 3.4, w: 0.5, h: 0.4,
      fill: { color: PALETTE.secondary }, line: { color: PALETTE.secondary, width: 0 },
    });
    slide.addText(callToAction, {
      x: MARGIN_X + 0.7, y: 3.35, w: W - 2.0, h: 0.5,
      fontFace: TYPE.body, fontSize: 18, color: PALETTE.secondary, margin: 0,
    });
  }
  if (contact) slide.addText(contact, {
    x: MARGIN_X, y: H - 1.0, w: W - 1.0, h: 0.4,
    fontFace: TYPE.body, fontSize: 12, color: PALETTE.secondary, margin: 0,
  });
  // 'Thank You' headline allowed via D-06 override: { action_title_override: true }.
  slide.addNotes(`Closing — ${callToAction || 'wrap'}.`);
}
```

**Cookbook master index** (`skills/create/references/cookbook.md`) links all 9 sub-files, includes the setup boilerplate, and ends with a "DO / DON'T" cheatsheet:

| ✅ DO | ❌ DON'T |
|---|---|
| `slide.addShape(pres.shapes.OVAL, …)` | `slide.addShape('oval', …)` |
| `color: 'FF0000'` | `color: '#FF0000'` or `color: 'FF000040'` |
| `bullet: true` | `'• item'` (unicode) |
| `paraSpaceAfter: 6` | `lineSpacing: 1.4` (with bullets) |
| `margin: 0` (when aligning shapes/text) | rely on default margin then offset shapes |
| Action title: `'Q3 revenue grew 23%'` | Topic title: `'Q3 Revenue'` |
| Fresh shadow/option object per call | Reuse one option object across `addShape` calls |

---

## Wave Decomposition (planner-actionable)

4 plans, mirroring Phase 3 layout. Each plan = one wave.

### Plan 04-01 — Test fixtures + 5 pure-function libs (Wave 1)

**Files modified:**
- `tests/fixtures/sample-brief.json` (new) — canonical valid `DeckBrief`
- `tests/fixtures/sample-render-deck.cjs` (new) — minimal but complete cjs (one slide of each type) used by enum-lint & integration tests
- `tests/fixtures/sample-design-ideas.json` (new) — small palette+typography fixture
- `tests/fixtures/bad-render-deck.cjs` (new) — contains `addShape('oval', …)` for negative test
- `skills/create/scripts/lib/deck-brief.js` (new)
- `skills/create/scripts/lib/enum-lint.js` (new)
- `skills/create/scripts/lib/title-check.js` (new)
- `skills/create/scripts/lib/design-validator.js` (new)
- `skills/create/scripts/lib/render-rationale.js` (new)
- `tests/create-deck-brief.test.js` (new)
- `tests/create-enum-lint.test.js` (new)
- `tests/create-title-check.test.js` (new)
- `tests/create-design-validator.test.js` (new)
- `tests/create-render-rationale.test.js` (new)

**Tasks (TDD red-green pattern names):**
1. **TDD-RED `deck-brief-rejects-empty-narrative_arc`** — `validateBrief({topic:'x', narrative_arc:[]})` throws.
2. **TDD-GREEN `deck-brief-accepts-canonical`** — implement `lib/deck-brief.js` (hand-rolled, no ajv).
3. **TDD-RED `enum-lint-flags-string-literal-shape`** — `lintCjs("addShape('oval', …)")` throws with line:col.
4. **TDD-GREEN `enum-lint-passes-enum-form`** — implement `lib/enum-lint.js` (regex per D-05).
5. **TDD-RED `title-check-rejects-blocked-words`** — "Overview" fails, "Introduction" fails.
6. **TDD-GREEN `title-check-accepts-action-claim`** — implement `lib/title-check.js` (verb list ≈ 80 verbs).
7. **TDD-RED `title-check-respects-override-flag`** — `{action_title_override: true}` bypasses.
8. **TDD-RED `design-validator-rejects-default-blue-without-justification`** — palette {#0070C0} + tone "executive" fails.
9. **TDD-GREEN `design-validator-accepts-pinned-pair`** — implement `lib/design-validator.js`.
10. **TDD-RED `render-rationale-emits-six-section-headings`** — output contains `## Palette`, `## Typography`, `## Motif`, `## Narrative Arc`, `## Key Tradeoffs`, `## Reviewer Notes`.
11. **TDD-GREEN `render-rationale-template-stable`** — implement `lib/render-rationale.js` (template literal, parallels Phase 3 `render-fixed.js`).

**Acceptance:** All 5 lib files green; ~20 test assertions; zero new deps.

### Plan 04-02 — Cookbook + author-original design-ideas (Wave 2)

**Files modified:**
- `skills/create/references/cookbook.md` (new)
- `skills/create/references/cookbook/{title,section,2col,comparison,data-chart,data-table,stat-callout,quote,closing}.md` (9 new)
- `skills/create/references/design-ideas.md` (new — **author-original prose per Q-1**)
- `skills/create/references/design-ideas.json` (new — pinned 10-palette + 8-typography)
- `tests/create-cookbook-recipes.test.js` (new)

**Tasks:**
1. Author 9 cookbook recipe files with the verbatim snippets from this RESEARCH.md §"The 9 Cookbook Recipes."
2. Author `cookbook.md` master index with setup boilerplate + DO/DON'T cheatsheet.
3. Author **original-prose** `design-ideas.md`: 10 palettes (project-original names + hexes), 8 typography pairings, 10 anti-patterns. Cite "inspired by public design literature."
4. Pin `design-ideas.json` (machine-readable: `{palettes: [{name, primary, secondary, accent, ink, muted}], typography_pairs: [{heading, body, mono?}]}`).
5. **TDD-RED `cookbook-recipes-must-be-loadable`** — `create-cookbook-recipes.test.js` reads each recipe `.md`, extracts the JS code-fence, `new Function(...)` it (sandboxed) with a fake `pres`/`slide` mock, asserts each recipe function is callable AND uses ENUM constants only.
6. **TDD-RED `cookbook-recipes-no-string-literal-shapes`** — same test extends to assert no `addShape('...')` literal in any recipe.
7. **TDD-GREEN** — author the 9 recipes verbatim from this research.
8. **TDD-RED `design-ideas-json-validates-against-design-validator`** — round-trip: load JSON, pass each palette+pair to `validateDesignChoice`, assert all pass.

**Acceptance:** All 9 recipes parse + execute against mock; design-ideas.json validates against `lib/design-validator.js`; lint-paths.sh stays clean.

### Plan 04-03 — `runCreate` orchestrator + CLI + CI lint gate (Wave 3)

**Depends on:** Plans 04-01 + 04-02.

**Files modified:**
- `skills/create/scripts/index.js` (new — `runCreate`)
- `skills/create/scripts/cli.js` (new — standalone)
- `tools/lint-pptxgenjs-enums.js` (new — Layer-1 CI gate)
- `package.json` — add `"lint:enums": "node tools/lint-pptxgenjs-enums.js"` script
- `tests/create-runtime.test.js` (new)
- `tests/create-cli.test.js` (new)
- `tests/create-enum-lint-cli.test.js` (new)

**Tasks (TDD red-green):**
1. **TDD-RED `runcreate-rejects-missing-brief`** — `runCreate({})` throws "brief required".
2. **TDD-RED `runcreate-validates-brief-via-deck-brief-lib`** — invalid brief throws (validation delegated).
3. **TDD-RED `runcreate-runs-enum-lint-on-cjs-pre-spawn`** — bad cjs path → enum-lint error before any spawn happens.
4. **TDD-RED `runcreate-shape-matches-d08`** — return value has `{deckPath, pdfPath, rationalePath, slidesCount, warnings}` keys.
5. **TDD-RED `runcreate-mode-standalone-prints-to-stdout`** vs **`runcreate-mode-handoff-stays-silent`** — parallels Phase 3.
6. **TDD-GREEN** — implement `runCreate` (pattern from Phase 3 `runReview`).
7. **TDD-RED `cli-spawns-as-subprocess-and-returns-json`** — spawn cli.js subprocess, assert correct args parse + JSON-on-stdout.
8. **TDD-GREEN** — implement `cli.js` (thin shell over `runCreate`).
9. **TDD-RED `lint-pptxgenjs-enums-cli-fails-bad-cjs`** — invoke `node tools/lint-pptxgenjs-enums.js` against fixture dir containing one bad cjs; assert exit code 1 + violation message.
10. **TDD-RED `lint-pptxgenjs-enums-cli-passes-clean-tree`** — clean dir → exit 0.
11. **TDD-GREEN** — implement `tools/lint-pptxgenjs-enums.js` (walk `skills/`, `tests/fixtures/`; grep regex; emit file:line).
12. **TDD-RED `runcreate-warns-when-xmllint-missing`** — patch PATH to remove xmllint; assert `warnings[]` includes a string about xmllint, no throw.
13. **TDD-GREEN** — wire OOXML xmllint sanity check inside `runCreate` (call `unzip -p deck.pptx ppt/presentation.xml | xmllint --noout -`; exit 0 = pass; non-zero = fail with friendly message; absent xmllint → soft warn).

**Acceptance:** Orchestrator green; CLI green; CI gate green; zero new deps.

### Plan 04-04 — SKILL.md full body + integration test + Phase-7 checklist (Wave 4)

**Depends on:** Plan 04-03.

**Files modified:**
- `skills/create/SKILL.md` (Phase 1 stub → full body)
- `tests/create-integration.test.js` (new — end-to-end happy path)
- `POWERPOINT-COMPATIBILITY.md` (new — Phase 7 release checklist; created in P4, run in P7)
- `NOTICE` — append "Design-ideas guidance is original to this project; structural pattern inspired by public design literature."

**Tasks:**
1. **SKILL.md authoring:**
   - Imperative description (≤1024 chars, keyword-front-loaded; sane defaults — activation tuning is P7).
   - "How to use" body: enumerate input modes (md/PDF/PPTX-read-only/URL/image/transcript/freeform/multi); instruct agent to (a) Read each input → emit `DeckBrief`; (b) read cookbook + design-ideas; (c) call `validateDesignChoice`; (d) compose render-deck.cjs honoring action-title rule; (e) write to run-dir; (f) call `runCreate({mode:'standalone'})`; (g) author design-rationale.md sections.
   - Locked invariants: ENUM-only shapes; no `#` hex; fresh option objects.
2. **TDD-RED `create-integration-end-to-end`** — load fixture brief → load fixture cjs → call `runCreate` → assert PPTX exists + xmllint passes + PDF exists + rationale.md has all 6 sections + slidesCount matches. Skip-guard if `soffice` not on PATH (matches Phase 3 pattern).
3. **POWERPOINT-COMPATIBILITY.md** — Phase 7 manual checklist: open every test deck in MS PowerPoint Mac+Windows; check shapes render, fonts substitute cleanly, no error dialogs, page numbers visible. Lists the canonical 9 test fixtures.
4. NOTICE update.

**Acceptance:** Integration test green; SKILL.md ≥ 1 imperative-voice keyword-front-loaded paragraph; Phase 7 checklist file present.

### Plan dependency graph

```
04-01 (libs + fixtures) ─┐
                         ├─► 04-03 (orchestrator + CLI + CI lint)
04-02 (cookbook + ideas) ─┘            │
                                        ▼
                                       04-04 (SKILL.md + integration + P7 checklist)
```

04-01 and 04-02 can run in parallel (independent file sets); 04-03 depends on both; 04-04 depends on 04-03.

---

## Common Pitfalls

### P-01 — Bundling Anthropic prose verbatim violates license (Q-1)
**What goes wrong:** NOTICE attribution is insufficient under Anthropic's "no copying / no derivative works" terms.
**Mitigation:** Author original `design-ideas.md` and `design-ideas.json`; "inspired by" attribution only.

### P-02 — `addShape('oval', …)` string literal silently corrupts in MS PowerPoint
**What goes wrong:** LibreOffice forgives; MS PowerPoint either renders fine or drops the shape, sometimes randomly across versions.
**Mitigation:** Three-layer gate (D-05). Lint surfaces file:line.

### P-03 — `#FF0000` hex prefix or 8-char hex corrupts file
**What goes wrong:** pptxgenjs writes invalid OOXML; PowerPoint refuses to open.
**Mitigation:** Cookbook recipes never use `#`; xmllint sanity check surfaces gross corruption.

### P-04 — Reusing option objects across `addShape` calls
**What goes wrong:** pptxgenjs mutates objects in-place (shadow.offset → EMU); second call gets pre-converted values.
**Mitigation:** Cookbook recipes always create fresh literals; explicit DON'T in cookbook cheatsheet.

### P-05 — Action title fails because user wrote "Q4 Outlook" not "Q4 will hit $40M"
**What goes wrong:** D-06 hard-fail would crash on every topic-style title.
**Mitigation:** D-06 specifies WARNING (not failure); override flag for legitimate cases (e.g. closing "Thank You").

### P-06 — Agent reuses one cookbook recipe for all slides (lazy)
**What goes wrong:** D-04 anti-pattern "Don't repeat the same layout" violated → R18 in `/review` flags it.
**Mitigation:** SKILL.md prompt explicitly enumerates all 9 recipes and instructs varying layout across narrative_arc beats.

### P-07 — `NODE_PATH` not set when spawning render-deck.cjs
**What goes wrong:** `require('pptxgenjs')` fails because cjs lives outside repo root.
**Mitigation:** `runCreate` always sets `env.NODE_PATH = ${CLAUDE_PLUGIN_DATA}/node_modules` (with fallback to repo root for dev).

### P-08 — `xmllint` missing on user machine
**What goes wrong:** OOXML sanity check skipped silently → corruption reaches user.
**Mitigation:** `which xmllint` at start of `runCreate`; if missing, emit warning + skip the check (don't fail). Adds entry to `warnings[]` in result.

### P-09 — Run-dir collisions on rapid reruns within same second
**What goes wrong:** `YYYYMMDD-HHMMSS` collides; 6-hex random differentiates.
**Mitigation:** Already handled — `crypto.randomBytes(3).toString('hex')` gives 16M of headroom per second.

### P-10 — Speaker notes silently dropped for some slide types
**What goes wrong:** pptxgenjs silently ignores notes if `slide.addNotes()` is called *before* `addText` in some versions.
**Mitigation:** Cookbook recipes call `addNotes` LAST. Test: `create-integration.test.js` unzips PPTX and asserts `notesSlide*.xml` present for every slide.

---

## Validation Architecture

### Test Framework

| Property | Value |
|---|---|
| Framework | `node:test` + `node:assert/strict` (Node ≥ 18 built-in) |
| Config file | none — Node test runner is config-less |
| Quick run command | `node --test tests/create-*.test.js` |
| Full suite command | `npm test` (already wired in `package.json`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Wave 0 fixtures? |
|---|---|---|---|---|
| CRT-01 | `runCreate({brief}) → pptx + pdf + rationale paths` | integration | `node --test tests/create-runtime.test.js tests/create-integration.test.js` | yes — sample brief + cjs fixture |
| CRT-02 | render-deck.cjs uses `pres.shapes.*` ENUMS | unit + lint | `node --test tests/create-cookbook-recipes.test.js && node tools/lint-pptxgenjs-enums.js` | no |
| CRT-03 | per-run cjs (not template) | architectural — `runCreate` accepts arbitrary cjs path | `node --test tests/create-runtime.test.js` | yes |
| CRT-04 | 8 (+1) slide types render at 16:9 | integration | `node --test tests/create-integration.test.js` (full deck fixture covers 8 types) | yes — full-deck fixture |
| CRT-05 | action titles + page nums + source + speaker notes | unit + integration | `node --test tests/create-title-check.test.js tests/create-integration.test.js` (asserts notesSlide presence via jszip) | yes |
| CRT-06 | PowerPoint compat gate (Phase 4 = Layer 1+2) | unit + CLI | `node --test tests/create-enum-lint.test.js tests/create-enum-lint-cli.test.js` + `xmllint` shell call | no |
| CRT-15 | ENUM-only shapes | unit + CLI lint | `node tools/lint-pptxgenjs-enums.js` | no |

### Sampling Rate

- **Per task commit:** `node --test tests/create-<scope>.test.js` (≤ 5s per file)
- **Per wave merge:** `npm test` (full suite — currently ~30s; P4 adds ~10–15s)
- **Phase gate:** Full suite green + `npm run lint:paths` green + `npm run lint:enums` green

### Wave 0 Gaps

- [ ] `tests/fixtures/sample-brief.json` — canonical `DeckBrief`
- [ ] `tests/fixtures/sample-render-deck.cjs` — full 8-slide-type cjs (covers all 9 recipes for the integration test)
- [ ] `tests/fixtures/sample-design-ideas.json` — small palette+type fixture for design-validator tests
- [ ] `tests/fixtures/bad-render-deck.cjs` — contains `addShape('oval', …)` for enum-lint negative test

---

## Code Examples (verified against pptxgenjs 4.0.1 + Anthropic pptxgenjs.md)

### Spawning render-deck.cjs with NODE_PATH

```javascript
// skills/create/scripts/index.js (excerpt)
const { spawn } = require('node:child_process');

function spawnNode(cjsPath, { cwd, env }) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [cjsPath], { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    proc.stdout.on('data', d => { stdout += d; });
    proc.stderr.on('data', d => { stderr += d; });
    proc.on('error', reject);
    proc.on('exit', code => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`render-deck.cjs exited ${code}\nstderr:\n${stderr}`));
    });
  });
}
```

### OOXML xmllint sanity check (P-08 fallback)

```javascript
async function xmllintOoxml(pptxPath) {
  const { execFile } = require('node:child_process');
  return new Promise((resolve) => {
    execFile('sh', ['-c',
      `unzip -p ${JSON.stringify(pptxPath)} ppt/presentation.xml | xmllint --noout -`],
      (err) => resolve({ ok: !err, err }));
  });
}
```

### NODE_PATH resolution (P-07 fix)

```javascript
function pluginDataNodeModules() {
  const data = process.env.CLAUDE_PLUGIN_DATA;
  if (data) return path.join(data, 'node_modules');
  // Dev fallback: this repo's node_modules
  return path.join(__dirname, '..', '..', '..', 'node_modules');
}
```

---

## State of the Art

| Old Approach | Current Approach | Source | Impact |
|---|---|---|---|
| `addShape('oval', …)` string literal | `pres.shapes.OVAL` ENUM | pptxgenjs 4.0.1 docs + cookbook | CRT-15 enforceable |
| Bundle template library | Author render-deck.cjs per run from cookbook | PROJECT.md decision | Every deck fresh; no template debt |
| python-pptx | pptxgenjs | PROJECT.md decision | Matches `annotate.js` toolchain |
| Bundle Anthropic pptx-skill prose verbatim | Author original `design-ideas.md` | **Q-1 license finding (this research)** | Apache-2.0 compliance |

**Deprecated/outdated:** None — pptxgenjs 4.0.1 is current; all APIs above are present and stable in 4.0.x.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | "≈80 verbs is sufficient for `lib/title-check.js` heuristic" | D-06 / Plan 04-01 | HIGH false-negative rate → action titles slip through. Mitigation: warn-only; easy to expand list. `[ASSUMED]` |
| A2 | "xmllint catches the OOXML cases that matter for PowerPoint compatibility" | D-05 layer-2.5 | False sense of safety; PPT might still reject syntactically valid OOXML. Mitigation: layer-3 manual check in P7 (locked). `[ASSUMED]` |
| A3 | "Agent can reliably normalize PDF/image/URL into `DeckBrief` using only Read+WebFetch" | D-01 | Brief skipping content from images without OCR. Mitigation: SKILL.md instructs agent to flag image-only slides. `[ASSUMED]` |
| A4 | "macOS + Linux ship `xmllint` by default" | Q-3 | Missing-tool warning path covers (P-08). `[VERIFIED: macOS]` for macOS; `[ASSUMED]` for Linux distros (Debian/Ubuntu ship libxml2-utils as separate package). |
| A5 | "Spawning `node` on cjs with NODE_PATH set is faster + cleaner than in-process require" | D-02 / Architecture | In-process require would avoid spawn overhead but pollutes test runner state. `[ASSUMED]` based on Phase 3 spawn patterns. |
| A6 | "The 9 cookbook recipes cover all narrative-arc beats Phase 4 will encounter" | §Cookbook | Edge case: a roadmap timeline slide doesn't fit any of the 9 cleanly. Mitigation: cookbook recipes are templates the agent COMPOSES, not exhaustively atomic. `[ASSUMED]` |

---

## Open Questions (resolved during research)

### Q-1 — Anthropic pptx-skill design-ideas re-bundle license
- **Resolved:** **Cannot bundle verbatim.** See §"Q-1 — Anthropic `pptx` Skill License Findings" above. Action: author original prose; "inspired by" attribution.
- **Confidence:** HIGH `[VERIFIED]`

### Q-2 — pptxgenjs 4.0.1 ENUM exhaustive coverage
- **Resolved:** All shapes needed by all 9 recipes have a `pres.shapes.*` ENUM. 184 total shape ENUMs verified by reading `node_modules/pptxgenjs/types/index.d.ts` lines 405–589. No string-literal fallback ever required.
- **Confidence:** HIGH `[VERIFIED: types/index.d.ts + live introspection]`

### Q-3 — OOXML schema validation tool
- **Resolved:** `xmllint --noout` on `ppt/presentation.xml` is sufficient for Phase 4 v0.1.0. It catches malformed XML (the dominant failure mode of `#`-prefixed colors and 8-char hexes) without requiring a strict OOXML XSD validator. Stricter validators exist (officeotron) but introduce dep risk and are not available system-wide. **Stay with xmllint.**
- **Confidence:** HIGH `[CITED: Anthropic pptxgenjs.md Common Pitfalls; libxml2 ships on macOS by default]`

### Q-4 — Action-title NLP dep
- **Resolved:** **No NLP dep.** Blocked-words list (9 phrases) + 3-word minimum + verb-list lookup (≈80 common verbs) handles the false-negative cases that matter without `compromise` (200KB) or `pos` (slow). D-06 specifies warning (not fail), so false negatives degrade gracefully.
- **Confidence:** MEDIUM `[ASSUMED — see A1]`

### Q-5 — `node:test` continuity
- **Resolved:** **Yes, same pattern.** Phase 2/3 use `node:test` + `node:assert/strict` (verified in `tests/review-runtime.test.js`). Phase 4 follows.
- **Confidence:** HIGH `[VERIFIED]`

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---|---|---|
| Node.js | runtime + test runner | ✓ | ≥ 18 (Phase 1 prereq) | hard requirement; SessionStart hook reports if missing |
| `pptxgenjs@4.0.1` | `render-deck.cjs` | ✓ | 4.0.1 (pinned) | hard requirement; assert-pptxgenjs-pin.js gate |
| `soffice` (LibreOffice) | PPTX→PDF | system | ≥ 7.4 | Phase 3 hardened; SessionStart warns if missing |
| `xmllint` (libxml2) | OOXML sanity check | system | ≥ 2.9 | **soft fallback:** if missing, skip + warn (P-08) |
| `unzip` | OOXML sanity check (extract presentation.xml) | system | any | hard requirement on macOS+Linux (universal) |
| IBM Plex Sans `.ttf` | body-font default | bundled `assets/fonts/` (Phase 1) | OFL — bundled | first-run install hook (Phase 1) |

**Missing dependencies with no fallback:** None — all hard deps verified or already gated by Phase 1 hooks.

**Missing dependencies with fallback:** `xmllint` skip-and-warn path (P-08).

---

## Project Constraints (from CLAUDE.md)

- `annotate.js` is binary asset — Phase 4 doesn't touch it. **OK.**
- `pptxgenjs` pinned exactly `4.0.1` — Phase 4 uses 4.0.1 APIs only. **OK.**
- No reaches outside plugin tree — `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_PLUGIN_DATA}`; `lint-paths.sh` already gates this. Phase 4 paths comply.
- Severity collapse 4→3 at `/annotate` adapter only — N/A in Phase 4 (no review findings emitted; Phase 5 wires the loop). **OK.**
- Auto-refine convergence rule — N/A in Phase 4 (single-cycle). **OK.**
- Content-vs-design boundary — N/A in Phase 4 (no review). **OK.**

**No CLAUDE.md directive blocks Phase 4 plans.**

---

## Sources

### Primary (HIGH confidence)
- `node_modules/pptxgenjs/types/index.d.ts` — ENUM verification (Q-2) `[VERIFIED]`
- `npm view pptxgenjs version` → `4.0.1` `[VERIFIED 2026-04-28]`
- `~/Library/Application Support/Claude/.../skills/pptx/LICENSE.txt` — Q-1 license finding `[VERIFIED]`
- `~/Library/Application Support/Claude/.../skills/pptx/SKILL.md` — design-ideas factual structure (NOT prose) `[VERIFIED]`
- `~/Library/Application Support/Claude/.../skills/pptx/pptxgenjs.md` — cookbook patterns + Common Pitfalls `[VERIFIED]`
- `skills/review/scripts/index.js` — `runReview` shape (D-08 parallel) `[VERIFIED]`
- `skills/annotate/scripts/index.js` — `runAnnotate` shape `[VERIFIED]`
- `.planning/phases/03-instadecks-review/03-02-PLAN.md` — plan structure pattern `[VERIFIED]`
- `tests/review-runtime.test.js` + `tests/review-integration.test.js` — Q-5 test pattern `[VERIFIED]`
- `.planning/PROJECT.md` + `.planning/ROADMAP.md` + `.planning/research/SUMMARY.md` `[VERIFIED]`
- `CLAUDE.md` (project) — invariants `[VERIFIED]`

### Secondary (MEDIUM confidence)
- pptxgenjs GitHub release notes — version stability `[CITED]`

### Tertiary (LOW confidence)
- General Node.js spawn-vs-require performance comparison (A5) `[ASSUMED]`

---

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — already pinned; verified live via npm + node introspection.
- Architecture: **HIGH** — mirrors Phase 3 `runReview` pattern verbatim; D-08 explicit.
- Cookbook recipes: **HIGH** — every API call verified against pptxgenjs 4.0.1 type definitions.
- Pitfalls: **HIGH** — drawn from Anthropic's verified pptxgenjs.md Common Pitfalls + Phase 2/3 experience.
- Q-1 license finding: **HIGH** — direct read of LICENSE.txt.
- Wave decomposition: **HIGH** — 1:1 mirror of Phase 3 plan structure (4–5 plans, ~10–13 tests).
- A1/A4/A5/A6 assumptions: **MEDIUM** — flagged in Assumptions Log; all degrade gracefully.

**Research date:** 2026-04-28
**Valid until:** 2026-05-28 (30 days; pptxgenjs 4.0.1 stable; no upcoming breaking changes flagged)
