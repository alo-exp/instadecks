# Auto-Refine Playbook — Per-Cycle Pseudocode

> Companion to `skills/create/SKILL.md` §"Auto-Refine Loop". This file holds the full numbered cycle pseudocode (steps 1-14), the worked example, the `slidesToReview` decision tree, and the D-09 oscillation rationale. SKILL.md keeps a 1-paragraph summary plus a pointer here (progressive disclosure per plugin-dev:skill-development).

Decision sources: `.planning/phases/05-instadecks-create-auto-refine/05-CONTEXT.md` D-01..D-09. CLAUDE.md locked invariants. RESEARCH.md Pitfall 2.

Primitives invoked below ship in Plan 05-01 / 05-02:
- `appendLedger`, `readLedger`, `checkInterrupt`, `hashIssueSet`, `slidesChangedSinceLastCycle` — `skills/create/scripts/lib/loop-primitives.js`.
- `detectOscillation` — `skills/create/scripts/lib/oscillation.js`.
- `runReview` (with `slidesToReview`) — `skills/review/scripts/index.js`.
- `runCreate` — `skills/create/scripts/index.js`.
- `runAnnotate` — `skills/annotate/scripts/index.js`.

---

## Per-cycle pseudocode (steps 1-14)

```
# Cycle N (1-indexed)
1. If checkInterrupt(runDir): finalize ledger with ended_via='interrupted',
   write design-rationale.md from accumulated notes, exit. (D-04 — TOP-OF-CYCLE only.)

2. Decide review_mode for this cycle:
   - cycle == 1 → 'full'
   - cycle == 2 AND prior cycle had findings_genuine == 0 → 'full'  (D-07 confirmation)
   - else → 'diff-only'

3. Author/edit render-deck.cjs:
   - cycle 1: compose from cookbook + brief.
   - cycle 2+: edit to fix the prior cycle's genuine && severity ∈ {Critical, Major}
     findings, EXCLUDING any id present in any prior cycle's skipped_finding_ids
     (do not relitigate intentionally-skipped items).

4. Invoke runCreate({...}) → produces <runDir>/deck.pptx and snapshots
   <runDir>/cycle-${N}/render-deck.cjs.

5. Invoke pptx-to-images.sh → <runDir>/cycle-${N}/slides/slide-NN.jpg.

6. Compute slidesToReview:
   - if review_mode === 'full' → null  (full review)
   - else → slidesChangedSinceLastCycle(runDir, cycle)  (int[] from SHA diff)

7. Invoke runReview({deckPath, runId, outDir: cycleDir, mode: 'standalone',
   slidesToReview}) → cycle-${N}/findings.json.

8. Triage: read each finding alongside its slide image + the brief; for each, set:
   - id = `${slideNum}-${sha1(text).slice(0,8)}`  (stable across cycles)
   - genuine = boolean
   - triage_rationale = "1-2 sentence justification"
   Write to cycle-${N}/findings.triaged.json (see references/findings-triaged-schema.md
   in the review skill). Only `genuine && severity ∈ {Critical, Major}` flow into
   the next cycle's fix list.

9. Compute issue_set_hash = hashIssueSet(<unfixed-genuine finding objects with
   slideNum + text>).

10. Append ledger entry: appendLedger(runDir, {
      cycle, timestamp, findings_total, findings_genuine,
      findings_fixed: <count to fix in cycle N+1>,
      findings_intentionally_skipped,
      issue_set_hash,
      skipped_finding_ids: [...non-genuine ids],
      fixed_finding_ids: [...genuine-major ids],
      slides_changed, review_mode, ended_via: null
    }).

11. Read ledger; detectOscillation(ledger) → if true, append a closing entry
    with ended_via='oscillation' (JSONL is append-only — never mutate prior
    lines), surface the ledger to the user, exit.

12. Convergence check:
    - findings_genuine == 0 AND cycle >= 2 → append closing entry with
      ended_via='converged', exit loop.
    - cycle == 1 AND findings_genuine == 0 → continue to cycle 2 (forced
      confirmation per D-07).

13. Soft-cap check: if cycle >= 5 AND not converged → AskUserQuestion
    (verbatim text in SKILL.md); route per response. Standalone non-interactive
    fallback: default to ACCEPT with stderr warning.

14. Increment cycle; loop to step 1.
```

---

## Worked example — one cycle's primitive composition

Run-dir is `<runDir>` (e.g., `${CLAUDE_PLUGIN_DATA}/instadecks/<runId>/`); we are entering cycle 3 of an in-progress refine. Prior cycles 1 and 2 have ledger entries; cycle 1 returned 5 genuine findings, cycle 2 fixed 3 (kept 2 unfixed, 1 intentionally skipped):

1. **`checkInterrupt(runDir)`** → returns `false` (no `.interrupt` file). Continue.
2. **review_mode** → cycle 3 ≥ 3 and prior cycle had findings_genuine > 0, so `'diff-only'`.
3. **Edit `render-deck.cjs`** — agent reads `cycle-2/findings.triaged.json`, picks the 2 `genuine && severity ∈ {Critical, Major}` items, edits the matching slide blocks. Skipped IDs from cycle 1/2 are excluded from the fix list (anti-pattern: relitigation).
4. **`runCreate({brief, runId, outDir: runDir, mode: 'standalone', designChoices})`** → writes new `<runDir>/deck.pptx`; snapshots `<runDir>/cycle-3/render-deck.cjs`.
5. **`pptx-to-images.sh`** → emits `<runDir>/cycle-3/slides/slide-01.jpg`..`slide-NN.jpg`.
6. **`slidesChangedSinceLastCycle(runDir, 3)`** → SHA-256 byte-diff against cycle 2's `slides/`. Returns `[3, 7]` (the two slides we edited).
7. **`runReview({deckPath, runId, outDir: cycleDir, mode: 'standalone', slidesToReview: [3, 7]})`** → only slides 3 and 7 are reviewed; emits `cycle-3/findings.json` with 1 finding on slide 7.
8. **Triage** — agent reads slide-07.jpg + brief + finding text. Decides `genuine = true`, severity Major, writes `cycle-3/findings.triaged.json` with `id = "7-a1b2c3d4"`, `triage_rationale = "Action title still topic-shaped; reviewer correctly flags."`.
9. **`hashIssueSet([{slideNum: 7, text: "..."}])`** → `'sha1:e3f4...'`.
10. **`appendLedger(runDir, {cycle: 3, timestamp: '2026-04-28T...', findings_total: 1, findings_genuine: 1, findings_fixed: 1, findings_intentionally_skipped: 0, issue_set_hash: 'sha1:e3f4...', skipped_finding_ids: [], fixed_finding_ids: ['7-a1b2c3d4'], slides_changed: [3, 7], review_mode: 'diff-only', ended_via: null})`**.
11. **`detectOscillation(readLedger(runDir))`** — compares `issue_set_hash` of cycle 3 vs cycle 1 (N-2). They differ → `false`. Continue.
12. **Convergence check** — `findings_genuine == 1 ≠ 0` → continue.
13. **Soft-cap check** — cycle 3 < 5 → continue.
14. **cycle = 4**; loop.

---

## `slidesToReview` decision tree

| Cycle | Prior-cycle genuine | review_mode | `slidesToReview` |
|-------|---------------------|-------------|------------------|
| 1 | (n/a) | `full` | `null` |
| 2 | 0 (cycle-1-clean) | `full` (D-07 forced confirmation) | `null` |
| 2 | >0 | `diff-only` | `slidesChangedSinceLastCycle(runDir, 2)` |
| 3+ | (any) | `diff-only` | `slidesChangedSinceLastCycle(runDir, N)` |

`slidesChangedSinceLastCycle` returns `null` for `cycle <= 1` and a sorted `int[]` of changed slide numbers thereafter; treats a missing-prior-cycle slide (e.g., new slide added) as changed.

If a structural shift renumbers slides between cycles (Pitfall 4), the SHA diff falsely flags every slide changed → cycle is fully reviewed. Acceptable: SHA diff is a performance optimization, not a correctness requirement.

---

## D-09 oscillation rationale (verbatim from CONTEXT.md)

> **Decision (D-09):** Strict equality of `issue_set_hash` across cycle N and cycle N-2, AND `findings_genuine > 0` on cycle N. Supersedes the subset semantics described in earlier text of this document, ROADMAP SC#2, and CRT-09.
>
> ```
> detectOscillation(ledger) === true  iff
>     ledger.length >= 3
>     AND ledger[N].issue_set_hash === ledger[N-2].issue_set_hash
>     AND ledger[N].findings_genuine > 0
> ```
>
> **Rationale (from RESEARCH Pitfall 2):** The original `cycle N ⊆ cycle N-2` subset rule generates a false-positive on the steady-improvement path. When a loop is genuinely converging, cycle N's issue set is a strict subset of N-2's — and `⊆` is satisfied trivially. The detector would flag the converging run as oscillating and halt prematurely. Strict hash equality on the unfixed-genuine set captures the "agent fixed a different subset each round but the leftovers are identical" pattern that IS oscillation, without false-flagging shrinkage. The `findings_genuine > 0` guard prevents two consecutive zero-genuine cycles (the convergence path under D-07) from registering as oscillation.

The production `detectOscillation` body in `skills/create/scripts/lib/oscillation.js` implements this verbatim; `tests/oscillation.test.js` exercises (a) identical-set → true, (b) strict-subset (shrinking) → false, (c) drift → false, (d) empty-on-both → false.

---

## See also

- `skills/create/SKILL.md` §"Auto-Refine Loop" — 1-paragraph summary, locked invariants, AskUserQuestion verbatim, post-loop bundle step.
- `skills/create/scripts/lib/loop-primitives.js` — `appendLedger`, `readLedger`, `checkInterrupt`, `hashIssueSet`, `slidesChangedSinceLastCycle`.
- `skills/create/scripts/lib/oscillation.js` — `detectOscillation` (D-09).
- `skills/review/references/findings-triaged-schema.md` — `findings.triaged.json` shape (id, genuine, triage_rationale).
- `.planning/phases/05-instadecks-create-auto-refine/05-CONTEXT.md` — D-01..D-09 source of truth.
