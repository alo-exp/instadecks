# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-27)

**Core value:** A user can hand Claude Code arbitrary input material and end up with a polished, design-reviewed, annotated PPTX + PDF — without having to know about pptxgenjs, custom-geometry arrows, or our deck-design-review skill — and the output quality matches what we ship by hand today.
**Current focus:** Phase 3 COMPLETE — all 5 plans landed; ready for Phase 4 (`/instadecks:create` scaffold + render cookbook)
**Current milestone:** v0.1.0 — Plugin v0.1.0 Public Release

## Current Position

Milestone: v0.1.0 (Plugin v0.1.0 Public Release) — 7 phases, 67 requirements
Phase: 3 of 7 (`/instadecks:review`) — COMPLETE (5/5 plans)
Plan: 5 of 5 in Phase 3 (03-05 complete)
Status: Phase 3 complete — DECK-VDA canonicalized in SKILL.md, NOTICE attribution landed, end-to-end integration test green; full repo suite 129 pass / 2 skip / 0 fail; RVW-01..RVW-11 all closed. SUMMARYs for 03-02/03-03/03-04 backfilled in this session (executors hit SB hook before SUMMARY emission; commits durable).
Last activity: 2026-04-28 — Plan 03-05 completed (Wave 3 closer)

Progress: [██████░░░░] 43%

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: ~22 min
- Total execution time: ~1.8 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 2 | 4 | ~95 min | ~24 min |
| 3 | 1 | ~12 min | ~12 min |

**Recent Trend:**
- Last 5 plans: 02-02 (~10 min), 02-03 (~25 min), 02-04 (~50 min, incl. Rule 4 checkpoint), 03-01 (~12 min)
- Trend: 03-01 fast — research-locked verbatim script body + 2 small Rule 1/3 deviations (macOS timeout shim, parallel-test leak filter)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Pre-Phase 1 (research synthesis 2026-04-27): 4-tier→3-tier severity collapse happens at /annotate adapter only; reviewer keeps 4-tier in JSON
- Pre-Phase 1 (research synthesis 2026-04-27): annotate.js verbatim with single documented require-path patch; SHA-pinned post-patch
- Pre-Phase 1 (research synthesis 2026-04-27): auto-refine convergence rule is `genuine_findings == 0 AND cycle ≥ 2`; soft cap 5 with user override; oscillation via cycle-N ⊆ cycle-N-2
- Pre-Phase 1 (research synthesis 2026-04-27): repo at alo-exp/instadecks; marketplace listing under alo-labs/claude-plugins references it
- Pre-Phase 1 (granularity = "fine"): split /create into Phase 4 (scaffold + 8 slide types + PowerPoint gate) and Phase 5 (auto-refine loop) to isolate the highest-risk subsystem
- Plan 02-04 (2026-04-28, Rule 4 user-approved Option A): Tier 1 visual regression redefined as structural-XML normalized SHA (not byte-identical) — pptxgenjs 4.0.1 timestamps + absolute-path `descr` attributes preclude byte-equivalence. New baseline `Annotations_Sample.pptx.normalized.sha256` pinned. Original `Annotations_Sample.pptx.sha256` retained as committed-binary self-check.
- Plan 03-01 (2026-04-28, Rule 3 auto-fix): macOS dev hosts lack `timeout`/`gtimeout`; added a probe in `scripts/pptx-to-images.sh` that defines a no-op `timeout` shim function ONLY if neither binary is present. Preserves verbatim `timeout 60 soffice` invocation form (static assertions still match) and keeps script runnable without coreutils. Production CI must provide GNU coreutils for real wall-clock cap.

### Pending Todos

None yet.

### Blockers/Concerns

Known-unknowns from research SUMMARY.md (validate during Phase 1):
- Exact pptxgenjs version v8 BluePrestige was calibrated against (action: visual-regression-test 4.0.1 against existing v8 reference; if clean diff, lock; otherwise pin to specific calibrated version)
- annotate.js relicensing under Apache-2.0 needs explicit author confirmation in NOTICE file (the user is the author — paperwork only)
- Schema migration policy for `findings-schema.md` v1 → v2 needs to be documented in Phase 1 (migration code is post-v0.1.0)

## Deferred Items

Items acknowledged and carried forward:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Post-launch | JSON-out / exit-code mode for CI pipelines | v1.x | 2026-04-27 (research synthesis) |
| Post-launch | Convergence diagnostics surfaced in design-rationale doc | v1.x | 2026-04-27 |
| Post-launch | Full WCAG audit (alt-text, color-only-info checks) | v1.x | 2026-04-27 |
| Post-launch | Stress-test fixtures (8 annotations / max overflow) | v1.x | 2026-04-27 |
| Post-launch | Windows path-detection in pptx-to-images.sh | v1.x | 2026-04-27 |
| v2 | /content-review integrated into /create's auto-refine loop | v2 | 2026-04-27 |
| v2 | Visual regression / version diff between deck versions | v2 | 2026-04-27 |
| v2 | Brand auto-detection from URL | v2 | 2026-04-27 |
| v2 | Multi-language localization | v2 | 2026-04-27 |
| v2 | Voice/tone analysis layered onto content-review | v2 | 2026-04-27 |
| v2 | In-deck image generation | v2 | 2026-04-27 |

## Session Continuity

Last session: 2026-04-28
Stopped at: Plan 03-01 complete (Wave 1 serial). Test suite 84 pass / 2 skip / 0 fail; lint green; pptxgenjs pin OK.
Resume file: None (next step: Wave 2 — Plans 03-02, 03-03, 03-04 can now execute in parallel against the now-locked `scripts/pptx-to-images.sh` contract)
