---
name: create
description: Generate a polished slide deck (PPTX + PDF + design-rationale) from any input. This skill should be used when the user supplies markdown / PDF / PPTX / URL / image / transcript / brief and asks for a deck, slides, presentation, or pitch. Composes a per-run render-deck.cjs from a curated pptxgenjs cookbook, picks palette and typography from author-original design guidance, and emits 8 slide types at 16:9 with action titles, page numbers, source lines, and speaker notes. Auto-refines the deck via an internal review-fix loop (trigger phrases: 'auto-refine deck', 'iterate until clean', 'convergence loop') until reviewer reports zero genuine findings or the user accepts the soft cap at cycle 5.
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
d. If the final cycle's `findings.json` has any findings (genuine + non-genuine union), invoke `runAnnotate({deckPath: deck.pptx, findings, outDir: runDir, runId})` → `deck.annotated.pptx` + `deck.annotated.pdf`.
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
