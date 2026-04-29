# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-27)

**Core value:** A user can hand Claude Code arbitrary input material and end up with a polished, design-reviewed, annotated PPTX + PDF — without having to know about pptxgenjs, custom-geometry arrows, or our deck-design-review skill — and the output quality matches what we ship by hand today.
**Current focus:** Phase 8 COMPLETE — 100% c8 coverage gate live in CI; v0.1.0 release-ready (pending human-only verifications scaffolded in RELEASE.md §1)
**Current milestone:** v0.1.0 — Plugin v0.1.0 Public Release

## Current Position

Milestone: v0.1.0 (Plugin v0.1.0 Public Release) — 8 phases (incl. Phase 8 test-coverage closure), 67+ requirements
Phase: 8 of 8 (Test Coverage to 100%) — COMPLETE (7/7 plans)
Plan: 7 of 7 in Phase 8 (08-07 complete)
Status: Phase 8 complete — c8 100% gate live in CI (lines/branches/funcs/stmts); bats wired (Gate 5b/5c apt install + run); e2e local-only via CI=true env var (CONTEXT D-08); CONTEXT D-01 reversal applied (annotate.js under standard test discipline); 878 tests / 855 pass / 0 fail / 23 skipped; v0.1.0 release readiness intact.
Last activity: 2026-04-29 — Plan 10-05 sign-off (HARD-13/HARD-14 release automation: marketplace PR + tag scripts + dry-run + 2 npm scripts; 1209 tests pass; c8 100% intact)

Progress: [██████████] 100%

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
- Plan 08-01 / 08-07 (2026-04-28): annotate.js standard test discipline (CONTEXT D-01 reversal); c8 100% lines/branches/functions/statements is now a CI hard gate (Gate 6 invokes `npm test` = `c8 --100 --check-coverage`); bats covers the 3 bash scripts (Gate 5b/5c install + run); e2e never runs in CI (FRESH-INSTALL.md remains the human v0.1.0 gate); `npm test` prefixes `CI=true` so dev hosts with soffice locally also auto-skip e2e.
- Plan 08-07 escalation (2026-04-28): On first `npm test` invocation Plan 08-07 surfaced 22 files <100% (gaps in adapter validation branches, DI hooks, render §5 group-slides, license-audit Promise body, fixture-builder catch branches). Per the plan's escalation protocol + W-7 (per-plan re-run budget), gaps were routed to Plan 08-02b which closed all of them in commit c90ce9a. Re-run of `npm test` exited 0 — Phase 8 sign-off proceeded.
- Plan 10-05 (2026-04-29): HARD-13 + HARD-14 release automation. `tools/submit-marketplace-pr.sh` (gh-CLI driven; --simulate sandbox; appends PR URL to RELEASE.md) + `tools/release-v0.1.0.sh` (10 gates + STATE flip + CHANGELOG + signed-tag-with-fallback per W-1; --dry-run + INSTADECKS_RELEASE_SIMULATE=1 short-circuits; STRICT=1 makes fresh-install non-skippable). 2 npm scripts (`release:dry-run`, `release`). 7 sandbox tests. Tag NOT pushed in this run — deferred to user authorization or Plan 10-06 E2E. Commits e5078e0 + 92c484b.
- Plan 10-04 (2026-04-29): HARD-12 fresh-install gate automated via Docker. Mac+Windows runner variants OUT OF SCOPE per SPEC §Out of Scope, deferred to v1.x; Linux automated via `tests/automation/Dockerfile.fresh-install` + `run-fresh-install.sh` + `node:test` driver gated by `(CI=true || RUN_DOCKER_TESTS=1) && hasDocker()`. Stub findings (`tests/fixtures/sample-findings.json` rebound at runtime) used to satisfy `/review` + `/content-review` standalone CLI's `--findings` requirement (LLM step is agent-mode-only). 1202 tests / 1170 pass / 0 fail / 32 skipped; 100% c8 coverage gate intact. Commits 238d05e + addf406.

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
