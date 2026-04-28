---
phase: 06
slug: instadecks-content-review
status: draft
created: 2026-04-28
inherits_from: [01-CONTEXT.md, 02-CONTEXT.md, 03-CONTEXT.md]
---

# Phase 06 — `/instadecks:content-review` — CONTEXT.md

> Implementation decisions for downstream researcher and planner.

---

## Goal Recap (from ROADMAP)

Ship `/instadecks:content-review`: 7 content checks (Pyramid Principle / MECE, narrative-arc, action-title quality, claim/evidence balance, redundancy, audience-fit, standalone-readability), same 4-tier severity + finding grammar + JSON schema as `/review`, hard content-vs-design boundary in both directions, v1 standalone (NOT in `/create`'s loop), but pipes into `/annotate`. Requirements CRV-01..CRV-11.

---

## Inherited Locked Decisions (no re-discussion)

- **Findings JSON schema** — Phase 1 `skills/review/references/findings-schema.md` v1.0 (REUSED VERBATIM)
- **4-tier severity** — Critical / Major / Minor / Nitpick at producer
- **4→3 severity collapse** happens only at `/annotate` adapter
- **Content-vs-design boundary hard** (CLAUDE.md) — content-review NEVER flags visual/typographic/layout
- **Run dir** convention `.planning/instadecks/<run-id>/`
- **Sibling-of-input outputs** `<deck>.content-review.json` + `<deck>.content-review.md` + `<deck>.content-review.narrative.md` (mirrors Phase 3 D-06 two-report convention)
- **Pipeline into `/annotate`** — gated by `--annotate` flag or natural-language intent (mirrors Phase 3 D-03)
- **soffice/pdftoppm hardening** — reuses Phase 3 D-07 `${CLAUDE_PLUGIN_ROOT}/scripts/pptx-to-images.sh`

---

## Phase 6 Gray-Area Decisions

### D-01 — Input Surface

**Decision:** **PPTX path + optional structured content extract.**

`runContentReview({deckPath, runId, outDir, mode, contentExtract})` accepts a `.pptx` file. The agent extracts slide text content (titles, bullets, body, speaker notes) via `unzip -p deck.pptx ppt/slides/slide*.xml | xmllint`. Optionally accepts a pre-extracted `contentExtract` object (saves re-parsing when called from `/create` in v2).

**Rationale:** PPTX text extraction is deterministic. Images are out of scope (this is content review, not design review). PDF input is NOT supported in v1 — text extraction from PDF is lossy and would re-introduce design noise.

**How to apply:**
- `skills/content-review/scripts/lib/extract-content.js` — PPTX → `{slides: [{slideNum, title, bullets, body, notes, sources}]}` extractor.
- `runContentReview` signature mirrors `runReview`.

---

### D-02 — Seven Content Checks: Code vs Prompt Split

**Decision:** **Hybrid (matches Phase 3 D-02 pattern).**

| Check | Owner | Why |
|---|---|---|
| 1. Action-title quality (claim-not-topic) | **Code** | Reuses `lib/title-check.js` from Phase 4 (D-06); already deterministic |
| 2. Redundancy detection (≥3 slides repeating same claim) | **Code** | Text-cosine-similarity on slide titles + first bullet; 0.85 threshold |
| 3. Audience-fit: jargon flag (>5 acronyms in body) | **Code** | Regex on UPPERCASE 2-5-char tokens |
| 4. Audience-fit: length flag (slide bullet > 25 words) | **Code** | Word count |
| 5. Pyramid Principle / MECE structural | **Prompt** | Requires understanding the argument hierarchy across slides — judgment |
| 6. Narrative-arc check | **Prompt** | "Does the deck tell a coherent story setup → tension → resolution?" — judgment |
| 7. Claim/evidence balance | **Prompt** | "Does each claim have a supporting datum or source?" — judgment |
| 8. Standalone-readability | **Prompt** | "If a reader saw only this deck (no presenter), would they get it?" — judgment |

**Rationale:** Mechanical checks (1-4) ship in code so they are testable, version-pinned, and run fast. Judgment checks (5-8) live in the SKILL.md prompt because they require reading meaning across slides.

**How to apply:**
- `skills/content-review/scripts/` — `lib/redundancy.js`, `lib/jargon.js`, `lib/length-check.js`; reuses `skills/create/scripts/lib/title-check.js` from Phase 4.
- `skills/content-review/SKILL.md` — enumerates checks 5-8 with prompt examples + finding-grammar templates.
- Combined output flows into the same findings JSON; code-derived findings carry `category: "content"` and a `check_id` (e.g., `"audience-fit:jargon"`); prompt-derived findings carry `category: "content"` and `check_id` from {pyramid, narrative, claim-evidence, readability}.

---

### D-03 — Findings Schema Extension

**Decision:** **Extend `findings-schema.md` v1.0 with a `category: "content"` enum value (additive non-breaking) and a `check_id` field for content findings.**

`category` already accepts `defect | improvement | style`; we add `content` as a fourth value. `check_id` is a new optional string field; only content findings populate it. Phase 1 schema validator updated to allow these (one-line additive change).

**Rationale:** Content findings need a category distinct from design defects so downstream filtering works (e.g., "show me only design issues"). `check_id` enables per-check accuracy metrics in v1.x. Both changes are additive — Phase 2 `/annotate` adapter ignores unknown fields gracefully.

**How to apply:**
- `skills/review/references/findings-schema.md` — add `category: "content"` to enum; add `check_id` field with enum of 8 values; mark schema version `1.1` (minor bump).
- `skills/review/scripts/lib/schema-validator.js` — accept new enum value + new optional field.
- Phase 2 `/annotate` adapter — verified unaffected (severity collapse table unchanged); content-severity Critical/Major → MAJOR (orange), Minor → MINOR (blue), Nitpick → POLISH (grey).

---

### D-04 — Two-Report Output

**Decision:** **Mirror Phase 3 D-06: fixed-template MD + narrative MD.**

| Path | Style |
|---|---|
| `<deck>.content-review.json` | Locked schema findings |
| `<deck>.content-review.md` | Fixed template: §1 systemic content, §2 per-slide, §3 top-10 fixes — rendered by `lib/render-content-fixed.js` |
| `<deck>.content-review.narrative.md` | LLM-authored narrative on argument flow / persuasiveness |

**Rationale:** Symmetry with `/review` keeps the two reports cognitively interchangeable for the user. Phase 7 marketplace polish is easier when both skills share output shape.

---

### D-05 — Boundary Enforcement (CRV-09)

**Decision:** **Bidirectional fixture-based regression test.**

`tests/fixtures/cross-domain-test-deck.pptx` contains:
- 1 slide with both a visual defect (low-contrast text) AND a content defect (vague claim, no evidence)
- 1 slide with only visual defect
- 1 slide with only content defect

Test asserts:
- `runReview` flags exactly the visual defects, NEVER the content defect
- `runContentReview` flags exactly the content defects, NEVER the visual defect

**Rationale:** The boundary is a CLAUDE.md locked invariant; needs a CI-enforceable regression test, not just prose discipline.

**How to apply:**
- Reuses Phase 3 review test infrastructure
- Fixture deck authored deterministically via pptxgenjs in `tools/build-cross-domain-fixture.js`
- Test: `tests/content-vs-design-boundary.test.js`

---

### D-06 — Activation Phrases (CRV-01 ≥8/10)

**Decision:** **Description front-loads "content review", "argument quality", "story flow", "is my deck persuasive", "Pyramid Principle / MECE", "narrative arc".**

These were already baked into `skills/content-review/SKILL.md` description during the retroactive plugin-dev compliance pass; Phase 6 confirms and tests against the canonical 10-prompt panel (Phase 7 DIST-02 measures activation rate).

**Rationale:** Phase 7 measurement; Phase 6 lays the groundwork.

---

### D-07 — `user-invocable: true` flip

**Decision:** Phase 6 flips `skills/content-review/SKILL.md` frontmatter `user-invocable: false` → `true` (was set false during Phase 5's retroactive compliance pass since body was empty).

**Rationale:** Body lands in Phase 6 → safe to enable user invocation.

---

## Canonical References

| Artifact | Path | Purpose |
|---|---|---|
| Phase 1 findings-schema | `skills/review/references/findings-schema.md` | EXTENDED in D-03 |
| Phase 3 `runReview` | `skills/review/scripts/index.js` | Architectural analog for `runContentReview` |
| Phase 3 `render-fixed.js` | `skills/review/scripts/render-fixed.js` | Analog for `lib/render-content-fixed.js` |
| Phase 4 `title-check.js` | `skills/create/scripts/lib/title-check.js` | REUSED for action-title check |

---

## Code Context

- `skills/content-review/SKILL.md` (current: stub + frontmatter) → full body in this phase
- `skills/content-review/scripts/`: NEW `index.js` (`runContentReview`), `cli.js`, `render-content-fixed.js`, `lib/{extract-content,redundancy,jargon,length-check}.js`
- `skills/review/references/findings-schema.md` — schema bumped to v1.1 (additive)
- `tests/`: `content-review-runtime.test.js`, `content-review-checks.test.js`, `content-vs-design-boundary.test.js`, `content-review-render-fixed.test.js`, `content-review-integration.test.js`
- `tools/build-cross-domain-fixture.js` — pptxgenjs deck authoring for D-05 fixture

---

## Out of Scope (deferred)

- **Content-review integration into `/create`'s loop** — v2 (PROJECT.md)
- **PDF input** — v1.x
- **Activation tuning ≥8/10 measurement** — Phase 7 DIST-02
- **Per-check accuracy metrics dashboard** — v1.x

---

## Open Questions for Researcher

- **Q-1:** Confirm `unzip + xmllint` PPTX text extraction is reliable across pptxgenjs-authored decks (Phase 4 cookbook output) — handles `<a:t>` text runs, accented chars, bullet hierarchy. If brittle, fall back to a tiny `xml2js`-style Node parser.
- **Q-2:** Redundancy threshold tuning — 0.85 cosine on title+first-bullet may over-flag templated section dividers. Recommend whitelisting common boilerplate (e.g., "Agenda", "Q&A", "Thank You") OR ignoring slides with `slide_type ∈ {section, closing}`.
- **Q-3:** Schema bump v1.0 → v1.1 — confirm Phase 2 `/annotate` adapter ignores unknown fields gracefully (read `skills/annotate/scripts/index.js` and verify the SAMPLES adapter logic).
- **Q-4:** Cross-domain fixture deck construction — easiest path is to author it via `pptxgenjs` directly in `tools/build-cross-domain-fixture.js` so it's reproducible. Confirm.
- **Q-5:** Wave decomposition — likely 4 plans (libs+schema / SKILL.md+orchestrator / fixtures+boundary test / integration test+CLI). Validate.

---

**Approved:** 2026-04-28 (autonomous mode per user directive)
