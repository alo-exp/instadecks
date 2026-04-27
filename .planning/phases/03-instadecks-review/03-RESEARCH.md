# Phase 3: `/instadecks:review` — Research

**Researched:** 2026-04-28
**Domain:** DECK-VDA design review skill packaging; R18 AI-tell heuristics over PPTX OOXML; soffice/pdftoppm hardening; LLM narrative + deterministic-template dual reporting
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Inherited Locked Decisions (no re-discussion)

- **Findings JSON schema** — Phase 1 `skills/review/references/findings-schema.md` (v1.0; `schema_version` first key)
- **4-tier severity in reviewer JSON** — `Critical` / `Major` / `Minor` / `Nitpick`. The 4→3 collapse to `MAJOR`/`MINOR`/`POLISH` happens **only** at the `/annotate` adapter (Phase 2 `skills/annotate/scripts/adapter.js`); reviewers MUST NOT pre-collapse.
- **Content-vs-design boundary** — `/review` flags visual / typographic / layout only; argument structure is `/content-review`'s territory (Phase 6).
- **Run dir** — `.planning/instadecks/<run-id>/`, run-id = `YYYYMMDD-HHMMSS-<6hex>`.
- **Sibling-of-input outputs** — `<deck>.review.json`, `<deck>.review.md`, `<deck>.review.narrative.md`; silent overwrite (D-04 inherited).
- **soffice flag** — `-env:UserInstallation=file:///tmp/lo-${SESSION_ID}-${PID}` per call (Phase 2 D-08).
- **`runAnnotate({deckPath,findings,outDir,runId})`** exported from `skills/annotate/scripts/index.js` — Phase 3 imports for pipeline mode.

### Phase 3 Decisions (LOCKED)

- **D-01 (DECK-VDA bundling):** **Canonicalize** into our own `skills/review/SKILL.md`. Re-express the 4-pass methodology, 4-tier severity grammar, exhaustive §1/§3/§4/§5 sections, and JSON contract as first-class authored content under Apache-2.0. Upstream credit goes in NOTICE only — no `references/deck-design-review-original.md` carried into the plugin.
- **D-02 (R18 AI-tell mechanism):** **Hybrid** — deterministic, testable rules in code (`skills/review/scripts/ai-tells.js`); fuzzy / context-sensitive tells stay in the SKILL.md prompt as LLM judgment calls. Both paths emit findings carrying `r18_ai_tell: true` for downstream filtering. **At least 3 in-code heuristics required.**
- **D-03 (pipeline default):** **Gated.** Pipeline runs only when (a) `--annotate` flag is passed, OR (b) the user's natural-language invocation mentions "annotate" / "overlay" / similar (LLM-driven intent detection in SKILL.md). Default is **standalone** (3 outputs only).
- **D-04 (structured-handoff mode):** Shared run-dir convention. `runReview({deckPath, runId, outDir, mode})` exported from `skills/review/scripts/index.js`; `mode ∈ {"standalone","structured-handoff"}`. In `structured-handoff`, returns `{jsonPath, mdPath, narrativePath, findingCounts: {critical, major, minor, nitpick}, genuineCount}` without printing to stdout.
- **D-05 (soffice/pdftoppm hardening):** per-call `-env:UserInstallation`, **60s timeout**, **1 retry** then fail loud, post-call (a) file exists (b) size > 1024 bytes (c) PDF magic-bytes `%PDF` at offset 0, cleanup `trap` on EXIT/INT/TERM, per-PID user-instance dir for concurrency safety.
- **D-06 (Markdown reports — TWO):** `<deck>.review.md` = fixed deterministic DECK-VDA template via `skills/review/scripts/render-fixed.js`. `<deck>.review.narrative.md` = LLM-authored prose, grounded in JSON, must cite slide numbers + finding IDs. Fixed-template renderer has unit coverage; narrative file gets presence + minimum-length sanity check only.
- **D-07 (`pptx-to-images.sh` placement):** **Plugin-level** `scripts/pptx-to-images.sh` (shared with Phases 4, 5, 6). Callers reference via `${CLAUDE_PLUGIN_ROOT}/scripts/pptx-to-images.sh`. Plugin-level test `tests/pptx-to-images.test.js` with stub fixtures + soffice skip-guard.

### Out of Scope (Deferred)

- ANNO-01 / RVW-01 activation tuning ≥8/10 — Phase 7 DIST-02
- Auto-refine consumption of `/review` findings — Phase 5
- `/content-review` skill — Phase 6 (independent of `/review`'s loop)
- Reviewer-of-reviewer eval / golden-set scoring — explicitly out of v0.1.0
- Tier 2 pixelmatch visual regression for `pptx-to-images.sh` — Phase 7 (RVW-09..11 unblocks via ci.yml RESERVED block)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RVW-01 | `/instadecks:review` invocable as slash skill; ≥8/10 activation (Phase 7 finalizes) | §"Standard Stack" — imperative-keyword pattern from Phase 2 carry-forward |
| RVW-02 | Bundles DECK-VDA: 4-pass methodology, finding grammar, 4-tier severity, exhaustive §3 / §1 / §4 / §5 | §"DECK-VDA Methodology Re-Expression" — full canonicalization recipe (Q-1) |
| RVW-03 | R18 AI-tell detection: accent-line-under-title, default-blue, identical-layouts-repeated | §"R18 AI-Tell Heuristics" — 3 in-code heuristics + XPath/regex evidence (Q-2) |
| RVW-04 | Each finding: `genuine`, `category` (defect/improvement/style), `nx`/`ny`, `rationale` | §"Findings Schema Compliance" — direct re-use of locked Phase 1 schema |
| RVW-05 | Output: JSON sidecar (locked schema) AND human-readable Markdown; both in run dir | §"Two-Report Architecture" — D-06 dual emission |
| RVW-06 | Pipeline-into-`/annotate` (gated per D-03) | §"Pipeline Architecture" — `runAnnotate` import contract |
| RVW-07 | Standalone mode: deck file path (PPTX/PDF) → JSON + Markdown only | §"Architecture Patterns" — `mode: standalone` orchestration |
| RVW-08 | Structured-handoff mode: pre-rendered deck-spec, no file roundtrip | §"Architecture Patterns" — `mode: structured-handoff` from D-04 |
| RVW-09 | `pptx-to-images.sh` uses `-env:UserInstallation=file:///tmp/lo-${SESSION_ID}-${PID}` per call | §"Code Examples — pptx-to-images.sh" |
| RVW-10 | Post-call file-existence + size + magic-bytes; 60s timeout; 1 retry | §"Code Examples — pptx-to-images.sh" + Q-3 (portable size) + §"Common Pitfalls" P-04 |
| RVW-11 | Cleanup trap on `/tmp/lo-${SESSION_ID}-${PID}` (EXIT/INT/TERM) | §"Code Examples — pptx-to-images.sh" |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- `annotate.js` SHA-pinned binary asset — Phase 3 is read-only against it (only imports `runAnnotate` from `skills/annotate/scripts/index.js`).
- `pptxgenjs` exact pin `4.0.1` — Phase 3 does NOT use pptxgenjs at runtime (no rendering path), but the CI version-pin assertion stays green because no change.
- Path discipline: `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_PLUGIN_DATA}` only. `tools/lint-paths.sh` enforces. Banner-comment lint-allow tokens permitted only with justification.
- 4→3 severity collapse strictly at `/annotate` adapter — Phase 3 emits full 4-tier; this is a property test target.
- Content-vs-design boundary — `/review` does NOT flag argument structure; `/content-review` (Phase 6) does NOT flag visual issues.
- Test runner: `node --test`. Commit format: HEREDOC + `<type>(03-NN): <message>` + Co-Authored-By line.
- Silver Bullet enforcement is non-skippable — every plan ends with formal `/artifact-reviewer review-research`, `plan-checker`, `code-reviewer`, `gsd-verifier` gates with 2-consecutive-clean.

## Summary

Phase 3 ships `/instadecks:review`: a DECK-VDA-driven design critique skill that produces three artifacts (locked-schema findings JSON, fixed-template Markdown, LLM-authored narrative Markdown) plus an optional pipeline-into-`/annotate` mode. The research resolves all four open questions from CONTEXT.md:

- **Q-1 (DECK-VDA source):** The canonical methodology lives at `/Users/shafqat/Documents/Projects/Sourcevo/deck-design-review/SKILL.md` — read in full and summarized in §"DECK-VDA Methodology Re-Expression". 4-pass scan (MACRO / TYPOGRAPHY / DATA & OBJECTS / MICRO), 4-tier severity (Critical 🔴 / Major 🟠 / Minor 🟡 / Nitpick ⚪) with calibration "when uncertain choose the lower," finding grammar `[Severity] | [Category] — [Location] — [Defect] — [Standard violated] — [Fix]`, §1 systemic-after-full-scan, §3 exhaustive per-slide, §4 maturity scoreboard, §5 top-10 leverage fixes. Phase 3 canonicalizes (re-expresses) under Apache-2.0; NOTICE acknowledges upstream.
- **Q-2 (R18 AI-tells from PPTX XML):** **All three required heuristics are deterministically detectable from `ppt/slides/slide*.xml`** — verified by direct unzip-and-inspect of `tests/fixtures/v8-reference/Annotations_Sample.pptx`. Default-blue palette walks `<a:srgbClr val="HEX"/>`; accent-line-under-title detects `<a:ln>` shapes whose `<a:off y>` is within 12pt (~152400 EMU) of the title's baseline; identical-layouts-repeated computes a shape-graph hash per slide and counts collisions. Toolkit: **jszip** (already transitively installed via pptxgenjs) for unzip; **regex-on-XML-substrings** for shape extraction (no `xml2js` dep needed — XPath/DOM overkill for the targeted attributes; matches the `tools/normalize-pptx-sha.js` precedent set in Phase 2 Plan 04).
- **Q-3 (portable stat):** Use `wc -c < "$file"` — POSIX, byte-identical on macOS BSD and Linux GNU. `stat -c%s` (Linux) and `stat -f%z` (macOS) require runtime detection (`if stat -c%s … 2>/dev/null …`). Recommendation: `wc -c` is simpler and equally fast. Verified locally that `stat -c` fails on macOS Darwin 25.3.0 with "illegal option" while `stat -f%z` returns the correct size.
- **Q-4 (PPTX→PDF/PNG regression strategy):** Phase 3 ships **existence + size + magic-bytes** smoke checks only. A deterministic Tier 1 baseline is **architecturally infeasible** because soffice 26.x writes wall-clock timestamps and absolute filesystem paths into the output (same trap that forced Phase 2 Plan 04 to redefine Tier 1 as a structural-XML-normalized SHA — see `02-04-SUMMARY.md`). Tier 2 pixelmatch on rendered PNGs at 150 DPI is the right shape but stays `test.skip` behind ci.yml RESERVED block per Phase 7 RVW activation gate. Phase 3 contribution: a hermetic `tests/pptx-to-images.test.js` that runs the script against a tiny 1-slide PPTX fixture, asserts the three smoke checks, and skips on missing soffice.

**Primary recommendation:** Implement in **5 plans** across 3 waves: (Wave 1 serial) Plan 03-01 `pptx-to-images.sh` + tests; (Wave 2 parallel) Plan 03-02 `runReview` orchestrator + adapter to `runAnnotate` + structured-handoff mode + standalone CLI, Plan 03-03 `ai-tells.js` + unit tests, Plan 03-04 `render-fixed.js` Markdown renderer + unit tests; (Wave 3 serial) Plan 03-05 SKILL.md full body (DECK-VDA canonicalization) + NOTICE update + integration test + activation-pattern carry-forward. Plan 03-01 must land first because every other plan depends on PPTX→images. Plans 02/03/04 are parallel-safe (disjoint files). Plan 05 is the integration ribbon.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 4-pass visual critique (LLM judgment over slide images) | Skill agent (SKILL.md prompt) | — | The whole point of LLM-driven review; pure judgment, not deterministic |
| Locked-schema findings JSON emission | Skill agent (instructed by SKILL.md) → optionally validated by `runReview` orchestrator | `findings-schema.md` (validation contract) | Agent emits text; orchestrator can validate before downstream calls |
| R18 AI-tell deterministic detection | Skill script (`scripts/ai-tells.js`) | — | Pure-Node, unit-testable, version-pinned; D-02 |
| R18 AI-tell fuzzy detection | Skill agent (SKILL.md residual-tells prompt block) | — | Context-sensitive judgment beyond regex reach |
| PPTX → per-slide JPG conversion | Plugin shell script (`scripts/pptx-to-images.sh`) | System tools `soffice`, `pdftoppm` | D-07 — shared with Phases 4/5/6 |
| Fixed-template Markdown report | Skill script (`scripts/render-fixed.js`) | Locked schema as input | D-06 — auditable, regression-testable |
| LLM-authored narrative Markdown | Skill agent | — | Connective prose, not byte-stable |
| `runReview` orchestrator (validate → write JSON → render fixed → return) | Skill script (`scripts/index.js`) | Standalone CLI wrapper (`scripts/cli.js`) | Library + thin shell, mirrors Phase 2 D-06 pattern |
| Pipeline into `/annotate` | Skill script (imports `runAnnotate` from Phase 2) | — | RVW-06 / D-03 gated |
| Structured-handoff mode | Skill script (`mode: structured-handoff`) | — | RVW-08 / D-04 — return paths + counts, no stdout |
| Activation prompt-panel testing | Out of scope (Phase 7 / DIST-02) | — | Phase 3 only lands the description string pattern |

## Standard Stack

### Core (already pinned in Phases 1–2)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `pptxgenjs` | 4.0.1 (exact) | (Phase 2 dep — Phase 3 does NOT load it directly; only `runAnnotate` does) | [VERIFIED: package.json:16] Locked Phase 1 invariant |
| `node` runtime | ≥ 18 (CI uses 20; user's machine v25.6.0) | Test runner + script host | [VERIFIED: package.json:7 engines] |

### Supporting (already in lockfile or transitive)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `jszip` | 3.10.1 | Unzip PPTX → read `ppt/slides/slide*.xml` for AI-tell detection | [VERIFIED: `node_modules/jszip/package.json` v3.10.1; declared as direct dep of `pptxgenjs@4.0.1` in `pptxgenjs/package.json:44`; precedent: `tools/normalize-pptx-sha.js:20` already requires `jszip` (Phase 2 Plan 04)] |
| `node:test` | built-in | Test runner | Phase 1/2 convention |
| `node:assert/strict` | built-in | Assertions | Phase 1/2 convention |
| `node:crypto` | built-in | SHA-256 for shape-graph layout-hash de-duplication (R18 #3) | Already used in Phase 1/2 |
| `node:fs` / `node:fs/promises` | built-in | I/O | — |
| `node:child_process` `execFile` | built-in | Invoke `pptx-to-images.sh` | Phase 2 precedent (`skills/annotate/scripts/index.js:11`) |

### Recommendation: `jszip` becomes a direct dev-dep

**[ASSUMED]** `jszip` is currently installed only via `pptxgenjs`'s transitive declaration. Phase 2 Plan 04 silently relied on this transitive resolution. **Phase 3 should pin `jszip` as a direct `devDependency`** in `package.json` so:
- A future `pptxgenjs` upgrade that drops or changes `jszip` doesn't silently break Phase 3 tests.
- License-checker (FOUND-08) sees an explicit declaration.
- `npm ci --omit=dev` in production still works (jszip is dev-only — runtime AI-tells run in tests + agent-side `read-deck-xml.js`; production deck-image conversion goes through soffice not jszip).

**Risk if assumption wrong:** Mild — even if pinned as runtime dep instead, the cost is one extra ~80KB module in `${CLAUDE_PLUGIN_DATA}/node_modules`. Acceptable tradeoff.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `jszip` for PPTX unzip | `unzip` system command | Adds shell-dependency; jszip is already in lockfile; reject |
| Regex on slide XML for AI-tells | `xml2js` or `fast-xml-parser` | `xml2js` not installed; `fast-xml-parser` is fast and dependency-free [CITED: npm-compare.com fast-xml-parser comparison] but adding it is unnecessary — the AI-tell heuristics target ≤5 attribute patterns (`<a:srgbClr val=`, `<a:ln w=`, `<a:off y=`, `<a:latin typeface=`, shape-graph hash). Regex is sufficient and matches the Phase 2 `tools/normalize-pptx-sha.js` precedent (regex on `<dcterms:created>` and `descr="..."`). Reject adding any XML parser. |
| Custom-built PDF→images pipeline | `pdftoppm` (Poppler) | `pdftoppm` already required by Phase 1 SessionStart hook; Phase 4+ depends on it; Phase 3's `pptx-to-images.sh` follows the locked toolchain choice |
| `wc -c` for portable size | `stat -c%s` (Linux) / `stat -f%z` (macOS) detection | `wc -c < "$file"` is POSIX, identical on both platforms [CITED: baeldung.com/linux/portable-command-file-size]; simpler than runtime stat-flag detection. Locally verified: `stat -c%s` fails on macOS Darwin 25.3.0 with "illegal option"; `stat -f%z` returns 581 bytes. Use `wc -c`. |

### Version verification

| Tool | Verified Version | Date |
|------|------------------|------|
| `pptxgenjs` | 4.0.1 | [CITED: npmjs.com/package/pptxgenjs — published ~June 2025; npm registry confirms 4.0.1 as latest stable] |
| `jszip` | 3.10.1 | [VERIFIED: `cat node_modules/jszip/package.json` 2026-04-28] |
| `soffice` | 26.2.2.2 | [VERIFIED Phase 2: `soffice --version`] |
| `pdftoppm` | 26.02.0 | [VERIFIED Phase 2: `pdftoppm -v`] |

**No new runtime dependencies.** Phase 3 adds at most one direct devDep (`jszip` if we promote from transitive).

### System tools (Phase 1 SessionStart hook checks)

| Tool | Version | Purpose |
|------|---------|---------|
| `soffice` (LibreOffice) | ≥ 7.4 | PPTX → PDF (RVW-09/10/11) |
| `pdftoppm` (Poppler) | ≥ 22 | PDF → per-slide JPG @ 150 DPI for LLM `Read`-driven 4-pass scan |

## Architecture Patterns

### System Architecture Diagram

```
┌────────────────────────┐                        ┌────────────────────────┐
│ User: /instadecks:review│ ── deck.pptx ────────▶│ SKILL.md (DECK-VDA     │
│   --annotate? (D-03)    │                        │ playbook)              │
└────────────────────────┘                        └─────────┬──────────────┘
                                                            │
                                                            ▼
                            ┌──────────────────────────────────────────────┐
                            │ scripts/pptx-to-images.sh (D-07)             │
                            │   1. soffice --headless --convert-to pdf     │
                            │      -env:UserInstallation=… (D-05)          │
                            │   2. validate (exists + size > 1024 bytes    │
                            │      + magic-bytes %PDF) — RVW-10            │
                            │   3. pdftoppm -jpeg -r 150 → slide-NN.jpg    │
                            │   4. trap cleanup /tmp/lo-${SESSION}-${PID}  │
                            │      on EXIT/INT/TERM                — RVW-11│
                            └──────────────┬───────────────────────────────┘
                                           │
                                           ▼
                          ┌─────────────────────────────────────────────┐
                          │  Skill agent reads slide-NN.jpg via Read    │
                          │  + applies 4-pass DECK-VDA + 4-tier severity│
                          │  → emits findings (in-memory object)        │
                          └──────────────┬──────────────────────────────┘
                                         │ in-memory findings
                                         ▼
                       ┌─────────────────────────────────────────────────┐
                       │ skills/review/scripts/ai-tells.js                │
                       │   detectAITells({slidesXml, paletteHex,          │
                       │                  layoutHashes})                  │
                       │ → 3+ in-code heuristic findings, merged into     │
                       │   the agent's findings array (r18_ai_tell flag)  │
                       └──────────────┬──────────────────────────────────┘
                                      │
                                      ▼
            ┌────────────────────────────────────────────────────────────────┐
            │ skills/review/scripts/index.js — runReview({deckPath, runId,    │
            │   outDir, mode, findings, annotate})                            │
            │   1. validate findings against findings-schema.md               │
            │   2. write <deck>.review.json + run-dir copy                    │
            │   3. require('./render-fixed').render(findings)                 │
            │      → write <deck>.review.md (DETERMINISTIC)                   │
            │   4. agent authors <deck>.review.narrative.md (LLM-prose)       │
            │   5. if annotate: require('../../annotate/scripts').runAnnotate │
            │      ({deckPath, findings, outDir, runId})                      │
            │   6. return:                                                    │
            │      mode=standalone        → { jsonPath, mdPath, narrativePath │
            │                                 [, annotatedPptx, annotatedPdf]}│
            │      mode=structured-handoff → above + findingCounts +          │
            │                                 genuineCount, NO stdout         │
            └────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                            ┌────────────────────────┐
                            │  /annotate (Phase 2)    │ — gated by D-03
                            │  runAnnotate(...)       │
                            └────────────────────────┘
```

### Recommended Project Structure

```
skills/review/
├── SKILL.md                       # canonicalized DECK-VDA playbook (D-01) + R18 fuzzy tells (D-02)
├── references/
│   └── findings-schema.md         # locked v1.0 (Phase 1; READ-ONLY in Phase 3)
└── scripts/
    ├── index.js                   # exports runReview(...)            (D-04, RVW-07/08)
    ├── cli.js                     # standalone CLI wrapper            (RVW-07)
    ├── ai-tells.js                # detectAITells(...) — 3 heuristics (D-02, RVW-03)
    ├── render-fixed.js            # fixed-template MD renderer        (D-06, RVW-05)
    └── lib/
        ├── read-deck-xml.js       # jszip-based slide XML extractor (used by ai-tells.js)
        ├── schema-validator.js    # validates findings against findings-schema.md (reuses Phase 2 adapter logic)
        └── pdf-magic-bytes.js     # %PDF header check (also useful from index.js if not deferring entirely to shell)

scripts/                            # plugin-level (D-07)
└── pptx-to-images.sh              # PPTX → per-slide JPG @ 150 DPI    (RVW-09/10/11)

tests/
├── pptx-to-images.test.js          # unit + smoke (skip-guarded on soffice)
├── review-runtime.test.js          # integration: runReview standalone + structured-handoff modes
├── review-ai-tells.test.js         # unit: 3 in-code heuristics
├── review-render-fixed.test.js     # unit: fixed-template renderer against canonical fixture
├── review-pipeline.test.js         # integration: --annotate gating + runAnnotate handoff
├── review-schema-emission.test.js  # property: emitted findings match findings-schema.md (4-tier preserved)
└── fixtures/
    ├── tiny-deck.pptx             # 1-slide deck for pptx-to-images smoke test
    └── ai-tells-positive.pptx     # 3-slide deck triggering all 3 heuristics
    └── ai-tells-negative.pptx     # 3-slide deck triggering NONE
```

### Pattern 1: Canonicalize-don't-vendor (D-01)

**What:** Re-express the upstream `deck-design-review` SKILL.md as our own first-class authored content. Same methodology (4-pass scan, 4-tier severity, finding grammar, §1/§3/§4/§5 ordering), different prose under our Apache-2.0 license. NOTICE acknowledges upstream as "methodological influence."

**When:** Whenever upstream content is a methodology rather than executable code. Code → vendor; methodology → re-express.

**Why:** Avoids permanent coupling to upstream's docs, license, update cadence. The methodology survives upstream deletion or relicense.

### Pattern 2: Hybrid AI-tell detection (D-02)

**What:** Deterministic rules in code (regex / DOM / hash); fuzzy rules in SKILL.md prompt. Both emit same-shape findings tagged `r18_ai_tell: true` for downstream filter.

**When:** Whenever a check has both objective (color hex match, geometric proximity) and subjective (vibes, jargon density) elements.

**Why:** Code-side rules are unit-testable and version-pinned. Prompt-side rules leverage LLM judgment for context-sensitive cases. Tagging both with the same flag means downstream consumers (e.g., a future `r18-only` filter) don't care about provenance.

### Pattern 3: Two-Report architecture (D-06)

**What:** Always emit BOTH a fixed-template MD (script-rendered, deterministic) AND a narrative MD (LLM-authored, prose). Same JSON source.

**When:** When humans want narrative + tooling wants structure. Refine loops (Phase 5) consume JSON; users read the narrative.

**Why:** Fixed template is auditable + regression-testable. Narrative is what users actually read. Each artifact wins where the other can't.

### Pattern 4: Mode-gated invocation (D-04)

**What:** Single function (`runReview`) with `mode ∈ {"standalone","structured-handoff"}` parameter. Standalone prints to stdout for human-in-loop. Structured-handoff returns rich object including `findingCounts` + `genuineCount` for programmatic consumers (Phase 4/5 `/create`'s loop).

**When:** Function called both interactively and pipelined.

**Why:** One implementation, two surfaces. Mirrors Phase 2's `runAnnotate` precedent (D-06 of Phase 2).

### Anti-Patterns to Avoid

- **Pre-collapsing severity in `/review`:** The 4-tier vocabulary is the producer contract. Collapsing to 3-tier in `/review` breaks `/content-review` (which shares the schema) and the future r18-only filter. Property test guards.
- **Reading `findings-schema.md` at runtime:** The schema is a doc; the validator hard-codes the constants. Phase 2's adapter is the precedent (`adapter.js:SEV_MAP` table + required-fields list).
- **Trusting `soffice` exit codes:** soffice returns 0 on certain silent failures. `RVW-10` is the existence + size + magic-bytes guard; bypassing it for "speed" is a regression.
- **Vendoring `deck-design-review.md` verbatim:** Couples our update cadence to upstream's; D-01 forbids.
- **Adding `xml2js` or `fast-xml-parser`:** Out of proportion to the 5-attribute pattern set we need. Regex matches Phase 2 precedent.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PPTX unzip | Custom inflate | `jszip` | Already transitively installed; precedent in `tools/normalize-pptx-sha.js` |
| PPTX→PDF | Anything except soffice | `soffice --headless --convert-to pdf` | Locked Phase 1 toolchain |
| PDF→PNG/JPG | Custom rasterizer | `pdftoppm -jpeg -r 150` | Locked Phase 1 toolchain; matches DECK-VDA SKILL.md Step 1 (`pdftoppm -jpeg -r 120` upstream; we use 150 to match our visual-regression baseline DPI from Phase 1 FOUND-09) |
| Schema validation | `ajv` / `joi` / `zod` | Hand-rolled validator mirroring Phase 2 `adapter.js` | D-07 of Phase 2 wants pinpoint errors; small ad-hoc validator clearer; no new dep |
| Run-id timestamp | `uuid` | Built-in `Date` + `crypto.randomBytes(3).toString('hex')` | Format is custom (D-02 of Phase 2 inherited) |
| Severity-collapse table at producer | (anything) | NOTHING — keep 4-tier | Locked invariant; collapse only at `/annotate` adapter |
| portable file-size check | runtime stat-flag detection | `wc -c < "$file"` | POSIX, equal on macOS BSD + Linux GNU [CITED: baeldung.com/linux/portable-command-file-size] |

**Key insight:** Phase 3 adds **zero new runtime deps**, optionally promotes `jszip` from transitive to direct devDep, and otherwise reuses Phase 1/2 infrastructure top to bottom.

## DECK-VDA Methodology Re-Expression (Q-1 RESOLVED)

**Canonical source verified:** `/Users/shafqat/Documents/Projects/Sourcevo/deck-design-review/SKILL.md` (262 lines; read in full — `# lint-allow:hardcoded-path` for the source-of-truth reference). Sibling `deck-design-review.md` referenced at line 248 contains the long-form 190+-checkpoint Categories A–T checklist (Part 2) — used as the authoritative checkpoint vocabulary for our re-expression but NOT vendored.

**Methodology summary (to be canonicalized in our SKILL.md, NOT verbatim-vendored):**

### The 4-pass scan, every slide

| Pass | Focus | Examples |
|------|-------|----------|
| **1 — MACRO** | Grid, margins, density, template fit | Outer margins consistent? Slide overcrowded? |
| **2 — TYPOGRAPHY** | Hierarchy, consistency, ragged-right, leading | All action titles same font/size? Body leading consistent? |
| **3 — DATA & OBJECTS** | Charts, tables, icons, images, shapes | Y-axis starts at zero? Mixed icon sets? |
| **4 — MICRO** | Sub-pixel misalignments, pixel defects, typographic punctuation | 2px misaligned bar? Smart quote vs straight quote? |

**Apply all four to every slide before moving to next.** No exceptions for title / TOC / dividers / appendix / closing.

### 4-tier severity (producer vocabulary — never pre-collapsed in `/review`)

| Symbol | Tier | Trigger | When in JSON |
|--------|------|---------|--------------|
| 🔴 | `Critical` | Partner/CEO would reject (default PPT theme, contrast <3:1, broken claim) | `severity_reviewer: "Critical"` |
| 🟠 | `Major` | Obvious to attentive viewer; undermines perceived rigor | `severity_reviewer: "Major"` |
| 🟡 | `Minor` | Noticeable on close inspection (2–4 px misalignment, one widow) | `severity_reviewer: "Minor"` |
| ⚪ | `Nitpick` | Perfectionist-level (straight quote where smart quote belongs) | `severity_reviewer: "Nitpick"` |

**Calibration rule (verbatim retained):** *when uncertain between two levels, choose the lower severity.*

### Finding grammar (verbatim retained — locked schema mapping)

```
[Severity] | [Category] — [Precise location] — [Defect observed] — [Standard violated] — [Suggested fix]
```

Direct mapping to `findings-schema.md` v1.0:
- `[Severity]` → `severity_reviewer`
- `[Category]` → `category` (`defect` / `improvement` / `style`)
- `[Precise location]` → `location` (text); `nx`/`ny` (numeric annotation point)
- `[Defect observed]` → `text`
- `[Standard violated]` → `standard`
- `[Suggested fix]` → `fix`
- (DECK-VDA implicit "why is this genuine?") → `rationale`
- (Auto-refine triage flag) → `genuine` (boolean)

### Section ordering (locked)

| § | Section | When written |
|---|---------|--------------|
| §1 | Deck-Level Systemic Findings | **AFTER** full 4-pass scan completes — systemic issues only visible after seeing whole deck |
| §2 | Inferred Design System | Established in Step 2 (first 5 slides) — baseline that §3 references |
| §3 | Slide-by-Slide Findings | Every slide, per-slide template (4-tier counts + summary + main themes + scores out of 10 + severity-ranked top fixes) |
| §4 | Summary Scoreboard | Counts + maturity rating (Draft / Internal-ready / Client-ready / Partner-ready) per the apply-first-matching rubric |
| §5 | Top 10 Highest-Leverage Fixes | Ranked table: `Fix name | Affected slides | Severity resolved | Effort` |

### Maturity rubric (locked — first matching rule wins)

- **Draft** — any 🔴, OR total 🟠 > 5
- **Internal-ready** — 0🔴, 3 ≤ 🟠 ≤ 5
- **Client-ready** — 0🔴, 🟠 ≤ 2
- **Partner-ready** — 0🔴, 0🟠, 🟡 ≤ 10

### Anti-Hallucination rules (verbatim retained — re-expressed in our prose)

1. Never invent a defect you cannot see — point to specific slide + location.
2. Mark uncertainty explicitly: "Possible 2px misalignment — verify at 200% zoom."
3. Name exact coordinates or zones.
4. Distinguish PDF rendering artifacts from real authoring defects.
5. No compliments, no hedging in §3 — the audit is a defect list.
6. When flagging consistency, always name both sides.
7. If you catch yourself writing "the argument would be stronger if…" — DELETE the line. (Content-vs-design boundary; that's `/content-review`'s job.)

### Large decks (>20 slides)

Subagent chunking pattern from upstream is preserved: chunks of 15–20 slides; final chunk produces §1/§4/§5; chunk handoff passes full §2 + exact prior counts. Re-expressed in our SKILL.md.

### NOTICE update (D-01 obligation)

Add to `NOTICE`:

> The DECK-VDA methodology embedded in `/instadecks:review` (4-pass scan, 4-tier severity, finding grammar, §1–§5 reporting structure) was developed by Shafqat Ullah / Sourcevo as the standalone `deck-design-review` skill (`/Users/shafqat/Documents/Projects/Sourcevo/deck-design-review/`). Instadecks re-expresses the methodology as first-class authored content under Apache-2.0; no upstream files are vendored.

## R18 AI-Tell Heuristics (Q-2 RESOLVED — at least 3 in-code)

**Verified by direct unzip-and-inspect** of `tests/fixtures/v8-reference/Annotations_Sample.pptx`. The `ppt/slides/slide*.xml` files expose the exact attributes needed.

### Heuristic #1: Default-blue palette without justification (D-02 #1)

**Detection:** Walk `ppt/slides/slide*.xml` for `<a:srgbClr val="HEX"/>`. Count occurrences of each hex. If any of the canonical "default-blue" set appears in ≥30% of color cells across the deck:

| Default-blue family | Source |
|---|---|
| `0070C0` | Office 2016 default Accent 1 |
| `1F4E79` | Office Dark 25% Accent 1 |
| `2E75B6` | Office Lighter 40% Accent 1 |
| `4472C4` | Office 2013 default theme |
| `5B9BD5` | Office 2010 default theme |
| `8FAADC` | Office Lighter 60% |

Emit:
```jsonc
{
  "severity_reviewer": "Major",
  "category": "style",
  "genuine": true,                  // unless deck rationale doc justifies
  "nx": 0.5, "ny": 0.5,
  "text": "Default Office-blue palette dominates the deck",
  "rationale": "47/142 fill colors are #0070C0 (Office Accent 1); typical AI-generated decks fall back to defaults",
  "location": "deck-systemic",
  "standard": "Custom palette per deck (DECK-VDA §2 Inferred Design System)",
  "fix": "Choose a brand-justified palette; document in design-rationale.md",
  "r18_ai_tell": true
}
```

This is a §1 systemic finding (deck-level), not per-slide.

### Heuristic #2: Accent-line-under-title geometry (D-02 #2)

**Detection:** For each slide:
1. Identify the title text shape — heuristically: the topmost `<p:sp>` containing `<a:t>` with `<a:rPr sz="..."/>` ≥2400 (sz units = 1/100 pt → 24pt+) AND `b="1"` (bold). Track its `<a:off y>` and `<a:ext cy>` (EMU; 914400 EMU = 1 inch; 12700 EMU = 1 pt).
2. Look for any `<p:sp>` whose `<a:prstGeom prst="line">` (or rect with `cy < 50800` ~= 4pt height) AND whose `<a:off y>` is within **152400 EMU (12pt)** of the title's baseline (`title_off_y + title_ext_cy`) AND whose `<a:ext cx>` ≥ **50% of slide width** (full-width-ish; default slide is 9144000 EMU wide for 16:9).
3. Threshold for triggering: present on ≥3 slides (consistency = generator-driven).

Emit per-slide finding (`severity_reviewer: "Major"`, `category: "style"`, `r18_ai_tell: true`, location = `"under title"`, standard = `"NEVER use accent lines under titles (Anthropic pptx skill 'Avoid' list)"`).

**Source for heuristic threshold:** SUMMARY.md "Avoid list — accent lines under titles" + DECK-VDA upstream "Anti-Hallucination Rules" + Anthropic-bundled `pptx` skill design-ideas guidance ([CITED: SUMMARY.md §"Expected Features" — "10 anti-patterns including 'NEVER use accent lines under titles'"]).

### Heuristic #3: Identical-layout-repeated (D-02 #3)

**Detection:** For each slide, compute a **shape-graph hash**:
1. Extract every `<p:sp>` and `<p:pic>` from the slide XML.
2. For each shape, capture `(prst-or-element-name, off_x_bucket, off_y_bucket, ext_cx_bucket, ext_cy_bucket)` where buckets = round to nearest 100000 EMU (~ 0.11 inch, tolerant of small jitter).
3. Sort the per-slide tuples lexicographically; SHA-256 the joined string.
4. Group slides by hash; if any hash count ≥ **3**, emit one §1 systemic finding listing the affected slide numbers.

Emit:
```jsonc
{
  "severity_reviewer": "Major",
  "category": "style",
  "genuine": true,
  "nx": 0.5, "ny": 0.5,
  "text": "Identical layout repeated on slides {N1, N2, N3, …}",
  "rationale": "Shape-graph hash collision across {count} slides; AI generators often reuse identical scaffolding",
  "location": "deck-systemic",
  "standard": "Slide-to-slide visual variety (DECK-VDA Pass 1 MACRO)",
  "fix": "Vary at least one layout dimension across consecutive same-type slides",
  "r18_ai_tell": true
}
```

### Toolkit confirmation

| Need | Tool | Note |
|------|------|------|
| Unzip PPTX | `jszip` | [VERIFIED transitive; precedent: `tools/normalize-pptx-sha.js`] |
| Extract `<a:srgbClr val="HEX"/>` | regex `/<a:srgbClr\s+val="([0-9A-Fa-f]{6})"/g` | Direct verified pattern in slide1.xml |
| Extract `<a:off y="..."/>` and `<a:ext cy="..."/>` | regex with sibling-tag tracking | Same |
| Detect `<a:prstGeom prst="line">` | regex `/<a:prstGeom\s+prst="line"\b/` | Same |
| SHA-256 layout hash | `node:crypto` `createHash('sha256')` | Phase 1/2 precedent |

**No `xml2js` / `fast-xml-parser` needed.** All five attribute extractions are regex-tractable and the resulting code stays under ~150 LOC. If a future heuristic needs deep tree traversal we can revisit.

### Fuzzy / prompt-side R18 tells (in SKILL.md)

The SKILL.md `## R18 AI-Tell Detection — Fuzzy` section lists residual tells the LLM judges:

- Vague jargon ("synergize", "leverage", "unlock potential") — count per slide; flag if >2/slide.
- Generic stock-photo vibes (people-pointing-at-screens, abstract handshake imagery).
- "AI-flavored" phrasing patterns ("In today's rapidly evolving landscape, …").
- Inconsistent voice across speaker notes.
- Title-case shouting ("The 5 Reasons Your Strategy Will Fail").

Each emitted as `category: "style"` with `r18_ai_tell: true`, `genuine` per LLM judgment.

## Two-Report Architecture (D-06 detail)

### Fixed-template renderer (`scripts/render-fixed.js`)

Pure function: `(findingsDoc) → markdown_string`. No LLM, no fs, no async.

Output structure (matches DECK-VDA §1–§5):

```markdown
# Design Review — {deck filename}

> Generated {ISO timestamp} · {N} slides reviewed · maturity: {Draft|Internal-ready|Client-ready|Partner-ready}

## §1 — Deck-Level Systemic Findings

{loop over findings where location == "deck-systemic"}
- **🔴 Critical** | Typography — {text}
  - *Standard:* {standard}
  - *Fix:* {fix}

## §2 — Inferred Design System

{from findings-meta if provided; else "(see SKILL.md §2 — agent declares baseline before §3)"}

## §3 — Slide-by-Slide Findings

{for each slide:}
### Slide {N} — {title}

Findings: {🔴×c} / {🟠×m} / {🟡×i} / {⚪×n}

🔴 CRITICAL
- {text} — {standard} → {fix}
…

## §4 — Summary Scoreboard

| Metric | Count |
|--------|-------|
| Total slides audited | {N} |
| Slides with ≥1 Critical | {N} |
| …  | … |
| Overall design maturity | **{maturity}** |

## §5 — Top 10 Highest-Leverage Fixes

| # | Fix | Affected slides | Severity resolved | Effort |
|---|-----|-----------------|-------------------|--------|
| 1 | {fix-text} | {S1, S2, …} | {Critical/Major/…} | {trivial/light/moderate/substantial} |
…
```

**Property:** Given the same `findingsDoc`, `render-fixed.js` produces byte-identical output. Unit test against `tests/fixtures/sample-findings.json` with a snapshot file `tests/fixtures/sample-findings.fixed.md`.

### Narrative renderer (LLM-authored, in SKILL.md)

After JSON + fixed MD are written, the agent reads them and authors `<deck>.review.narrative.md`. SKILL.md instructs:

- **Length:** 200–800 words.
- **Cite specifics:** every paragraph must reference at least one slide number and one finding's `text`. Pure prose without citation is a violation.
- **Audience:** decision-maker who hasn't read §3 yet — explain the deck's overall design posture, dominant patterns, what's working, what's not, recommended priority order.
- **Test:** presence + minimum 200 words. No byte-stable assertion.

## Pipeline Architecture (D-03 + RVW-06)

```js
// skills/review/scripts/index.js
const { runAnnotate } = require('../../annotate/scripts');
const { detectAITells } = require('./ai-tells');
const { render } = require('./render-fixed');
const { validate } = require('./lib/schema-validator');

async function runReview({ deckPath, runId, outDir, mode = 'standalone', findings, annotate = false }) {
  // findings is in-memory: agent has done 4-pass + ai-tells.detectAITells already
  // (or runReview may invoke detectAITells if findings doesn't include r18_ai_tell flagged ones)
  validate(findings);                                    // throws on schema violation

  const sib = resolveSiblingOutputs(deckPath);           // <deck>.review.{json,md,narrative.md}
  await fs.writeFile(sib.jsonPath, JSON.stringify(findings, null, 2));
  await fs.writeFile(sib.mdPath, render(findings));
  // narrative.md is authored by the agent AFTER runReview returns

  let annotated;
  if (annotate) {
    annotated = await runAnnotate({ deckPath, findings, outDir, runId });
  }

  if (mode === 'structured-handoff') {
    return {
      jsonPath: sib.jsonPath,
      mdPath: sib.mdPath,
      narrativePath: sib.narrativePath,
      findingCounts: countBySeverity(findings),
      genuineCount: countGenuine(findings),
      ...(annotated && { annotatedPptx: annotated.pptxPath, annotatedPdf: annotated.pdfPath }),
    };
  }
  // mode === 'standalone'
  console.log(JSON.stringify({ jsonPath: sib.jsonPath, mdPath: sib.mdPath, /*…*/ }, null, 2));
  return { /*same shape*/ };
}
```

**Pipeline gating (D-03):** `annotate` parameter defaults `false`. CLI `--annotate` flag sets `true`. SKILL.md instructs the agent to pass `--annotate` when the user's request mentions "annotate" / "overlay" / "markup" / similar.

**Structured-handoff (D-04):** Phase 4/5 `/create` will import `runReview` directly, pass `mode: 'structured-handoff'`, and consume `findingCounts` + `genuineCount` for convergence checking. No file roundtrip beyond what disk already buffers.

## Common Pitfalls

### P-01: Pre-collapsing severity in `/review` breaks `/content-review` and r18 filter

**What goes wrong:** Producer emits `severity_reviewer: "MAJOR"` (3-tier) instead of `"Critical"`/`"Major"` (4-tier). Phase 2 adapter has no entry for `"MAJOR"` → throws. `/content-review` (Phase 6) also can't distinguish Critical vs Major findings.
**Why it happens:** Reviewer authors think the schema is the 3-tier seen in `annotate.js` SAMPLES.
**How to avoid:** Property test on emitted JSON: `assert(['Critical','Major','Minor','Nitpick'].includes(f.severity_reviewer))` for every finding. SKILL.md states explicitly: "DO NOT collapse to MAJOR/MINOR/POLISH; that happens at /annotate."
**Warning signs:** `runAnnotate` throws `severity_reviewer: MAJOR not in {Critical,Major,Minor,Nitpick}` (Phase 2 `adapter.js` error format).

### P-02: soffice exit-code 0 with empty output (RVW-10 motivation)

**What goes wrong:** Phase 2 already documented this in `02-RESEARCH.md` P-04. soffice variants silently fail and return 0 with no PDF, or with a corrupted 0-byte PDF. `pdftoppm` similarly produces partial output on resource-pressure conditions.
**Why it happens:** soffice headless dispatcher fails after process started; PDF fork returns 0 prematurely.
**How to avoid:** **Always** check (a) target file exists (`test -f`), (b) size > 1024 bytes (`[ "$(wc -c < "$f")" -gt 1024 ]` — POSIX-portable per Q-3), (c) for PDFs, magic bytes `%PDF` at offset 0 (`head -c 4 "$f" | grep -q '^%PDF'`). Failure → 1 retry → fail loud with full stderr.
**Warning signs:** "Source file could not be loaded" with no further detail; downstream `pdftoppm` errors with "Syntax Error: Couldn't find trailer dictionary."

### P-03: macOS `stat -c` flag silently fails (Q-3 motivation)

**What goes wrong:** Bash script written with `stat -c%s "$f"` works on Linux CI but fails on macOS dev machine with "stat: illegal option -- c" (verified locally on Darwin 25.3.0). Or vice versa.
**Why it happens:** GNU stat (Linux) uses `-c <fmt>`; BSD stat (macOS) uses `-f <fmt>`.
**How to avoid:** Use `wc -c < "$file"` — POSIX standard, identical output on both platforms [CITED: baeldung.com/linux/portable-command-file-size]. Avoid `stat` for portable size checks.
**Warning signs:** CI green on Ubuntu, red on macOS dev (or vice versa).

### P-04: soffice user-profile collision under concurrent invocation (inherited from Phase 2 D-08)

**What goes wrong:** Two concurrent soffice calls share `/root/.config/libreoffice` and one silently wedges.
**How to avoid:** D-05 — per-call `-env:UserInstallation=file:///tmp/lo-${SESSION_ID}-${PID}`. Per-PID isolation gives concurrency safety. Cleanup `trap` removes on exit (RVW-11).
**Warning signs:** Random hangs at the 60s timeout boundary.

### P-05: soffice timestamp + path nondeterminism kills any byte-baseline regression (Q-4 motivation)

**What goes wrong:** Phase 2 Plan 04 hit this: pptxgenjs writes `<dcterms:created>` wall-clock + `descr="<absolute path>"`, defeating byte-identical SHA assertion. soffice's PDF output similarly carries a `/CreationDate` Info entry.
**How to avoid:** Phase 3 ships **smoke checks only** for `pptx-to-images.sh` (existence + size + magic bytes). Tier 1 deterministic baseline = NOT FEASIBLE for the PDF/PNG output of soffice/pdftoppm without normalization (and PNG normalization is its own can of worms). Phase 7 RVW-09..11 unblocks Tier 2 pixelmatch behind ci.yml RESERVED block.
**Warning signs:** Plan-time temptation to "just SHA-pin the PDF" — resist; redirect to smoke checks.

### P-06: Cleanup trap firing too early in `pptx-to-images.sh`

**What goes wrong:** `trap 'rm -rf /tmp/lo-…' EXIT` fires when a subshell exits, not the script. Or fires before pdftoppm finishes if a `&` background was used.
**How to avoid:** Trap at top of script, BEFORE first soffice call. Use `EXIT INT TERM` (not `ERR` — ERR is suppressed under `set -e` in some bash versions). Avoid `&` in this script (sequential conversion is the design).
**Warning signs:** `pdftoppm: Error: PDF file is damaged` (PDF was deleted before pdftoppm finished).

### P-07: `runAnnotate` import path drift

**What goes wrong:** Phase 2's `runAnnotate` is exported from `skills/annotate/scripts/index.js`. Phase 3 imports via relative path `require('../../annotate/scripts')`. If Phase 7 reorganizes the skill tree, the import breaks silently.
**How to avoid:** Lock the import path in a `tests/review-pipeline.test.js` smoke that imports both `runReview` and `runAnnotate` from their canonical paths, mocks the underlying side effects, and asserts the wired call. CI fails loud on path drift.
**Warning signs:** `Cannot find module '../../annotate/scripts'` only appears at runtime (not at startup).

### P-08: AI-tell heuristic false-positives on hand-authored decks

**What goes wrong:** A hand-authored deck legitimately uses `#0070C0` because it's the brand color. AI-tell heuristic flags `r18_ai_tell: true` even though it's correct.
**How to avoid:** Heuristic emits `genuine: true` BUT the SKILL.md prompt instructs the agent to flip `genuine: false` when the deck's own design-rationale doc (Phase 4 CRT-06) justifies the choice. The flag survives to the rationale doc; the annotation overlay doesn't show it.
**Warning signs:** Phase 5 auto-refine attempts to "fix" the brand color → loop oscillates.

### P-09: Slide title detection misfires for non-bold or smaller-than-24pt titles

**What goes wrong:** Heuristic #2 (accent-line-under-title) needs the title shape located. If a deck uses a non-bold or 22pt title, the regex misses, and the heuristic returns no findings (false negative).
**How to avoid:** Fall back to "topmost shape with `<a:t>`" if no shape passes the bold+24pt+ filter. Document the fallback in `ai-tells.js`. Unit test the fallback path.
**Warning signs:** Decks where Heuristic #2 returns 0 findings on every slide despite obvious accent lines.

### P-10: Narrative MD bypassing the citation rule

**What goes wrong:** Agent writes `<deck>.review.narrative.md` as pure prose without slide-number citations. Useless to the reader.
**How to avoid:** Test asserts at least 3 occurrences of `Slide \d+` or finding-id-style references in the narrative file. Soft check — fails with a warning, not error — because LLM output isn't byte-stable.
**Warning signs:** Test warns: "narrative.md has fewer than 3 slide citations — review SKILL.md narrative-quality instructions."

## Runtime State Inventory

Phase 3 is greenfield code — no rename / refactor / migration. **All five categories: None.**

- **Stored data:** None — no databases or datastores.
- **Live service config:** None — no n8n / external service config.
- **OS-registered state:** None — no Task Scheduler / launchd / pm2 entries.
- **Secrets / env vars:** None — no SOPS / .env changes (CLAUDE_PLUGIN_DATA / CLAUDE_PLUGIN_ROOT inherited).
- **Build artifacts / installed packages:** Possible: if we promote `jszip` from transitive to direct devDep, `package-lock.json` updates and `npm ci` re-runs. Action = code edit (`package.json` + `package-lock.json` regenerate) + Phase 1 SessionStart hook re-runs `npm ci --omit=dev` automatically (FOUND-04).

## Code Examples

### Example 1: `scripts/pptx-to-images.sh` (D-07; RVW-09/10/11)

**Source:** original v8 `scripts/pptx-to-images.sh` precedent (referenced in SUMMARY.md §"Architecture Approach" component 3) + Phase 2 D-08 + Q-3 portable-size + P-06 trap discipline.

```bash
#!/usr/bin/env bash
# scripts/pptx-to-images.sh — PPTX → per-slide JPG @ 150 DPI for /review (and Phase 4/5/6).
# RVW-09/10/11: per-call -env:UserInstallation, 60s timeout, 1 retry, post-call validation, cleanup trap.
#
# Usage: pptx-to-images.sh <input.pptx> <output_dir>
# Exit codes:
#   0  success
#   1  invalid args
#   2  soffice failed twice
#   3  soffice produced empty/missing PDF
#   4  pdftoppm failed
#   5  pdftoppm produced no JPGs

set -euo pipefail
umask 0077

INPUT="${1:-}"
OUTDIR="${2:-}"
if [[ -z "$INPUT" || -z "$OUTDIR" ]]; then
  echo "Usage: pptx-to-images.sh <input.pptx> <output_dir>" >&2
  exit 1
fi
[[ -f "$INPUT" ]] || { echo "Instadecks: input not a file: $INPUT" >&2; exit 1; }
mkdir -p "$OUTDIR"

SESSION_ID="${CLAUDE_SESSION_ID:-s$(date +%s)}"
LO_PROFILE="/tmp/lo-${SESSION_ID}-$$"
mkdir -p "$LO_PROFILE"
trap 'rm -rf "$LO_PROFILE"' EXIT INT TERM   # RVW-11

# --- 1. soffice → PDF ---------------------------------------------------------
PDF_PATH="$OUTDIR/$(basename "${INPUT%.*}").pdf"
attempt=0
while (( attempt < 2 )); do
  attempt=$(( attempt + 1 ))
  if timeout 60 soffice \
        --headless \
        "-env:UserInstallation=file://$LO_PROFILE" \
        --convert-to pdf \
        --outdir "$OUTDIR" \
        "$INPUT" 2> "$OUTDIR/soffice.stderr"; then
    break
  fi
  if (( attempt == 2 )); then
    echo "Instadecks: soffice failed twice (see $OUTDIR/soffice.stderr)" >&2
    exit 2
  fi
done

# RVW-10: existence + size + magic-bytes (P-02 / P-03 / P-05)
if [[ ! -f "$PDF_PATH" ]]; then
  echo "Instadecks: soffice exited 0 but PDF missing: $PDF_PATH" >&2
  exit 3
fi
SIZE=$(wc -c < "$PDF_PATH")           # Q-3: portable, POSIX-standard
if (( SIZE < 1024 )); then
  echo "Instadecks: soffice produced PDF < 1024 bytes (got $SIZE): $PDF_PATH" >&2
  exit 3
fi
MAGIC=$(head -c 4 "$PDF_PATH")
if [[ "$MAGIC" != "%PDF" ]]; then
  echo "Instadecks: soffice output is not a PDF (magic: $(printf '%q' "$MAGIC")): $PDF_PATH" >&2
  exit 3
fi

# --- 2. pdftoppm → JPG @ 150 DPI ---------------------------------------------
SLIDE_PREFIX="$OUTDIR/slide"
if ! timeout 60 pdftoppm -jpeg -r 150 "$PDF_PATH" "$SLIDE_PREFIX" 2> "$OUTDIR/pdftoppm.stderr"; then
  # 1 retry
  if ! timeout 60 pdftoppm -jpeg -r 150 "$PDF_PATH" "$SLIDE_PREFIX" 2> "$OUTDIR/pdftoppm.stderr"; then
    echo "Instadecks: pdftoppm failed twice (see $OUTDIR/pdftoppm.stderr)" >&2
    exit 4
  fi
fi
shopt -s nullglob
JPGS=( "$SLIDE_PREFIX"-*.jpg )
shopt -u nullglob
if (( ${#JPGS[@]} == 0 )); then
  echo "Instadecks: pdftoppm produced no JPGs in $OUTDIR" >&2
  exit 5
fi

# RVW-10: per-JPG smoke check
for jpg in "${JPGS[@]}"; do
  s=$(wc -c < "$jpg")
  if (( s < 1024 )); then
    echo "Instadecks: $jpg < 1024 bytes — pdftoppm partial-output suspected" >&2
    exit 5
  fi
  m=$(head -c 3 "$jpg" | xxd -p)
  # JPEG magic: FF D8 FF
  [[ "$m" == "ffd8ff" ]] || {
    echo "Instadecks: $jpg lacks JPEG magic bytes (got: $m)" >&2
    exit 5
  }
done

echo "Instadecks: $PDF_PATH + ${#JPGS[@]} slide JPGs → $OUTDIR"
```

[VERIFIED: bash idioms — `umask 0077`, `set -euo pipefail`, `trap … EXIT INT TERM` — match Phase 1 precedent (CLAUDE.md / 02-PATTERNS S4)]
[CITED: `wc -c < "$file"` portable-size — baeldung.com/linux/portable-command-file-size]
[VERIFIED: per-call `-env:UserInstallation=file:///…` — Phase 2 D-08, RESEARCH.md P-04]

### Example 2: `skills/review/scripts/ai-tells.js` (D-02; RVW-03)

```js
'use strict';
// ai-tells.js — Deterministic R18 AI-tell heuristics.
// Per Phase 3 D-02 (hybrid; in-code rules) + RVW-03.
// Three heuristics: default-blue palette, accent-line-under-title, identical-layouts-repeated.

const crypto = require('node:crypto');
const JSZip = require('jszip');
const fs = require('node:fs/promises');

const DEFAULT_BLUES = new Set([
  '0070C0', '1F4E79', '2E75B6', '4472C4', '5B9BD5', '8FAADC',
]);
const TITLE_BASELINE_TOLERANCE_EMU = 152400;     // 12pt
const FULL_WIDTH_THRESHOLD_EMU     = 4572000;    // 50% of 9144000 (16:9 default slide width)
const LAYOUT_BUCKET_EMU            = 100000;     // ~0.11 inch
const DEFAULT_BLUE_DOMINANCE_PCT   = 0.30;
const REPEATED_LAYOUT_MIN_COUNT    = 3;
const ACCENT_LINE_MIN_SLIDES       = 3;

async function loadSlides(pptxPath) {
  const zip = await JSZip.loadAsync(await fs.readFile(pptxPath));
  const slideFiles = Object.keys(zip.files)
    .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const an = parseInt(a.match(/slide(\d+)/)[1], 10);
      const bn = parseInt(b.match(/slide(\d+)/)[1], 10);
      return an - bn;
    });
  const slides = [];
  for (const f of slideFiles) {
    slides.push({
      slideNum: parseInt(f.match(/slide(\d+)/)[1], 10),
      xml: await zip.file(f).async('string'),
    });
  }
  return slides;
}

function detectDefaultBluePalette(slides) {
  const colorCounts = {};
  for (const s of slides) {
    const matches = s.xml.matchAll(/<a:srgbClr\s+val="([0-9A-Fa-f]{6})"/g);
    for (const m of matches) {
      const hex = m[1].toUpperCase();
      colorCounts[hex] = (colorCounts[hex] || 0) + 1;
    }
  }
  const total = Object.values(colorCounts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  let defaultBlueCount = 0;
  for (const [hex, c] of Object.entries(colorCounts)) {
    if (DEFAULT_BLUES.has(hex)) defaultBlueCount += c;
  }
  if (defaultBlueCount / total < DEFAULT_BLUE_DOMINANCE_PCT) return null;
  return {
    severity_reviewer: 'Major', category: 'style', genuine: true,
    nx: 0.5, ny: 0.5,
    text: `Default Office-blue palette dominates the deck (${defaultBlueCount}/${total} fills)`,
    rationale: 'Default Office accent blues appear in >30% of color cells; typical AI-generator fallback',
    location: 'deck-systemic',
    standard: 'Custom palette per deck (DECK-VDA §2)',
    fix: 'Choose a brand-justified palette; document in design-rationale.md',
    r18_ai_tell: true,
    slideNum: null,   // deck-systemic — no per-slide attribution
  };
}

function extractShapes(xml) {
  // Lightweight shape extraction. Each <p:sp> or <p:pic> chunk between matching tags.
  // Captures (kind, off_x, off_y, ext_cx, ext_cy, prstGeom-or-name).
  const shapes = [];
  const spRegex = /<p:(sp|pic)\b[\s\S]*?<\/p:\1>/g;
  for (const m of xml.matchAll(spRegex)) {
    const chunk = m[0];
    const off = chunk.match(/<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/);
    const ext = chunk.match(/<a:ext\s+cx="(-?\d+)"\s+cy="(-?\d+)"/);
    if (!off || !ext) continue;
    const prst = (chunk.match(/<a:prstGeom\s+prst="([^"]+)"/) || [])[1] || m[1];
    shapes.push({
      kind: m[1],
      offX: parseInt(off[1], 10), offY: parseInt(off[2], 10),
      extCx: parseInt(ext[1], 10), extCy: parseInt(ext[2], 10),
      prst,
      isBoldLargeText: /<a:rPr[^>]*\bb="1"\b[^>]*\bsz="(\d+)"/.test(chunk) &&
                       parseInt((chunk.match(/<a:rPr[^>]*\bsz="(\d+)"/) || ['', '0'])[1], 10) >= 2400,
    });
  }
  return shapes;
}

function detectAccentLineUnderTitle(slides) {
  const findings = [];
  for (const s of slides) {
    const shapes = extractShapes(s.xml);
    // Title heuristic: topmost bold-large; fallback: topmost with text
    let title = shapes
      .filter(sh => sh.isBoldLargeText)
      .sort((a, b) => a.offY - b.offY)[0];
    if (!title) {
      title = shapes
        .filter(sh => /<a:t>/.test(s.xml))   // any text shape
        .sort((a, b) => a.offY - b.offY)[0];
    }
    if (!title) continue;
    const titleBaseline = title.offY + title.extCy;
    const accent = shapes.find(sh =>
      sh.kind === 'sp' &&
      (sh.prst === 'line' || sh.extCy < 50800) &&
      Math.abs(sh.offY - titleBaseline) <= TITLE_BASELINE_TOLERANCE_EMU &&
      sh.extCx >= FULL_WIDTH_THRESHOLD_EMU,
    );
    if (accent) {
      findings.push({
        slideNum: s.slideNum,
        severity_reviewer: 'Major', category: 'style', genuine: true,
        nx: (accent.offX + accent.extCx / 2) / 9144000,
        ny: (accent.offY) / 5143500,    // 16:9 height in EMU
        text: 'Accent line under title (R18 AI-tell)',
        rationale: 'Generator-style accent rule under title; flagged on Anthropic pptx skill Avoid list',
        location: 'under title',
        standard: 'NEVER use accent lines under titles (Anthropic pptx skill Avoid list)',
        fix: 'Remove the accent line; use whitespace + type weight for hierarchy',
        r18_ai_tell: true,
      });
    }
  }
  return findings.length >= ACCENT_LINE_MIN_SLIDES ? findings : [];
}

function detectIdenticalLayoutsRepeated(slides) {
  const hashesBySlide = {};
  for (const s of slides) {
    const shapes = extractShapes(s.xml);
    const tuples = shapes
      .map(sh => [sh.kind, sh.prst,
        Math.round(sh.offX / LAYOUT_BUCKET_EMU),
        Math.round(sh.offY / LAYOUT_BUCKET_EMU),
        Math.round(sh.extCx / LAYOUT_BUCKET_EMU),
        Math.round(sh.extCy / LAYOUT_BUCKET_EMU)].join('|'))
      .sort();
    const hash = crypto.createHash('sha256').update(tuples.join('\0')).digest('hex');
    (hashesBySlide[hash] ||= []).push(s.slideNum);
  }
  const findings = [];
  for (const [, slideNums] of Object.entries(hashesBySlide)) {
    if (slideNums.length >= REPEATED_LAYOUT_MIN_COUNT) {
      findings.push({
        slideNum: null,
        severity_reviewer: 'Major', category: 'style', genuine: true,
        nx: 0.5, ny: 0.5,
        text: `Identical layout repeated on slides ${slideNums.join(', ')}`,
        rationale: `Shape-graph hash collision across ${slideNums.length} slides; AI generators reuse scaffolding`,
        location: 'deck-systemic',
        standard: 'Slide-to-slide visual variety (DECK-VDA Pass 1 MACRO)',
        fix: 'Vary at least one layout dimension across consecutive same-type slides',
        r18_ai_tell: true,
      });
    }
  }
  return findings;
}

async function detectAITells(pptxPath) {
  const slides = await loadSlides(pptxPath);
  const out = [];
  const dblue = detectDefaultBluePalette(slides); if (dblue) out.push(dblue);
  out.push(...detectAccentLineUnderTitle(slides));
  out.push(...detectIdenticalLayoutsRepeated(slides));
  return out;
}

module.exports = { detectAITells, _internal: {
  detectDefaultBluePalette, detectAccentLineUnderTitle, detectIdenticalLayoutsRepeated,
  extractShapes, loadSlides,
}};
```

[VERIFIED: regex patterns against unzipped `tests/fixtures/v8-reference/Annotations_Sample.pptx ppt/slides/slide1.xml` — confirms `<a:srgbClr val="HEX"/>`, `<a:off x="" y=""/>`, `<a:ext cx="" cy=""/>`, `<a:rPr … sz="" b="1"/>`, `<a:prstGeom prst="..."/>` patterns exist verbatim]

### Example 3: `skills/review/scripts/index.js` (D-04; RVW-05/06/07/08)

```js
'use strict';
// index.js — exports runReview({deckPath, runId, outDir, mode, findings, annotate}).
// Per Phase 3 D-04 / D-06 / RVW-05/06/07/08.

const path = require('node:path');
const fsp = require('node:fs/promises');
const crypto = require('node:crypto');

function generateRunId() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const ts = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-`
           + `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `${ts}-${crypto.randomBytes(3).toString('hex')}`;
}

function resolveSiblingOutputs(deckPath) {
  const dir = path.dirname(deckPath);
  const ext = path.extname(deckPath);
  const base = path.basename(deckPath, ext);
  return {
    jsonPath: path.join(dir, `${base}.review.json`),
    mdPath:   path.join(dir, `${base}.review.md`),
    narrativePath: path.join(dir, `${base}.review.narrative.md`),
  };
}

function countBySeverity(findings) {
  const c = { Critical: 0, Major: 0, Minor: 0, Nitpick: 0 };
  for (const slide of findings.slides) {
    for (const f of slide.findings) c[f.severity_reviewer]++;
  }
  return { critical: c.Critical, major: c.Major, minor: c.Minor, nitpick: c.Nitpick };
}

function countGenuine(findings) {
  let n = 0;
  for (const slide of findings.slides) {
    for (const f of slide.findings) if (f.genuine === true) n++;
  }
  return n;
}

async function runReview({ deckPath, runId, outDir, mode = 'standalone', findings, annotate = false } = {}) {
  if (!deckPath) throw new Error('runReview: deckPath required');
  if (!findings) throw new Error('runReview: findings required (in-memory object)');

  const { validate } = require('./lib/schema-validator');
  validate(findings);              // throws Error on schema violation

  runId = runId || generateRunId();
  outDir = outDir || path.join(process.cwd(), '.planning', 'instadecks', runId);
  await fsp.mkdir(outDir, { recursive: true });

  const sib = resolveSiblingOutputs(deckPath);
  await fsp.writeFile(sib.jsonPath, JSON.stringify(findings, null, 2));

  const { render } = require('./render-fixed');
  await fsp.writeFile(sib.mdPath, render(findings));

  // Mirror to run-dir archive
  await fsp.copyFile(sib.jsonPath, path.join(outDir, path.basename(sib.jsonPath)));
  await fsp.copyFile(sib.mdPath, path.join(outDir, path.basename(sib.mdPath)));

  let annotated;
  if (annotate) {
    const { runAnnotate } = require('../../annotate/scripts');
    annotated = await runAnnotate({ deckPath, findings, outDir, runId });
  }

  const result = {
    jsonPath: sib.jsonPath, mdPath: sib.mdPath, narrativePath: sib.narrativePath,
    runDir: outDir, runId,
    findingCounts: countBySeverity(findings),
    genuineCount: countGenuine(findings),
    ...(annotated && { annotatedPptx: annotated.pptxPath, annotatedPdf: annotated.pdfPath }),
  };

  if (mode === 'standalone') {
    console.log(JSON.stringify(result, null, 2));
  }
  return result;
}

module.exports = { runReview, generateRunId, resolveSiblingOutputs };
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Standalone `deck-design-review` skill at `~/.claude/skills/` | Bundled, canonicalized into Instadecks under Apache-2.0 | Phase 3 (D-01) | Marketplace-installable; survives upstream changes |
| Reviewer emits 3-tier (post-collapsed) severity | Reviewer emits full 4-tier; collapse happens at `/annotate` adapter only | Phase 1 schema lock | `/content-review` and r18 filter both depend on full taxonomy |
| AI-tell detection as pure prompt | Hybrid code (regex on slide XML) + prompt | Phase 3 (D-02) | Unit-testable, version-pinned heuristics |
| Single Markdown report | Two reports: fixed-template + LLM narrative | Phase 3 (D-06) | Auditable + readable; consumers pick |
| Pipeline-into-`/annotate` by default | Gated on flag / NL intent (D-03) | Phase 3 | Principle of least surprise |
| `pptx-to-images.sh` as one-off in v5-blue-prestige | Hardened plugin-level shared script | Phase 3 (D-07) | Phases 4/5/6 all reuse |

**Deprecated/outdated:** `~/.claude/skills/deck-design-review/` — superseded by bundled `/instadecks:review` per PROJECT.md Out of Scope ("Standalone `deck-design-review` skill — superseded by the bundled review inside the plugin").

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The default-blue dominance threshold (30%) catches AI-generator decks without false-positive on legitimately blue-branded decks | R18 #1 | Calibration matters less than the discoverability — if it false-positives, agent flips `genuine: false` per P-08 mitigation; if it false-negatives, missed AI-tell is recoverable in next refine cycle. **LOW risk.** |
| A2 | Title detection (topmost bold ≥24pt) covers ≥80% of decks; fallback (topmost text) covers the rest | R18 #2 / P-09 | If both heuristics miss, finding is silently absent. Mitigation: log `console.warn` in `extractShapes` when no title detected; SKILL.md instructs agent to add the AI-tell finding manually if visually obvious. **MEDIUM risk** — calibrate against `tests/fixtures/ai-tells-positive.pptx`. |
| A3 | Layout-bucket size (100000 EMU ~ 0.11 inch) is loose enough to absorb AI-generator jitter but tight enough not to coincide unrelated layouts | R18 #3 | Empirically tested by P&C in `tests/fixtures/ai-tells-positive.pptx` vs `…-negative.pptx`; bucket size is one knob to tune. **LOW risk** — easily adjustable. |
| A4 | `jszip@3.10.1` will remain present transitively via `pptxgenjs@4.0.1` for the lifetime of v0.1.0 | Standard Stack | If we don't promote to direct devDep and pptxgenjs is bumped (which it won't be — locked at 4.0.1), jszip could vanish. Mitigation: promote to direct devDep in Phase 3 Plan 01 (1-line `package.json` edit). **LOW risk.** |
| A5 | The activation-rate ≥8/10 testing is deferred to Phase 7 / DIST-02 — Phase 3 only lands the imperative-keyword pattern | RVW-01 | None — CONTEXT.md "Out of Scope" makes this explicit. |
| A6 | Narrative-MD citation enforcement (≥3 slide references) is a soft warn, not error, because LLM output isn't byte-stable | D-06 / P-10 | Reasonable trade — strict assertion would over-fail. **LOW risk.** |
| A7 | The 4 in-code AI-tell heuristics deliver enough precision that `r18_ai_tell: true` flag is meaningful to downstream consumers | D-02 | Deferred-eval (Phase 7 DIST-02 panel). **LOW risk.** |
| A8 | Promoting `jszip` to direct devDep (not runtime dep) is correct because Phase 3 production runtime calls go through `pptx-to-images.sh` → soffice/pdftoppm, NOT jszip | Standard Stack | If Phase 4/5 turns out to need jszip at runtime (e.g., in-process slide-XML inspection during `/create` refine), promote to runtime dep then. **LOW risk** — re-classification is one-line. |

**Confirmation needed from user:** None — all assumptions have low-risk mitigations; planner can proceed.

## Open Questions

All four CONTEXT.md open questions resolved above. Remaining smaller open items deferred to plan-time:

1. **Default-blue threshold tuning** — 30% is the starting value (A1). Plan-time fixture-driven calibration; `tests/fixtures/ai-tells-positive.pptx` (3+ slides with ≥30% default blue) and `…-negative.pptx` (artisanal palette) bound the calibration corridor.
2. **Narrative-MD minimum length** — 200 words is the starting value (D-06 / P-10). Plan-time soft-warn, not hard-fail, until we have user feedback.
3. **`jszip` promotion to direct devDep vs leave transitive** — defer to Plan 03-03 implementation (1-line decision; A4/A8 give the rationale either way).
4. **`render-fixed.js` snapshot fixture name** — `tests/fixtures/sample-findings.fixed.md` proposed; planner confirms.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `node` ≥ 18 | All scripts/tests | ✓ | v25.6.0 (verified Phase 2) | — |
| `jszip` | `ai-tells.js`, possibly `read-deck-xml.js` | ✓ | 3.10.1 (transitive via pptxgenjs) | — |
| `soffice` | `pptx-to-images.sh` | ✓ | 26.2.2.2 | None — required |
| `pdftoppm` | `pptx-to-images.sh` | ✓ | 26.02.0 | None — required |
| `wc` (POSIX) | `pptx-to-images.sh` size check | ✓ | builtin | — |
| `head`, `xxd` | magic-byte checks | ✓ | builtin | If `xxd` missing, fallback to `od -An -tx1 -N3` (POSIX) |
| `timeout` | 60s caps | ✓ | GNU coreutils on Linux; macOS via Homebrew | If absent on macOS bare, use `gtimeout` or perl `alarm` wrapper. **Note:** macOS without coreutils lacks `timeout`. Mitigation: detect at script start and fail fast with a clear error |
| `tests/fixtures/ai-tells-positive.pptx` | AI-tell unit tests | ✗ | — | **Plan 03-03 generates** via a one-off pptxgenjs script (`tools/build-ai-tells-fixtures.js`) committed alongside the .pptx |
| `tests/fixtures/ai-tells-negative.pptx` | AI-tell unit tests | ✗ | — | Same |
| `tests/fixtures/tiny-deck.pptx` | `pptx-to-images.test.js` smoke | ✗ | — | Plan 03-01 generates via 4-line pptxgenjs script |
| `${CLAUDE_PLUGIN_DATA}/node_modules/jszip` | runtime if we expose `read-deck-xml.js` to agent | conditional | — | If we keep jszip dev-only (production agent does not call ai-tells.js), no production install needed |

**Missing dependencies with no fallback:** None — all blockers either present or generable in plan-time.
**Missing dependencies needing plan-time generation:** 3 PPTX test fixtures.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node --test` (Node 18+ built-in), zero-dep (Phase 1/2 convention) |
| Config file | none |
| Quick run command | `node --test tests/review-runtime.test.js` |
| Full suite command | `find tests -maxdepth 2 -name '*.test.js' -print0 \| xargs -0 node --test` (matches ci.yml Gate 6) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RVW-01 | SKILL.md frontmatter passes manifest validator (imperative description, single-line scalar, ≤1024 chars) | unit | `node tools/validate-manifest.js` (existing) | ✅ exists; Plan 03-05 updates SKILL.md body |
| RVW-02 | Fixed-template renderer produces correct §1/§3/§4/§5 structure against canonical fixture | unit | `node --test tests/review-render-fixed.test.js` | ❌ Wave 0 — new |
| RVW-03 | All 3 in-code R18 heuristics fire on positive fixture; 0 fire on negative fixture | unit | `node --test tests/review-ai-tells.test.js` | ❌ Wave 0 — new |
| RVW-04 | Schema validator passes canonical fixture; rejects mutated fixtures (missing fields, bad enum values) | unit | covered by `tests/review-runtime.test.js` validation subtest | ❌ Wave 0 — new |
| RVW-05 | `runReview` writes JSON + fixed MD + (post-runReview) narrative MD; all in run dir + sibling-of-input | integration | `node --test tests/review-runtime.test.js` | ❌ Wave 0 — new |
| RVW-06 | `--annotate` flag pipes through to `runAnnotate`; default does not | integration | `node --test tests/review-pipeline.test.js` | ❌ Wave 0 — new |
| RVW-07 | Standalone CLI (`scripts/cli.js`) accepts deck path + (optional) findings JSON + flags | integration | covered by `tests/review-runtime.test.js` | ❌ Wave 0 — new |
| RVW-08 | Structured-handoff mode returns `findingCounts` + `genuineCount` without printing stdout | integration | covered by `tests/review-runtime.test.js` | ❌ Wave 0 — new |
| RVW-09 | `pptx-to-images.sh` invokes soffice with `-env:UserInstallation=file:///tmp/lo-${SESSION_ID}-${PID}` | integration | `node --test tests/pptx-to-images.test.js` (parses script content) | ❌ Wave 0 — new |
| RVW-10 | Post-call validation catches missing PDF / size <1024 / missing %PDF magic | integration | `node --test tests/pptx-to-images.test.js` (positive + 3 negative cases via fixtures) | ❌ Wave 0 — new |
| RVW-11 | Cleanup trap fires on EXIT/INT/TERM | integration | `node --test tests/pptx-to-images.test.js` (verifies `/tmp/lo-${SESSION_ID}-${PID}` absent post-run) | ❌ Wave 0 — new |
| Severity-preservation property | Every emitted finding's `severity_reviewer` ∈ `{Critical, Major, Minor, Nitpick}` | property | `node --test tests/review-schema-emission.test.js` | ❌ Wave 0 — new |
| Pipeline path-stability | `runAnnotate` import resolves from `runReview` location | smoke | covered by `tests/review-pipeline.test.js` | ❌ Wave 0 — new |

### Sampling Rate

- **Per task commit:** `node --test tests/review-<topic>.test.js` (the file the task touches) + `node --test tests/pptx-to-images.test.js` if Plan 03-01 work.
- **Per wave merge:** `find tests -maxdepth 2 -name '*.test.js' -print0 | xargs -0 node --test`.
- **Phase gate:** Full suite green + manifest validator + path lint + version-pin assertion + license-checker, all enforced by ci.yml.

### Wave 0 Gaps

- [ ] `tests/pptx-to-images.test.js` — covers RVW-09/10/11 (Plan 03-01)
- [ ] `tests/review-ai-tells.test.js` — covers RVW-03 (Plan 03-03)
- [ ] `tests/review-render-fixed.test.js` — covers RVW-02 fixed-template path (Plan 03-04)
- [ ] `tests/review-runtime.test.js` — covers RVW-04/05/07/08 (Plan 03-02)
- [ ] `tests/review-pipeline.test.js` — covers RVW-06 + path stability (Plan 03-02)
- [ ] `tests/review-schema-emission.test.js` — property test (Plan 03-02)
- [ ] `tests/fixtures/tiny-deck.pptx` — Plan 03-01
- [ ] `tests/fixtures/ai-tells-positive.pptx`, `…-negative.pptx` — Plan 03-03
- [ ] `tests/fixtures/sample-findings.fixed.md` — Plan 03-04 snapshot
- [ ] `tools/build-ai-tells-fixtures.js` — Plan 03-03
- [ ] `tools/build-tiny-deck-fixture.js` — Plan 03-01
- [ ] No new framework install required.

## Security Domain

`security_enforcement` flag check: assume default-enabled per the researcher contract. Phase 3 introduces a shell script (`pptx-to-images.sh`) that takes user-provided file paths and an output directory, and an `index.js` that reads/writes files. New surface = path-traversal + shell-injection + DoS via large input.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A — no auth |
| V3 Session Management | no | N/A — no session |
| V4 Access Control | no | N/A — single-user CLI |
| V5 Input Validation | yes | Schema validator (`schema-validator.js`) for findings; basic path-shape validation in `runReview`; `pptx-to-images.sh` quotes all user paths and uses `--` to terminate flags |
| V6 Cryptography | no | SHA-256 use is for layout-hash de-duplication, not secrecy |

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal via `deckPath` / `outDir` | Tampering | `path.resolve` + assertion that output paths stay within `outDir` or sibling-of-input dir |
| Shell injection via filename in `pptx-to-images.sh` | Tampering | Quote all variables; pass `--` to soffice and pdftoppm; reject paths containing `\n` or null bytes via Node-side check before exec |
| Symlink target outside expected dir | Tampering | `fs.realpath` + prefix check before any write |
| Findings JSON billion-laughs / huge size | DoS | `fs.stat` size cap (10 MB) before `JSON.parse`; same as Phase 2 |
| AI-tell heuristic ReDoS via crafted slide XML | DoS | All regex non-backtracking-prone (anchored, no nested quantifiers); `loadSlides` bounds at zip filesize cap |
| `jszip` zip-bomb on hostile PPTX | DoS | jszip 3.x has known protections; cap raw archive size to 100 MB before `loadAsync` |
| LibreOffice CVE surface (soffice headless) | Tampering / DoS | Per-call isolated user-instance dir already in place (Phase 2 D-08); 60s timeout caps damage |

## Sources

### Primary (HIGH confidence)

- `/Users/shafqat/Documents/Projects/Sourcevo/deck-design-review/SKILL.md` — full DECK-VDA methodology read in full (262 lines)
- `/Users/shafqat/Documents/Projects/instadecks/.planning/phases/03-instadecks-review/03-CONTEXT.md` — D-01..D-07 verbatim
- `/Users/shafqat/Documents/Projects/instadecks/.planning/REQUIREMENTS.md` RVW-01..11
- `/Users/shafqat/Documents/Projects/instadecks/skills/review/references/findings-schema.md` — locked v1.0 contract
- `/Users/shafqat/Documents/Projects/instadecks/tests/fixtures/sample-findings.json` — canonical fixture
- `/Users/shafqat/Documents/Projects/instadecks/skills/annotate/scripts/index.js` — `runAnnotate` export contract
- `/Users/shafqat/Documents/Projects/instadecks/.planning/phases/02-instadecks-annotate/02-RESEARCH.md` — Phase 2 baseline
- `/Users/shafqat/Documents/Projects/instadecks/.planning/phases/02-instadecks-annotate/02-PATTERNS.md` — banner / test conventions
- `/Users/shafqat/Documents/Projects/instadecks/.planning/phases/02-instadecks-annotate/02-04-SUMMARY.md` — Tier 1 normalization precedent (P-05 motivation)
- `/Users/shafqat/Documents/Projects/instadecks/.planning/research/SUMMARY.md` — original critical alignment decisions
- `/Users/shafqat/Documents/Projects/instadecks/tools/normalize-pptx-sha.js` — jszip-as-test-utility precedent
- `/Users/shafqat/Documents/Projects/instadecks/node_modules/jszip/package.json` — version 3.10.1 verified
- `/Users/shafqat/Documents/Projects/instadecks/node_modules/pptxgenjs/package.json` — `jszip: "^3.10.1"` direct dep verified
- Direct `unzip -p` of `tests/fixtures/v8-reference/Annotations_Sample.pptx ppt/slides/slide1.xml` — confirmed OOXML element / attribute patterns for AI-tell heuristics

### Secondary (MEDIUM confidence)

- [npm-compare.com fast-xml-parser vs xml2js](https://npm-compare.com/fast-xml-parser,xml-js,xml2js) — informed decision to skip XML parser
- [npmjs.com/package/pptxgenjs](https://www.npmjs.com/package/pptxgenjs) — confirmed 4.0.1 latest stable
- [baeldung.com/linux/portable-command-file-size](https://www.baeldung.com/linux/portable-command-file-size) — `wc -c` portability over `stat -c%s`/`stat -f%z`
- [cyberciti.biz BSD vs GNU stat differences](https://www.cyberciti.biz/faq/howto-bash-check-file-size-in-linux-unix-scripting/) — corroborates portable-stat trap
- Anthropic-bundled `pptx` skill design-ideas (10 anti-patterns including "NEVER use accent lines under titles") — referenced via SUMMARY.md §"Expected Features"

### Tertiary (LOW confidence)

- Default-blue hex set (Office 2016/2013/2010 accents) — informed by general industry knowledge of Office defaults; not externally cross-verified at single-source authority. Mitigation: A1 / P-08 acknowledge calibration risk; fixture-driven tuning at plan-time.
- Layout-bucket size 100000 EMU — engineering-judgment knob; A3 calibration plan.
- 30% default-blue dominance threshold — engineering-judgment knob; A1 calibration plan.

## Recommendations

Concrete planner-actionable answers to each open question and decision domain:

1. **DECK-VDA bundling (Q-1, D-01):** Read `/Users/shafqat/Documents/Projects/Sourcevo/deck-design-review/SKILL.md` (full methodology summarized in §"DECK-VDA Methodology Re-Expression"). Re-express as our own SKILL.md under Apache-2.0. NOTICE update mandatory. **No vendoring** of upstream `deck-design-review.md` or `SKILL.md`.

2. **R18 AI-tells (Q-2, D-02):** Implement the three in-code heuristics in `skills/review/scripts/ai-tells.js` per Example 2. Toolkit = `jszip` (transitive) + `node:crypto` + regex on slide XML. **No `xml2js` / `fast-xml-parser`.** Promote `jszip` to direct devDep in `package.json` (Plan 03-03). Fuzzy R18 tells live in SKILL.md prompt block.

3. **Portable file-size (Q-3):** `wc -c < "$file"` only. Do NOT use `stat -c%s` or `stat -f%z` (verified locally that the wrong flag fails on the wrong platform).

4. **PPTX→PDF/PNG regression (Q-4):** Smoke checks only — existence + size > 1024 bytes + magic bytes. Tier 2 pixelmatch deferred to Phase 7 RVW-09..11 unblock window. Tier 1 deterministic baseline is architecturally infeasible for soffice/pdftoppm output (timestamps + paths) and would require a normalizer comparable to Phase 2 Plan 04's `tools/normalize-pptx-sha.js`. Out of Phase 3 scope.

5. **`pptx-to-images.sh` (D-07, RVW-09/10/11):** Use Example 1 as the starting body. Place at `scripts/pptx-to-images.sh` (plugin-level shared). Hermetic test in `tests/pptx-to-images.test.js` with `tiny-deck.pptx` fixture + soffice skip-guard. Cleanup trap on EXIT/INT/TERM.

6. **`runReview` orchestrator (D-04, RVW-05/07/08):** Use Example 3 as starting body. Two modes: `standalone` (prints JSON to stdout) and `structured-handoff` (returns rich object including `findingCounts` + `genuineCount`).

7. **Two-report architecture (D-06):** `render-fixed.js` is pure, deterministic. Snapshot test against `tests/fixtures/sample-findings.fixed.md`. Narrative MD authored by agent post-runReview; soft-test for slide-citation density.

8. **Pipeline gating (D-03, RVW-06):** `--annotate` CLI flag + NL-intent in SKILL.md. Default = standalone (3 outputs only). Smoke test verifies both branches.

9. **Plan decomposition (5 plans, 3 waves):**
   - **Plan 03-01 (Wave 1, serial — must land first):** `scripts/pptx-to-images.sh` + `tests/pptx-to-images.test.js` + `tools/build-tiny-deck-fixture.js` + `tests/fixtures/tiny-deck.pptx` + Phase 1 SessionStart hook check (no change — pre-existing). Acceptance: pptx-to-images.test.js green; positive + 3 negative cases pass.
   - **Plan 03-02 (Wave 2, parallel-safe):** `skills/review/scripts/index.js` (`runReview`) + `cli.js` + `lib/schema-validator.js` + `tests/review-runtime.test.js` + `tests/review-pipeline.test.js` + `tests/review-schema-emission.test.js`. Depends on Plan 03-01 (smoke test runs `pptx-to-images.sh`). Acceptance: all integration tests green.
   - **Plan 03-03 (Wave 2, parallel-safe with 03-02):** `skills/review/scripts/ai-tells.js` + `lib/read-deck-xml.js` + `tests/review-ai-tells.test.js` + `tools/build-ai-tells-fixtures.js` + `tests/fixtures/ai-tells-positive.pptx` + `tests/fixtures/ai-tells-negative.pptx` + promote `jszip` to direct devDep in `package.json`. Acceptance: 3 heuristics fire on positive, 0 on negative.
   - **Plan 03-04 (Wave 2, parallel-safe with 03-02 / 03-03):** `skills/review/scripts/render-fixed.js` + `tests/review-render-fixed.test.js` + `tests/fixtures/sample-findings.fixed.md` snapshot. Pure function; trivially testable. Acceptance: snapshot test green.
   - **Plan 03-05 (Wave 3, serial — integration ribbon):** Replace `skills/review/SKILL.md` body (canonicalized DECK-VDA per D-01 + R18 fuzzy-tells block per D-02 + invocation modes per D-03/D-04 + two-report instructions per D-06) + update NOTICE (D-01 attribution) + final integration test traversing the full happy path (deck → pptx-to-images → 4-pass mocked → ai-tells → runReview → render-fixed → narrative authored → optional runAnnotate). Acceptance: full suite green + manifest validator green + license-checker green.

   **Highest-risk plan:** 03-01 — every other plan depends on the shell script's correctness. Recommend NO worktree for 03-01 (touches plugin-shared script + plugin-shared SessionStart conventions); land atomically on main. Plans 03-02 / 03-03 / 03-04 are worktree-safe (disjoint files).

10. **See "Common Pitfalls" P-01 through P-10 above.** Highest-impact: P-01 (severity-collapse contamination), P-02 (soffice silent failure), P-05 (don't try to byte-pin soffice output), P-08 (AI-tell false-positives — agent flips `genuine` when justified).

11. **Skill-description pattern (RVW-01 carry-forward — Phase 7 tunes ≥8/10):** Imperative verb at start, domain noun + artifact early, embedded examples, third-person voice, ≤1024 chars. Example: *"Review a presentation deck for design defects using DECK-VDA 4-pass methodology and R18 AI-tell heuristics — emits findings JSON in the locked Instadecks v1.0 schema, a fixed-template Markdown report, and a narrative Markdown summary; pipes into /annotate when the user requests overlay/annotation. Use this skill when a deck file (PPTX or PDF) needs design critique. Examples: `/instadecks:review deck.pptx`, `/instadecks:review deck.pptx --annotate`."*

## Metadata

**Confidence breakdown:**
- DECK-VDA methodology re-expression: **HIGH** — read upstream SKILL.md in full; 4-pass / 4-tier / §1–§5 ordering verified line-numbered.
- R18 AI-tell heuristics: **HIGH** for #1 (default-blue) + #3 (layout-hash); **MEDIUM** for #2 (accent-line-under-title — title-detection fallback adds calibration risk per A2/P-09). All three patterns verified against unzipped `Annotations_Sample.pptx`.
- Standard stack: **HIGH** — every dep is in lockfile (jszip transitive verified) or built-in.
- Architecture: **HIGH** — D-01..D-07 close every gap; module shape mirrors Phase 2 precedent.
- Pitfalls: **HIGH** for P-01..P-07 (verified against source / Phase 2 history); **MEDIUM** for P-08..P-10 (calibration / soft-warn judgments).
- Open questions: 4 — all resolved with concrete recipes; smaller calibration items deferred to plan-time fixture work.

**Research date:** 2026-04-28
**Valid until:** 2026-05-28 (30 days; pptxgenjs 4.0.1, jszip 3.10.1, soffice 26.x, pdftoppm 26.x — locked, no upstream drift expected)

## RESEARCH COMPLETE
