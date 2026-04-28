---
plan: 08-07
phase: 08
slug: ci-gate-and-signoff
status: ready
created: 2026-04-28
wave: 3
depends_on: [08-02, 08-03, 08-04, 08-05, 08-06]
autonomous: true
files_modified:
  - .github/workflows/ci.yml
  - README.md
  - tests/coverage-baseline.txt
  - .planning/RELEASE.md
  - .planning/STATE.md
requirements: [TEST-01, TEST-08]

must_haves:
  truths:
    - ".github/workflows/ci.yml replaces the existing 'Gate 6 — Node test suite (full)' step with a 'Gate 6 — Coverage 100% gate' step that runs `npm test` directly (per CONTEXT D-02; the `test` script is `c8 --100 --check-coverage --reporter text node --test 'tests/**/*.test.js'`) and fails the build on any regression below 100% lines/branches/functions/statements."
    - ".github/workflows/ci.yml adds a step (before the coverage gate) that installs `bats-core` via `sudo apt-get install -y bats` and runs `npm run test:bats`; bats failure also fails the build."
    - ".github/workflows/ci.yml does NOT install LibreOffice or Poppler; e2e tests are explicitly excluded from CI per CONTEXT D-08."
    - "README.md gains a coverage badge (Codecov OR shields.io static badge generated from the c8 lcov report) and a `## Testing` section documenting `npm run coverage`, `npm run coverage:check`, `npm run test:smoke`, `npm run test:e2e`, `npm run test:bats`, plus the FRESH-INSTALL.md pointer for human E2E."
    - "tests/coverage-baseline.txt is overwritten with the FINAL c8 text-summary table from the single end-of-phase `npm test` run (CONTEXT D-09: this plan triggers the ONE full-suite run permitted in Phase 8). The header records the final state: '100% lines/branches/functions/statements achieved on YYYY-MM-DD'."
    - ".planning/RELEASE.md gains a Phase 8 sign-off section listing: c8 final %, every TEST-NN closed with the plan that closed it, residual gaps (if any) with explicit deferral notes, the CI commit SHA that made the workflow change live, AND verbatim citation of the 6 D-07 `test()` description strings from `tests/auto-refine-integration.test.js` per BLOCKER B-4."
    - ".planning/STATE.md is updated: Phase set to '8 of 8 — Test Coverage to 100% — COMPLETE', plan progress 7/7, last activity dated, decisions appended (CONTEXT D-01 reversal applied; coverage gate is now hard)."
    - "The single full-suite run in this plan is `npm test` (under Plan 8-01's setup the `test` script is `c8 --100 --check-coverage --reporter text node --test 'tests/**/*.test.js'` per CONTEXT D-02) — c8 emits the 100% verification AND test results in one pass."
    - "If `npm test` fails (any file <100%), this plan PAUSES and surfaces the gaps; it does NOT silently lower thresholds. Gap closure routes back to whichever Wave 2/3 plan owns the file (8-02 lib/orchestrator/cli/tools/render-fixed/ai-tells, 8-03 annotate.js, 8-04 bats, 8-05 SKILL.md outcomes, 8-06 smoke/e2e). Re-run only after gaps closed."
  artifacts:
    - path: ".github/workflows/ci.yml"
      provides: "Updated CI workflow with bats step + coverage:check as Gate 6"
      contains: "coverage:check"
    - path: "README.md"
      provides: "Coverage badge + Testing section"
      contains: "## Testing"
    - path: "tests/coverage-baseline.txt"
      provides: "Final 100% sign-off coverage report"
      contains: "100"
    - path: ".planning/RELEASE.md"
      provides: "Phase 8 sign-off section"
      contains: "Phase 8"
    - path: ".planning/STATE.md"
      provides: "Phase complete marker + final decisions"
      contains: "Phase 8"
  key_links:
    - from: ".github/workflows/ci.yml"
      to: "package.json scripts.coverage:check"
      via: "Gate 6 invokes `npm test` (script body: c8 --100 --check-coverage; CONTEXT D-02)"
      pattern: "npm test"
    - from: "README.md"
      to: "coverage report (lcov / Codecov)"
      via: "badge in README header references the coverage gate"
      pattern: "coverage"
    - from: ".planning/RELEASE.md"
      to: "tests/coverage-baseline.txt"
      via: "RELEASE.md cites the baseline file as the artifact of record"
      pattern: "coverage-baseline"
---

<objective>
Wave 3 closer: flip CI from the current per-file `node --test` invocation to `npm run coverage:check` with c8's 100% threshold; add a bats install + run step; do NOT install soffice/poppler in CI (e2e stays local); update README.md with a coverage badge + Testing section; run the SINGLE permitted full-suite end-to-end pass (CONTEXT D-09); overwrite tests/coverage-baseline.txt with the final 100% report; sign off Phase 8 in .planning/RELEASE.md and .planning/STATE.md.

If `npm run coverage:check` fails on first run, this plan does NOT silently lower thresholds — it surfaces the gap, routes to the owning Wave 2/3 plan for closure, and re-runs (which is itself the new "single permitted full-suite run" — earlier failures are diagnosis, not coverage gate runs).

Output: CI workflow updated; README badge + section live; final baseline pinned; RELEASE.md Phase 8 section + STATE.md status flipped to complete.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@CLAUDE.md
@.planning/phases/08-test-coverage-100/08-CONTEXT.md
@.planning/phases/08-test-coverage-100/08-01-c8-wiring-baseline-PLAN.md
@.planning/phases/08-test-coverage-100/08-02-lib-orchestrator-gap-fill-PLAN.md
@.planning/phases/08-test-coverage-100/08-03-annotate-geometry-PLAN.md
@.planning/phases/08-test-coverage-100/08-04-bats-bash-coverage-PLAN.md
@.planning/phases/08-test-coverage-100/08-05-skill-md-outcome-tests-PLAN.md
@.planning/phases/08-test-coverage-100/08-06-smoke-and-e2e-runner-PLAN.md
@.github/workflows/ci.yml
@README.md
@tests/coverage-baseline.txt
@package.json
@.planning/REQUIREMENTS.md

<interfaces>
**ci.yml diff — final shape (Gate 6 replaced + new bats step inserted before it):**

Replace the existing `- name: Gate 6 — Node test suite (full)` step with:

```yaml
      - name: Gate 5b — Install bats-core
        run: |
          sudo apt-get update
          sudo apt-get install -y bats
          bats --version

      - name: Gate 5c — Bash script test suite (bats)
        run: |
          npm run test:bats || {
            echo "::error::bats test suite failed"
            exit 1
          }

      - name: Gate 6 — Coverage 100% gate (c8 + node --test, per CONTEXT D-02)
        run: |
          npm test || {
            echo "::error::Coverage regression below 100% — see c8 report above"
            exit 1
          }

      - name: Gate 6b — Upload lcov coverage report (artifact)
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-lcov
          path: coverage/lcov.info
          retention-days: 14
```

Keep the existing RESERVED block comment about LibreOffice — Phase 8 explicitly does NOT add it (CONTEXT D-08).

**README.md — additions:**

Near the top of README.md, under any existing badge row, ADD:
```markdown
[![CI](https://github.com/alo-exp/instadecks/actions/workflows/ci.yml/badge.svg)](https://github.com/alo-exp/instadecks/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](./tests/coverage-baseline.txt)
```

Near the end (or in a new section above License), ADD:
```markdown
## Testing

```bash
# Full suite + 100% coverage gate (matches CI; per CONTEXT D-02):
npm test

# Coverage report (text + lcov; non-failing):
npm run coverage

# Smoke suite (<30s; runs in CI):
npm run test:smoke

# Bash-script suite (bats; runs in CI; install via `brew install bats-core`):
npm run test:bats

# E2E suite (local-only; requires soffice + pdftoppm; skipped silently otherwise):
npm run test:e2e
```

For human end-to-end gating before release, see [tests/FRESH-INSTALL.md](tests/FRESH-INSTALL.md).
```

**tests/coverage-baseline.txt — final shape:**

```
# Coverage Baseline — Phase 8 SIGN-OFF
# Captured: <ISO date>
# Tool: c8 10.1.3
# Command: npm run coverage:check
# Result: 100% lines / 100% branches / 100% functions / 100% statements

<paste the c8 text-table here, including All files row>
```

**RELEASE.md — Phase 8 sign-off section to ADD:**

```markdown
## Phase 8 — Test Coverage to 100% (signed off YYYY-MM-DD)

**Result:** 100% lines / branches / functions / statements across all in-scope files (CONTEXT D-03).

### Requirements closed

| ID | Description | Closed by |
|---|---|---|
| TEST-01 | c8 100% gate; CI fails on regression | Plan 8-01 (wiring) + Plan 8-07 (gate) |
| TEST-02 | Lib + cli + orchestrator + tools branch coverage | Plan 8-02 |
| TEST-03 | Bats coverage for all 3 bash scripts | Plan 8-04 |
| TEST-04 | SKILL.md outcome-based tests (5 skills) | Plan 8-05 |
| TEST-05 | Smoke suite <30s | Plan 8-06 |
| TEST-06 | Auto-refine branch coverage (6 D-07 branches in `tests/auto-refine-integration.test.js`, canonical deliverable per BLOCKER B-4): `cycle 1 zero-findings forces confirmation cycle`, `oscillation: cycle N issue_set_hash strictly equals cycle N-2 hash → exit`, `soft-cap 4-option UX: each option drives the documented branch`, `top-of-cycle interrupt: .interrupt flag detected pre-cycle → clean exit`, `schema v1.1 routing: stub returns schema_version=1.1 → v1.1 branch taken`, `content-vs-design boundary BIDIRECTIONAL` | Plan 8-02 (canonical) + Plan 8-05 (supporting) |
| TEST-07 | E2E runner (local-only, skip-when-absent) | Plan 8-06 |
| TEST-08 | Coverage gate in CI | Plan 8-07 |

### Decisions enacted

- D-01 (annotate.js policy reversal): applied in Plan 8-01 to CLAUDE.md.
- D-02 (c8 + 100% threshold): wired in Plan 8-01; gate live in Plan 8-07.
- D-04 (bats for bash; not folded into c8): tests in Plan 8-04; CI install in Plan 8-07.
- D-05 (LLM-DI carve-out): hooks added in Plan 8-02 + Plan 8-05.
- D-08 (e2e local-only; FRESH-INSTALL.md as human gate): runner in Plan 8-06; CI never installs soffice.
- D-09 (one full-suite run per plan): honored throughout.

### Coverage report

See `tests/coverage-baseline.txt` for the pinned text summary; `coverage/lcov.info` is uploaded as a CI artifact on every push.

### Residual gaps

<list any file that landed below 100% with explicit deferral note + ticket; if none, state "None — coverage is hard 100%.">
```

**STATE.md update — replace the Current Position block + append a decision row:**

```markdown
Phase: 8 of 8 (Test Coverage to 100%) — COMPLETE (7/7 plans)
Plan: 7 of 7 in Phase 8 (08-07 complete)
Status: Phase 8 complete — c8 100% gate live in CI; bats wired; e2e local-only; CONTEXT D-01 reversal applied. v0.1.0 release readiness intact.
Last activity: <YYYY-MM-DD> — Plan 08-07 sign-off
```

Append to Decisions:
```
- Plan 08-01 / 08-07 (YYYY-MM-DD): annotate.js standard test discipline (CONTEXT D-01); c8 100% lines/branches/functions/statements is now a CI hard gate; bats covers the 3 bash scripts; e2e never runs in CI (FRESH-INSTALL.md remains the human v0.1.0 gate).
```

**Coverage gap escalation protocol:**

If `npm test` fails on first invocation in this plan:
1. Capture the c8 text report.
2. Identify each file <100%.
3. For each, classify the owning Wave 2/3 plan and document the gap as a "to be closed by" note.
4. Pause and either (a) close the gaps inline (small) or (b) loop back to the owning plan for a follow-up.
5. Re-run `npm test` (W-7: D-09's 'one full-suite run per plan' budget is PER-PLAN; re-runs inside Plan 8-07 after closing a gap are permitted as this plan's single allotted run — failed runs are diagnosis, the final green run is the gate).

Do NOT lower thresholds. Do NOT add to .c8rc.json `exclude`. The exclude list is locked at Plan 8-01.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update ci.yml + README.md (no test runs yet)</name>
  <files>.github/workflows/ci.yml, README.md</files>
  <read_first>
    - /Users/shafqat/Documents/Projects/instadecks/.github/workflows/ci.yml (entire file — confirm Gate 6 step name + step ordering; confirm RESERVED block comment is preserved)
    - /Users/shafqat/Documents/Projects/instadecks/README.md (entire file — locate badge row + License section to find insertion points)
    - /Users/shafqat/Documents/Projects/instadecks/package.json (confirm coverage:check + test:smoke + test:bats + test:e2e scripts present from Plan 8-01)
    - /Users/shafqat/Documents/Projects/instadecks/.planning/phases/08-test-coverage-100/08-CONTEXT.md (D-04 — bats install in CI; D-08 — soffice NOT in CI)
  </read_first>
  <action>
    **Step A — update .github/workflows/ci.yml:**
    Use the Edit tool. Replace the existing Gate 6 step (the `find tests -maxdepth 2 -name '*.test.js' -print0 | xargs -0 node --test` block) with the three new steps from <interfaces> (`Gate 5b — Install bats-core`, `Gate 5c — Bash script test suite (bats)`, `Gate 6 — Coverage 100% gate`, `Gate 6b — Upload lcov coverage report`). Preserve the RESERVED block comment about LibreOffice exactly.

    **Step B — update README.md:**
    - Add the CI + Coverage badges near top (under any existing badge row; if no badge row exists, create one immediately after the H1).
    - Add the `## Testing` section per <interfaces> above the License section (or wherever appropriate by reading file structure).

    **Step C — verify edits parse:**
    ```bash
    grep -q 'npm test' .github/workflows/ci.yml && grep -qE 'c8 --100|--check-coverage' package.json
    grep -q 'apt-get install -y bats' .github/workflows/ci.yml
    ! grep -q 'libreoffice' .github/workflows/ci.yml      # MUST be 0 — soffice never installed in CI
    grep -q '## Testing' README.md
    grep -q 'coverage-100' README.md
    grep -q 'FRESH-INSTALL.md' README.md
    ```

    **Step D — atomic commit:**
    ```bash
    git add .github/workflows/ci.yml README.md
    git commit -m "$(cat <<'EOF'
ci(08-07): coverage:check as hard Gate 6 + bats install/run + lcov artifact upload

- Replace per-file `node --test` Gate 6 with `npm run coverage:check`
  (c8 --100 --check-coverage; CI fails on coverage regression below 100%).
- Add Gate 5b/5c: install bats-core via apt + run `npm run test:bats`.
- Upload coverage/lcov.info as a 14-day CI artifact.
- LibreOffice/Poppler explicitly NOT installed (CONTEXT D-08; e2e local-only;
  FRESH-INSTALL.md remains the human gate). RESERVED block preserved.
- README: CI badge + 100% coverage badge + Testing section.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
    ```
  </action>
  <verify>
    <automated>grep -q 'npm test' .github/workflows/ci.yml && grep -qE 'c8 --100|--check-coverage' package.json && grep -q 'apt-get install -y bats' .github/workflows/ci.yml && ! grep -qi 'libreoffice' .github/workflows/ci.yml && grep -q '## Testing' README.md && grep -q 'coverage-100' README.md</automated>
  </verify>
  <acceptance_criteria>
    - .github/workflows/ci.yml's Gate 6 invokes `npm test` (per CONTEXT D-02; the script body in package.json contains `c8 --100 --check-coverage`); workflow also contains `apt-get install -y bats`.
    - .github/workflows/ci.yml does NOT contain `libreoffice` or `poppler-utils` (D-08).
    - README.md contains `## Testing` section, CI badge, coverage badge, FRESH-INSTALL.md pointer.
    - Atomic commit landed.
  </acceptance_criteria>
  <done>CI workflow + README updated; ready for the single permitted full-suite verification in Task 2.</done>
</task>

<task type="auto">
  <name>Task 2: Run npm run coverage:check ONCE; on green, write final baseline + RELEASE.md + STATE.md</name>
  <files>tests/coverage-baseline.txt, .planning/RELEASE.md, .planning/STATE.md</files>
  <read_first>
    - /Users/shafqat/Documents/Projects/instadecks/tests/coverage-baseline.txt (current Plan 8-01 baseline — to be overwritten on green)
    - /Users/shafqat/Documents/Projects/instadecks/.planning/RELEASE.md (current shape — append Phase 8 section; if file does not exist, create with H1 "Release Notes" and add Phase 8 section)
    - /Users/shafqat/Documents/Projects/instadecks/.planning/STATE.md (entire — locate Current Position block + Decisions block to update)
    - /Users/shafqat/Documents/Projects/instadecks/.planning/phases/08-test-coverage-100/08-CONTEXT.md (D-09: this is the single permitted full-suite run for Plan 8-07; failed runs are diagnosis, the green run is the gate)
  </read_first>
  <action>
    **Step A — sanity sub-step BEFORE the gated full run:**
    Run targeted c8 probes to detect any obvious gap before the gate fires (does not count as the full-suite run; --include limits scope):
    ```bash
    # Probe 1: orchestrators + cli + adapter
    npx c8 --reporter=text \
      --include 'skills/**/index.js' --include 'skills/**/cli.js' --include 'skills/**/adapter.js' \
      node --test tests/orchestrator-*-branches.test.js tests/cli-*-branches.test.js tests/skill-outcome/ tests/auto-refine-integration.test.js 2>&1 | tail -40

    # Probe 2: lib
    npx c8 --reporter=text \
      --include 'skills/**/lib/**' \
      node --test tests/lib-*-branches.test.js tests/loop-primitives.test.js tests/oscillation.test.js 2>&1 | tail -40

    # Probe 3: annotate.js geometry
    npx c8 --reporter=text \
      --include 'skills/annotate/scripts/annotate.js' \
      node --test tests/annotate-*.test.js 2>&1 | tail -20

    # Probe 4: tools
    npx c8 --reporter=text \
      --include 'tools/**' \
      node --test tests/tools-*-branches.test.js tests/manifest-validator.test.js tests/audit-allowed-tools.test.js tests/license-audit.test.js tests/assert-pin.test.js 2>&1 | tail -30
    ```
    Each probe should report ≥99% on its targeted files. If any file is <100%, surface the gap and route back to the owning plan BEFORE the gated run.

    **Step B — the SINGLE permitted full-suite run (D-09 per-plan budget honored — see W-7 below):**
    ```bash
    npm test 2>&1 | tee /tmp/cov-final.txt
    ```
    `npm test` per CONTEXT D-02 is `c8 --100 --check-coverage --reporter text node --test 'tests/**/*.test.js'`.
    Three outcomes:
    - **Green (exit 0):** proceed to Step C.
    - **Red (exit non-zero):** capture the c8 report from /tmp/cov-final.txt, identify each <100% file, route to owning plan (8-02 lib/orchestrator/cli/tools/render-fixed/ai-tells/fixture-builders, 8-03 annotate.js, 8-05 SKILL.md outcomes, 8-06 smoke), close gap, then re-run `npm test`. Each failed run is diagnosis; the green run is the gate. Per W-7: D-09's 'one full-suite run per plan' budget is PER-PLAN, not per-phase — re-runs INSIDE Plan 8-07 after closing a gap are permitted as 8-07's single allotted run (the failed pre-runs are diagnosis, only the final green run counts). Do NOT lower threshold; do NOT add to .c8rc.json exclude.

    **Step C — extract the `All files` summary table from /tmp/cov-final.txt and overwrite tests/coverage-baseline.txt** with the final-state header per <interfaces> + the c8 text-table dump. Confirm the `All files` row shows 100 / 100 / 100 / 100.

    **Step D — append Phase 8 section to .planning/RELEASE.md** per <interfaces>. If RELEASE.md does not exist, create it with `# Release Notes` H1 + Phase 8 section. Use today's date.

    **Step E — update .planning/STATE.md** per <interfaces>: replace Current Position block with the COMPLETE state; append the Phase 8 decision row to the Decisions section.

    **Step F — final verification:**
    ```bash
    grep -q '100% lines' tests/coverage-baseline.txt
    grep -q 'Phase 8 — Test Coverage to 100%' .planning/RELEASE.md
    grep -q 'Phase 8 of 8' .planning/STATE.md || grep -q 'Phase: 8 of 8' .planning/STATE.md
    bash tools/lint-paths.sh
    ```

    **Step G — atomic commit:**
    ```bash
    git add tests/coverage-baseline.txt .planning/RELEASE.md .planning/STATE.md
    git commit -m "$(cat <<'EOF'
docs(08-07): Phase 8 sign-off — 100% coverage achieved; CI gate live

- tests/coverage-baseline.txt: final c8 text-summary (100/100/100/100).
- .planning/RELEASE.md: Phase 8 sign-off — TEST-01..TEST-08 closed,
  decisions enacted (D-01 reversal, D-02 gate, D-04 bats, D-05 LLM-DI,
  D-08 e2e local-only, D-09 single-run discipline).
- .planning/STATE.md: Phase 8 marked complete (7/7 plans); decisions
  appended.

Single full-suite run via `npm run coverage:check` honored CONTEXT D-09.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
    ```
  </action>
  <verify>
    <automated>grep -q '100% lines' tests/coverage-baseline.txt && grep -q 'Phase 8' .planning/RELEASE.md && grep -qE 'Phase: 8 of 8|Phase 8 of 8' .planning/STATE.md && bash tools/lint-paths.sh</automated>
  </verify>
  <acceptance_criteria>
    - `npm test` exited 0 on its final invocation in this plan (proven by tests/coverage-baseline.txt's 100/100/100/100 line).
    - tests/coverage-baseline.txt overwritten with final-state header + c8 100% table.
    - .planning/RELEASE.md contains a Phase 8 sign-off section listing TEST-01..TEST-08 closure.
    - .planning/STATE.md Current Position reflects Phase 8 COMPLETE; Decisions appended.
    - `bash tools/lint-paths.sh` green.
    - Atomic commit landed.
  </acceptance_criteria>
  <done>Phase 8 signed off; CI gate live; 100% coverage pinned; v0.1.0 release readiness intact.</done>
</task>

</tasks>

<threat_model>
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-08-19 | Tampering | A future PR adds source files outside .c8rc.json `include` to silently bypass the 100% gate | mitigate | Plan 8-01 .c8rc.json `include` uses `skills/**/*.js` and `tools/**/*.js` globs — every new product source file is automatically swept in; surface in Plan 8-07 SUMMARY for future reviewer awareness. |
| T-08-20 | Repudiation | Coverage report claims 100% but excludes test-relevant code via .c8rc.json | mitigate | exclude list is enumerated in Plan 8-01 PLAN.md and reviewed in 8-07; tests/coverage-baseline.txt shows the All-files row from c8 directly (not synthesized). |
| T-08-21 | DoS | `npm run coverage:check` exceeds CI runner timeout | accept | The full suite runs in <2min historically (Plan 8-06 smoke <30s; Plans 8-02/8-03/8-05 each contribute deterministic seconds); Plan 8-07 verifies wall-clock and surfaces tunings if >5min. |
</threat_model>

<verification>
- `.github/workflows/ci.yml` has Gate 5b (bats install), 5c (bats run), 6 (coverage:check), 6b (lcov upload).
- `.github/workflows/ci.yml` does NOT install LibreOffice/Poppler (D-08 invariant).
- README.md has CI + coverage badges + `## Testing` section.
- `npm test` exits 0 (per CONTEXT D-02 invocation; per W-7 the per-plan CPU budget allows re-runs after gap closure inside this plan; only the final green run is the gate).
- tests/coverage-baseline.txt shows 100/100/100/100 in the All-files row.
- .planning/RELEASE.md has Phase 8 section with TEST-01..TEST-08 closed and CONTEXT decisions cited.
- .planning/STATE.md flipped to Phase 8 COMPLETE.
- 2 atomic commits across both tasks.
</verification>

<success_criteria>
- TEST-01 (100% c8 gate; CI fails on regression) — closed.
- TEST-08 (Coverage gate added to CI workflow) — closed.
- Phase 8 ROADMAP success criteria #1 (npm test produces 100% c8 report; CI fails on regression) and #8 (CI workflow coverage gate) — closed.
- All 8 ROADMAP Phase 8 success criteria are now closed across the 7 plans.
- Instadecks v0.1.0 has 100% test coverage as a CI invariant; future PRs cannot regress without explicit reviewer override.
</success_criteria>

<output>
`.planning/phases/08-test-coverage-100/08-07-SUMMARY.md` — final c8 percentages per file (paste full table), full-suite wall-clock, ci.yml diff summary, README.md additions, RELEASE.md sign-off pointer, STATE.md status flip confirmation, list of any residual gaps deferred (target: zero), commit SHAs for the workflow + sign-off commits.
</output>
