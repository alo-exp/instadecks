---
phase: 05
slug: instadecks-create-auto-refine
status: draft
created: 2026-04-28
inherits_from: [01-CONTEXT.md, 02-CONTEXT.md, 03-CONTEXT.md, 04-CONTEXT.md]
---

# Phase 05 — `/instadecks:create` Auto-Refine Loop — CONTEXT.md

> Implementation decisions for downstream researcher and planner. Decisions inherited from prior phases are not restated.

---

## Goal Recap (from ROADMAP)

Add the auto-refine loop on top of Phase 4's `runCreate`. Each cycle: render deck (via `runCreate`) → image-ize via `pptx-to-images.sh` → review via `runReview` → triage findings (genuine vs non-genuine) → fix genuines → repeat. Converge on `genuine_findings == 0 AND cycle ≥ 2` (cycle 1 with zero forces one confirmation cycle). Detect oscillation (cycle N's set ⊆ cycle N-2's). Soft-cap at 5 with user override (continue / accept / specify). User-interruptible via `.interrupt` flag. Persist per-cycle issue ledger. Default-pipeline produces full artifact bundle (deck + PDF + design-rationale + findings JSON + annotated PPTX + annotated PDF). Requirements CRT-07..CRT-14.

---

## Inherited Locked Decisions (no re-discussion)

- **Convergence rule** (PROJECT.md / CLAUDE.md): `genuine_findings == 0 AND cycle ≥ 2`
- **Confirmation cycle**: cycle 1 returning 0 forces one full re-render+re-image+re-review cycle
- **Oscillation rule**: cycle N's issue set ⊆ cycle N-2's set → stop, surface ledger, ask user
- **Soft cap**: cycle 5 surfaces "continue / accept / specify what to fix"; no hardcoded hard cap
- **User interrupt**: `.planning/instadecks/<run-id>/.interrupt` flag file; checked at top of each cycle
- **`runCreate` (Phase 4 D-08)** + **`runReview` (Phase 3 D-04)** + **`runAnnotate` (Phase 2 D-08)** are the cycle building blocks — no restructuring
- **Run dir**: `.planning/instadecks/<run-id>/` already canonical
- **Content-vs-design boundary hard** (CLAUDE.md) — Phase 5 only consumes `/review` (design); `/content-review` is NOT integrated into the loop in v1 (PROJECT.md out-of-scope)

---

## Phase 5 Gray-Area Decisions

### D-01 — Loop Owner: Agent vs Script

**Decision:** **AGENT-OWNED loop** (per research SUMMARY.md).

The auto-refine loop lives in `skills/create/SKILL.md` as a numbered playbook (`while genuine > 0 OR cycle == 1: …`). Each cycle's "is this finding genuine?" triage is a judgment call → LLM territory. Code provides primitives (`runCreate`, `runReview`, `runAnnotate`, `appendLedger`, `checkInterrupt`, `detectOscillation`) but does NOT own the control flow.

**Rationale:** Per finding triage requires reading the screenshot + the finding text + the brief, deciding "genuine defect or stylistic over-flag?" — the same judgment a human would make. A pure-code loop would mis-fix or thrash. Matches Phase 3 D-02 hybrid pattern (judgment in prompt, determinism in code).

**How to apply:**
- `skills/create/SKILL.md` Section: `## Auto-Refine Loop` with explicit cycle pseudocode the agent executes step-by-step.
- `skills/create/scripts/lib/loop-primitives.js` — exports `appendLedger(runDir, entry)`, `readLedger(runDir)`, `checkInterrupt(runDir)`, `detectOscillation(ledger)`, `slidesChangedSinceLastCycle(runDir, cycle)`.
- Agent calls primitives between renders; primitives are stateless except for ledger I/O.

---

### D-02 — Issue Ledger Schema

**Decision:** Append-only JSONL at `<run-dir>/refine-ledger.jsonl`.

Each cycle appends one line:

```json
{
  "cycle": 1,
  "timestamp": "2026-04-28T12:34:56Z",
  "findings_total": 14,
  "findings_genuine": 9,
  "findings_fixed": 9,
  "findings_intentionally_skipped": 5,
  "issue_set_hash": "sha1:...",
  "skipped_finding_ids": ["F-04", "F-09", "F-11", "F-13", "F-14"],
  "fixed_finding_ids": ["F-01","F-02","F-03","F-05","F-06","F-07","F-08","F-10","F-12"],
  "slides_changed": [3, 7, 9],
  "review_mode": "full" | "diff-only",
  "ended_via": null | "converged" | "oscillation" | "soft-cap" | "interrupted"
}
```

`issue_set_hash` is a SHA-1 of sorted (slide_idx + finding_text) for the genuine-finding set — enables fast oscillation detection (cycle N hash ⊆ cycle N-2 set means subset).

**Rationale:** JSONL is append-safe across crashes; per-cycle line is small; `issue_set_hash` makes oscillation detection an O(1) operation per cycle. Stored alongside other run-dir artifacts; survives plugin updates.

**How to apply:**
- `skills/create/scripts/lib/loop-primitives.js` exports `appendLedger`/`readLedger` with this schema.
- `skills/create/scripts/lib/oscillation.js` — `detectOscillation(ledger)` returns `true` if cycle N's `skipped_finding_ids ∪ findings_fixed_ids ⊆ cycle N-2`'s union.
- Schema validated by `tests/refine-ledger-schema.test.js`.

---

### D-03 — Diff-Only Review After Cycle 1

**Decision:** **Slide-image diff via SHA comparison.**

After cycle 1, the loop compares each slide's freshly-rendered image (`<run-dir>/cycle-N/slides/slide-XX.jpg`) byte-SHA against cycle N-1's. Slides whose SHA matches the prior cycle are SKIPPED in the next review pass — they're textually unchanged. Reviewer (`runReview`) accepts a `slidesToReview: int[]` filter param (added to Phase 3 API).

**Rationale:** Slide images at 150 DPI are deterministic for unchanged content; SHA equality is a reliable "did this slide change?" signal. Avoids costly re-review of untouched slides (cycle 2+ typically only changes 2-4 slides). Cheap, robust, works even when render-deck.cjs is rewritten between cycles.

**How to apply:**
- `runReview` extends signature: `runReview({deckPath, runId, outDir, mode, slidesToReview})` — `slidesToReview` defaults to "all"; when set, reviewer only emits findings for those slide indices. (NON-BREAKING: existing callers pass nothing.)
- `lib/loop-primitives.js` `slidesChangedSinceLastCycle(runDir, cycle)` returns `int[]` of changed slide indices via SHA diff.
- Cycle 1 always passes `slidesToReview = "all"` (no diff baseline yet).
- The "confirmation cycle" (cycle 2 after cycle 1 returned 0) is `review_mode = "full"` (not diff-only) — re-renders + re-images and reviews everything.

---

### D-04 — User Interrupt Mechanics

**Decision:** **Top-of-cycle check only.**

The agent's loop pseudocode begins each cycle with: `if checkInterrupt(runDir) → break`. `checkInterrupt` returns `true` iff `<run-dir>/.interrupt` exists. On interrupt: ledger appended with `ended_via: "interrupted"`, design-rationale doc updated with the partial state, current artifacts (whatever rendered last) returned. No mid-cycle abort — once a cycle starts (render → image → review → fix), it runs to completion, THEN the interrupt is honored.

**Rationale:** Mid-cycle abort produces partial files (e.g., half-rendered PPTX). Top-of-cycle keeps every artifact whole. The "next cycle" boundary is the natural commit point.

**How to apply:**
- `lib/loop-primitives.js` exports `checkInterrupt(runDir): boolean`.
- SKILL.md Auto-Refine Loop step 1 of each cycle: "Check `${runDir}/.interrupt` — if present, finalize ledger, write rationale, exit."

---

### D-05 — Soft-Cap UX (cycle 5)

**Decision:** **AskUserQuestion with 3 options + free-text 4th.**

When cycle 5 completes without convergence, the agent calls AskUserQuestion:

> "5 refine cycles complete; still {N} genuine findings. Choose:"
> A. Continue refining (one more cycle)
> B. Accept current deck as final
> C. Specify exactly what to fix (free-text)
> D. Stop and let me review the ledger

A → continue from cycle 6 (no new cap; user can re-prompt at any cycle).
B → mark as `ended_via: "soft-cap-accepted"`, finalize artifacts.
C → user types issues; agent treats those as the next cycle's fix list and ignores reviewer findings for that one cycle (user override).
D → mark as `ended_via: "soft-cap-stopped"`, surface ledger path, exit.

**Rationale:** "No hardcoded cap" (PROJECT.md) is preserved — the user, not the loop, decides. Free-text option lets the user inject judgment when reviewer drifts. Always-asking past 5 prevents quiet token burn.

**How to apply:**
- SKILL.md Auto-Refine Loop step 6 (post-cycle): "If `cycle >= 5 AND not converged`, AskUserQuestion as above; route per response."
- Standalone-mode runs (no agent) past cycle 5 default to "B" (accept) with a printed warning.

---

### D-06 — Default-Pipeline Output Bundle

**Decision:** **Full bundle on every run.**

By default, the auto-refine loop emits ALL of:
1. `<run-dir>/deck.pptx` — final deck (post-convergence)
2. `<run-dir>/deck.pdf` — final PDF
3. `<run-dir>/design-rationale.md` — including non-genuine-skipped findings (Phase 4 Reviewer-Notes section now populated)
4. `<run-dir>/findings.json` — final cycle's reviewer JSON
5. `<run-dir>/deck.annotated.pptx` — annotated overlay (via `runAnnotate` on final findings)
6. `<run-dir>/deck.annotated.pdf` — PDF of annotated overlay
7. `<run-dir>/refine-ledger.jsonl` — full cycle history
8. `<run-dir>/render-deck.cjs` — last-cycle's render script (for reproducibility)

Annotation step uses non-zero findings if any remain (e.g., post-soft-cap-accept) OR final-cycle non-genuine findings (so the user sees what was deliberately skipped).

**Rationale:** ROADMAP SC#5 explicitly says "deck + PDF + design-rationale + JSON findings + annotated PPTX + annotated PDF as a single artifact bundle." This is the contract. Annotated artifacts are valuable even on clean convergence — they show the design-review history.

**How to apply:**
- SKILL.md Auto-Refine Loop step 7 (post-loop): "Always invoke `runAnnotate({deckPath: deck.pptx, findings: <appropriate>, outDir: runDir, runId})`."
- "Appropriate" findings selection logic in SKILL.md: prefer the last cycle's full findings set (genuine + non-genuine) so the overlay shows the deck's review heritage. Empty findings → no annotated artifacts (skip cleanly).

---

### D-07 — Confirmation-Cycle Mechanics

**Decision:** **Full re-render + re-image + full review** (NOT diff-only).

When cycle 1 returns 0 genuine findings, the loop enters cycle 2 (the confirmation cycle) with:
- Re-execute `render-deck.cjs` (same script, may produce identical output — that's fine)
- Re-image via `pptx-to-images.sh` (fresh JPGs)
- Full review (`slidesToReview = "all"`)

If cycle 2 also returns 0 genuine, convergence achieved. If cycle 2 returns N>0, normal loop resumes.

**Rationale:** A clean cycle 1 is suspicious — usually means reviewer was lenient or render had no defects to find. Forcing the deterministic re-render + re-image + re-review on the same brief flushes out flakiness. Diff-only on the confirmation cycle would skip everything (no slides changed) and provide no real verification.

**How to apply:**
- SKILL.md Auto-Refine Loop step 2 (per cycle): "If cycle == 2 AND prior cycle had 0 genuine findings, force `review_mode = full` regardless of diff."

---

### D-08 — Genuine vs Non-Genuine Triage Mechanics

**Decision:** **Per-finding `genuine` boolean is set by the AGENT during the cycle, NOT by `/review`.**

`/review` (Phase 3) emits findings with severity but no `genuine` flag — that's a judgment field. In the auto-refine loop, the agent reads each finding alongside the relevant slide image and the brief, then sets `genuine = true | false` and writes back to `<run-dir>/cycle-N/findings.triaged.json`. Only `genuine && severity ∈ {Critical, Major}` findings drive fixes; `Minor / Nitpick` are noted in design-rationale but don't trigger re-render.

**Rationale:** `/review` is correctly content-blind to context — it flags "low contrast" without knowing if the user wants a high-energy palette. Triage is the agent's job. Severity gating prevents endless polish.

**How to apply:**
- `findings-schema.md` (Phase 1 contract) — clarifies `genuine` is set during triage, not during review. Add note; no breaking change.
- SKILL.md Auto-Refine Loop step 4 (per cycle): "Read each finding + slide image, decide genuine/non-genuine, write `findings.triaged.json`. Only `genuine && severity ∈ {Critical, Major}` flow into fix list."

---

## Canonical References (read in research)

| Artifact | Path | Purpose |
|---|---|---|
| Phase 4 `runCreate` | `skills/create/scripts/index.js` | Cycle building block (D-01) |
| Phase 3 `runReview` | `skills/review/scripts/index.js` | Cycle building block; needs `slidesToReview` param (D-03) |
| Phase 2 `runAnnotate` | `skills/annotate/scripts/index.js` | Final-bundle step (D-06) |
| Phase 1 findings-schema | `skills/review/references/findings-schema.md` | Triage column clarification (D-08) |
| Phase 4 design-rationale renderer | `skills/create/scripts/lib/render-rationale.js` | Reviewer-Notes section now populated (D-06) |

---

## Code Context

- `skills/create/SKILL.md` — Auto-Refine Loop section appended (Phase 4 body remains, loop is additive)
- `skills/create/scripts/lib/`: NEW `loop-primitives.js`, `oscillation.js`; modified `render-rationale.js` (populate Reviewer-Notes from ledger)
- `skills/review/scripts/index.js` — `runReview` extended with `slidesToReview` param (NON-BREAKING)
- `tests/`: `refine-ledger-schema.test.js`, `oscillation.test.js`, `loop-primitives.test.js`, `auto-refine-integration.test.js` (mocked review/annotate)

---

## Out of Scope (deferred)

- **`/content-review` in the loop** — explicitly v2 per PROJECT.md
- **Activation rate ≥8/10 tuning** — Phase 7 DIST-02
- **Post-launch convergence diagnostics** — v1.x deferred (research SUMMARY)
- **Multi-deck batch refine** — not in v0.1.0

---

## Open Questions for Researcher

- **Q-1:** `runReview` `slidesToReview` param — confirm it's a small additive change to Phase 3's reviewer (filter findings by slide index); estimate LOC and check it doesn't touch JSON schema.
- **Q-2:** SHA comparison for slide-image diff — JPG byte-SHA may vary across `pdftoppm` runs even on identical input due to compression metadata. Validate empirically; if unreliable, fall back to perceptual hash or PNG conversion.
- **Q-3:** Auto-refine integration test strategy — fully integrating render+image+review per cycle is heavyweight (60s+ per cycle in CI). Recommend: mock `runReview` to return a deterministic findings sequence per cycle and assert loop primitives + ledger correctness (NOT end-to-end soffice). Confirm this scopes properly to the must-haves.
- **Q-4:** `findings.triaged.json` location — confirm `<run-dir>/cycle-N/findings.triaged.json` per cycle (vs `<run-dir>/cycle-N/findings.json` for raw reviewer output). Two files per cycle is the cleanest split.
- **Q-5:** Soft-cap interactive AskUserQuestion in standalone-mode (no agent) — what's the fallback? Default to "B accept" with a printed warning is the proposal in D-05; confirm acceptable for CI runs.

---

**Approved:** 2026-04-28 (autonomous mode per user directive)
