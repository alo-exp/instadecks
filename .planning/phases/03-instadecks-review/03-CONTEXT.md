---
phase: 03
slug: instadecks-review
status: draft
created: 2026-04-28
inherits_from: [01-CONTEXT.md, 02-CONTEXT.md]
---

# Phase 03 — `/instadecks:review` (Design Review) — CONTEXT.md

> Implementation decisions for downstream researcher and planner. Decisions inherited from prior phases (Phase 1 contract, Phase 2 D-01..D-08) are not restated here.

---

## Goal Recap (from ROADMAP)

Ship `/instadecks:review`: DECK-VDA 4-pass methodology + R18 AI-tell detection, emits findings JSON in the locked Phase 1 schema + a human-readable Markdown report, optionally pipelines into `/annotate`. Hardens `scripts/pptx-to-images.sh` against soffice race conditions. 11 requirements (RVW-01..11).

---

## Inherited Locked Decisions (no re-discussion)

- **Findings JSON schema** — Phase 1 `skills/review/references/findings-schema.md`
- **4-tier severity in reviewer JSON** — Critical / Major / Minor / Nitpick (collapse to 3-tier happens at `/annotate` adapter only, never here)
- **Content-vs-design boundary** — `/review` flags visual / typographic / layout only; argument structure is `/content-review`'s territory
- **Run dir** — `.planning/instadecks/<run-id>/`, run-id = `YYYYMMDD-HHMMSS-<6hex>`
- **Sibling-of-input outputs** — `<deck>.review.json`, `<deck>.review.md`, `<deck>.review.narrative.md`; silent overwrite
- **soffice flag** — `-env:UserInstallation=file:///tmp/lo-${SESSION_ID}-${PID}` per-call (Phase 2 D-08)
- **`runAnnotate({deckPath,findings,outDir,runId})`** exported — Phase 3 reuses for pipeline mode

---

## Phase 3 Gray-Area Decisions

### D-01 — DECK-VDA Bundling Strategy

**Decision:** **Canonicalize into our own `skills/review/SKILL.md`** — do not vendor the deck-design-review skill verbatim.

**Rationale:** Verbatim bundling would couple us to upstream's docs, license, and update cadence indefinitely. We own the methodology by re-expressing it: 4-pass DECK-VDA flow, 4-tier severity grammar, exhaustive §1/§3/§4/§5 sections, and the JSON contract become first-class authored content under our Apache-2.0 license. Upstream credit goes in NOTICE.

**How to apply:**
- Researcher reads `~/.claude/skills/deck-design-review/SKILL.md` (or wherever it lives) for methodology, then drafts an original SKILL.md re-expressing it.
- No `references/deck-design-review-original.md` carried into the plugin.
- NOTICE acknowledges deck-design-review as the methodological influence.

---

### D-02 — R18 AI-Tell Detection Mechanism

**Decision:** **Hybrid — maximize in code; minimum in prompt.**

**Rationale:** Deterministic, testable rules (default-blue palette, accent-line-under-title geometry, identical-layout-repeated detection across slides) belong in code where they can be unit-tested and version-pinned. Fuzzy / context-sensitive tells (vague jargon, generic stock-photo vibes, "AI-flavored" phrasing) stay in the SKILL.md prompt because they require LLM judgment.

**How to apply:**
- Code module: `skills/review/scripts/ai-tells.js` exports `detectAITells({slidesXml, paletteHex, layoutHashes})` returning structured findings. At least these heuristics in code:
  1. Default-blue family detection (`#0070C0`, `#1F4E79`, `#2E75B6`, etc.) without justification in deck rationale
  2. Accent-line-under-title geometry detection (any horizontal line within 12pt of title baseline, full-width-ish)
  3. Identical-layout-repeated (≥3 slides sharing the same shape-graph hash)
- SKILL.md prompt enumerates the residual fuzzy tells with explicit examples; LLM emits these as `category: "style"` findings with `genuine` true/false per its judgment.
- Combined output flows into the same findings JSON; both code-derived and LLM-derived findings carry `r18_ai_tell: true` flag for downstream filtering.

---

### D-03 — Pipeline-Into-`/annotate` Default Behavior

**Decision:** **Gated** — pipeline runs only when:
1. User invokes with explicit `--annotate` flag, OR
2. User's natural-language invocation mentions "annotate" / "overlay" / similar intent (LLM-driven intent detection in SKILL.md)

**Rationale:** Avoids surprise file writes (annotated PPTX/PDF) when the user just wanted findings. Keeps standalone mode the principle-of-least-surprise default.

**How to apply:**
- CLI: `--annotate` boolean flag; when set, calls `runAnnotate(...)` after review JSON is written.
- SKILL.md: explicit "If the user's request mentions annotate/overlay/markup, pass `--annotate` to the underlying script" instruction with examples.
- Standalone mode (no flag, no annotate intent) writes `<deck>.review.json` + `<deck>.review.md` + `<deck>.review.narrative.md` only.

---

### D-04 — Structured-Handoff Mode (called from `/create`)

**Decision:** **Shared run-dir** — `/create` writes its just-generated deck to `.planning/instadecks/<run-id>/work/<name>.pptx`, then invokes `/review` passing the same `runId`. `/review` reads from that path, writes outputs to the same run-dir, returns finding-counts and paths.

**Rationale:** Both phases already converge on the run-dir convention from Phase 2 D-01. No file-read roundtrip beyond what disk already buffers. Keeps each skill cleanly invocable standalone or in pipeline; no in-process function-export coupling.

**How to apply:**
- `runReview({deckPath, runId, outDir, mode})` exported from `skills/review/scripts/index.js` — `mode` ∈ `{"standalone", "structured-handoff"}`. In `structured-handoff` mode, returns `{jsonPath, mdPath, narrativePath, findingCounts: {critical, major, minor, nitpick}, genuineCount}` for the caller without printing to stdout.
- CLI defaults to `standalone`; `/create` orchestration sets `structured-handoff`.

---

### D-05 — soffice / pdftoppm Hardening

**Decision (mine, per user delegation):**

| Concern | Setting |
|---|---|
| Per-call user-instance | `-env:UserInstallation=file:///tmp/lo-${SESSION_ID}-${PID}` (inherited from Phase 2 D-08) |
| Timeout (per-call) | **60s** (matches ROADMAP success criterion #3) |
| Retry on timeout / non-zero exit | **1 retry, then fail loud** |
| Post-call file checks | (a) target file exists, (b) `stat -c%s` (or `stat -f%z` macOS) > **1024 bytes**, (c) on PDF, magic bytes `%PDF` at offset 0 |
| Cleanup trap | `trap 'rm -rf "/tmp/lo-${SESSION_ID}-${PID}"' EXIT INT TERM` at top of `pptx-to-images.sh` |
| Concurrent-invocation safety | Per-PID user-instance dir already isolates state; tests verify by spawning 4 parallel invocations |

**Rationale:** 60s is the published ROADMAP target. One retry catches transient soffice startup hiccups without masking real failures. Size + magic-byte checks catch the "soffice exited 0 but produced empty file" failure mode that bit v5-blue-prestige. Cleanup trap prevents `/tmp/lo-*` accumulation.

**How to apply:** Researcher specifies the exact bash idioms (portable `stat` flag detection between Linux/macOS), planner makes it Task 1 of the soffice-hardening plan.

---

### D-06 — Markdown Report Format — TWO Reports

**Decision:** Emit **both** report styles. Use both downstream.

| Path | Style | Source |
|---|---|---|
| `<deck>.review.md` | **Fixed template** — DECK-VDA structure: §1 systemic, §3 per-slide exhaustive, §4 maturity scoreboard, §5 top-10 fixes. Deterministic. | Generated by `skills/review/scripts/render-fixed.js` from the JSON findings array. |
| `<deck>.review.narrative.md` | **LLM-generated narrative** — connective prose explaining the deck's overall design posture, dominant patterns, what's working, what's not, recommended priority order. | Authored by the agent during `/review` invocation, grounded in the JSON. |

**Rationale:** Fixed template is auditable, scriptable, regression-testable. Narrative is what humans actually read. Phase 5 auto-refine and Phase 7 distribution will consume different ones (refine prefers JSON; the narrative is the user-facing artifact).

**How to apply:**
- SKILL.md instructs: after JSON is written, render fixed template via script, then author narrative file from JSON inputs.
- Narrative MUST cite specific slides + finding IDs to stay grounded; no decorative prose.
- Tests: fixed-template renderer has unit coverage against canonical findings fixture; narrative file presence + minimum-length sanity check only (LLM output isn't byte-stable).

---

### D-07 — `scripts/pptx-to-images.sh` Placement

**Decision:** **Plugin-level `scripts/`** (shared).

**Rationale:** Phase 4 (`/create`'s render-time PPTX→PDF for the PowerPoint compatibility gate), Phase 5 (auto-refine cycle's PDF rendering), and Phase 6 (`/content-review`) will all need the same hardened conversion. Duplicating across `skills/<n>/scripts/` would mean 4 copies to keep in sync. Single source of truth wins.

**How to apply:**
- File path: `scripts/pptx-to-images.sh`
- Callers reference it via `${CLAUDE_PLUGIN_ROOT}/scripts/pptx-to-images.sh`
- Unit-tested at plugin level (`tests/pptx-to-images.test.js`) with stub fixtures + soffice-skip-guard

---

## Canonical References (read in research)

| Artifact | Path | Purpose |
|---|---|---|
| DECK-VDA methodology source | (identify in research — `~/.claude/skills/deck-design-review/SKILL.md` or successor) | Re-express in our SKILL.md (D-01) |
| Phase 1 findings schema | `skills/review/references/findings-schema.md` | Locked JSON contract |
| Phase 2 `runAnnotate` export | `skills/annotate/scripts/index.js` | Pipeline target (D-03) |
| Phase 2 sample findings fixture | `tests/fixtures/sample-findings.json` | Reuse for review-output round-trip tests |
| ROADMAP Phase 3 success criteria | `.planning/ROADMAP.md` §"Phase 3" | Acceptance bar |

---

## Code Context

- `skills/review/SKILL.md` (Phase 1 stub) → full body in this phase
- `skills/review/scripts/` will gain: `index.js` (`runReview` orchestrator), `cli.js`, `ai-tells.js` (D-02), `render-fixed.js` (D-06)
- `scripts/pptx-to-images.sh` (D-07) — plugin-level
- `tests/`: `review-adapter.test.js`, `review-runtime.test.js`, `pptx-to-images.test.js`, `ai-tells.test.js`

---

## Out of Scope (deferred)

- **ANNO-01 / RVW-01 activation tuning ≥8/10** — Phase 7 DIST-02
- **Auto-refine consumption of `/review` findings** — Phase 5
- **`/content-review` skill** — Phase 6 (independent of `/review`'s loop)
- **Reviewer-of-reviewer eval / golden-set scoring** — explicitly out of v0.1.0

---

## Open Questions for Researcher

- **Q-1:** Confirm the canonical source path for the DECK-VDA methodology (deck-design-review skill location). Read its SKILL.md, summarize the 4-pass flow + severity grammar + section ordering for re-expression in our SKILL.md.
- **Q-2:** What r18 AI-tell heuristics are deterministically detectable from PPTX XML alone (palette, line geometry, layout hashes)? Confirm pptxgenjs / unzip / xpath toolkit choice. (D-02 expects ≥3 in-code heuristics.)
- **Q-3:** Best approach for portable file-size check between Linux (`stat -c%s`) and macOS (`stat -f%z`) in `pptx-to-images.sh`? (D-05)
- **Q-4:** Is there a stable PPTX→PDF reference output to use as Tier 1 baseline for `pptx-to-images.sh` regression tests, or does Phase 3 only validate via existence + size + magic-bytes?

---

**Approved:** 2026-04-28 (user, post-7-area discussion)
