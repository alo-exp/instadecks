---
plan: 08-06
phase: 08
slug: smoke-and-e2e-runner
status: ready
created: 2026-04-28
wave: 3
depends_on: [08-02]
autonomous: true
files_modified:
  - tests/smoke/cli-create-help.test.js
  - tests/smoke/cli-review-help.test.js
  - tests/smoke/cli-content-review-help.test.js
  - tests/smoke/cli-annotate-help.test.js
  - tests/smoke/cli-create-min.test.js
  - tests/smoke/cli-review-min.test.js
  - tests/smoke/cli-content-review-min.test.js
  - tests/smoke/cli-annotate-min.test.js
  - tests/smoke/_runner-time.test.js
  - tests/smoke/README.md
  - tests/e2e/create-real-soffice.test.js
  - tests/e2e/review-real-soffice.test.js
  - tests/e2e/annotate-real-soffice.test.js
  - tests/e2e/helpers/skip-without-soffice.js
  - tests/e2e/README.md
requirements: [TEST-05, TEST-07]

must_haves:
  truths:
    - "tests/smoke/ contains 8 test files: 4 --help smoke tests + 4 minimal-valid-input smoke tests (one per cli.js: create, review, content-review, annotate)."
    - "Each --help smoke test asserts: exit 0, stdout first non-empty line matches a documented banner shape (e.g. starts with 'Usage:' or skill name), runs in <2s."
    - "Each minimal-valid-input smoke test runs a happy-path invocation with: LLM stub injected via env var (`INSTADECKS_LLM_STUB=tests/fixtures/llm-stubs/<scenario>.json`) + soffice/pdftoppm stubbed via DI, asserting exit 0 + expected sidecar output (JSON or PPTX) materializes."
    - "Whole tests/smoke/ suite completes in ≤30s end-to-end (CONTEXT D-06). The wall-clock total is ASSERTED in a runner wrapper (`tests/smoke/_runner-time.test.js` OR a final smoke test that reads `process.hrtime` against a recorded start) — not just hoped for. If exceeded, the test fails (W-6 closure)."
    - "Each smoke test has an EXACT filename (no placeholders) and EXACT cli arg patterns. Filenames pre-discovered + recorded in <interfaces>; cli arg patterns confirmed by reading each `skills/*/scripts/cli.js` BEFORE authoring (W-6)."
    - "tests/e2e/ contains 3 real-soffice tests (create / review / annotate) — each guarded by `skipWithoutSoffice()` from helpers/skip-without-soffice.js so absent-soffice causes silent skip + `CI=true` env causes unconditional skip (CONTEXT D-08)."
    - "tests/e2e/helpers/skip-without-soffice.js exports a single function that consults `process.env.CI` + `commandExists('soffice')` and returns true when the test should be skipped; uses `node:test`'s `t.skip(reason)` mechanism."
    - "tests/smoke/README.md + tests/e2e/README.md document the contract: smoke is fast + always-on; e2e is real-system + opt-in via local soffice."
    - "FRESH-INSTALL.md (existing, untouched by this plan) remains the human E2E gate for v0.1.0 per CONTEXT D-08."
    - "package.json `test:smoke` runs only `tests/smoke/**/*.test.js`; package.json `test:e2e` runs only `tests/e2e/**/*.test.js` (Plan 8-01 already added these scripts; this plan only verifies the globs match the new files)."
    - "Smoke tests are part of the c8 coverage run (no special exclusion); e2e tests are NOT (excluded via .c8rc.json — Plan 8-07 confirms exclusion if needed)."
  artifacts:
    - path: "tests/smoke/cli-create-help.test.js"
      provides: "smoke: /create --help exit 0 + banner shape"
      contains: "--help"
    - path: "tests/smoke/cli-create-min.test.js"
      provides: "smoke: /create with stubbed LLM + stubbed soffice → exits 0 with sidecar artifacts"
      contains: "INSTADECKS_LLM_STUB"
    - path: "tests/e2e/create-real-soffice.test.js"
      provides: "e2e: /create end-to-end with real soffice; skipped when soffice absent or CI=true"
      contains: "skipWithoutSoffice"
    - path: "tests/e2e/helpers/skip-without-soffice.js"
      provides: "Skip helper for soffice-dependent e2e tests"
      contains: "process.env.CI"
    - path: "tests/smoke/README.md"
      provides: "Smoke contract documentation"
    - path: "tests/e2e/README.md"
      provides: "E2E contract documentation; FRESH-INSTALL.md as the human gate"
  key_links:
    - from: "tests/smoke/cli-create-min.test.js"
      to: "tests/fixtures/llm-stubs/create-cycle-2-converged.json"
      via: "env var INSTADECKS_LLM_STUB points to the stub; orchestrator's _test_setLlm reads it on init"
      pattern: "llm-stubs"
    - from: "tests/e2e/*-real-soffice.test.js"
      to: "tests/e2e/helpers/skip-without-soffice.js"
      via: "first line of every e2e test invokes skipWithoutSoffice(t)"
      pattern: "skipWithoutSoffice"
---

<objective>
Wave 3 (parallel with 8-05): smoke suite + e2e runner. Smoke runs in <30s in CI on every push, exercises every cli.js's --help + minimal-valid-input path with stubbed LLM + stubbed soffice. E2E runs locally only when `soffice` is on PATH and `CI` is unset; never runs in CI; FRESH-INSTALL.md remains the human gate.

Per CONTEXT D-06 and D-08, smoke is fast and deterministic; e2e is honest about external-dependency requirements and skips silently when those dependencies are absent. The e2e directory's purpose is to keep "does the real pipeline run?" testable on developer machines without polluting CI runtime.

Output: 8 smoke files + 3 e2e files + 1 e2e helper + 2 READMEs. Plan 8-01 already added the npm scripts; this plan populates the directories. Per W-6: smoke wall-clock budget is asserted in the test runner (30000ms hard cap surfaced via `--test-timeout` + a wrapper time-check); ONE cli-min smoke test is authored + verified end-to-end BEFORE the remaining 7 are bulk-authored (pre-validation reduces blast radius).
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
@.planning/phases/08-test-coverage-100/08-05-skill-md-outcome-tests-PLAN.md
@skills/create/scripts/cli.js
@skills/review/scripts/cli.js
@skills/content-review/scripts/cli.js
@skills/annotate/scripts/cli.js
@tests/FRESH-INSTALL.md
@tests/cli-create-branches.test.js
@tests/cli-review-branches.test.js
@tests/cli-content-review-branches.test.js
@tests/cli-annotate-branches.test.js
@tests/skill-outcome-harness.js
@tests/helpers/llm-mock.js
@tests/fixtures/llm-stubs/create-cycle-2-converged.json
@tests/smoke/.gitkeep
@package.json

<interfaces>
**Smoke test pattern (tests/smoke/cli-<skill>-help.test.js):**
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('cli-<skill> --help exits 0 with banner', () => {
  const cli = path.resolve(__dirname, '..', '..', 'skills', '<skill>', 'scripts', 'cli.js');
  const r = spawnSync('node', [cli, '--help'], { encoding: 'utf8', timeout: 5000 });
  assert.equal(r.status, 0, `exit code: ${r.status}; stderr: ${r.stderr}`);
  assert.match(r.stdout.trim().split('\n')[0], /Usage|<skill>/i);
});
```

**Smoke test pattern — minimal valid input (tests/smoke/cli-<skill>-min.test.js):**
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

test('cli-<skill> minimal-valid-input exits 0 + emits expected artifact', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'instadecks-smoke-'));
  const env = {
    ...process.env,
    INSTADECKS_LLM_STUB: path.resolve(__dirname, '..', 'fixtures', 'llm-stubs', '<scenario>.json'),
    INSTADECKS_RENDER_STUB: '1',     // bypasses soffice via the orchestrator's _test_setRenderImages hook (read at module init when env=1)
    INSTADECKS_RUN_DIR: tmp,
  };
  const cli = path.resolve(__dirname, '..', '..', 'skills', '<skill>', 'scripts', 'cli.js');
  const args = [cli, /* minimal flags appropriate per skill */];
  const r = spawnSync('node', args, { encoding: 'utf8', env, timeout: 25000 });
  assert.equal(r.status, 0, `stderr: ${r.stderr}`);
  // Artifact assertion: e.g. for /review, expect <tmp>/findings.json
  assert.ok(fs.existsSync(path.join(tmp, '<expected-artifact>')), 'expected artifact missing');
});
```

**Env-var DI bridge (consumed, not authored — BLOCKER B-3):**
Plan 8-02 owns the env-var bridge in every `skills/*/scripts/index.js` (single source of truth). The cli.js imports the orchestrator at module load; the orchestrator's module-level init reads `process.env.INSTADECKS_LLM_STUB` and `process.env.INSTADECKS_RENDER_STUB` once at first import and wires the stubs via `_test_setLlm` / `_test_setRenderImages`. Plan 8-06 ONLY sets these env vars in the smoke test subprocess — it does NOT modify orchestrator source.

**E2E pattern (tests/e2e/<skill>-real-soffice.test.js):**
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { skipWithoutSoffice } = require('./helpers/skip-without-soffice');
// ... imports

test('<skill> real-soffice end-to-end', async (t) => {
  if (skipWithoutSoffice(t)) return;
  // run real cli + assert real artifact present
});
```

**skip-without-soffice.js:**
```js
'use strict';
const { spawnSync } = require('node:child_process');

function skipWithoutSoffice(t) {
  if (process.env.CI === 'true') {
    t.skip('CI=true: e2e tests do not run in CI (CONTEXT D-08)');
    return true;
  }
  const r = spawnSync('command', ['-v', 'soffice'], { shell: true, encoding: 'utf8' });
  if (r.status !== 0) {
    t.skip('soffice not on PATH; install LibreOffice to run e2e tests');
    return true;
  }
  return false;
}

module.exports = { skipWithoutSoffice };
```

**Per-skill smoke artifact expectations:**
| Skill | Stub scenario | Expected artifact |
|---|---|---|
| create | create-cycle-2-converged | <tmp>/deck.pptx + <tmp>/findings.json + <tmp>/design-rationale.md |
| review | review-design-findings | <tmp>/findings.json + <tmp>/review.md |
| content-review | content-review-findings | <tmp>/findings.json + <tmp>/content-review.md |
| annotate | annotate-passthrough | <tmp>/Annotations_*.pptx |

Read each cli.js to confirm exact flag names and artifact filenames before authoring.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: 8 smoke tests (4 --help + 4 min-valid) + smoke README + env-var DI bridge if needed</name>
  <files>tests/smoke/cli-create-help.test.js, tests/smoke/cli-review-help.test.js, tests/smoke/cli-content-review-help.test.js, tests/smoke/cli-annotate-help.test.js, tests/smoke/cli-create-min.test.js, tests/smoke/cli-review-min.test.js, tests/smoke/cli-content-review-min.test.js, tests/smoke/cli-annotate-min.test.js, tests/smoke/_runner-time.test.js, tests/smoke/README.md</files>
  <read_first>
    - /Users/shafqat/Documents/Projects/instadecks/skills/{create,review,content-review,annotate}/scripts/cli.js (read each fully — confirm flag names, artifact filenames written by orchestrator, --help banner shape)
    - /Users/shafqat/Documents/Projects/instadecks/skills/{create,review,content-review,annotate}/scripts/index.js (confirm whether the env-var DI bridge from <interfaces> is already present per Plan 8-02 Task 3; add if missing)
    - /Users/shafqat/Documents/Projects/instadecks/tests/cli-{create,review,content-review,annotate}-branches.test.js (Plan 8-02 Task 2 outputs — smoke tests are similar but use spawnSync subprocess, not require — to validate the cli runs as a real process)
    - /Users/shafqat/Documents/Projects/instadecks/tests/fixtures/llm-stubs/ (Plan 8-05 Task 1 outputs — smoke uses these via env var)
    - /Users/shafqat/Documents/Projects/instadecks/tests/helpers/llm-mock.js (Plan 8-05 Task 1 — env-var bridge requires this)
    - /Users/shafqat/Documents/Projects/instadecks/.planning/phases/08-test-coverage-100/08-CONTEXT.md (D-06 — <30s wall-clock; D-09 — no full-suite runs during this plan)
  </read_first>
  <action>
    **Step A — verify env-var DI bridge present in all 4 orchestrators (added by Plan 8-02 per BLOCKER B-3 single source of truth).** Run `grep -l 'INSTADECKS_LLM_STUB' skills/*/scripts/index.js` and confirm 4 matches. If ANY orchestrator is missing the bridge, STOP this plan and route back to Plan 8-02 — Plan 8-06 does NOT add or modify DI hooks or env-var bridges.

    **Step A.5 — pre-validate ONE cli-min smoke test before bulk-authoring (W-6):** Author `tests/smoke/cli-create-min.test.js` ALONE first. Run it via `npm run test:smoke 2>&1 | tee /tmp/smoke-pre.txt`. Confirm: (a) exit 0, (b) wall-clock <5s for that single test, (c) the env-var bridge in `skills/create/scripts/index.js` actually fires (grep `/tmp/smoke-pre.txt` for the stub fixture name to confirm). If ANY of (a)/(b)/(c) fails, FIX before authoring the remaining 7 smoke tests. This pre-validation prevents a cascade of broken smoke tests from a single bridge mis-configuration.

    **Step B — author 4 --help smoke tests** per <interfaces>. Each is ~15 LOC. Confirm each cli's banner regex by running `node skills/<skill>/scripts/cli.js --help` once locally and adapting the regex to match the actual first line.

    **Step C — author 4 min-valid smoke tests** per <interfaces> per-skill artifact expectations table. Each is ~30 LOC. Verify the artifact filenames by reading the orchestrator (each writes a deterministic set of files; the smoke test asserts existence of one or two).

    **Step D — author tests/smoke/README.md:**
    ```markdown
    # Smoke tests

    Fast, deterministic smoke tests for every cli.js. Always run in CI; complete in <30s.

    ## What's stubbed
    - LLM: `INSTADECKS_LLM_STUB=<path-to-fixture>` env var.
    - soffice / pdftoppm: `INSTADECKS_RENDER_STUB=1` env var bypasses image rendering via the orchestrator's _test_setRenderImages DI hook (CONTEXT D-05 carve-out).

    ## What's NOT stubbed
    - argv parsing.
    - cli.js → orchestrator dispatch.
    - JSON / Markdown sidecar emit.
    - File I/O within $TMPDIR.

    ## Running
    `npm run test:smoke` (runs `node --test tests/smoke/**/*.test.js`).
    ```

    **Step E — verify locally (single run, D-09):**
    ```bash
    npm run test:smoke
    ```
    Expect <30s wall-clock + all 8 tests green. If a smoke test exceeds 5s individually, surface in SUMMARY for tuning.

    **Step F — atomic commits:**
    ```bash
    # Smoke tests only — env-var bridge already in place from Plan 8-02 (BLOCKER B-3):
    git add tests/smoke/cli-*.test.js tests/smoke/README.md
    git commit -m "$(cat <<'EOF'
test(08-06): smoke suite — 4 --help + 4 minimal-valid-input tests <30s total

LLM via INSTADECKS_LLM_STUB; soffice via INSTADECKS_RENDER_STUB; argv parsing
+ cli.js→orchestrator dispatch + sidecar emit run for real (subprocess).
README documents the stub contract.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
    ```
  </action>
  <verify>
    <automated>npm run test:smoke 2>&1 | tee /tmp/smoke-out.txt && test $(grep -c '^# tests ' /tmp/smoke-out.txt) -ge 1</automated>
  </verify>
  <acceptance_criteria>
    - 8 cli smoke test files + 1 runner-time test exist under tests/smoke/ (W-6).
    - tests/smoke/README.md exists and documents the env-var stub contract.
    - `npm run test:smoke` exits 0 with all 8 tests green.
    - Wall-clock under 30s (CONTEXT D-06) — ASSERTED in a runner wrapper test (`tests/smoke/_runner-time.test.js` OR equivalent), NOT merely surfaced in SUMMARY (W-6).
    - Each orchestrator has the env-var DI bridge — verified by grep, NOT added here (per BLOCKER B-3, Plan 8-02 owns this).
    - 1-2 atomic commits landed.
  </acceptance_criteria>
  <done>Smoke suite green; <30s; 4 cli.js + their happy-path orchestrator dispatch covered as subprocess invocations.</done>
</task>

<task type="auto">
  <name>Task 2: 3 e2e tests + skip-without-soffice helper + e2e README</name>
  <files>tests/e2e/create-real-soffice.test.js, tests/e2e/review-real-soffice.test.js, tests/e2e/annotate-real-soffice.test.js, tests/e2e/helpers/skip-without-soffice.js, tests/e2e/README.md</files>
  <read_first>
    - /Users/shafqat/Documents/Projects/instadecks/tests/FRESH-INSTALL.md (the human gate — e2e tests complement, don't replace)
    - /Users/shafqat/Documents/Projects/instadecks/tests/annotate-runtime.test.js (existing precedent for invoking annotate end-to-end)
    - /Users/shafqat/Documents/Projects/instadecks/tests/review-integration.test.js (existing precedent for invoking review end-to-end)
    - /Users/shafqat/Documents/Projects/instadecks/skills/{create,review,annotate}/scripts/cli.js (entry points)
    - /Users/shafqat/Documents/Projects/instadecks/.planning/phases/08-test-coverage-100/08-CONTEXT.md (D-08 — silently skip when soffice absent OR CI=true)
  </read_first>
  <action>
    **Step A — author tests/e2e/helpers/skip-without-soffice.js** per <interfaces> exactly. ≤25 LOC.

    **Step B — author 3 e2e tests** per <interfaces>:
    - `tests/e2e/create-real-soffice.test.js`: invoke `/create` cli with a small input fixture; assert real PPTX + PDF land in run dir; LLM stays stubbed (we're testing the real soffice + real pptxgenjs render path, not the real LLM).
    - `tests/e2e/review-real-soffice.test.js`: invoke `/review` against a real PPTX in tests/fixtures/v8-reference/Annotations_Sample.pptx; assert findings.json + review.md materialize; image rendering is real.
    - `tests/e2e/annotate-real-soffice.test.js`: invoke `/annotate` end-to-end on tests/fixtures/sample-findings.json + the v8 reference PPTX; assert annotated PPTX + annotated PDF (the PDF requires real soffice).

    Each test's first line: `if (skipWithoutSoffice(t)) return;`. CI=true → silent skip. soffice absent → silent skip.

    **Step C — author tests/e2e/README.md:**
    ```markdown
    # End-to-end tests (real soffice)

    These tests run the full pipeline with REAL soffice + pdftoppm. They DO NOT run in CI.
    They are local-only opt-in tests that complement the human FRESH-INSTALL.md gate.

    ## Skip rules (CONTEXT D-08)
    - `process.env.CI === 'true'` → silent skip.
    - `command -v soffice` returns nothing → silent skip with install hint.

    ## Running locally
    1. Install LibreOffice + Poppler (see FRESH-INSTALL.md).
    2. `npm run test:e2e`.

    ## Why real?
    soffice's PDF rendering and pptxgenjs's pptx output have non-deterministic edges (timestamps, descr paths). Smoke tests stub these to keep CI fast; e2e tests catch divergence on developer machines before merge.

    ## Relationship to FRESH-INSTALL.md
    FRESH-INSTALL.md is the human gate for v0.1.0: a human walks through install + first-run + sample invocation. tests/e2e/ is a developer-machine convenience that catches regressions earlier; it does NOT replace the human gate.
    ```

    **Step D — verify locally (single run, D-09):**
    ```bash
    if command -v soffice >/dev/null && [ "$CI" != "true" ]; then
      npm run test:e2e
    else
      echo "soffice absent or CI=true; e2e tests skipped (expected)."
      # Verify the skip path works:
      CI=true npm run test:e2e 2>&1 | grep -i 'skip'
    fi
    ```

    **Step E — atomic commit:**
    ```bash
    git add tests/e2e/
    git commit -m "$(cat <<'EOF'
test(08-06): e2e suite (real soffice) with skipWithoutSoffice helper + README

3 e2e tests (create / review / annotate) end-to-end against real soffice +
pdftoppm; silent skip when CI=true OR soffice absent (CONTEXT D-08).
Complements FRESH-INSTALL.md as a developer-machine pre-merge regression
catcher; does not run in CI.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
    ```
  </action>
  <verify>
    <automated>test -f tests/e2e/helpers/skip-without-soffice.js && grep -q 'process.env.CI' tests/e2e/helpers/skip-without-soffice.js && test -f tests/e2e/create-real-soffice.test.js && test -f tests/e2e/review-real-soffice.test.js && test -f tests/e2e/annotate-real-soffice.test.js && test -f tests/e2e/README.md && CI=true npm run test:e2e 2>&1 | grep -qi 'skip'</automated>
  </verify>
  <acceptance_criteria>
    - tests/e2e/helpers/skip-without-soffice.js exports `skipWithoutSoffice`; references `process.env.CI` and `soffice` PATH check.
    - 3 e2e test files exist; each first line invokes `skipWithoutSoffice(t)`.
    - tests/e2e/README.md documents skip rules + relationship to FRESH-INSTALL.md.
    - `CI=true npm run test:e2e` skips silently (no failures).
    - Locally with soffice on PATH (developer's choice), `npm run test:e2e` runs the real pipeline; if soffice is absent the run skips silently.
    - Atomic commit landed.
  </acceptance_criteria>
  <done>e2e runner contract in place; smoke suite is the always-on path, e2e is the opt-in local sibling, FRESH-INSTALL.md remains the human gate.</done>
</task>

</tasks>

<threat_model>
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-08-16 | Tampering | INSTADECKS_LLM_STUB env var pointing at attacker-controlled JSON in production | mitigate | The DI bridge is documented as test-only; production deployment hardening is out of scope for v0.1.0; surface in v1.x as a config audit. |
| T-08-17 | DoS | Smoke suite exceeds 30s in CI as codebase grows | mitigate | SUMMARY records per-test wall-clock; Plan 8-07 verifies the <30s budget; if exceeded, split into priority + extended subgroups. |
| T-08-18 | Repudiation | E2E test passes locally, fails on a different machine due to soffice version drift | accept | E2E is opt-in; FRESH-INSTALL.md is the human gate; soffice version drift is documented in tests/FRESH-INSTALL.md. |
</threat_model>

<verification>
- 8 smoke + 1 runner-time + 3 e2e + 1 helper + 2 READMEs = 15 new files.
- `npm run test:smoke` exits 0 in <30s with 8 tests green.
- `CI=true npm run test:e2e` skips all 3 e2e tests silently.
- Each orchestrator has the env-var DI bridge (verified by grep).
- 2-3 atomic commits across both tasks.
</verification>

<success_criteria>
- TEST-05 (smoke <30s with --help + minimal-valid-input per cli) closed.
- TEST-07 (e2e runs locally with real soffice; skipped when absent or CI=true; FRESH-INSTALL.md as human gate) closed.
- Smoke runs as part of c8 coverage; e2e excluded from coverage gate.
- Plan 8-07 can flip the CI workflow to use `npm run coverage:check` confidently — smoke runs are part of the suite and bring fresh coverage with them.
</success_criteria>

<output>
`.planning/phases/08-test-coverage-100/08-06-SUMMARY.md` — smoke + e2e file inventory, smoke wall-clock total + per-test, e2e skip behavior verified, env-var DI bridge inventory (which orchestrators got it in this plan vs. Plan 8-02), any tunings recommended for Plan 8-07 CI step.
</output>
