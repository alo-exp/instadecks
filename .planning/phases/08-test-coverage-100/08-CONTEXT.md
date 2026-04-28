# Phase 8 — Test Coverage to 100% — CONTEXT

> **Mode**: autonomous (user pre-negotiated full scope). All decisions below are
> locked at phase entry; planner / executors do NOT re-litigate.

## Phase goal

Drive coverage to 100% lines/branches/functions/statements across the entire
Instadecks codebase, wire `c8` as a CI hard gate, and add outcome-based unit
tests for every SKILL.md instruction. **annotate.js is INCLUDED in coverage,
not excluded** — see policy reversal below.

## Locked decisions (do not revisit)

### D-01: annotate.js policy reversal
The earlier "SHA-pinned binary asset / verbatim / Any other edit fails CI"
prohibition on `skills/annotate/scripts/annotate.js` is **withdrawn**. annotate.js
is now under standard test discipline like every other source file: must hit
100% coverage with direct unit tests on geometry primitives (polygon math,
charPts table, miter-join, MAX_SIDE overflow, color/transparency, layout
constants). The single documented require-path patch remains the only
historical edit on record; no other content change is bundled with Phase 8.

**Action**: Update `CLAUDE.md` (root) to remove the locked-invariant framing
on annotate.js. Keep the other invariants (pptxgenjs 4.0.1 pin, severity
4-tier, content-vs-design boundary, plugin-relative paths). Commit as the
first action of execute-phase.

### D-02: Coverage tool & threshold
- Tool: `c8` (devDependency).
- Threshold: 100% on lines / branches / functions / statements.
- Runner: `c8 --100 --reporter=text --reporter=lcov node --test`.
- npm scripts:
  - `test` → `c8 --100 node --test 'tests/**/*.test.js'`
  - `test:smoke` → `node --test tests/smoke/`
  - `test:e2e` → `node --test tests/e2e/` (skips silently if `soffice` absent;
    never invoked by CI).
- CI: existing GitHub Actions workflow is updated so `npm test` is the
  coverage gate (regression below 100% fails the build).

### D-03: Files in scope (must reach 100%)
- All `skills/*/scripts/cli.js` (annotate, create, review, content-review)
- All orchestrators / `index.js`: `runCreate`, `runReview`, `runContentReview`,
  `runAnnotate`
- All `skills/*/scripts/lib/*.js`
- `skills/annotate/scripts/annotate.js`, `adapter.js`, `samples.js`
- `skills/review/scripts/{ai-tells.js,render-fixed.js,lib/*}`
- `skills/content-review/scripts/{render-content-fixed.js,lib/*}`
- `skills/create/scripts/lib/*` (loop-primitives, oscillation, design-validator,
  enum-lint, deck-brief, title-check, render-rationale)
- All `tools/*.js` (validate-manifest, audit-allowed-tools, license-audit,
  assert-pptxgenjs-pin, lint-pptxgenjs-enums, normalize-pptx-sha,
  build-cross-domain-fixture, build-tiny-deck-fixture, build-ai-tells-fixtures)

### D-04: Bash scripts — bats coverage
Three bash scripts get bats tests (happy-path + failure modes):
- `scripts/pptx-to-images.sh`
- `hooks/check-deps.sh`
- `skills/doctor/scripts/check.sh`

Bats install: prefer Homebrew (`brew install bats-core`) at developer time;
in CI, vendor `bats-core` as a git submodule OR install via apt. Tests live
under `tests/bats/*.bats`. Plain `bats tests/bats/` runs them; integrated into
`npm test` via a pre-step that runs only when `bats` is on PATH (CI installs
it explicitly). Bats coverage is NOT folded into the c8 100% gate — c8 only
covers Node sources. Bats branch coverage is asserted by test-case enumeration
in PLAN 8-04.

### D-05: SKILL.md outcome-based tests
Each instruction in every SKILL.md (5 skills: create, review, content-review,
annotate, doctor) is treated as a unit. Tests:
1. Mock the LLM step with a deterministic stub (returns canned JSON / canned
   prose).
2. Drive the surrounding deterministic plumbing (cli.js / orchestrator).
3. Assert the OUTCOME is deterministic: JSON shape conforms to schema, finding
   IDs / severity values match expected set, render artifact bytes/SHA match
   baseline, schema-version routing picks the expected branch.

LLM mock harness: a single `tests/helpers/llm-mock.js` that exposes
`stubLlmResponse(scenarioName)` reading from `tests/fixtures/llm-stubs/*.json`.
Orchestrators receive an injected `llm` adapter (DI) — if any orchestrator
currently hardcodes the LLM call, refactor to accept an injected client,
default = real client. This is the only allowed source mod beyond test files.

### D-06: Smoke suite (`tests/smoke/`)
- One smoke test per cli.js: `--help` exits 0 with expected first-line shape;
  minimal valid input invocation exits 0 (LLM mocked).
- Whole suite must complete in <30s in CI.
- Runs as part of `npm test` (smoke test files match the same glob).

### D-07: Integration coverage — auto-refine branches
Extend existing mocked-cycle tests to cover, in `tests/auto-refine-integration.test.js`
(or a sibling): cycle-1 zero-findings confirmation cycle, oscillation hash
equality (D-09 from Phase 5), soft-cap 4-option UX (each branch), top-of-cycle
interrupt flag, schema v1.1 routing, content-vs-design boundary bidirectional.

### D-08: E2E runner discipline
- `tests/e2e/*.test.js` use `node --test`.
- Each E2E test starts with `if (!commandExists('soffice')) { test.skip(); }`.
- CI environment variable `CI=true` causes E2E tests to skip unconditionally.
- `tests/FRESH-INSTALL.md` stays as the human E2E gate for v0.1.0.

### D-09: CPU constraint (HARD)
- `npm test` runs **once** at the very end of execute-phase. No tight loops.
- No parallel Node processes inside tests. Use mocked I/O wherever possible.
- TDD red→green cycles use targeted `node --test path/to/one.test.js`, not
  full-suite runs.

## Out of scope

- Refactoring source files for "improved testability" beyond the single LLM-DI
  refactor noted in D-05.
- Changing pptxgenjs 4.0.1 pin.
- Visual regression baseline changes.
- Adding new product features.
- Removing existing tests (only additions and the LLM-DI refactor).

## Plan decomposition (waves)

| Plan | Wave | Title |
|------|------|-------|
| 8-01 | 1 | Wire `c8`, baseline coverage report, raise to current floor |
| 8-02 | 2 | Lib + orchestrator gap-fill (failure branches, interrupt, oscillation, soft-cap) |
| 8-03 | 2 | annotate.js geometry primitives unit tests |
| 8-04 | 2 | bats tests for the three bash scripts |
| 8-05 | 3 | Outcome-based SKILL.md tests (5 skills) + LLM-mock harness + DI refactor |
| 8-06 | 3 | `tests/smoke/` + `tests/e2e/` runner shape |
| 8-07 | 3 | CI workflow update, final npm test, sign-off |

Wave 1 must finish before Wave 2 (baseline numbers needed). Waves 2 plans
(8-02, 8-03, 8-04) are independent and may run in parallel. Wave 3 (8-05,
8-06, 8-07) depends on Wave 2; 8-05 and 8-06 may run in parallel; 8-07 closes.

## Requirements

TEST-01..TEST-08 mirror Phase 8 success criteria 1..8 in ROADMAP.md. They
will be back-filled into REQUIREMENTS.md by Plan 8-01 as the first step.

## Notes for planner

- Use existing `tests/fixtures/` heavily — sample-findings, sample-brief,
  sample-refine-ledger, cross-domain fixtures are already canonical.
- New fixtures only when no existing fixture applies (e.g. llm-stubs/).
- Every plan must include a verification block that runs ONLY its own targeted
  tests, not the full suite (CPU constraint).
- The very last verification (Plan 8-07) runs `npm test` once and captures
  the c8 report as evidence in 8-07-SUMMARY.md.
