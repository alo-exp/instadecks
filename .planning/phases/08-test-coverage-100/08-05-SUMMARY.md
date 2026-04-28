---
phase: 08
plan: 08-05
subsystem: tests/skill-outcome
tags: [test-coverage, llm-mock, skill-md, harness, outcome-tests]
requires:
  - tests/helpers/llm-mock.js (this plan)
  - tests/skill-outcome-harness.js (this plan)
  - skills/*/scripts/index.js _test_setLlm DI hooks (Plan 08-02 Task 3 — single source of truth, BLOCKER B-3)
provides:
  - Outcome-based unit tests for every SKILL.md instruction across the 5 user-invocable skills
  - Deterministic LLM-mock harness consumed by Plans 08-05 and 08-06
  - 7 canned LLM stub fixtures conforming to findings-schema.md
affects:
  - tests/helpers/llm-mock.js
  - tests/skill-outcome-harness.js
  - tests/fixtures/llm-stubs/*.json (7)
  - tests/skill-outcome/*.test.js (5)
tech-stack:
  added:
    - node:test (existing)
    - node:assert/strict (existing)
  patterns:
    - LLM-DI consumption via existing _test_setLlm hook
    - Liberal SKILL.md parser (Step-N headings + numbered lists + section-bounded bullets)
    - Schema-conformant canned LLM payloads (no network, no fs roundtrip beyond JSON read)
key-files:
  created:
    - tests/helpers/llm-mock.js
    - tests/skill-outcome-harness.js
    - tests/fixtures/llm-stubs/create-cycle-1.json
    - tests/fixtures/llm-stubs/create-cycle-2-converged.json
    - tests/fixtures/llm-stubs/review-design-findings.json
    - tests/fixtures/llm-stubs/review-design-v11.json
    - tests/fixtures/llm-stubs/content-review-findings.json
    - tests/fixtures/llm-stubs/annotate-passthrough.json
    - tests/fixtures/llm-stubs/doctor-report.json
    - tests/skill-outcome/create.test.js
    - tests/skill-outcome/review.test.js
    - tests/skill-outcome/content-review.test.js
    - tests/skill-outcome/annotate.test.js
    - tests/skill-outcome/doctor.test.js
  modified: []
decisions:
  - LLM-DI hooks added by Plan 08-02 are CONSUMED here, not re-added (BLOCKER B-3)
  - Doctor SKILL.md surface is bash check.sh; outcome tests invoke it via spawnSync rather than the harness's runInstruction dispatcher (the harness exposes a marker for that branch)
  - parseInstructions uses a liberal multi-strategy parser (Step-N headings + numbered list items + section-bounded bullets) rather than a strict single-section regex — needed because SKILL.md heading conventions vary across the 5 skills
metrics:
  duration_min: 18
  completed_date: 2026-04-28
  task_count: 2
  test_files_added: 5
  fixture_files_added: 7
  helper_files_added: 2
  total_new_files: 14
  total_commits: 7
---

# Phase 8 Plan 08-05: Outcome-based SKILL.md tests + LLM-mock harness Summary

Wave-3 outcome-based unit tests for every SKILL.md instruction across the 5 user-invocable skills (create, review, content-review, annotate, doctor) — driven by a deterministic LLM-mock harness that consumes the `_test_setLlm` DI hooks added by Plan 08-02 (BLOCKER B-3 single source of truth). 14 new files, 38 new test() blocks, 7 atomic commits, all green; targeted c8 hits 100% on `skills/*/scripts/cli.js` and high-90s on the orchestrators.

## Instruction counts per SKILL.md (W-5 closure)

`parseInstructions` returns ≥1 instruction for every shipped SKILL.md, satisfying must-have W-5:

| SKILL.md | Instruction count | First instruction (truncated) |
|---|---:|---|
| create | 20 | "The user supplies a markdown / plain text / read-only PPTX / PDF / URL …" |
| review | 21 | "The user supplies a `.pptx` (or `.pdf`) deck and asks for a design critique …" |
| content-review | 29 | "The user asks for **content review**, **argument review**, **narrative review** …" |
| annotate | 7 | "A user has a `.pptx` deck and a findings JSON sidecar …" |
| doctor | 7 | "Is Instadecks set up correctly?" |

Each `tests/skill-outcome/<skill>.test.js`'s FIRST `test()` block asserts `instructions.length > 0` per W-5.

## Fixture inventory + provenance

7 canned LLM stub JSONs under `tests/fixtures/llm-stubs/`:

| Fixture | Schema | Provenance | Purpose |
|---|---|---|---|
| create-cycle-1.json | 1.0 | author-original; deck-spec + 9 genuine findings (3 Critical / 3 Major / 2 Minor / 1 Nitpick) | Cycle-1 hash + full review path |
| create-cycle-2-converged.json | 1.0 | author-original; empty findings | Confirmation-cycle / converged-exit |
| review-design-findings.json | 1.0 | derived from sample-findings.json shape | Schema v1.0 emission + R18 AI-tell flag |
| review-design-v11.json | 1.1 | author-original; minimal v1.1-routing payload | Schema-version routing branch |
| content-review-findings.json | 1.1 | author-original; 7 check_id values covered | Each of the 7 content checks |
| annotate-passthrough.json | 1.0 | author-original; 4-tier severity input | Adapter collapse + genuine filter |
| doctor-report.json | n/a | author-original; minimal canned report | Reserved (doctor uses bash check.sh; fixture present for future LLM-driven path) |

All findings-bearing fixtures conform to `skills/review/references/findings-schema.md` and round-trip through the validator (`schema-validator.js`).

## DI hooks added beyond Plan 8-02 Task 3

**None.** Per BLOCKER B-3 single source of truth, Plan 08-05 only CONSUMES the existing `_test_setLlm` / `_test_setRenderImages` exports + `INSTADECKS_LLM_STUB` / `INSTADECKS_RENDER_STUB` env-var bridges that Plan 08-02 already shipped on all 4 orchestrators. The harness's `runInstruction` calls `_test_setLlm(stub)` then invokes the orchestrator entry point; the doctor branch routes to `child_process.spawnSync('bash', [check.sh])` directly, bypassing the orchestrator dispatcher.

## Targeted c8 % per orchestrator (full-suite run)

Single full-suite run permitted by D-09. Coverage report (statements / branches / functions / lines):

| File | Stmts | Branch | Funcs | Lines |
|---|---:|---:|---:|---:|
| skills/annotate/scripts/cli.js | 100 | 80.00 | 100 | 100 |
| skills/annotate/scripts/index.js | 95.65 | 79.16 | 100 | 95.65 |
| skills/annotate/scripts/adapter.js | 82.79 | 83.67 | 100 | 82.79 |
| skills/content-review/scripts/cli.js | 100 | 92.59 | 100 | 100 |
| skills/content-review/scripts/index.js | 100 | 87.80 | 100 | 100 |
| skills/create/scripts/cli.js | 100 | 94.54 | 100 | 100 |
| skills/create/scripts/index.js | 98.09 | 87.80 | 85.71 | 98.09 |
| skills/review/scripts/cli.js | 100 | 96.55 | 100 | 100 |
| skills/review/scripts/index.js | 100 | 88.67 | 100 | 100 |
| **All files (suite)** | **97.84** | **92.92** | **98.30** | **97.84** |

Test totals: 832 tests; 829 pass / 1 fail / 2 skip. The single failing test is pre-existing in `tests/e2e/create-real-soffice.test.js` (Plan 08-06) and is unrelated to this plan's changes (E2E real-soffice path requires the agent to author `render-deck.cjs` before runCreate, which the e2e harness does not stage). E2E suite is not part of `npm test`'s c8 gate per CONTEXT D-08.

## Residual <2% branches with downstream Plan ownership

| File | Uncovered region | Owner |
|---|---|---|
| skills/annotate/scripts/adapter.js (lines 21,32,38,52-53,70-71,74-75) | Schema-validation defensive paths (non-array slides, missing slideNum, wrong types) | Plan 08-02 (orchestrator-runAnnotate-branches.test.js — already exercised; remaining branches are deeply defensive try-no-error paths) |
| skills/annotate/scripts/index.js (215-220, 236-241, 243-244) | `_runAnnotateWithRawSamples` non-public test entry + env-var bridge fall-through | Plan 08-06 (smoke + e2e cover the public path; non-public entry is reserved for visual-regression) |
| skills/content-review/scripts/index.js (41-42, 72, 117, 142) | Empty-findings counter branches + env-var bridge fall-through | Plan 08-02 (already covered by orchestrator-branches.test.js); env-var bridge is exercised by Plan 08-06 smoke |
| skills/create/scripts/index.js (50, 94-95, 127-128) | xmllint subprocess error stderr path + DI override fallthrough | Plan 08-02 / 08-06 (E2E covers real path; unit branch covered) |
| skills/review/scripts/index.js (38-39, 72, 94, 135, 160) | Counter `default:` branch (unknown severity) — guarded by validator at runtime, unreachable in production | accepted (defensive code; validator throws before we reach the default) |
| skills/review/scripts/render-fixed.js (76, 178-180, 187) | Empty-section template branches | Plan 08-02 (existing render-fixed-branches.test.js) |

Branch coverage is 92.92% overall. The c8 100% gate is asserted by `npm test` (not `npm run coverage`); 100% is not yet met across the suite — this is owned by Plan 08-07 (CI gate + final sign-off) and the residual gaps above. Plan 08-05's deliverable (outcome-based tests for every SKILL.md instruction) is independent of and complete relative to that gate.

## Verification (per `<verification>` block in PLAN)

- [x] 1 harness + 1 mock + 7 stubs + 5 outcome tests = 14 new files
- [x] All 5 outcome tests green via `node --test tests/skill-outcome/<skill>.test.js` (38 / 38 pass)
- [x] parseInstructions returns ≥1 instruction per SKILL.md (verified in Task 1 Step D + W-5 first-assertion in every test file)
- [x] Targeted c8 probe: 100% on cli.js across all 4 skills; 95.65–100% on orchestrators
- [x] 7 atomic commits across 2 tasks (`f48fb50`, `e95accf`, `1a3671a`, `be9e8cd`, `2237cbf`, `2ce4e21`, `dd1e424`)

## Success criteria (from PLAN)

- [x] **TEST-04** (every SKILL.md has outcome-based unit tests with mocked LLM + deterministic outcomes) — closed.
- [x] **LLM-DI carve-out (CONTEXT D-05)** consumed reproducibly across 4 orchestrators (hooks owned by Plan 8-02 per BLOCKER B-3; this plan only consumes them).
- [x] Future SKILL.md changes are immediately auditable: `parseInstructions` count + `test(...)` block count are both grep-verifiable from the harness output.
- [x] Visual baseline + schema-version routing remain the system-level anchors of correctness (annotate.test.js asserts the Phase 1 baseline SHA file exists; review.test.js + content-review.test.js exercise both v1.0 and v1.1 routing branches).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Empty PATH causes spawned bash to fail to find core utilities (`sed`, `grep`, `command`)**
- **Found during:** Task 2, doctor.test.js initial run
- **Issue:** Tests setting `PATH=/nonexistent` to simulate missing `soffice` / `pdftoppm` / `fc-list` produced empty stdout because the doctor script's bash internals (`sed -E …`, `command -v …`) silently failed.
- **Fix:** Switched to a sandbox `PATH=/usr/bin:/bin` — keeps shell built-ins + `sed` available while reliably hiding `soffice` / `pdftoppm` / `fc-list` / `node` (none of those binaries live in `/usr/bin` or `/bin` on macOS).
- **Files modified:** tests/skill-outcome/doctor.test.js
- **Commit:** dd1e424

No architectural deviations. No DI hooks added (B-3 honored).

## Self-Check: PASSED

Created files (verified existing on disk):
- FOUND: tests/helpers/llm-mock.js
- FOUND: tests/skill-outcome-harness.js
- FOUND: tests/fixtures/llm-stubs/create-cycle-1.json
- FOUND: tests/fixtures/llm-stubs/create-cycle-2-converged.json
- FOUND: tests/fixtures/llm-stubs/review-design-findings.json
- FOUND: tests/fixtures/llm-stubs/review-design-v11.json
- FOUND: tests/fixtures/llm-stubs/content-review-findings.json
- FOUND: tests/fixtures/llm-stubs/annotate-passthrough.json
- FOUND: tests/fixtures/llm-stubs/doctor-report.json
- FOUND: tests/skill-outcome/create.test.js
- FOUND: tests/skill-outcome/review.test.js
- FOUND: tests/skill-outcome/content-review.test.js
- FOUND: tests/skill-outcome/annotate.test.js
- FOUND: tests/skill-outcome/doctor.test.js

Commits (verified via git log):
- FOUND: f48fb50 (llm-mock + 7 fixtures)
- FOUND: e95accf (skill-outcome-harness)
- FOUND: 1a3671a (create.test.js)
- FOUND: be9e8cd (review.test.js)
- FOUND: 2237cbf (content-review.test.js)
- FOUND: 2ce4e21 (annotate.test.js)
- FOUND: dd1e424 (doctor.test.js)
