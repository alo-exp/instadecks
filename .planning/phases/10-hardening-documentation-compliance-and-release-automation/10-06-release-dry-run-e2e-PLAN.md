---
plan: 10-06
phase: 10
slug: release-dry-run-e2e
status: ready
created: 2026-04-29
wave: 4
depends_on: [10-01, 10-02, 10-03, 10-04, 10-05]
autonomous: true
files_modified:
  - tests/release-dry-run-e2e.test.js
  - .planning/STATE.md
  - .planning/ROADMAP.md
  - .planning/RELEASE.md
  - docs/CHANGELOG.md
requirements: [HARD-15]

must_haves:
  truths:
    - "tests/release-dry-run-e2e.test.js spawns `npm run release:dry-run` against the current clean repo (after Plans 10-01..10-05 have landed) and asserts: exit 0; stdout contains every gate label (`>>> lint:paths`, `>>> lint:enums`, `>>> license-audit`, `>>> manifest-validator`, `>>> doc-size`, `>>> test (c8 100%)`, `>>> bats`, `>>> activation-panel`, `>>> permission-mode`, fresh-install line — either `>>> fresh-install` if docker present or the SKIPPED diagnostic); stdout contains the 5 `DRY-RUN: would` action lines (would-tag, would-push-commit, would-push-tag, would-submit-marketplace-pr, would-flip-STATE.md OR would-prepend-CHANGELOG)"
    - "Test is gated by `process.env.RUN_RELEASE_E2E === '1'` (opt-in even on CI — this is a slow integration test that runs the full c8 suite + bats + activation-panel + permission-mode + optionally fresh-install; runtime budget 4-15 minutes); on hosts without the opt-in env, test is `t.skip(reason)` with a clear message"
    - "Test does NOT execute `npm run release` (no --dry-run): release script is real-tag-pushing and is never run from automated tests; verification of the real release path is done manually by the maintainer running `npm run release` once after this plan ships"
    - ".planning/STATE.md is updated: Status flips to `Phase 10 COMPLETE — v0.1.0 release-ready, automation chain green`; Phase entry shows `10 of 10 — Hardening, Documentation Compliance, and Release Automation — COMPLETE (6/6 plans)`; last-activity dated 2026-04-29; new decisions appended capturing the 6 plan IDs and the new automated gates"
    - ".planning/ROADMAP.md Phase 10 row in the Progress table updates from `0/TBD` to `6/6 Complete 2026-04-29`; the Phase 10 `Plans` field updates from `TBD` to a 6-line list mirroring Plans 10-01..10-06"
    - ".planning/RELEASE.md gains a `## §6 Phase 10 — Release Automation Sign-Off` section listing: every HARD-NN closed with the plan that closed it; the new `npm run gate:*` and `npm run release:dry-run` / `npm run release` scripts; the v0.1.0 release-readiness statement; pointer to the dry-run E2E test as evidence"
    - "docs/CHANGELOG.md gains a final Phase 10 entry dated 2026-04-29: `## 2026-04-29 — Phase 10 closed: v0.1.0 release-automation chain live` with bullets for each plan"
    - "On test pass + STATE/ROADMAP/RELEASE updates committed, the v0.1.0 release-readiness assertion is: `npm run release:dry-run` is the SINGLE green-button verification — when it exits 0, `npm run release` is safe to run; this plan is the closer for Phase 10"
  artifacts:
    - path: "tests/release-dry-run-e2e.test.js"
      provides: "End-to-end integration test of release:dry-run chain"
      contains: "release:dry-run"
    - path: ".planning/STATE.md"
      provides: "Phase 10 complete marker"
      contains: "Phase 10 COMPLETE"
    - path: ".planning/ROADMAP.md"
      provides: "Phase 10 progress row updated to 6/6"
      contains: "Phase 10"
    - path: ".planning/RELEASE.md"
      provides: "§6 Phase 10 sign-off section"
      contains: "Phase 10"
    - path: "docs/CHANGELOG.md"
      provides: "Phase 10 closed entry"
      contains: "Phase 10 closed"
  key_links:
    - from: "tests/release-dry-run-e2e.test.js"
      to: "tools/release-v0.1.0.sh (via npm run release:dry-run)"
      via: "spawn npm script; assert gate labels and DRY-RUN actions in stdout"
      pattern: "release:dry-run"
    - from: ".planning/STATE.md"
      to: ".planning/ROADMAP.md"
      via: "both reflect Phase 10 COMPLETE in lock-step"
      pattern: "Phase 10"
---

<objective>
Wave 6 — closer for Phase 10. Author one end-to-end integration test that runs `npm run release:dry-run` against the clean repo (after Plans 10-01..10-05 have landed) and asserts the entire automated chain — every gate runs, every DRY-RUN would-action prints — exits 0 in a single green-button check.

This is the proof that the maintainer's path to v0.1.0 is now: `npm run release:dry-run` (green) → `npm run release` (real). No human gate remains. After the test passes, this plan flips Phase 10 to complete in STATE.md + ROADMAP.md, adds the §6 sign-off section to RELEASE.md, and prepends the closing entry to docs/CHANGELOG.md — preparing the milestone for audit.

Output: 1 integration test + 4 documentation file updates.

**Gate-label contract (revision — checker W-4):** This test asserts substring matches against gate markers (`>>> <label>`) and DRY-RUN action lines emitted by `tools/release-v0.1.0.sh` (Plan 10-05). The label set is a SHARED CONTRACT between the emitter (10-05) and the asserter (10-06). The 9 expected gate labels are: `lint:paths`, `lint:enums`, `license-audit`, `manifest-validator`, `doc-size`, `test (c8 100%)`, `bats`, `activation-panel`, `permission-mode`, plus the 10th line for fresh-install (either `>>> fresh-install` or the documented `gate:fresh-install SKIPPED` diagnostic). The 5 expected DRY-RUN action lines are: `would flip STATE.md`, `would prepend CHANGELOG`, `would tag v0.1.0`, `would push tag`, `would submit marketplace PR`. If 10-05 changes any of these label strings, 10-06 MUST be updated in lock-step. Future hardening: extract these strings into a single `tools/release-gates.json` consumed by both scripts; out of scope for v0.1.0.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/SPEC.md
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/RELEASE.md
@.planning/phases/10-hardening-documentation-compliance-and-release-automation/10-05-release-automation-PLAN.md
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Author tests/release-dry-run-e2e.test.js (opt-in integration test)</name>
  <read_first>tools/release-v0.1.0.sh (Plan 10-05 Task 2 output — note the gate labels emitted via `>>> <label>` and DRY-RUN action labels emitted via `DRY-RUN: would <action>`); package.json (release:dry-run script); existing slow integration tests for style — tests/auto-refine-integration.test.js</read_first>
  <files>tests/release-dry-run-e2e.test.js</files>
  <behavior>
    - Without `RUN_RELEASE_E2E=1`: test reports skipped with clear reason.
    - With `RUN_RELEASE_E2E=1`: spawns `npm run release:dry-run` via `child_process.spawnSync('npm', ['run', 'release:dry-run'], {timeout: 15*60*1000})`; asserts exit code 0; asserts stdout contains all 9 expected `>>> <label>` markers (lint:paths, lint:enums, license-audit, manifest-validator, doc-size, test (c8 100%), bats, activation-panel, permission-mode) AND a fresh-install line (either `>>> fresh-install` or the documented SKIP message); asserts stdout contains the 5 expected `DRY-RUN: would` action lines.
    - Test runtime budget 4-15 minutes; emits `t.diagnostic('release:dry-run took <N>s')` for visibility.
  </behavior>
  <action>
1. Test scaffold:
   ```js
   const test = require('node:test');
   const assert = require('node:assert');
   const { spawnSync } = require('node:child_process');
   const enabled = process.env.RUN_RELEASE_E2E === '1';
   test('release:dry-run runs the full automated chain green', { skip: !enabled, timeout: 16*60*1000 }, (t) => {
     const start = Date.now();
     const r = spawnSync('npm', ['run', 'release:dry-run'], { encoding: 'utf8' });
     t.diagnostic(`release:dry-run took ${((Date.now()-start)/1000)|0}s`);
     assert.strictEqual(r.status, 0, `non-zero exit; stderr=${r.stderr}\nstdout-tail=${r.stdout.slice(-2000)}`);
     const expectedGates = [
       '>>> lint:paths', '>>> lint:enums', '>>> license-audit',
       '>>> manifest-validator', '>>> doc-size', '>>> test (c8 100%)',
       '>>> bats', '>>> activation-panel', '>>> permission-mode'
     ];
     for (const g of expectedGates) {
       assert.ok(r.stdout.includes(g), `missing gate marker ${g}`);
     }
     // fresh-install: either ran or was explicitly skipped
     assert.ok(
       r.stdout.includes('>>> fresh-install') || r.stdout.includes('gate:fresh-install SKIPPED'),
       'missing fresh-install gate or skip diagnostic'
     );
     const expectedActions = [
       'DRY-RUN: would flip STATE.md',
       'DRY-RUN: would prepend CHANGELOG',
       'DRY-RUN: would tag v0.1.0',
       'DRY-RUN: would push tag',
       'DRY-RUN: would submit marketplace PR'
     ];
     for (const a of expectedActions) {
       assert.ok(r.stdout.includes(a), `missing DRY-RUN action ${a}`);
     }
   });
   ```
2. The test deliberately does NOT include `tests/release-dry-run-e2e.test.js` in the default `npm test` glob via the c8 suite (it's slow and gated by RUN_RELEASE_E2E). Verify by running `npm test` after creating the file — if c8 picks it up, add it to the c8 exclude list in `.c8rc.json` or rename to `.e2e.js` outside the test pattern. (Cleanest: keep `.test.js` extension but add to exclude list — match the established pattern from Phase 8 for e2e files; check `.c8rc.json` / `package.json` `c8` config / existing `tests/e2e/` exclusion approach.)
3. Document opt-in in plan SUMMARY: locally, run with `RUN_RELEASE_E2E=1 node --test tests/release-dry-run-e2e.test.js`.
  </action>
  <verify>
    <automated>node --test tests/release-dry-run-e2e.test.js</automated>
  </verify>
  <acceptance_criteria>
    - Without `RUN_RELEASE_E2E=1`: test runs and reports skipped (exit 0)
    - With `RUN_RELEASE_E2E=1` on a clean tree (after Plans 10-01..10-05 land): test passes; runtime ≤ 15 min
    - Test does NOT contribute to or break the c8 100% gate (excluded from coverage scope)
    - Stdout assertions cover all 9 gate markers + 5 DRY-RUN action markers + fresh-install line
  </acceptance_criteria>
  <done>Release dry-run E2E test green when opted-in; idle when not.</done>
</task>

<task type="auto">
  <name>Task 2: Update STATE.md + ROADMAP.md + RELEASE.md + CHANGELOG.md to mark Phase 10 complete</name>
  <read_first>.planning/STATE.md (full file — note current Phase entry, Decisions list); .planning/ROADMAP.md (Phase 10 row in Progress table at lines 174-185 + Phase 10 details at lines 154-167); .planning/RELEASE.md (existing §1-§5 structure — append §6 in the same style as §5 Phase 8); docs/CHANGELOG.md (existing entry style)</read_first>
  <files>.planning/STATE.md, .planning/ROADMAP.md, .planning/RELEASE.md, docs/CHANGELOG.md</files>
  <action>
1. **STATE.md**: 
   - Update `**Current focus:**` line to `Phase 10 COMPLETE — v0.1.0 release-automation chain live; `npm run release:dry-run` is the single green-button verification`.
   - Update `Phase: 8 of 8 ...` line to `Phase: 10 of 10 (Hardening, Documentation Compliance, and Release Automation) — COMPLETE (6/6 plans)`.
   - Update `Plan: 7 of 7 ...` to `Plan: 6 of 6 in Phase 10 (10-06 complete)`.
   - Update `Status:` to a single sentence summarizing Phase 10's outcome (every previously-human gate now automated; activation-panel/permission-mode/fresh-install gates green; release-v0.1.0.sh + submit-marketplace-pr.sh shipped; doc-scheme.md compliance achieved; backlog defects HARD-01/02/03 closed).
   - Update `Last activity:` to `2026-04-29 — Plan 10-06 sign-off (Phase 10 closer)`.
   - Append to `### Decisions`: 6 lines, one per plan 10-01..10-06, capturing the closed HARD-NN IDs and the key artifact each plan added.
2. **ROADMAP.md**:
   - Phase 10 details (around line 154): replace `**Plans**: TBD ...` with a 6-line bulleted list of the 6 plan filenames + 1-line objectives.
   - Phase 10 row in the Progress table (around line 185): change `0/TBD | Not started | -` to `6/6 | Complete | 2026-04-29`.
   - Top-level checkbox at line 22 (currently `- [ ] **Phase 10: ...`): change to `- [x] **Phase 10: ...** *(complete 2026-04-29 — 6/6 plans, HARD-01..HARD-15)*`.
3. **RELEASE.md**: append a new section `## §6 Phase 10 — Release Automation Sign-Off (2026-04-29)` matching the §5 Phase 8 sign-off style. Include:
   - **Result:** every previously-human gate automated; v0.1.0 release-readiness now verified end-to-end via `npm run release:dry-run`.
   - **Requirements closed table:** HARD-01 → 10-01 ... HARD-15 → 10-06.
   - **New scripts shipped:** `npm run gate:activation-panel`, `npm run gate:permission-mode`, `npm run gate:fresh-install`, `npm run release:dry-run`, `npm run release`.
   - **Outstanding human-needed items (block tag push):** the §1 list at lines 116-118 — strike through each item and replace with the automated gate that now covers it (e.g., `~~Run tests/activation-panel.md~~ → automated by `npm run gate:activation-panel` per Plan 10-03`).
   - **Top-of-file Status line at line 6:** change from `pending-human-signoff` to `automation-complete-pending-tag` (the only remaining step is the maintainer running `npm run release`).
4. **docs/CHANGELOG.md**: prepend (after any header) a new H2:
   ```
   ## 2026-04-29 — Phase 10 closed: v0.1.0 release-automation chain live
   - 10-01: backlog defects HARD-01/02/03 closed (enum-lint typo detection, runCreate cwd lock, license-audit OK-path coverage)
   - 10-02: doc-scheme.md compliance — knowledge/lessons populated, SECURITY.md + CONTRIBUTING.md scaffolded, lint-doc-size.js + CI Gate 7 wired
   - 10-03: activation-panel + permission-mode automation (Jaccard scorer + script walker)
   - 10-04: fresh-install Docker harness (Linux runner; Mac+Win deferred to v1.x)
   - 10-05: marketplace-PR + release-v0.1.0 scripts + npm release/release:dry-run
   - 10-06: release dry-run E2E integration test (opt-in via RUN_RELEASE_E2E=1)
   ```
5. After all 4 file updates, run `node tools/lint-doc-size.js && node tools/lint-doc-size.js --orphans` to verify the size-cap and orphan checks still pass.
  </action>
  <verify>
    <automated>grep -q "Phase 10 COMPLETE" .planning/STATE.md && grep -q "6/6 | Complete | 2026-04-29" .planning/ROADMAP.md && grep -q "§6 Phase 10" .planning/RELEASE.md && grep -q "Phase 10 closed" docs/CHANGELOG.md && node tools/lint-doc-size.js && node tools/lint-doc-size.js --orphans</automated>
  </verify>
  <acceptance_criteria>
    - `grep "Phase 10 COMPLETE" .planning/STATE.md` returns ≥1 line
    - `grep "6/6 | Complete | 2026-04-29" .planning/ROADMAP.md` returns 1 line
    - `grep "§6 Phase 10" .planning/RELEASE.md` returns 1 line
    - `grep "Phase 10 closed" docs/CHANGELOG.md` returns ≥1 line
    - All HARD-NN → 10-NN mappings present in RELEASE.md §6 table
    - `node tools/lint-doc-size.js && node tools/lint-doc-size.js --orphans` exits 0
  </acceptance_criteria>
  <done>Phase 10 marked COMPLETE in STATE/ROADMAP/RELEASE/CHANGELOG; size-cap and orphan checks still green; v0.1.0 ready for `npm run release`.</done>
</task>

</tasks>

<verification>
- HARD-15: `npm run release:dry-run` runs the full automated chain end-to-end without pushing
- All gate markers + DRY-RUN action markers present in stdout
- STATE/ROADMAP/RELEASE/CHANGELOG reflect Phase 10 complete in lock-step
- v0.1.0 release readiness: maintainer running `npm run release` is the only remaining step (no human-only gate left)
</verification>

<success_criteria>
- AC-15 satisfied per SPEC.md
- Phase 10 closes; 6/6 plans complete; ROADMAP top-level checkbox checked
- `npm run release:dry-run` is the single green-button verification for v0.1.0
</success_criteria>

<output>
After completion, create `.planning/phases/10-hardening-documentation-compliance-and-release-automation/10-06-SUMMARY.md`.
</output>
