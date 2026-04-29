---
phase: 09
plan: 09-06
subsystem: live-e2e-varied-inputs
tags: [e2e, brief-polymorphism, design-variety, harness]
status: partial — harness landed; live-rounds checkpoint pending
requires: [09-01, 09-02, 09-03, 09-04, 09-05]
provides: [varied-input-e2e-harness, visual-diversity-gate, output-contract-doc]
affects: [skills/create/SKILL.md]
key-files:
  created:
    - tests/e2e/varied-inputs/v1-structured-json.test.js
    - tests/e2e/varied-inputs/v2-markdown-narrative.test.js
    - tests/e2e/varied-inputs/v3-raw-transcript.test.js
    - tests/e2e/varied-inputs/v4-one-line-ask.test.js
    - tests/e2e/varied-inputs/v5-research-paper.test.js
    - tests/e2e/varied-inputs/v6-photo-captions.test.js
    - tests/e2e/visual-diversity.test.js
    - tests/e2e/varied-inputs/fixtures/v1-brief.json
    - tests/e2e/varied-inputs/fixtures/v2-brief.md
    - tests/e2e/varied-inputs/fixtures/v3-transcript.txt
    - tests/e2e/varied-inputs/fixtures/v4-ask.txt
    - tests/e2e/varied-inputs/fixtures/v5-paper.md
    - tests/e2e/varied-inputs/fixtures/v6-captions.md
  modified:
    - skills/create/SKILL.md
decisions: []
metrics:
  duration: ~25 min
  completed: 2026-04-29 (partial)
requirements: [DV-10 (harness), DV-12]
---

# Phase 9 Plan 09-06: Live E2E Varied Inputs — Summary

## One-liner

Harness for 6 brief-shape E2E rounds + cross-deck design-DNA diversity gate landed; DV-12 (100% c8 coverage / 1012 tests, 0 fail) preserved. Live agent-mode rounds (Part 2 of expanded scope) BLOCKED — see Deviations.

## What was built

**Tasks 1 & 2 (literal plan): COMPLETE**

- 6 fixture files matching brief shapes: V1 structured-json, V2 markdown-narrative,
  V3 raw-transcript (≥40 turns), V4 one-line-ask (single sentence), V5 research-paper
  (academic abstract + Methods/Results + 2 markdown tables), V6 photo-captions
  (5 numbered sections with placeholder images + captions).
- 6 E2E test files (`tests/e2e/varied-inputs/v{1..6}-*.test.js`) each driving
  `/instadecks:create → /instadecks:review → /instadecks:annotate` via existing
  CLI entry points. Each gates on `CI === 'true'` (CONTEXT D-08), uses
  `--run-id e2e-v<N>-<ts>`, and asserts `deck.pptx`, `design-rationale.md`,
  `findings.json`, `annotated.pptx` artifacts exist post-pipeline.
- `tests/e2e/visual-diversity.test.js`: discovers most-recent V1..V6 runs by
  run-id pattern, parses each run's `design-rationale.md` for the rolled
  `(palette, typography, motif)` triple, asserts `Set.size === 6` (all 6
  distinct). Handles BOTH the SKILL-shorthand format (`Palette: <name>` line)
  AND the section-heading format produced by `lib/render-rationale.js`
  (`## Palette` heading + `- Chosen: <name>` line).
- `skills/create/SKILL.md`: appended new H2 `## Output contract for varied
  input shapes` documenting the artifact set produced by every input shape +
  required `Palette: <name>` / `Typography: <name>` / `Motif: <name>`
  shorthand lines so downstream regex tooling can extract DNA without
  parsing markdown sections.

**Task 3 (checkpoint:human-verify): INCOMPLETE — see Deviations.**

## Verification evidence

```
$ CI=true npm test
ℹ tests 1012
ℹ pass 981
ℹ fail 0
ℹ skipped 31  (e2e + soffice-gated under CI=true; expected)
c8: 100% lines / 100% branches / 100% functions / 100% statements
```

Plan automated verifies for both Task 1 and Task 2 PASS:
- `Task1 OK` — 6 test files + 6 fixtures + CI-gating + `--run-id` flag confirmed
- `Task2 OK` — visual-diversity test contains design-rationale read + CI gate
  + DNA triple regex; SKILL.md contains `Output contract for varied input shapes`
  + `Palette: <name>`, `Typography: <name>`, `Motif: <name>` literal lines

## Deviations from Plan

### Rule 4 — Architectural blocker on expanded-scope Part 2

**Found during:** Task 3 (checkpoint).
**Issue:** The execute-plan context expands Plan 09-06's literal scope. The
expansion calls for:
1. **Part 2** — 6 LIVE agent-mode rounds (V1..V6) where each round dispatches
   a "separate gsd-executor subagent" that drives the full Phase 5
   auto-refine loop (cycle 1..N until converged | oscillation | soft-cap)
   and returns plugin-defects + convergence stats.
2. **Part 3** — iterate Part 2 until 2 consecutive clean rounds.

This expansion requires a Task/Agent dispatch tool to spawn subagents.
**This executor has no such tool available** — the present environment
exposes only `Read`, `Write`, `Edit`, and `Bash`. No `Task`,
`mcp__claude-in-chrome__*`-style sub-execution, no `gsd-sdk` CLI
(`command not found`), and no way to spawn nested Claude Code sessions
that author `render-deck.cjs` per round.

A secondary blocker: even sequential live rounds driven by this executor
would not exercise the test pipeline as written, because `runCreate`
requires an **agent-authored `render-deck.cjs`** in the run-dir before it
spawns the deck-rendering child process (see `skills/create/scripts/index.js`
line 238–252). The harness tests as authored will fail on a fresh run with
"render-deck.cjs not found" unless an agent (or pre-staged fixture) writes
that file. This is by design — the cookbook + design-DNA picker live in the
agent's prose loop, not in deterministic code.

**Action taken:**
- Stopped per Rule 4 — architectural decision required.
- Tasks 1 + 2 (the harness deliverables, which DO satisfy the literal plan
  scope and DV-12) committed. Coverage gate green.
- Surface this blocker as a checkpoint so the user can route Part 2 through
  the appropriate execution surface (interactive Claude Code session with
  agent-driven render-deck.cjs authoring; or an orchestrator with subagent
  dispatch).

**Why this is a Rule 4 (architectural) and not a Rule 3 (auto-fix):**
- Spawning subagents is not a tool-use gap that can be patched in code.
- Authoring 6 × N-cycle render-deck.cjs files requires the design-DNA
  picker prose loop in SKILL.md, which is the agent's responsibility, not
  a deterministic script.

### Rule 1 — Diversity-test regex format mismatch

**Found during:** Task 2 authoring.
**Issue:** The plan's example diversity-test regex `/Palette:\s*([^\n]+)/`
does not match the actual `design-rationale.md` format emitted by
`skills/create/scripts/lib/render-rationale.js`, which uses
`## Palette\n- Chosen: <name> (hex, hex, hex)` markdown sections.
**Fix:** Implemented `extractPalette` / `extractTypography` / `extractMotif`
helpers in `tests/e2e/visual-diversity.test.js` that try the
shorthand-line format first (so the SKILL.md output-contract is honoured
verbatim if the agent emits it) and fall back to parsing the section
headings (so the existing render-rationale output also works).
**Files modified:** tests/e2e/visual-diversity.test.js
**Commit:** d96261b

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, no new auth paths, no schema changes
at trust boundaries. Test files only spawn local Node processes.

## Self-Check

**Files claimed:**
- tests/e2e/varied-inputs/v1-structured-json.test.js — FOUND
- tests/e2e/varied-inputs/v2-markdown-narrative.test.js — FOUND
- tests/e2e/varied-inputs/v3-raw-transcript.test.js — FOUND
- tests/e2e/varied-inputs/v4-one-line-ask.test.js — FOUND
- tests/e2e/varied-inputs/v5-research-paper.test.js — FOUND
- tests/e2e/varied-inputs/v6-photo-captions.test.js — FOUND
- tests/e2e/visual-diversity.test.js — FOUND
- tests/e2e/varied-inputs/fixtures/v{1..6}-*.{json,md,txt} — ALL FOUND
- skills/create/SKILL.md (modified) — VERIFIED contains 'Output contract for varied input shapes'

**Commits claimed:**
- 557dd79 — FOUND (Task 1)
- d96261b — FOUND (Task 2)

## Self-Check: PASSED

## Outstanding work for sign-off

DV-10 (≥80% pairwise visual diversity) and DV-11 (2 consecutive clean
live E2E rounds) require the live-rounds execution that is currently
blocked. Two routes forward, listed in order of recommendation:

1. **Interactive Claude Code session.** Drive V1..V6 manually in a
   Claude Code session with the agent authoring `render-deck.cjs` per
   round per the SKILL.md design-DNA picker (Plan 09-03). The harness
   tests then pass / fail deterministically. After 2 consecutive clean
   rounds, return here and mark DV-10/DV-11 sign-off.
2. **Orchestrator with subagent dispatch.** Re-spawn this plan from an
   environment with a Task/Agent tool exposed (the `gsd-execute-phase`
   orchestrator referenced in this executor's role-prompt) so the
   parallel V1..V6 rounds + iteration loop execute as the
   user-clarification specifies.
