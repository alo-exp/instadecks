---
name: create
description: Generate, build, make, author, or compose a polished slide deck (PPTX + PDF + design-rationale) from any input — including markdown, PDF whitepaper, PPTX, URL, image, interview transcript, outline, or freeform brief. This skill should be used when the user wants a fresh deck made and supplies markdown / PDF whitepaper / PPTX / URL / image / interview transcript / outline / brief and asks for a deck, slides, presentation, or pitch (turn this into a presentation, make slides from this) — including AI-generated-avoidance phrasings like "slides that don't look AI-generated". Composes a per-run render-deck.cjs from a curated pptxgenjs cookbook, picks palette and typography from author-original design guidance, and emits 8 slide types at 16:9 with action titles, page numbers, source lines, and speaker notes. Auto-refines the deck via an internal review-fix loop (trigger phrases: 'auto-refine deck', 'iterate until clean', 'convergence loop') until reviewer reports zero genuine findings or the user accepts the soft cap at cycle 5.
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

- Use `pres.shapes.*` ENUM constants only — never `addShape('oval', …)` (CRT-15). `lib/enum-lint.js` blocks string-literal shape names BEFORE spawn; `tools/lint-pptxgenjs-enums.js` enforces the same in CI. <!-- enum-lint-allow: anti-pattern doc -->
- 6-character hex colors with no `#` prefix (CRT-15 sibling rule). 8-char hex (`FF000040`) corrupts OOXML.
- Action titles (claim, not topic) per D-06 — `lib/title-check.js` warns on blocked words ("Overview", "Introduction", "Outline", "Agenda", "Summary", "Conclusion", "Q&A", "Background"). Use `{action_title_override:true}` ONLY for legit cases like the closing "Thank You" slide.
- Fresh option object per `addShape` call (pptxgenjs mutates in place — sharing options across calls produces silent rendering bugs).
- Output paths: `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_PLUGIN_DATA}` only — no hardcoded user paths. `tools/lint-paths.sh` enforces.
- `references/design-ideas.md` is author-original (Q-1) — do NOT reference Anthropic pptx-skill palette/typography names. Sniff-grep gate is CI-armed.
- Auto-refine convergence rule is `findings_genuine == 0 AND cycle >= 2`; cycle 1 with zero genuine findings forces one full confirmation cycle before convergence (D-07). Never converge on cycle 1.
- Oscillation rule is `issue_set_hash_N == issue_set_hash_{N-2} AND genuine_count_N > 0`; halt and surface the ledger via `detectOscillation` (D-09). The earlier subset-style description is superseded.
- Soft cap is at cycle 5: surface a 4-option AskUserQuestion (Continue / Accept / Specify / Stop). Never hardcode a hard cap; the user, not the loop, decides termination past cycle 5.
- User interrupt is checked at TOP-OF-CYCLE only via `checkInterrupt(runDir)` against `${runDir}/.interrupt` (D-04). No mid-cycle abort; in-progress cycles always run to completion before the interrupt is honored.

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

### Step 2.5 — Choose design DNA

**Before authoring render-deck.cjs**, roll a design DNA that varies meaningfully per brief. Phase 9 (D-05) makes this a hard pre-step — the v8 BluePrestige look is **one** valid DNA among many, not the default.

1. **Roll a design DNA from `references/palettes.md`, `references/typography.md`, `references/motifs.md`** — copy hex values, font names, and motif treatments verbatim from those library files. Do not invent new palettes/fonts/motifs; the curated libraries are the agent's allowed surface.

2. **Hash-seed picker** — compute a deterministic hash-seed over `brief.audience + brief.tone` (e.g., `crypto.createHash('sha1').update(audience + '|' + tone).digest()` and reduce modulo each library's entry count). The same brief produces the same DNA on re-run; different briefs roll different DNAs. This is the deterministic-per-brief variety mechanism — no randomness source required.

3. **Diversity audit** — if `.planning/instadecks/` contains prior runs, sort run-ids descending and READ the `design-rationale.md` of the **last 3 prior runs**. Extract the palette / typography / motif each one used. **DO NOT pick the same palette / typography / motif combination** as any of the last 3. If the hash-seed picker lands on a recently-used combination, advance the seed (e.g., increment the modulo offset) until the rolled DNA differs from all 3 priors on at least one axis. **When running tests in isolated dirs (e.g. `/tmp/`), pass `--diversity-history <dir>` to the standalone CLI pointing at a shared directory containing prior `design-rationale.md` files** so the agent can see prior choices across run boundaries (Live E2E Iteration 2 Fix #13). The `<dir>` may use either layout: **(a) flat** — `*.md` rationale files directly under `<dir>`, or **(b) per-run subdirs** — `<dir>/<run-id>/design-rationale.md` (Live E2E Iter4-2). Both are scanned; files lacking the `**Palette:** / **Typography:** / **Motif:**` shorthand are skipped.

3a. **Tone-tag fit gate (Live E2E Iteration 1 Fix #8)** — each palette in `references/palettes.md` declares a `**Tone tags:** <comma-separated-keywords>` line. After the diversity audit, intersect the rolled palette's tone tags against `brief.tone` keywords (and `brief.audience` keywords). **If the intersection is empty**, the palette is tone-mismatched (e.g., Burnt Sienna's `travel,hospitality` against a `finance,executive` brief). Advance the hash seed by 1 (or pick the next palette in the alphabetic list whose tone tags intersect with the brief). This is a soft-tighten on top of the diversity audit.

3b. **Conflict precedence — tone-fit wins (Live E2E Iter4-3)** — when the tone-tag fit gate (3a) and the diversity audit (3) cannot BOTH be satisfied (every tone-matching palette is in the last-3-priors set), **prefer tone-fit and RELAX diversity** rather than the other way around. Reusing a palette across runs is an acceptable degradation; mismatching brief tone is not (an executive-finance brief in Carbon Neon or Burnt Sienna is a defect, not novelty). Emit a warning in `design-rationale.md` noting the diversity relaxation. The palettes carrying `executive | finance | board | corporate | b2b-enterprise` tone tags are at minimum: **Cobalt Edge, Verdant Steel, Editorial Serif, Monochrome High-Contrast** — pick across this set so executive briefs cycle through ≥4 distinct DNAs before forcing a relax. The picker helper `pickPaletteByTone` in `scripts/lib/design-validator.js` accepts an `excludeNames` option and returns a `relaxed:'diversity'` flag when the relaxation triggers.

4. **Defaults prohibition** — **NEVER** default to verdant-steel + Plex Serif + underline-accent. That is the v8 register; Phase 9 explicitly relaxes the "match v8" invariant. Different decks must look meaningfully different. If your roll lands there by chance, re-roll on the next seed offset.

5. **Variant IDs** — when picking cookbook recipes in Step 3, each recipe ships ≥3 variants per the convention `{recipe}-[A-E]-{shorthand}` (see `references/cookbook.md` → "Variant IDs" section). Pick variants consistent with the rolled motif:
   - title-A-centered-classic vs title-C-oversized-numeral vs title-D-type-as-image
   - stat-callout-B-asymmetric-grid vs stat-callout-D-full-bleed-numeral
   - Vary variant choice across the 9 slide types so 3+ slides do not share the same `recipe-variant` ID (design-validator flags diversity violations).

Persist the rolled DNA into `design-choices.json` so Step 4 (`runCreate`) writes it into `design-rationale.md`.

### Step 3 — Compose render-deck.cjs from the cookbook

Read `references/cookbook.md` (master) and the per-recipe files in `references/cookbook/*.md`. For each beat in `narrative_arc`, pick the recipe that matches the beat's intent (cookbook recipe-index table maps slide types → "When to use"). **Vary recipe across beats** — repeating the same recipe more than 3 consecutive slides triggers R18 in `/instadecks:review`.

Compose render-deck.cjs:

1. Setup boilerplate (verbatim from cookbook.md "Setup boilerplate" block).
2. Define PALETTE + TYPE constants from chosen design.
3. For each beat: copy the recipe code, instantiate the slide, fill params.
4. Always: ENUM constants (`pres.shapes.OVAL`, never `'oval'`); 6-char hex no `#`; `addNotes()` last per recipe.
   <!-- enum-lint-allow: anti-pattern doc -->

5. Action titles: every slide title MUST be a claim. `lib/title-check.js` warns on blocked words — use `{action_title_override:true}` ONLY for legit cases like the closing "Thank You".

Write to `${runDir}/render-deck.cjs`.

### Step 4 — Call runCreate

**Standalone CLI with structured handoff** — pass design choices via a JSON file so the design-rationale gets the full Palette / Typography / Motif / Tradeoffs sections instead of heuristic [TBD] fallbacks:

```bash
node ${CLAUDE_PLUGIN_ROOT}/skills/create/scripts/cli.js \
  --brief brief.json \
  --design-choices design-choices.json \
  --out-dir .
```

`design-choices.json` shape (matches the `designChoices` arg below):

```json
{
  "palette": {
    "name": "midnight-citrine",
    "primary": "1E2761",
    "secondary": "CADCFC",
    "accent": "F4C141",
    "rationale": "Cooler executive base with a citrine accent for the upside slide."
  },
  "typography": {
    "heading": "IBM Plex Sans",
    "body": "IBM Plex Sans",
    "rationale": "Single-family pairing for board-room legibility."
  },
  "motif": "Quiet diagonals as section bookends; no decorative imagery on data slides.",
  "tradeoffs": [
    "Skipped a third accent to keep board-deck restraint",
    "Chose IBM Plex over a serif/sans pair to maximize on-screen legibility"
  ]
}
```

If `--design-choices` is omitted in standalone mode, runCreate statically parses your render-deck.cjs for `const PALETTE = {...}` / `const TYPE = {...}` blocks and a leading `// Motif: ...` comment, surfacing whatever it can find in the rationale (sections without matches stay `[TBD]` with a hint to use `--design-choices`).

**Pipelined (in-process):**

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
- ## Reviewer Notes — populated by the auto-refine loop from the ledger (per-cycle skipped findings + final-cycle non-genuine findings); placeholder only on clean cycle-1-and-2 convergence

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

## Output contract for varied input shapes

Regardless of input shape (structured JSON, markdown narrative, raw text, attached files), every `/instadecks:create` run produces the same artifacts under `.planning/instadecks/<run-id>/`:

- `deck.pptx` — the rendered presentation
- `deck.pdf` — PDF render via soffice
- `design-rationale.md` — MUST include lines `Palette: <name>`, `Typography: <name>`, `Motif: <name>` so downstream tooling (review, annotate, diversity gate) can read the rolled design DNA. The richer `## Palette` / `## Typography` / `## Motif` markdown sections produced by `lib/render-rationale.js` remain the primary surface; the `Palette: <name>` / `Typography: <name>` / `Motif: <name>` shorthand lines MUST also appear (top of file or alongside the section headings) so regex-based tooling can extract the chosen DNA without parsing markdown sections.
- `findings.json` — populated by `/instadecks:review` (empty until review runs)
- `annotated.pptx` — populated by `/instadecks:annotate`

## Out of scope (deferred)

- /content-review integration — **v2** (PROJECT.md).
- Real-PowerPoint open gate (Mac + Windows) — **Phase 7 release** (D-05 Layer 3; `tests/POWERPOINT-COMPATIBILITY.md`).
- Brand auto-detection from URL — **v2**.
- In-deck image generation — **v2**.

## Auto-Refine Loop

Wrap `runCreate` in an agent-owned review-fix convergence loop (D-01). Each cycle: check interrupt → render → image → review (scoped per D-03) → triage findings → hash issue set → append ledger → check oscillation (D-09) → check convergence (D-07) → soft-cap if cycle ≥ 5. See `references/auto-refine-playbook.md` for the full numbered pseudocode (steps 1-14), worked example, `slidesToReview` decision tree, and D-09 oscillation rationale. The loop is PROSE owned by the agent; control flow lives here, not in code (D-01).

### Run-dir layout

```
<runDir>/
  brief.json
  refine-ledger.jsonl              # JSONL — append-only, one line per cycle (D-02)
  cycle-1/
    render-deck.cjs
    slides/slide-01.jpg .. slide-NN.jpg
    findings.json                  # raw runReview output (Phase 3 schema)
    findings.triaged.json          # agent-set genuine + triage_rationale (D-08)
  cycle-2/
    ...
  deck.pptx                        # final-cycle deck
  deck.pdf
  design-rationale.md              # populated reviewerNotes from ledger
  deck.annotated.pptx              # final-cycle findings union (D-06)
  deck.annotated.pdf
  render-deck.cjs                  # final-cycle render script (audit trail)
```

The `<runDir>/.interrupt` flag file (touched by the user out-of-band) signals top-of-cycle exit per D-04.

### Per-cycle summary

Each cycle invokes the primitives in this order: `checkInterrupt` → render-deck.cjs author/edit → `runCreate` → `pptx-to-images.sh` → `slidesChangedSinceLastCycle` (cycle ≥ 2) → `runReview` (with `slidesToReview`) → triage → `hashIssueSet` → `appendLedger` → `detectOscillation` → convergence check → soft-cap `AskUserQuestion` at cycle ≥ 5. Cycle 1 always runs `slidesToReview = null` (full review). Cycle 2 forces a full review when cycle 1 returned zero genuine findings (D-07 confirmation). Cycle 3+ defaults to diff-only via SHA byte-comparison of slide images (D-03). Triage stamps each finding with a stable `id = "${slideNum}-${sha1(text).slice(0,8)}"`, a `genuine` boolean, and a 1-2 sentence `triage_rationale`; only `genuine && severity ∈ {Critical, Major}` flow into the next cycle's fix list. Skipped IDs are accumulated in the ledger and excluded from future fix lists (do not relitigate intentionally-skipped findings). Per-cycle output spec is `findings.triaged.json` per `references/findings-triaged-schema.md` in the review skill. See `references/auto-refine-playbook.md` for the full numbered pseudocode (steps 1-14).

### AskUserQuestion soft-cap prompt (verbatim — D-05)

When cycle ≥ 5 completes without convergence, surface the user this 4-option prompt verbatim:

```
5 refine cycles complete; still {N} genuine findings. Choose:
A. Continue refining (one more cycle).
B. Accept current deck as final.
C. Specify exactly what to fix (free-text).
D. Stop and let me review the ledger.
```

Routing:

- **A (Continue)** — increment cycle and loop back to step 1; user may re-prompt at any cycle.
- **B (Accept)** — append a closing ledger entry with `ended_via='soft-cap-accepted'`; finalize the bundle.
- **C (Specify)** — read the user's free-text fix list; treat it as the next cycle's fix list and ignore reviewer findings for that one cycle (user override).
- **D (Stop)** — append `ended_via='soft-cap-stopped'`; surface the ledger path and exit.

**Standalone-mode fallback:** if running non-interactive (`CI=1`, `NON_INTERACTIVE=1`, or stdout is not a TTY), default to B (Accept) and emit a stderr warning. The standalone CLI also accepts `--soft-cap=<accept|stop|continue>` (Plan 05-04).

### Post-loop bundle (D-06; CRT-14)

After the loop exits (any `ended_via`), execute the following in order:

a. Compose the final `reviewerNotes` string from the ledger: per-cycle `skipped_finding_ids` (with their `triage_rationale`) plus the final cycle's non-genuine findings.
b. Render `design-rationale.md` via `lib/render-rationale.js` with the populated `reviewerNotes`.
c. Convert `deck.pptx` → `deck.pdf` via soffice (per Phase 4 `runCreate`; soft on missing tool).
d. If the final cycle's `findings.json` has any **genuine** findings (`genuine === true` count > 0), invoke `runAnnotate({deckPath: deck.pptx, findings, outDir: runDir, runId})` → `deck.annotated.pptx` + `deck.annotated.pdf`. (Live E2E Iteration 1 Fix #11: aligned to adapter behavior — non-genuine findings are filtered by the adapter, so passing only-non-genuine findings would produce an empty annotated deck. runAnnotate now short-circuits in that case and returns `{annotatedSlideCount:0, message, ...}` with no .pptx/.pdf written; consumers should treat that as "clean convergence".)
e. If the final findings union is empty (clean convergence), SKIP the annotated artifacts and surface to the user: "Clean convergence — no annotation overlay generated." (Pitfall 7).
f. Surface the 8-artifact bundle (deck.pptx, deck.pdf, design-rationale.md, findings.json, deck.annotated.pptx, deck.annotated.pdf, refine-ledger.jsonl, render-deck.cjs) to the user.

### Anti-patterns to avoid

- Mid-cycle abort — interrupts are honored at TOP-OF-CYCLE only (D-04). Once a cycle starts, run it to completion.
- Mutating `findings.json` in place — JSONL ledger is append-only; raw reviewer output is immutable. Triage writes a sibling `findings.triaged.json`.
- Re-fixing intentionally-skipped findings — the ledger's accumulated `skipped_finding_ids` are excluded from every future fix list.
- Hardcoding a hard cap — only the cycle-5 AskUserQuestion gates further work; the user owns termination past 5.
- Assuming `runCreate` idempotency on identical input — re-rendering may produce byte-different PPTX; SHA-diff slide images, not the PPTX file.

### See also

- `${CLAUDE_PLUGIN_ROOT}/skills/create/references/auto-refine-playbook.md` — full numbered pseudocode (steps 1-14), worked example, `slidesToReview` decision tree, D-09 oscillation rationale.
- `${CLAUDE_PLUGIN_ROOT}/skills/create/scripts/lib/loop-primitives.js` — `appendLedger`, `readLedger`, `checkInterrupt`, `hashIssueSet`, `slidesChangedSinceLastCycle`.
- `${CLAUDE_PLUGIN_ROOT}/skills/create/scripts/lib/oscillation.js` — `detectOscillation` (D-09).
- `${CLAUDE_PLUGIN_ROOT}/skills/review/references/findings-triaged-schema.md` — `findings.triaged.json` shape (id, genuine, triage_rationale).
- `${CLAUDE_PLUGIN_ROOT}/.planning/phases/05-instadecks-create-auto-refine/05-CONTEXT.md` — D-01..D-09 source of truth.

## See also

- `${CLAUDE_PLUGIN_ROOT}/skills/create/references/cookbook.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/create/references/design-ideas.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/create/references/design-ideas.json`
- `${CLAUDE_PLUGIN_ROOT}/skills/create/scripts/index.js` (runCreate)
- `${CLAUDE_PLUGIN_ROOT}/skills/create/scripts/lib/*.js` (validators)
- `${CLAUDE_PLUGIN_ROOT}/tests/POWERPOINT-COMPATIBILITY.md` (Phase 7 release gate)
