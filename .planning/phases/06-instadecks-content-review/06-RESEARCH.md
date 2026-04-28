# Phase 6: `/instadecks:content-review` — Research

**Researched:** 2026-04-28
**Domain:** Pyramid-Principle / MECE / narrative-arc / claim-evidence content critique on PPTX decks; producer-side reuse of Phase 1 findings JSON contract; hard content-vs-design boundary.
**Confidence:** HIGH (all critical claims grounded in code on disk; assumptions explicitly tagged below).

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Inherited (not re-discussable):**
- Findings JSON schema = Phase 1 `skills/review/references/findings-schema.md` v1.0 (REUSED VERBATIM as the base)
- 4-tier severity (Critical / Major / Minor / Nitpick) at producer
- 4→3 severity collapse happens **only** at `/annotate` adapter
- Content-vs-design boundary is **hard** (CLAUDE.md): content-review NEVER flags visual / typographic / layout
- Run dir convention `.planning/instadecks/<run-id>/`
- Sibling-of-input outputs `<deck>.content-review.{json,md,narrative.md}` (mirrors Phase 3 D-06 two-report convention)
- Pipeline into `/annotate` is gated by `--annotate` flag or natural-language intent (mirrors Phase 3 D-03)
- soffice / pdftoppm hardening reuses Phase 3 D-07 `${CLAUDE_PLUGIN_ROOT}/scripts/pptx-to-images.sh`

**Phase-6 specific:**
- **D-01 Input:** PPTX path (+ optional pre-extracted `contentExtract`). NO PDF in v1. Signature mirrors `runReview`: `runContentReview({deckPath, runId, outDir, mode, contentExtract, annotate})`.
- **D-02 Hybrid 4-code / 4-prompt split:**
  - Code-side checks: action-title quality (REUSE `skills/create/scripts/lib/title-check.js`), redundancy (cosine ≥ 0.85 on title + first bullet), audience-fit jargon (>5 UPPERCASE 2-5-char tokens in body), audience-fit length (bullet > 25 words).
  - Prompt-side checks: Pyramid Principle / MECE structural, narrative-arc, claim/evidence balance, standalone-readability.
- **D-03 Schema bump v1.0 → v1.1 (additive, non-breaking):** add `content` to `category` enum; add OPTIONAL `check_id` field with enum of 8 values. Phase 1 schema validator updated (one-line additive). Adapter MUST also be patched to accept `content` (see `[VERIFIED]` under Schema Compatibility below).
- **D-04 Two-report output:** mirror Phase 3 D-06. Fixed-template MD via `lib/render-content-fixed.js`; LLM-authored narrative MD authored post-`runContentReview`.
- **D-05 Boundary enforcement:** bidirectional fixture-based regression test using `tests/fixtures/cross-domain-test-deck.pptx`, authored deterministically via pptxgenjs in `tools/build-cross-domain-fixture.js`.
- **D-06 Activation phrases:** description front-loads "content review", "argument quality", "story flow", "is my deck persuasive", "Pyramid Principle / MECE", "narrative arc". (Phase 7 DIST-02 measures ≥8/10.)
- **D-07 Frontmatter flip:** `user-invocable: false` → `true` lands in Phase 6.

### Claude's Discretion

- **Q-1 PPTX text extraction strategy** — recommend below.
- **Q-2 Redundancy threshold tuning** — recommend whitelist + `slide_type` skip strategy below.
- **Q-3 Schema-bump compat with Phase 2 adapter** — confirmed below; planner MUST include adapter patch as a task.
- **Q-4 Cross-domain fixture construction** — confirmed below.
- **Q-5 Wave decomposition** — recommended 3 waves / 4 plans below.
- Internal helper file shapes inside `skills/content-review/scripts/lib/`.
- Specific stop-words / boilerplate whitelist tokens (concrete list below).
- Cosine-similarity implementation (recommend hand-rolled bag-of-words below — no new dep).

### Deferred Ideas (OUT OF SCOPE)

- Content-review integration into `/create`'s auto-refine loop — v2 (PROJECT.md).
- PDF input — v1.x.
- Activation tuning ≥8/10 measurement — Phase 7 DIST-02.
- Per-check accuracy metrics dashboard — v1.x.
- Voice/tone analysis — v2.
- Multi-language localization — v2.

</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CRV-01 | `/instadecks:content-review` is invocable as slash skill with imperative-keyword description (≥8/10 prompt activation) | §"SKILL.md plugin-dev conformance"; §"Activation phrases (D-06)" — Phase 7 finalizes the ≥8/10 measurement, Phase 6 lands the description shape. |
| CRV-02 | Pyramid Principle / MECE structural check | §"Check 5 — Pyramid Principle / MECE (PROMPT)" — full prompt template + finding-grammar examples. |
| CRV-03 | Narrative-arc check | §"Check 6 — Narrative-arc (PROMPT)" — story-shape spec + prompt template. |
| CRV-04 | Action-title quality check (claim, not topic) | §"Check 1 — Action-title quality (CODE)" — REUSES `skills/create/scripts/lib/title-check.js`, validateTitle() already implements the heuristic. |
| CRV-05 | Claim/evidence balance check | §"Check 7 — Claim/evidence balance (PROMPT)" — claim detection + evidence-tagging prompt template. |
| CRV-06 | Redundancy detection | §"Check 2 — Redundancy (CODE)" — bag-of-words cosine ≥0.85 on title+first-bullet, with Q-2 whitelist + slide-type skip. |
| CRV-07 | Audience-fit (jargon + length) | §"Check 3 — Jargon (CODE)" + §"Check 4 — Length (CODE)" — concrete regex + word-count thresholds. |
| CRV-08 | Standalone-readability test | §"Check 8 — Standalone-readability (PROMPT)" — "no presenter" framing + concrete prompt template. |
| CRV-09 | Same 4-tier severity + finding grammar + locked schema as `/review`; output pipes into `/annotate` via same adapter | §"Schema extension v1.1" — additive change; adapter patch required (Q-3). |
| CRV-10 | Hard content-vs-design boundary preserved bidirectionally | §"Check D-05 — Boundary regression test" — fixture deck + bidirectional assertion. |
| CRV-11 | Standalone in v1 (NOT in `/create`'s loop); pipelines into `/annotate` | §"Architecture: runContentReview" — mirrors `runReview` API, lazy-requires `runAnnotate` only when gated. |

</phase_requirements>

---

## Summary

Phase 6 ships the second producer of findings against the Phase 1 v1.0 JSON schema. Architecturally it is a near-mirror of Phase 3 (`/review`): same orchestrator shape, same two-report output, same lazy-required pipeline into `/annotate`, same SKILL.md invocation patterns. The novel surface is (a) PPTX text extraction (vs. Phase 3's PDF→image extraction), (b) four code-side deterministic content checks layered with four prompt-side LLM-judgment checks, (c) an additive schema bump to v1.1 (`category: "content"` + optional `check_id`), and (d) a bidirectional content-vs-design boundary fixture test that locks CLAUDE.md's invariant into CI.

The single biggest risk is the schema bump's compatibility with the Phase 2 `/annotate` adapter. **Verified below:** the adapter's `category` enum is currently a closed whitelist of `{defect, improvement, style}` and will throw on `category: "content"`. Phase 6 MUST include an adapter patch (one-line additive). Unknown top-level fields (`check_id`) ARE tolerated — no extra-field rejection in either validator or adapter.

**Primary recommendation:** Decompose into 3 waves / 4 plans. Wave 0 = schema bump v1.1 + adapter patch + 4 code-side check libs (parallel-safe — independent files). Wave 1 = `runContentReview` orchestrator + `render-content-fixed.js` + CLI + SKILL.md body + frontmatter flip (sequential — orchestrator depends on libs). Wave 2 = cross-domain boundary fixture + bidirectional regression test + end-to-end integration test.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| PPTX text extraction (slide titles, bullets, body, notes) | Node code (`lib/extract-content.js`) | — | Deterministic, version-pinned (jszip already available); same-process as orchestrator. No agent in the loop. |
| 4 deterministic content checks (title / redundancy / jargon / length) | Node code (`lib/*.js`) | — | Pure functions, unit-testable; same model as Phase 3 `ai-tells.js`. |
| 4 judgment content checks (Pyramid / narrative / claim-evidence / readability) | SKILL.md prompt | LLM agent | Cross-slide argument reasoning is judgment-heavy; can't be hand-rolled without NLP deps the project bans. Findings flow back through `runContentReview` as injected `findings.slides[]`. |
| Findings validation | Reused Phase 1 lib (`schema-validator.js` extended for v1.1) | — | Single canonical validator; no duplication. |
| Severity 4→3 collapse | `/annotate` adapter ONLY | — | Locked invariant (CLAUDE.md, P-01). Producers always emit 4-tier. |
| Genuine filter | `/annotate` adapter ONLY | — | Locked invariant; `genuine` flag is a producer-side determination but the FILTER is downstream. |
| Two-report output (fixed MD + narrative MD) | Node code writes fixed MD; agent writes narrative MD post-call | — | Mirrors Phase 3 D-06; deterministic audit trail + flexible narrative. |
| Pipeline into `/annotate` | Lazy-required from `runContentReview` when gated | — | Mirrors Phase 3 P-07 invariant. |
| PPTX→images pipeline | NOT NEEDED for content-review (text-only domain) | — | Content review reads XML text, not rendered images. `pptx-to-images.sh` is reused only IF `--annotate` is passed (downstream of orchestrator). |

---

## Standard Stack

### Core (already on disk — REUSED)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `jszip` | `3.10.1` (devDep) | PPTX zip-archive read for slide XML | [VERIFIED: package.json] Already promoted to direct devDep in Phase 3 (Plan 03-03 A4/A8); same use case (read `ppt/slides/slide*.xml`). [VERIFIED: skills/review/scripts/lib/read-deck-xml.js loads slides via JSZip; reusable.] |
| `pptxgenjs` | `4.0.1` (pinned) | Author the cross-domain fixture deck | [VERIFIED: package.json] Pinned exact; reuse for `tools/build-cross-domain-fixture.js`. |
| Node `node:test` | built-in | Test framework | [VERIFIED: package.json `"test": "node --test"`] All Phase 1-5 tests use `node:test`. |
| Node `crypto`, `path`, `fs/promises` | built-in | Run-id, paths, IO | [VERIFIED: skills/review/scripts/index.js] Same pattern as `runReview`. |

### Supporting (already on disk — REUSED)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `skills/create/scripts/lib/title-check.js` | local | Action-title heuristic (Check 1) | [VERIFIED: D-02 D-06 mandates reuse] `validateTitle(title, opts)` returns `{ok, reason}` — already exposes blocked-words list + 3-word minimum + verb lookup. Phase 6 wraps it; does NOT modify. |
| `skills/review/scripts/lib/schema-validator.js` | local | Validate findings v1.1 | [VERIFIED] Phase 6 patches the validator (additive: extend `CATEGORIES` Set + add optional `check_id` recognition). |
| `skills/review/scripts/render-fixed.js` | local | Architectural template for `render-content-fixed.js` | [VERIFIED] Pure function, deterministic; copy structure (§1 systemic, §2 inferred system, §3 per-slide, §4 maturity, §5 top-10). For content-review the section labels change (see §"Render-content-fixed structure" below) but the determinism + ordering invariants stay. |
| `skills/annotate/scripts/adapter.js` | local | Phase 2 4→3 collapse adapter | [VERIFIED] **REQUIRES PATCH** — see §"Schema compatibility" below. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled cosine on bag-of-words for redundancy | `natural`, `compromise`, embedding APIs | [ASSUMED] Adds dep weight + license-checker risk. Bag-of-words on title+first-bullet at threshold 0.85 is sufficient for the v1 use case and matches the project's "no NLP dep" posture (`title-check.js` precedent — comment line: "tiny verb-list lookup (no NLP dep)"). |
| `unzip + xmllint` shell pipeline (CONTEXT.md Q-1) | jszip in Node | [VERIFIED: Phase 3 already uses jszip for `read-deck-xml.js`; reuse it.] Shell pipeline has whitespace/escaping fragility on accented chars and CDATA; jszip is already a pinned devDep. **Recommendation:** USE JSZIP — extend `lib/read-deck-xml.js` or add a sibling `extract-content.js` that calls `loadSlides()` and parses the XML for `<a:t>` / `<a:r>` / `<p:sp>` shapes. |
| Adding a content-review-specific schema file | Bumping unified schema to v1.1 | [VERIFIED: D-03 locked] Single schema is the design; v1.1 keeps `/annotate` working unmodified for the value side and only adds enum members. |

**Installation:** No new deps. (Confirmed via §"Don't Hand-Roll" below — the four code-side checks intentionally use built-in Node only, matching the project's stated posture.)

**Version verification:**
```bash
npm view jszip version       # [VERIFIED 2026-04-28: 3.10.1 in package.json — pinned exact for the devDep slot]
npm view pptxgenjs version   # [VERIFIED 2026-04-28: 4.0.1 pinned in package.json — locked invariant per CLAUDE.md]
```

---

## Architecture Patterns

### System Architecture Diagram

```
                          ┌─────────────────────────────────────┐
   user prompt ──────────▶│  agent activates                    │
   ("review my deck for   │  /instadecks:content-review         │
    argument quality")    │  via SKILL.md description match    │
                          └─────────────────┬───────────────────┘
                                            │
                                            ▼
                          ┌──────────────────────────────────────┐
                          │  Step 1: agent extracts content      │
                          │  via lib/extract-content.js (jszip)  │
                          │  → {slides:[{slideNum,title,bullets, │
                          │     body,notes,sources,slide_type}]} │
                          └─────────────────┬────────────────────┘
                                            │
                          ┌─────────────────┴───────────────────┐
                          ▼                                     ▼
        ┌────────────────────────────┐    ┌──────────────────────────────┐
        │ Step 2a: CODE-SIDE checks  │    │ Step 2b: PROMPT-SIDE checks  │
        │ (deterministic, sync)      │    │ (LLM judgment, agent-driven) │
        │  • title-check.js          │    │  • Pyramid / MECE            │
        │  • redundancy.js           │    │  • narrative-arc             │
        │  • jargon.js               │    │  • claim/evidence balance    │
        │  • length-check.js         │    │  • standalone-readability    │
        │  → findings[] (4-tier sev, │    │  → findings[] (4-tier sev,   │
        │     category:"content",    │    │     category:"content",      │
        │     check_id from {1..4})  │    │     check_id from {5..8})    │
        └─────────────┬──────────────┘    └────────────┬─────────────────┘
                      │                                │
                      └────────────┬───────────────────┘
                                   ▼
                          ┌────────────────────────────────────────┐
                          │  Step 3: agent merges into             │
                          │  findings document (schema v1.1)       │
                          │  + calls runContentReview({findings})  │
                          └─────────────────┬──────────────────────┘
                                            │
                                            ▼
                          ┌────────────────────────────────────────┐
                          │  runContentReview                      │
                          │  • validate (schema-validator v1.1)    │
                          │  • write JSON sibling + run-dir mirror │
                          │  • render fixed MD via                 │
                          │     render-content-fixed.js            │
                          │  • return narrativePath (NOT written)  │
                          │  • IF annotate:true → lazy-require     │
                          │     runAnnotate (lazy P-07 invariant)  │
                          └─────────────────┬──────────────────────┘
                                            │
              ┌─────────────────────────────┴────────────────┐
              ▼                                              ▼
   ┌──────────────────────┐                  ┌──────────────────────────┐
   │ <deck>.content-      │                  │ optional pipeline:       │
   │ review.{json,md,     │                  │ /annotate adapter        │
   │ narrative.md}        │                  │ → 4→3 collapse           │
   │ + run-dir mirror     │                  │ → genuine filter         │
   │ (sibling-of-input)   │                  │ → annotated PPTX + PDF   │
   └──────────────────────┘                  └──────────────────────────┘
```

### Recommended Project Structure

```
skills/content-review/
├── SKILL.md                                 # full body lands in Phase 6 (D-07 flips user-invocable:true)
├── scripts/
│   ├── index.js                             # exports runContentReview({...})
│   ├── cli.js                               # standalone CLI: node skills/content-review/scripts/cli.js <pptx> ...
│   ├── render-content-fixed.js              # pure deterministic fixed-template renderer
│   └── lib/
│       ├── extract-content.js               # PPTX → {slides:[{slideNum,title,bullets,body,notes,sources,slide_type}]}
│       ├── redundancy.js                    # bag-of-words cosine on title+first-bullet
│       ├── jargon.js                        # UPPERCASE 2-5-char acronym counter
│       └── length-check.js                  # word-count per bullet, threshold 25
└── references/
    └── content-checks.md                    # narrative reference for the 8 checks (consumed by agent)

skills/review/references/findings-schema.md  # bumped to v1.1 (additive, additive only)
skills/review/scripts/lib/schema-validator.js # patched (extend CATEGORIES; allow check_id)
skills/annotate/scripts/adapter.js           # patched (extend VALID_CATEGORY)

tools/build-cross-domain-fixture.js          # pptxgenjs author of the boundary fixture
tests/fixtures/cross-domain-test-deck.pptx   # generated fixture (committed)
tests/content-review-runtime.test.js
tests/content-review-checks.test.js          # one test per code-side check (4 tests)
tests/content-vs-design-boundary.test.js     # bidirectional regression
tests/content-review-render-fixed.test.js
tests/content-review-integration.test.js
tests/findings-schema-v11.test.js            # validator accepts content+check_id; rejects unknown check_id values
```

### Pattern 1: `runContentReview` mirrors `runReview`

**What:** Orchestrator API symmetric to Phase 3 — same parameter names, same return shape, same lazy-require gate for annotate, same sibling-of-input + run-dir-mirror output.
**When to use:** Always — symmetry is the design intent for downstream consumer simplicity.
**Example:**

```js
// Source: skills/review/scripts/index.js (Phase 3 — VERIFIED on disk)
async function runReview({deckPath, runId, outDir, mode='standalone',
                          findings, annotate=false, slidesToReview=null} = {}) {
  if (!deckPath) throw new Error('runReview: deckPath required');
  if (!findings) throw new Error('runReview: findings required (in-memory object honoring findings-schema.md v1.0)');
  validate(findings);
  // ... resolve outputs, write JSON sibling + run-dir mirror, render fixed MD ...
  if (annotate) {
    const runAnnotate = require('../../annotate/scripts').runAnnotate; // P-07 lazy
    annotated = await runAnnotate({deckPath, findings, outDir, runId});
  }
  return {jsonPath, mdPath, narrativePath, runDir, runId, findingCounts, genuineCount, ...};
}
```

Phase 6 `runContentReview` ships an isomorphic copy. Diff vs `runReview`:
- Output path stems: `<deck>.content-review.{json,md,narrative.md}` (not `.review.{...}`)
- Renderer: `render-content-fixed.js` (not `render-fixed.js`)
- No `slidesToReview` parameter (v1; CRV-11 keeps content-review out of the auto-refine loop, so the diff-only filter has no consumer).
- `findings` schema_version expected = `"1.1"` (validator accepts 1.x — see Schema Compatibility).

### Pattern 2: Hybrid code/prompt finding production (Phase 3 precedent)

**What:** Mechanical heuristics in code emit findings as a JS array; LLM-judgment findings authored by the agent in the SKILL.md prompt; agent merges both into a single `findings` document before calling `runContentReview`.
**When to use:** Always — matches Phase 3 D-02 (R18 AI-tell detection: 3 code heuristics + fuzzy LLM checks).
**Example pattern:**

```js
// Phase 3 precedent — skills/review/scripts/ai-tells.js produces findings[] from XML
// Phase 6 mirrors:
const {extractContent} = require('./lib/extract-content');
const {checkTitles} = require('./lib/title-adapter');         // wraps title-check.js
const {checkRedundancy} = require('./lib/redundancy');
const {checkJargon} = require('./lib/jargon');
const {checkLength} = require('./lib/length-check');

const extract = await extractContent(deckPath);
const codeFindings = [
  ...checkTitles(extract),
  ...checkRedundancy(extract),
  ...checkJargon(extract),
  ...checkLength(extract),
];
// agent then adds prompt-side findings (Pyramid/narrative/claim-evidence/readability)
// merged document goes to runContentReview as `findings`
```

### Anti-Patterns to Avoid

- **DO NOT pre-collapse severity in content-review.** Producers always emit `Critical / Major / Minor / Nitpick`. CLAUDE.md P-01 invariant; schema-validator throws on pre-collapsed inputs.
- **DO NOT flag visual issues from content-review.** Counter-test exists in `tests/content-vs-design-boundary.test.js` (D-05); CI blocks regressions.
- **DO NOT eagerly require `runAnnotate`** at module-load time. Mirror Phase 3 P-07 — lazy-require inside `if (annotate)` branch only. (Phase 3 has a regression test for this; copy it.)
- **DO NOT extract via `unzip + xmllint` shell pipeline.** jszip is already a direct devDep; shell parsing is fragile on accented chars / CDATA / namespace prefixes.
- **DO NOT hand-roll a stemmer / stop-words list larger than necessary.** Bag-of-words cosine on lowercased alphanumeric tokens (drop tokens ≤2 chars) is sufficient for redundancy; matches the project's "no NLP dep" posture.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PPTX zip-archive read | Custom zip parser | `jszip 3.10.1` (already devDep) | Already on disk + already pinned + already license-clean. |
| XML parsing | `xml2js`, `fast-xml-parser` | Hand-rolled regex on `<a:t>...</a:t>` | The XML surface needed is tiny (extract `<a:t>` text runs grouped by `<p:sp>` shape). [ASSUMED — needs Wave 0 spike] **HOWEVER:** if regex-on-XML proves brittle on namespace-prefixed elements or CDATA, fall back to a tiny `xml2js`-style parser. Add `fast-xml-parser` as devDep ONLY if regex extraction fails the cookbook-deck round-trip test (Phase 4 fixture provides the round-trip target). |
| Cosine similarity | `natural`, `string-similarity` | Hand-rolled bag-of-words (token frequency vectors → dot product / (||a||·||b||)) | ~20 lines; matches project's "tiny verb-list lookup (no NLP dep)" precedent in `title-check.js`. |
| Action-title heuristic | New regex / rule set | REUSE `skills/create/scripts/lib/title-check.js`'s `validateTitle()` | Already in use by Phase 4; reusing avoids drift. Wrap it in `lib/title-adapter.js` to map `{ok:false, reason}` → finding object with `severity_reviewer` + `nx`/`ny` defaults. |
| Schema validation | New ajv/joi/zod dep | Patch existing `skills/review/scripts/lib/schema-validator.js` | Already hand-rolled per Phase 1 RESEARCH §"Don't Hand-Roll" (no ajv/joi/zod). Phase 6 adds `content` to CATEGORIES set + tolerates new optional `check_id`. |
| Cross-domain fixture deck construction | Manually edit a PPTX in PowerPoint | `pptxgenjs` in `tools/build-cross-domain-fixture.js` | Reproducible, version-pinned, identical pattern to Phase 4 cookbook authoring. CONTEXT.md Q-4 confirmed. |

**Key insight:** Every code-side concern in Phase 6 has a Phase 3 / Phase 4 / Phase 1 precedent already on disk. The phase intentionally adds zero new runtime dependencies. The only library-level change is patching three local files (validator + adapter + schema doc).

---

## The Seven (actually Eight) Content Checks — concrete heuristic specs

> Note: CONTEXT.md D-02 lists 8 distinct checks; CRV-02..08 names them as 7. The 8th — action-title quality (CRV-04) — is sometimes counted as part of "audience-fit" but is implementation-distinct. Phase 6 ships 8 logical checks; the JSON `check_id` enum has 8 values.

### Check 1 — Action-title quality (CODE) — `check_id: "action-title"`

Maps to CRV-04. REUSES existing `skills/create/scripts/lib/title-check.js::validateTitle(title, opts)`.

**Spec:**
- For each slide with a non-empty title, call `validateTitle(slide.title)`.
- If `{ok:false, reason}`: emit a finding.
  - `severity_reviewer`: `Major` if reason contains `"blocked phrase"` (e.g., "Overview", "Agenda"); `Minor` if `"too short"`; `Minor` if `"no verb detected"`.
  - `category`: `"content"`
  - `check_id`: `"action-title"`
  - `genuine`: `true` (deterministic — agent may flip false in design-rationale loop, but defaults true)
  - `nx`: `0.5`, `ny`: `0.08` (centred above title baseline; matches Phase 2 annotation convention)
  - `text`: `"Slide ${slideNum} title \"${title}\" is a label, not a claim — ${reason}"`
  - `rationale`: `"Action titles state the slide's claim; topic labels force the audience to derive the message themselves."`
  - `location`: `"slide title"`
  - `standard`: `"Pyramid Principle (Minto 1987) — title states the answer"`
  - `fix`: `"Rewrite title as a claim, e.g., \"Revenue grew 40% in Q3 from enterprise renewals\" instead of \"Q3 Revenue\""`

**Severity calibration table:**

| Reason from title-check.js | Severity |
|---|---|
| `blocked phrase: ...` | Major |
| `too short (need ≥3 words...)` | Minor |
| `no verb detected ...` | Minor |

**Closing-slide override:** Slides with `slide_type === "closing"` (e.g., "Thank You") are skipped. Wrap the call with `validateTitle(title, {action_title_override: slide_type === 'closing'})`.

---

### Check 2 — Redundancy (CODE) — `check_id: "redundancy"`

Maps to CRV-06. NEW — `skills/content-review/scripts/lib/redundancy.js`.

**Spec:**
- Build a token-frequency vector for each slide using `title + " " + (bullets[0] || body.firstSentence)`.
  - Tokenize: lowercase, strip punctuation `[^\p{L}\p{N}\s]`, split on whitespace, drop tokens of length ≤2, drop a small stop-word set.
  - Stop-words (initial list, 25 tokens): `the, and, for, with, that, this, from, into, our, your, are, was, were, has, have, had, will, can, but, not, all, any, one, two, new`. (Tunable in v1.x.)
- Boilerplate whitelist (per CONTEXT.md Q-2 recommendation): skip pairs where either slide title (lowercased, normalized) ∈ `{"agenda", "q&a", "thank you", "questions", "appendix", "table of contents"}`.
- Slide-type skip: skip pairs where either `slide.slide_type ∈ {"section", "closing", "title"}` (extracted from PPTX layout name when available; defaults to `"content"` if absent).
- For each unordered pair `(i, j)` of remaining slides, compute cosine similarity:
  ```
  cos = (a · b) / (||a|| · ||b||)
  ```
  where `a`, `b` are token-frequency vectors over the union of their token sets.
- Threshold: `cos ≥ 0.85` → emit a finding on the LATER slide (`max(i,j)` slideNum) referencing the earlier one.
- Finding shape:
  - `severity_reviewer`: `Major` if `cos ≥ 0.95`; `Minor` if `0.85 ≤ cos < 0.95`.
  - `category`: `"content"`, `check_id`: `"redundancy"`, `genuine`: `true`
  - `nx`: `0.5`, `ny`: `0.5` (centre of slide; redundancy is a whole-slide property)
  - `text`: `"Slide ${later} repeats the claim from slide ${earlier} (cos sim ${cos.toFixed(2)})"`
  - `standard`: `"MECE (Minto) — Mutually Exclusive ensures no claim is restated"`
  - `fix`: `"Merge slides ${earlier} and ${later}, OR differentiate the angle (e.g., problem on ${earlier}, solution on ${later})"`

**Why threshold 0.85:** [ASSUMED — needs Wave 1 spike on Phase 4 cookbook deck output] Cosine 0.85 on a 10-15 token bag flags slides that share 8/10 tokens — a plausible heuristic for "same claim, different wording". Confirm against Phase 4's 8-slide-type cookbook fixture; if false-positive rate >20%, raise to 0.90.

---

### Check 3 — Jargon (CODE) — `check_id: "jargon"`

Maps to CRV-07. NEW — `skills/content-review/scripts/lib/jargon.js`.

**Spec:**
- For each slide, count distinct UPPERCASE tokens of length 2-5 in `body + bullets.join(" ")`. Regex: `/\b[A-Z]{2,5}\b/g`.
- Filter: drop common English contractions / Roman numerals / known non-jargon (`I`, `II`, `III`, `IV`, `V`, `OK`, `USA`, `EU`, `UK`, `CEO`, `CTO`, `CFO`).
- If distinct-acronym-count > 5 on a single slide → emit finding.
- Finding shape:
  - `severity_reviewer`: `Major` if count ≥ 8; `Minor` if 6-7.
  - `category`: `"content"`, `check_id`: `"jargon"`, `genuine`: `true`
  - `nx`: `0.5`, `ny`: `0.6` (mid-body)
  - `text`: `"Slide ${slideNum} contains ${count} acronyms: ${list.slice(0,8).join(', ')}${count>8?'...':''}"`
  - `rationale`: `"Acronym density above 5/slide forces the audience to context-switch into a glossary lookup; reduces standalone-readability."`
  - `standard`: `"Audience-fit (Knaflic, Storytelling with Data 2015)"`
  - `fix`: `"Spell out acronyms on first use; move definitions to speaker notes; keep ≤5 distinct acronyms per slide"`

[ASSUMED — needs spike] The 5-acronym threshold is taken verbatim from CONTEXT.md D-02; adjust if false-positive rate is high on technical decks.

---

### Check 4 — Length (CODE) — `check_id: "length"`

Maps to CRV-07. NEW — `skills/content-review/scripts/lib/length-check.js`.

**Spec:**
- For each bullet on each slide, count whitespace-separated tokens.
- If any single bullet > 25 words → emit finding (one per offending bullet).
- Finding shape:
  - `severity_reviewer`: `Major` if words > 35; `Minor` if 26-35.
  - `category`: `"content"`, `check_id`: `"length"`, `genuine`: `true`
  - `nx`: `0.5`, `ny`: `0.3 + 0.1 * bulletIndex` (rough vertical position; clamp to [0.3, 0.85])
  - `text`: `"Slide ${slideNum} bullet ${bulletIndex+1} is ${words} words: \"${bullet.slice(0,60)}...\""`
  - `rationale`: `"Bullets >25 words become paragraphs; audience reads instead of listening, breaking presenter-audience connection."`
  - `standard`: `"6×6 rule heuristic (Reynolds, Presentation Zen 2008)"`
  - `fix`: `"Split into two bullets, OR move detail to speaker notes, OR rewrite as a single short claim"`

---

### Check 5 — Pyramid Principle / MECE (PROMPT) — `check_id: "pyramid-mece"`

Maps to CRV-02. SKILL.md prompt-side check.

**Spec (prompt template injected into SKILL.md):**

```markdown
### Pyramid / MECE structural check

Read all slide titles in order. The deck should follow Pyramid Principle:

1. **Top of pyramid:** the very first content slide (slide 2 — slide 1 is title) states the
   deck's GOVERNING THESIS as a single claim.
2. **Pyramid level 2:** the next 2-5 slide titles (or section headers) are the SUPPORTING
   ARGUMENTS for the governing thesis. They MUST be Mutually Exclusive (no overlap) AND
   Collectively Exhaustive (cover the thesis without gaps).
3. **Pyramid level 3:** under each supporting argument, the slides provide the EVIDENCE
   (data, example, source).

Emit a finding when:
- The first content slide does not state a thesis (it labels a topic, or it is an agenda).
  → `Critical` if no thesis surfaces in the first 3 slides; `Major` if delayed but eventually present.
- Two supporting arguments overlap (violates ME). → `Major`.
- A claim made in level 2 is never substantiated at level 3. → `Major`.
- A relevant supporting argument is missing (violates CE — the deck claims X depends on A,B
  but only covers A and B without addressing the implicit C). → `Minor` (subjective).

Finding shape:
- `category`: `"content"`, `check_id`: `"pyramid-mece"`
- `severity_reviewer`: per above
- `genuine`: agent's judgment; default true unless the deck's design-rationale doc justifies
- `nx, ny`: `(0.5, 0.5)` for whole-deck systemic findings; specific slide coordinates for per-slide
- `slideNum`: `null` for whole-deck systemic findings (lives in §1 of the report); else the
  specific slide number
- `text`: `"[Severity] | content — [location] — [defect] — Pyramid/MECE — [fix]"` (full grammar)
- `standard`: `"Pyramid Principle (Minto 1987)"` or `"MECE (Minto 1987)"`
- `fix`: a CONCRETE rewrite, e.g., `"Insert a thesis slide stating: 'Enterprise SaaS will
  consolidate to 3 vendors by 2030 because of ...'"`
```

---

### Check 6 — Narrative-arc (PROMPT) — `check_id: "narrative-arc"`

Maps to CRV-03.

**Spec (prompt template):**

```markdown
### Narrative-arc check

Read the deck end-to-end. A persuasive deck follows a setup → tension → resolution shape:

1. **Setup** (first 20-30%): establish the world / status-quo / audience's current belief.
2. **Tension** (middle 40-50%): introduce the disruption / problem / counter-evidence that
   makes the status-quo untenable.
3. **Resolution** (last 20-30%): present the answer / new framing / call-to-action that
   resolves the tension.

Emit a finding when:
- Setup is missing or absent — the deck dives directly into solution without establishing
  why the audience should care. → `Major`. `slideNum: null` (deck-systemic).
- Tension is missing — the deck presents facts without an antagonist (no "but...", no
  "however...", no counter-evidence). The audience doesn't know what's at stake. → `Critical`
  if the deck has zero tension; `Major` if tension is present but underdeveloped.
- Resolution is missing — the deck stops at the problem without naming the answer or the
  ask. → `Critical`.
- Arc inversion — resolution comes BEFORE tension (e.g., recommendations slide at slide 3
  out of 12). → `Major`.

Finding shape: same as Pyramid/MECE check; `standard`: `"Narrative arc (Duarte, Resonate 2010)"`.
```

---

### Check 7 — Claim/evidence balance (PROMPT) — `check_id: "claim-evidence"`

Maps to CRV-05.

**Spec (prompt template):**

```markdown
### Claim/evidence balance

For each non-section slide, identify the slide's PRIMARY CLAIM (the action title's assertion).
Then look for SUPPORTING EVIDENCE on the same slide: a number, a source citation, an example,
a quote, a chart, a screenshot.

Emit a finding when:
- A slide states a claim with NO supporting evidence on the slide. → `Major`. (Subjective —
  flag `genuine: false` if speaker notes contain the evidence and the slide is intentionally
  visual.)
- A slide has evidence but no claim (e.g., a chart with no action title summarizing what
  the chart shows). → `Minor`. (Already partially caught by Check 1; this is the deeper version.)
- Evidence cited but not sourced (a number with no source line). → `Minor`. `check_id` still
  `"claim-evidence"` but `text` says `"unsourced number"`.
- Hyperbolic claim ("the most important shift in the last decade") with no quantified evidence.
  → `Minor`.

Finding shape: same; `standard`: `"Claim-evidence balance (Heath, Made to Stick 2007)"`.
`fix` MUST cite the slide and propose a concrete addition: `"Add source line citing 'Gartner
2025 forecast, accessed 2026-04-15' under the 80% retention claim"`.
```

---

### Check 8 — Standalone-readability (PROMPT) — `check_id: "standalone-readability"`

Maps to CRV-08.

**Spec (prompt template):**

```markdown
### Standalone-readability test

Read each slide AS IF you are seeing the deck for the first time, with NO presenter
narration. Ask: "Does this slide make sense without a human in the room explaining it?"

Emit a finding when:
- A slide depends on the presenter to make sense. Symptoms: a chart with no action title,
  a list of names with no context, a single image with no caption, a number with no
  surrounding sentence. → `Major`.
- A slide has speaker notes that are CRITICAL to understanding the on-slide content (i.e.,
  removing them breaks the slide). → `Minor`. (Speaker notes should ENRICH, not COMPLETE.)
- A slide uses an internal abbreviation, project codename, or person's first name without
  introduction. → `Minor`.
- A slide assumes prior context from a slide ≥3 slides earlier ("as we discussed on
  slide 3..."). → `Nitpick` unless it's load-bearing.

Finding shape: same; `standard`: `"Standalone readability (Reynolds, Presentation Zen 2008;
audience-fit per Knaflic 2015)"`.
```

---

### Check D-05 — Boundary regression test (NOT a check; it's the locked invariant test)

**Fixture deck** (`tests/fixtures/cross-domain-test-deck.pptx`, authored by `tools/build-cross-domain-fixture.js`):

- **Slide 1:** title slide.
- **Slide 2 — both visual AND content defects:**
  - Visual: low-contrast text (e.g., `#CCCCCC` body on `#FFFFFF` background — fails WCAG <3:1).
  - Content: vague claim with no evidence ("Our solution is innovative and disruptive in the market.")
- **Slide 3 — visual defect ONLY:**
  - Visual: misaligned bullet (off-grid by ~12pt).
  - Content: clean — clear action title, sourced evidence, single concrete claim.
- **Slide 4 — content defect ONLY:**
  - Visual: clean — proper contrast, on-grid alignment, consistent typography.
  - Content: 30-word run-on bullet with 7 acronyms ("Our SaaS B2B SMB GTM motion via PLG drives ARR ACV expansion through ICP-aligned MQLs that convert to SQLs at industry-leading rates per the latest BCG report").

**Test assertions** (`tests/content-vs-design-boundary.test.js`):

```js
const { runReview } = require('../skills/review/scripts');
const { runContentReview } = require('../skills/content-review/scripts');

test('runReview flags visual defects on slides 2,3 — never the content defect on slide 4', async () => {
  // ... agent generates findings via DECK-VDA pass; assert no slide-4 findings,
  //     assert slides 2,3 findings have category in {defect,improvement,style} (not "content")
});

test('runContentReview flags content defects on slides 2,4 — never the visual defects', async () => {
  // ... agent generates findings via 8-check pass; assert no findings on slide 3,
  //     assert all findings have category === "content"
});
```

The test runs against PRE-COMPUTED findings JSON files (no LLM in CI loop) — `tests/fixtures/cross-domain-design-findings.json` and `tests/fixtures/cross-domain-content-findings.json`. The agent produces these on first authoring; CI asserts the `category` enum invariant.

---

## Schema Compatibility (Q-3 — VERIFIED)

### What changes in v1.0 → v1.1

**File: `skills/review/references/findings-schema.md`**
- Bump `Schema version: 1.0` → `1.1`.
- §3 Finding shape: extend `category` enum to `{defect, improvement, style, content}`.
- §3 Finding shape: add OPTIONAL row `check_id` — string, one of `{action-title, redundancy, jargon, length, pyramid-mece, narrative-arc, claim-evidence, standalone-readability}`. Required iff `category === "content"`.
- §6 Schema version policy: clarify that `1.x` validators tolerate optional new fields.

**File: `skills/review/scripts/lib/schema-validator.js`** [VERIFIED — REQUIRES PATCH]
- Extend `CATEGORIES` Set: `new Set(['defect', 'improvement', 'style', 'content'])`.
- After the existing required-field loop, add:
  ```js
  if (f.category === 'content') {
    if (typeof f.check_id !== 'string' ||
        !VALID_CHECK_IDS.has(f.check_id)) {
      throw new Error(`${where}.check_id: required for category="content", must be one of {action-title,redundancy,jargon,length,pyramid-mece,narrative-arc,claim-evidence,standalone-readability} (got ${JSON.stringify(f.check_id)})`);
    }
  }
  ```
- Existing tests in `tests/findings-schema.test.js` and `tests/review-schema-emission.test.js` continue to pass (the old fixture has no `category: "content"` findings).
- New test `tests/findings-schema-v11.test.js` covers the new branch.

**File: `skills/annotate/scripts/adapter.js`** [VERIFIED — REQUIRES PATCH — Q-3 RESOLUTION]
- **Currently at line 7:** `const VALID_CATEGORY = new Set(['defect', 'improvement', 'style']);`
- **Patch:** `const VALID_CATEGORY = new Set(['defect', 'improvement', 'style', 'content']);`
- **No other changes needed.** Severity collapse table at line 6 (`SEV_MAP = { Critical: 'major', Major: 'major', Minor: 'minor', Nitpick: 'polish' }`) handles content findings correctly per CONTEXT.md D-03 (Critical/Major content findings → MAJOR / orange; Minor → MINOR / blue; Nitpick → POLISH / grey).
- The adapter does NOT inspect `check_id`; it ignores all unknown fields — confirmed by reading lines 14-91. Top-level field-tolerance is implicit (no `Object.keys` whitelist anywhere). [VERIFIED 2026-04-28 by reading adapter.js end-to-end.]

**Risk if forgotten:** `runContentReview` produces valid v1.1 findings → user passes `--annotate` → `runAnnotate` calls `adaptFindings` → adapter throws `slides[0].findings[0].category: content not in {defect,improvement,style}` and the pipeline aborts. This is a one-line fix, but the planner MUST schedule it as a task in Wave 0 (alongside the validator patch).

### Schema regression test plan

`tests/findings-schema-v11.test.js`:
- **Positive 1:** valid v1.1 doc with mixed `category` values (defect + content) → validator passes.
- **Positive 2:** valid v1.1 doc with `category:"content"` + valid `check_id` → validator passes.
- **Negative 1:** `category:"content"` without `check_id` → throws `check_id: required for category="content"`.
- **Negative 2:** `category:"content"` with `check_id:"foo"` → throws `check_id: ... must be one of {...}`.
- **Backwards-compat:** existing v1.0 fixture (`tests/fixtures/sample-findings.json`) still validates against patched validator unchanged.
- **Adapter compat:** patched `adaptFindings` accepts a v1.1 doc with mixed content+defect findings; collapsed SAMPLES contain both.

---

## Render-content-fixed structure

Mirror `render-fixed.js` (Phase 3, VERIFIED on disk) but specialize section labels:

| Section | Phase 3 (`/review`) | Phase 6 (`/content-review`) |
|---|---|---|
| §1 | Deck-Level Systemic Findings | Deck-Level Argument Structure (Pyramid/MECE/narrative) |
| §2 | Inferred Design System | Inferred Argument Architecture (thesis statement + supporting points + tension/resolution beats) |
| §3 | Slide-by-Slide Findings | Slide-by-Slide Content Findings |
| §4 | Summary Scoreboard (maturity) | Content Maturity Scoreboard (rubric below) |
| §5 | Top 10 Highest-Leverage Fixes | Top 10 Content Fixes |

**Content maturity rubric** (mirrors Phase 3 first-matching-wins, but content-tuned):

| Score | Label | Match if |
|-------|-------|----------|
| 5 | Persuasive | 0 Critical AND ≤2 Major AND coherent thesis surfaces in first 3 slides |
| 4 | Argued | 0 Critical AND ≤4 Major |
| 3 | Informational | 0 Critical AND ≥5 Major (deck states facts but doesn't persuade) |
| 2 | Draft | 1-2 Critical |
| 1 | Notes | ≥3 Critical OR no thesis OR no resolution |

Determinism invariants (locked from Phase 3):
- Same `findingsDoc` → byte-identical Markdown output.
- No `Date.now()`, no `Math.random()`, no `fs`, no `async`.
- Sort within each tier by `text` ascending.

---

## Common Pitfalls

### Pitfall 1: Adapter rejection of `category: "content"`

**What goes wrong:** Schema bump v1.1 lands; user runs `/instadecks:content-review my-deck.pptx --annotate`; pipeline aborts at the adapter with a confusing "category not in {defect,improvement,style}" error.
**Why it happens:** The adapter (`skills/annotate/scripts/adapter.js`) has its OWN closed enum that mirrors v1.0; v1.1 adds an enum value but adapter is not auto-synced.
**How to avoid:** Schedule the adapter patch as a Wave 0 task ALONGSIDE the validator patch. Add a `tests/annotate-adapter.test.js` case asserting `category:"content"` passes through.
**Warning signs:** Phase 6 integration tests pass standalone but fail when `--annotate` is added.

### Pitfall 2: Pre-collapsing severity in code-side checks

**What goes wrong:** Author of `redundancy.js` or `jargon.js` emits `severity_reviewer: "MAJOR"` (uppercase) instead of `"Major"`.
**Why it happens:** Confusion between producer-side (4-tier title-case) and adapter-side (3-tier UPPERCASE) vocabulary.
**How to avoid:** Each code-side check unit test asserts `f.severity_reviewer in {Critical,Major,Minor,Nitpick}`. Schema-validator throws on mismatch (P-01 guard).
**Warning signs:** schema-validator test fails with "severity_reviewer: must be one of {Critical,Major,Minor,Nitpick} (got "MAJOR")".

### Pitfall 3: Content-review flags visual defects (boundary leak)

**What goes wrong:** A prompt-side check (e.g., standalone-readability) emits a finding like "Slide 7 has low-contrast text".
**Why it happens:** Standalone-readability and visual-readability are easy to conflate — both ask "can the audience parse this without help".
**How to avoid:** SKILL.md prompt MUST repeat CLAUDE.md's locked invariant verbatim ("If you catch yourself writing about color, font, alignment, or layout, DELETE the line"). The D-05 boundary fixture test catches regressions in CI.
**Warning signs:** `tests/content-vs-design-boundary.test.js` fails on slide 3 (visual-defect-only slide), with content-review having flagged it.

### Pitfall 4: PPTX text extraction loses bullet hierarchy

**What goes wrong:** `extract-content.js` flattens all `<a:t>` runs into one string, losing the distinction between title / bullet 1 / bullet 2 / body.
**Why it happens:** Naive text extraction grabs all `<a:t>` runs; OOXML stores hierarchy in `<a:p>` paragraph elements with `<a:pPr lvl="..."/>` indent levels.
**How to avoid:** Group runs by `<a:p>` parent; treat the first `<a:p>` of the title placeholder shape as `title`; subsequent `<a:p>` elements as `bullets[]`. Extract `<a:r>` text runs within each `<a:p>` and concatenate. A spike test (Wave 0) using Phase 4's cookbook output as fixture validates this works.
**Warning signs:** Length check (Check 4) misfires by counting the entire slide as one bullet; redundancy check (Check 2) shows artificially-high cosine similarity because all slides share a flat blob of text.

### Pitfall 5: Activation collision with `/instadecks:review`

**What goes wrong:** User says "review my deck" → both `/instadecks:review` and `/instadecks:content-review` match.
**Why it happens:** Both descriptions contain the word "review".
**How to avoid:** Front-load `/content-review`'s description with content-specific anchors ("argument quality", "story flow", "claim evidence", "Pyramid Principle"). Front-load `/review` with design-specific anchors ("design defects", "DECK-VDA", "design review"). Phase 7 DIST-02 measures activation rate and tunes the descriptions.
**Warning signs:** Phase 7 activation panel hits both skills on the same prompt.

---

## Code Examples

### Example 1: Hybrid finding emission (code + prompt merged)

```js
// Source: pattern derived from skills/review/scripts/index.js + skills/review/scripts/ai-tells.js
// Phase 6 — agent-orchestrated flow inside SKILL.md prompt:
//
//   Step 1: agent calls extractContent(deckPath) → extract object
//   Step 2: agent runs the 4 code-side checks programmatically:

const { validateTitle } = require('../../create/scripts/lib/title-check');
const { checkRedundancy } = require('./lib/redundancy');
const { checkJargon } = require('./lib/jargon');
const { checkLength } = require('./lib/length-check');

function runCodeSideChecks(extract) {
  const findings = [];
  for (const slide of extract.slides) {
    // Check 1 — action title
    const r = validateTitle(slide.title, { action_title_override: slide.slide_type === 'closing' });
    if (!r.ok) {
      findings.push({
        slideNum: slide.slideNum,
        title: slide.title,
        finding: makeTitleFinding(slide, r.reason),  // see spec above
      });
    }
  }
  // Check 2 — cross-slide redundancy
  findings.push(...checkRedundancy(extract));
  // Checks 3-4 — per-slide
  for (const slide of extract.slides) {
    findings.push(...checkJargon(slide));
    findings.push(...checkLength(slide));
  }
  return findings;
}

//   Step 3: agent runs the 4 prompt-side checks (LLM judgment) and produces findings
//   Step 4: agent merges code+prompt findings into a single findings doc and calls
//             runContentReview({deckPath, findings, mode: 'standalone', annotate: false})
```

### Example 2: PPTX text extraction (jszip-based)

```js
// Source: pattern adapted from skills/review/scripts/lib/read-deck-xml.js (VERIFIED on disk)
// Phase 6 — skills/content-review/scripts/lib/extract-content.js

const { loadSlides } = require('../../../review/scripts/lib/read-deck-xml');

async function extractContent(pptxPath) {
  const rawSlides = await loadSlides(pptxPath);  // [{slideNum, xml}, ...]
  const slides = rawSlides.map(({ slideNum, xml }) => {
    // Group <a:r><a:t>...</a:t></a:r> runs by <a:p> parent
    const paragraphs = parseParagraphs(xml);
    // Heuristic: title placeholder = first paragraph with shape role "title" or
    //   first paragraph chronologically if no role marker found
    const title = paragraphs.find(p => p.role === 'title')?.text
                  || paragraphs[0]?.text || '';
    const bullets = paragraphs.filter(p => p.role === 'body').map(p => p.text);
    const body = bullets.join(' ');  // concatenated for jargon check
    const notes = parseNotes(xml);   // separate ppt/notesSlides/notesSlideN.xml lookup
    const slide_type = inferSlideType(xml);  // 'title'|'section'|'content'|'closing'
    return { slideNum, title, bullets, body, notes, sources: [], slide_type };
  });
  return { slides };
}

// parseParagraphs: regex-based extraction of <a:p>...</a:p> blocks; for each, concat
//   the inner <a:r><a:t>...</a:t></a:r> text. Spike validates this on Phase 4 cookbook
//   fixture before Wave 1 ships. Fallback: add fast-xml-parser devDep if regex breaks.
```

### Example 3: SKILL.md prompt template (standalone-readability check)

```markdown
<!-- Source: structure derived from skills/review/SKILL.md "R18 AI-tell detection — fuzzy side"
     section (VERIFIED on disk) — same prompt-injection pattern. -->

## Standalone-readability (Check 8 — `check_id: "standalone-readability"`)

For each non-title, non-closing slide, mentally remove the presenter and ask:

1. **Can a first-time reader, with no presenter narration, understand the slide's claim?**
2. **Is the evidence on the slide self-contained? Or does the presenter need to explain it?**
3. **Are speaker notes ENRICHING (extra context) or COMPLETING (load-bearing)?**

Emit a finding when the answer to #1 is no, or #3 is "completing".

Finding text grammar (matches Phase 3 finding grammar):
`Major | content — slide N body text — claim "X" lacks the context required to interpret it standalone — Reynolds, Presentation Zen 2008 — Add a one-sentence preamble or move slide N to follow slide M which establishes the context.`
```

---

## SKILL.md plugin-dev Conformance — 10-Item Checklist

Per Phase 5's retroactive plugin-dev compliance pass + the canonical pattern in `skills/review/SKILL.md` (VERIFIED on disk) and `skills/create/SKILL.md` (VERIFIED on disk), Phase 6's `skills/content-review/SKILL.md` MUST satisfy:

1. **Frontmatter `name`:** `content-review` (matches directory name).
2. **Frontmatter `description`:** ≤1024 chars, third-person voice, imperative-keyword-front-loaded with the canonical activation phrases (D-06): "content review", "argument quality", "story flow", "is my deck persuasive", "Pyramid Principle / MECE", "narrative arc". Embeds 1-2 example user prompts.
3. **Frontmatter `allowed-tools`:** scoped to `Bash(node:*)`, `Bash(unzip:*)`, `Bash(xmllint:*)` (only if extract-content fallback uses shell), `Read`, `Write`. NO `Bash(soffice:*)` / `Bash(pdftoppm:*)` unless `--annotate` is in scope (lazy-imported from `/annotate`'s allowed-tools at call time — verify Phase 7 DIST-03 confirms this is acceptable in `default` permission mode).
4. **Frontmatter `user-invocable: true`** (D-07 flip from current `false`).
5. **Frontmatter `version: 0.1.0`** (matches package.json).
6. **§ "When to invoke":** explicit list of triggering prompts; explicit "Do NOT use this skill for..." pointing at `/instadecks:review` (design) for visual issues.
7. **§ "Inputs":** `deckPath` required, `--annotate` flag, `--out-dir`, `--run-id` overrides.
8. **§ "Outputs":** standalone (3 files) vs `--annotate` (5 files) per D-04.
9. **§ "The 8 content checks"** — full prompt templates for the 4 prompt-side checks (Pyramid/narrative/claim-evidence/readability) verbatim from §"The Seven (actually Eight) Content Checks" above. Code-side checks reference the lib files but do NOT duplicate the heuristic spec (single source of truth in the lib).
10. **§ "Severity-collapse boundary"** + **§ "Content-vs-design boundary"** — locked-invariant statements (P-01 + CLAUDE.md), copied verbatim from `/review`'s SKILL.md to lock the rules and prevent drift.

Bonus item (recommended): a §"Allowed tools" section explicitly listing the tools and the `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_PLUGIN_DATA}` path-discipline note, mirroring `/review`'s § Environment.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Single schema v1.0 with closed `category` enum `{defect,improvement,style}` | v1.1 additive — `content` added; optional `check_id` field | Phase 6 (this phase) | All consumers (validator + adapter) need one-line patch; old v1.0 fixtures still validate. |
| `unzip + xmllint` shell pipeline (CONTEXT.md Q-1 fallback) | `jszip`-based extraction reusing Phase 3's `read-deck-xml.js` | Phase 6 | Removes shell-escaping fragility; matches devDep posture. |
| Action-title check living in `/create` only | Reused by `/content-review` via wrapper | Phase 6 | Single source of truth for the heuristic; future tuning in `title-check.js` benefits both skills. |
| `/content-review` body empty (Phase 5 retroactive stub + `user-invocable: false`) | Full body + `user-invocable: true` | Phase 6 (D-07) | Skill activates user-side. |

**Deprecated/outdated:** None — Phase 6 is purely additive over the Phase 1-5 foundation.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | Bag-of-words cosine ≥0.85 on title+first-bullet is a sufficient redundancy heuristic for Phase 4 cookbook output | Check 2 spec | False-positive over-flagging on similar section dividers; mitigated by Q-2 whitelist. Wave 1 spike test confirms or tunes. |
| A2 | 5-acronym threshold for jargon check | Check 3 spec | Under/over-flagging on technical decks; threshold is locked in CONTEXT.md D-02 — adjust in v1.x via CRV-07 metrics. |
| A3 | 25-word threshold for length check | Check 4 spec | Hardcoded in CONTEXT.md D-02; matches Reynolds 6×6 rule scaled up; tunable in v1.x. |
| A4 | Regex-based XML extraction (`<a:p>` paragraph grouping + `<a:r><a:t>` run extraction) handles namespaced + accented + CDATA cases | extract-content.js spec | If regex breaks, fall back to `fast-xml-parser` devDep. Wave 0 spike tests this against Phase 4 cookbook fixture. |
| A5 | Phase 7 DIST-03 will validate that `/content-review --annotate` works in `default` permission mode despite `/content-review`'s SKILL.md not declaring `Bash(soffice:*)` (the soffice call happens inside `/annotate`'s lazy-required process) | SKILL.md item 3 | If Claude Code's permission model requires the calling skill to declare downstream tools, planner adds `Bash(soffice:*)` + `Bash(pdftoppm:*)` to content-review's allowed-tools. |
| A6 | Closing-slide skip for action-title check via `slide_type === "closing"` extraction works on pptxgenjs-authored decks | Check 1 spec | Phase 4's cookbook may not emit a parseable `slide_type`; Wave 0 spike confirms. Fallback: heuristic — last slide always treated as closing. |
| A7 | Stop-word list (25 tokens) is sufficient for the redundancy bag-of-words tokenizer | Check 2 spec | Tunable in v1.x; doesn't block ship. |

---

## Open Questions

1. **Slide-type inference** — How reliable is extracting `slide_type` (title / section / content / closing) from PPTX layout names emitted by Phase 4's cookbook?
   - What we know: pptxgenjs assigns layout names per slide (e.g., `slideLayout1`); Phase 4 cookbook recipes label slide layouts.
   - What's unclear: whether the layout name maps deterministically back to the 8 cookbook slide types.
   - Recommendation: Wave 0 spike — run extract-content.js against Phase 4's `tests/fixtures/v8-reference/` deck and verify `slide_type` extraction. If unreliable, ship a heuristic (slide 1 = title; last slide = closing; slides whose title matches `/^(agenda|q&a|appendix|thank you)$/i` = section/closing).

2. **Cycle integration with `/create` (deferred to v2 but worth scoping)** — How does `/content-review` plug into the auto-refine loop later?
   - What we know: CRV-11 explicitly defers this; v1 standalone only.
   - What's unclear: whether the auto-refine loop's convergence rule (`genuine_findings == 0 AND cycle ≥ 2`) treats content findings the same as design findings, or has a separate convergence track.
   - Recommendation: Out of Phase 6 scope; document the question for the v2 design discussion.

3. **Narrative MD authorship surface in CLI mode** — When invoked from CLI (not agent-driven), who authors the narrative MD?
   - What we know: Phase 3 returns `narrativePath` as a sibling-of-input but does NOT write it; the agent authors post-call.
   - What's unclear: in pure CLI invocation (no agent), the narrative MD is never written. Is that acceptable?
   - Recommendation: Match Phase 3 — narrative MD is "authored post-call, optional". CLI users get the JSON + fixed MD; only agent-mediated invocations get the narrative. Document in SKILL.md.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---|---|---|
| `node` ≥ 18 | runContentReview, all libs | ✓ | (Phase 1 prereq) | — |
| `jszip` 3.10.1 | extract-content.js (jszip path) | ✓ | devDep — already on disk | — |
| `pptxgenjs` 4.0.1 | tools/build-cross-domain-fixture.js | ✓ | pinned | — |
| `unzip` (system) | optional fallback for extract-content | ✓ | macOS 6.00 [VERIFIED 2026-04-28] | jszip path is primary |
| `xmllint` (system) | optional fallback | ✓ | libxml 20913 [VERIFIED 2026-04-28] | jszip + regex path is primary |
| `soffice` | only if `--annotate` is gated on (downstream of `/annotate`) | (Phase 1 prereq, hook-checked) | (per env) | — |
| `pdftoppm` | only if `--annotate` is gated on (downstream of `/annotate`) | (Phase 1 prereq) | (per env) | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None expected. Phase 6 adds zero new runtime deps.

---

## Validation Architecture

> nyquist_validation enabled per default (no explicit `false` in `.planning/config.json` — confirm; if absent, treat as enabled).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node built-in `node:test` (Node ≥18) |
| Config file | none — `package.json` `"test": "node --test"` |
| Quick run command | `node --test tests/content-review-checks.test.js` (single file, < 10s) |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| CRV-01 | Skill description has activation phrases | unit | `node --test tests/content-review-runtime.test.js -- frontmatter` | ❌ Wave 1 |
| CRV-02 | Pyramid/MECE finding emission via prompt — verified by fixture | integration | `node --test tests/content-review-integration.test.js` | ❌ Wave 2 |
| CRV-03 | Narrative-arc check — fixture | integration | `node --test tests/content-review-integration.test.js` | ❌ Wave 2 |
| CRV-04 | Action-title check on bad title → finding | unit | `node --test tests/content-review-checks.test.js -- title` | ❌ Wave 0 |
| CRV-05 | Claim/evidence prompt path — fixture | integration | `node --test tests/content-review-integration.test.js` | ❌ Wave 2 |
| CRV-06 | Redundancy check on duplicate-claim slides → finding | unit | `node --test tests/content-review-checks.test.js -- redundancy` | ❌ Wave 0 |
| CRV-07 | Jargon check (>5 acronyms) + length check (>25 words) → findings | unit | `node --test tests/content-review-checks.test.js -- jargon length` | ❌ Wave 0 |
| CRV-08 | Standalone-readability prompt path — fixture | integration | `node --test tests/content-review-integration.test.js` | ❌ Wave 2 |
| CRV-09 | Findings v1.1 schema acceptance + adapter pass-through | unit | `node --test tests/findings-schema-v11.test.js tests/annotate-adapter.test.js` | ❌ Wave 0 |
| CRV-10 | Bidirectional content-vs-design boundary on cross-domain fixture | integration | `node --test tests/content-vs-design-boundary.test.js` | ❌ Wave 2 |
| CRV-11 | Standalone runtime + `--annotate` pipeline | runtime | `node --test tests/content-review-runtime.test.js` | ❌ Wave 1 |

### Sampling Rate

- **Per task commit:** `node --test tests/content-review-checks.test.js` (the changed lib's test).
- **Per wave merge:** `node --test tests/content-review-*.test.js tests/findings-schema-v11.test.js tests/annotate-adapter.test.js`.
- **Phase gate:** Full suite green via `npm test` before `/gsd-verify-work`.

### Wave 0 Gaps

- [ ] `tests/findings-schema-v11.test.js` — covers CRV-09 schema additions.
- [ ] `tests/content-review-checks.test.js` — covers CRV-04, CRV-06, CRV-07.
- [ ] `tests/annotate-adapter.test.js` — adds case for `category:"content"` (extends existing file).
- [ ] `tests/fixtures/cross-domain-test-deck.pptx` — generated by `tools/build-cross-domain-fixture.js`.
- [ ] `tests/fixtures/cross-domain-{design,content}-findings.json` — pre-computed expected outputs.
- [ ] No new framework install needed.

---

## Security Domain

> security_enforcement default enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---|---|---|
| V2 Authentication | no | (CLI-only skill; no auth surface) |
| V3 Session Management | no | (no sessions) |
| V4 Access Control | yes | `allowed-tools` scoped per SKILL.md item 3; Phase 7 DIST-03 validates in `default` + `dontAsk` modes |
| V5 Input Validation | yes | jszip 100MB cap (existing in `read-deck-xml.js`); schema-validator throws pinpoint errors on malformed v1.1 docs; path-traversal guard on `deckPath` (Phase 3 precedent — `path.resolve` + check stays under cwd) |
| V6 Cryptography | no | (no secrets, no signing) |
| V12 File and Resources | yes | PPTX read-only via jszip (no zip-slip risk — we never extract files to disk, only read XML in-memory); fixture deck written under `tests/fixtures/` (controlled path) |

### Known Threat Patterns for Node + PPTX text extraction

| Pattern | STRIDE | Standard Mitigation |
|---|---|---|
| Zip-bomb (huge PPTX inflating memory) | DoS | 100MB byte cap before `JSZip.loadAsync` — already in `lib/read-deck-xml.js`; reuse the same cap. |
| Zip-slip (path traversal via crafted zip entries) | Tampering | We never extract files; we only read in-memory XML strings. Mitigation = "don't extract". |
| XXE (XML external entity) on slide XML | InfoDisclosure | Regex-based extraction has no XXE surface. If `fast-xml-parser` fallback is needed, configure with `allowEntities: false` / equivalent. |
| Path traversal via `deckPath` argument | Tampering | `path.resolve(deckPath)` + assert resolved path exists; reject `..` traversal at runtime. Match Phase 3 precedent. |
| Schema-validator denial-of-service via huge findings array | DoS | Bound checked: validator iterates O(slides × findings); for v1 there's no upstream attacker-supplied findings — content-review GENERATES the findings, doesn't accept them from outside. |
| Cross-skill privilege escalation via `--annotate` | Privilege | `runAnnotate` is lazy-required from a sibling skill in the same plugin tree; no IPC; no cross-process boundary. Same trust domain. |

---

## Wave Decomposition (Q-5 RECOMMENDATION)

### Wave 0 — Schema bump + code-side check libs (parallel-safe; 4 plans)

Independent files; no inter-task ordering required after schema patch lands first.

1. **Plan 06-01** — Schema v1.1 patch: `findings-schema.md` doc bump + `schema-validator.js` patch + `adapter.js` patch + `tests/findings-schema-v11.test.js` + extend `tests/annotate-adapter.test.js`. **Must merge before plans 02/03 use it.** Maps CRV-09.
2. **Plan 06-02** — Code-side check libs: `lib/redundancy.js`, `lib/jargon.js`, `lib/length-check.js`, `lib/title-adapter.js` (wraps `title-check.js`) + `tests/content-review-checks.test.js`. Independent of orchestrator. Maps CRV-04, CRV-06, CRV-07.
3. **Plan 06-03** — `lib/extract-content.js` (jszip path) + spike test against Phase 4's cookbook fixture. May surface A4 risk; if spike fails, this plan adds `fast-xml-parser` devDep. Independent. Maps prerequisite for CRV-02..05, CRV-08.

### Wave 1 — Orchestrator + renderer + SKILL.md (1 plan, sequential after Wave 0)

4. **Plan 06-04** — `runContentReview` (`scripts/index.js`) + `cli.js` + `render-content-fixed.js` + SKILL.md full body + frontmatter `user-invocable: true` flip + `tests/content-review-runtime.test.js` + `tests/content-review-render-fixed.test.js`. Maps CRV-01, CRV-11, and the spec from D-04 / D-06 / D-07. Depends on Wave 0.

### Wave 2 — Boundary fixture + integration test (combinable into Plan 06-04 OR split as Plan 06-05)

5. **Plan 06-05 (optional split, recommended)** — `tools/build-cross-domain-fixture.js` + `tests/fixtures/cross-domain-test-deck.pptx` (committed) + `tests/fixtures/cross-domain-{design,content}-findings.json` + `tests/content-vs-design-boundary.test.js` + `tests/content-review-integration.test.js`. Maps CRV-10 + the integration tests for CRV-02/03/05/08. Depends on Wave 1.

**Total:** 5 plans across 3 waves (matches CONTEXT.md Q-5's "likely 4 plans" with one optional split for cleaner ownership; the planner can collapse 06-04 + 06-05 into a single plan if preferred — the SKILL.md body and the boundary fixture are the two highest-risk surfaces and benefit from separate review).

**CONTEXT.md Q-5 confirmed:** 3 waves is correct. 4-vs-5 plans is a planner judgment call; this research recommends 5 (clean separation of "boundary regression" from "skill body"), but 4 is acceptable.

---

## Sources

### Primary (HIGH confidence)

- `skills/review/scripts/lib/schema-validator.js` (lines 7-95) — the validator's CATEGORIES Set is closed; extend additively for v1.1.
- `skills/annotate/scripts/adapter.js` (lines 7-91) — VALID_CATEGORY at line 7 is the patch site; SEV_MAP at line 6 needs no change.
- `skills/review/scripts/index.js` (lines 1-170) — architectural template for runContentReview.
- `skills/review/scripts/render-fixed.js` (lines 1-235) — architectural template for render-content-fixed.js.
- `skills/review/SKILL.md` (full file, lines 1-237) — canonical SKILL.md body shape.
- `skills/create/SKILL.md` (lines 1-60) — canonical activation-phrase pattern.
- `skills/create/scripts/lib/title-check.js` (full file) — REUSED for action-title check.
- `skills/review/scripts/lib/read-deck-xml.js` (full file) — REUSED for PPTX text extraction.
- `skills/review/references/findings-schema.md` (full file) — locked v1.0; v1.1 is additive.
- `skills/annotate/scripts/index.js` (lines 1-228) — runAnnotate's lazy-require contract for the `--annotate` pipeline.
- `package.json` — confirms jszip 3.10.1 devDep + pptxgenjs 4.0.1 pinned + node:test framework.
- `.planning/phases/06-instadecks-content-review/06-CONTEXT.md` — locked decisions.
- `CLAUDE.md` — locked invariants (severity collapse boundary, content-vs-design boundary).
- `.planning/REQUIREMENTS.md` — CRV-01..11 source-of-truth.

### Secondary (MEDIUM confidence)

- Phase 3 plans `03-01-PLAN.md`..`03-05-PLAN.md` (referenced via summary lines in ROADMAP.md) — architectural pattern for orchestrator + renderer + integration test split.

### Tertiary (LOW confidence — flagged via Assumptions Log)

- A1 redundancy threshold tuning (CONTEXT.md Q-2 hypothesis; Wave 1 spike confirms).
- A4 regex-based XML extraction sufficiency (Wave 0 spike confirms).

---

## Project Constraints (from CLAUDE.md)

- **`annotate.js` is a SHA-pinned binary asset** — Phase 6 does NOT touch it. Adapter patch (`adapter.js`) is a sibling file and is freely modifiable. CONFIRMED.
- **pptxgenjs pinned at exactly 4.0.1** — Phase 6 adds NO new runtime deps. CONFIRMED.
- **No reaches outside the plugin tree** — all paths via `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_PLUGIN_DATA}`. CONFIRMED — paths in this research are all repo-relative or env-var-prefixed; lint-paths.sh enforces.
- **Severity collapse 4→3 happens at the `/annotate` adapter only** — Phase 6 producers always emit Critical/Major/Minor/Nitpick. P-01 schema-validator guard. CONFIRMED.
- **Auto-refine convergence rule** — N/A for Phase 6 (CRV-11 defers loop integration to v2).
- **Content-vs-design boundary is hard** — Phase 6's CORE invariant. D-05 fixture + bidirectional test enforces. CONFIRMED.
- **Don't get cute** — Phase 6 ships the smallest viable surface: 4 deterministic checks + 4 prompt checks + schema-additive bump. No NLP deps, no clever heuristics, no convergence experiments. Matches the productization-not-research posture.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every dep already on disk and pinned.
- Architecture: HIGH — direct mirror of Phase 3 with verified-by-reading code template.
- Schema compatibility (Q-3): HIGH — verified by reading adapter.js and schema-validator.js end-to-end; one-line patches identified.
- Code-side check specs: HIGH on shape (verified pattern in `ai-tells.js`); MEDIUM on threshold values (A1, A2, A3 tagged).
- Prompt-side check specs: MEDIUM — spec is the agent's contract; CRV-02/03/05/08 are LLM-judgment by design.
- Boundary regression test: HIGH — fixture authoring path well-understood (Phase 4 precedent).
- Wave decomposition: HIGH — confirms CONTEXT.md Q-5 hypothesis with one minor refinement (split optional).

**Research date:** 2026-04-28
**Valid until:** 2026-05-28 (30 days — Phase 1-5 foundation is stable; bump on schema-version v1.2 introduction or any pptxgenjs/jszip dep change).
