---
plan: 08-05
phase: 08
slug: skill-md-outcome-tests
status: ready
created: 2026-04-28
wave: 3
depends_on: [08-02]
autonomous: true
files_modified:
  - tests/skill-outcome-harness.js
  - tests/helpers/llm-mock.js
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
requirements: [TEST-04]

must_haves:
  truths:
    - "tests/helpers/llm-mock.js exposes `stubLlmResponse(scenarioName)` reading JSON from `tests/fixtures/llm-stubs/<scenarioName>.json`; deterministic; no network."
    - "tests/skill-outcome-harness.js parses a SKILL.md file, extracts each numbered/bulleted instruction in the playbook into a list, and provides a `runInstruction(skillName, instructionIndex, llmStub)` helper that invokes the corresponding orchestrator path with the stub LLM. parseInstructions MUST return ≥1 instruction for ALL 5 SKILL.md files (not just create); each `tests/skill-outcome/<skill>.test.js` MUST assert `assert.ok(instructions.length > 0)` as the FIRST assertion in the file before any other test runs (W-5 closure)."
    - "Each tests/skill-outcome/<skill>.test.js loads the matching SKILL.md, iterates the extracted instructions, and asserts deterministic OUTCOMES (JSON shape conforms to schema, finding IDs are stable, severity values are in the closed set, render artifact bytes/SHA match fixtures, schema-version routing picks the expected branch)."
    - "5 skill outcome test files exist (create, review, content-review, annotate, doctor) and each runs green against the harness + mock LLM."
    - "create.test.js asserts: cycle-1 produces deck + design-rationale + JSON findings; cycle-2 confirmation when cycle-1 returned 0 findings; converged exit; oscillation exit; soft-cap surface; interrupt exit. Each driven by a different llm-stub scenario."
    - "review.test.js asserts: schema v1.0 emission shape, schema v1.1 emission shape, the 4-tier severity values are preserved (no premature collapse), each R18 AI-tell category emits with correct positioning fields."
    - "content-review.test.js asserts: each of the 7 content checks (Pyramid/MECE, narrative, action-title, claim/evidence, redundancy, audience-fit, standalone-readability) produces findings with the same locked schema as /review."
    - "annotate.test.js asserts: severity collapse 4→3 happens at adapter only; annotate.js still receives only major/minor/polish; produced PPTX SHA matches Phase 1 baseline."
    - "doctor.test.js asserts: report structure + exit-code policy + per-tool gap-or-OK row format (the SKILL.md instructions for /doctor map to skills/doctor/scripts/check.sh)."
    - "Tests cover the SKILL.md instructions explicitly (CONTEXT D-05): each instruction has at least one test that drives the deterministic plumbing surrounding the LLM step and asserts the documented outcome."
    - "Per BLOCKER B-3, Plan 8-05 does NOT add or modify DI hooks or env-var bridges. All `_test_setLlm` / `_test_setRenderImages` exports AND `INSTADECKS_LLM_STUB` / `INSTADECKS_RENDER_STUB` env-var init blocks are owned by Plan 8-02 (single source of truth). Plan 8-05 CONSUMES the existing hooks via `_test_setLlm(stubLlmResponse(scenario))`. If a hook is genuinely missing at execute-time, route back to Plan 8-02 — do NOT add it here."
  artifacts:
    - path: "tests/skill-outcome-harness.js"
      provides: "Single harness — parses SKILL.md instruction list + runInstruction helper"
      contains: "runInstruction"
    - path: "tests/helpers/llm-mock.js"
      provides: "stubLlmResponse(scenarioName) deterministic stub loader"
      contains: "stubLlmResponse"
    - path: "tests/fixtures/llm-stubs/"
      provides: "7 canned LLM response JSONs for the 5 skills' core scenarios"
      contains: "schema_version"
    - path: "tests/skill-outcome/create.test.js"
      provides: "Outcome assertions for /create's auto-refine cycle scenarios"
      contains: "stubLlmResponse"
    - path: "tests/skill-outcome/review.test.js"
      provides: "Outcome assertions for /review's design + R18 findings emission"
      contains: "schema_version"
    - path: "tests/skill-outcome/content-review.test.js"
      provides: "Outcome assertions for /content-review's 7 content checks"
      contains: "Pyramid"
    - path: "tests/skill-outcome/annotate.test.js"
      provides: "Outcome assertions for /annotate's severity collapse + visual baseline"
      contains: "polish"
    - path: "tests/skill-outcome/doctor.test.js"
      provides: "Outcome assertions for /doctor's report shape + exit codes"
  key_links:
    - from: "tests/skill-outcome-harness.js"
      to: "skills/<skill>/SKILL.md"
      via: "fs.readFileSync + extract instructions via section-heading regex"
      pattern: "fs.readFileSync.*SKILL\\.md"
    - from: "tests/skill-outcome/create.test.js"
      to: "skills/create/scripts/index.js"
      via: "imports runCreate + injects stubLlmResponse via _test_setLlm hook (Plan 8-02 Task 3)"
      pattern: "_test_setLlm"
    - from: "tests/skill-outcome/<skill>.test.js"
      to: "tests/fixtures/llm-stubs/<scenario>.json"
      via: "stubLlmResponse(scenario) loads canned JSON"
      pattern: "llm-stubs"
---

<objective>
Wave 3: outcome-based unit tests for every SKILL.md instruction across the 5 user-invocable skills (create, review, content-review, annotate, doctor). The LLM step is mocked via a deterministic harness; the deterministic plumbing (cli.js → orchestrator → render → JSON emit) runs for real. Each test asserts the OUTCOME (JSON shape, finding IDs, severity values, render artifact bytes/SHA, schema-version routing) is deterministic — proving the SKILL.md playbook produces the documented behavior, not just "Claude does its best."

Per CONTEXT D-05, the LLM-DI refactor is the only allowed source mod beyond test files. Plan 8-02 Task 3 owns ALL DI hooks AND env-var bridges (BLOCKER B-3 single source of truth). Plan 8-05 CONSUMES those hooks via `_test_setLlm(stubLlmResponse(scenario))`; it does NOT add or modify production source.

Output: 1 harness, 1 LLM mock helper, 7 stub-JSON fixtures, 5 skill outcome test files. Targeted c8 on `skills/*/scripts/index.js` and SKILL.md-driven entry points reaches 100%.
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
@.planning/phases/08-test-coverage-100/08-02-lib-orchestrator-gap-fill-PLAN.md
@skills/create/SKILL.md
@skills/review/SKILL.md
@skills/content-review/SKILL.md
@skills/annotate/SKILL.md
@skills/doctor/SKILL.md
@skills/create/scripts/index.js
@skills/review/scripts/index.js
@skills/content-review/scripts/index.js
@skills/annotate/scripts/index.js
@skills/doctor/scripts/check.sh
@skills/review/references/findings-schema.md
@tests/fixtures/sample-findings.json
@tests/auto-refine-integration.test.js

<interfaces>
**llm-mock.js — stubLlmResponse contract:**
```js
'use strict';
const fs = require('node:fs');
const path = require('node:path');

function stubLlmResponse(scenarioName) {
  const file = path.join(__dirname, '..', 'fixtures', 'llm-stubs', `${scenarioName}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  // Returns a function compatible with the orchestrator's LLM-call signature:
  // (prompt, opts) => Promise<canned response>.
  return async (_prompt, _opts) => data;
}

module.exports = { stubLlmResponse };
```

**skill-outcome-harness.js — top-level shape:**
```js
'use strict';
const fs = require('node:fs');
const path = require('node:path');

// Extract numbered instruction list from a SKILL.md.
// Heuristic: find the first ordered list (^\d+\. ) under a heading
// matching /Instructions|Playbook|Steps/i, return as array of strings.
function parseInstructions(skillMdPath) { /* ... */ }

// Run a single instruction by index against the corresponding orchestrator.
// `skillName` ∈ {create, review, content-review, annotate, doctor}.
// `llmStub` from stubLlmResponse.
// Returns the orchestrator's output object.
async function runInstruction(skillName, instructionIndex, llmStub, opts = {}) { /* ... */ }

module.exports = { parseInstructions, runInstruction };
```

**llm-stub fixture shapes (canned LLM JSON outputs):**

`create-cycle-1.json` — first cycle: returns a deck-spec + 9 genuine design findings (mix of severities).
`create-cycle-2-converged.json` — second cycle: 0 genuine findings (forces confirmation cycle per CRT-08).
`review-design-findings.json` — schema v1.0, 4-tier severity, R18 AI-tell flags present.
`review-design-v11.json` — schema v1.1 emission shape (the routing branch).
`content-review-findings.json` — findings covering all 7 checks; same schema as review.
`annotate-passthrough.json` — adapter-pre-collapse 4-tier findings (used to test the adapter's collapse).
`doctor-report.json` — minimal canned doctor report (used only if doctor.test.js needs an LLM-driven path; check.sh is bash so this may be unused).

Each fixture conforms to `skills/review/references/findings-schema.md` where applicable.

**Per-skill test outline:**

**create.test.js** — describe blocks:
- "cycle 1 produces deck + design-rationale + JSON findings" (uses create-cycle-1.json).
- "cycle 1 returns 0 → forces confirmation cycle" (uses create-cycle-2-converged.json on cycle 1).
- "cycle 2 with 0 findings → converged exit" (uses create-cycle-2-converged.json).
- "oscillation: cycle N hash == cycle N-2 hash → oscillation exit" (chains stubs to produce hash equality).
- "soft-cap at cycle 5: each user-choice branch (accept / continue / specify)" (3 tests; uses interactive-mock for user-choice).
- "interrupt flag: top-of-cycle .interrupt → clean exit" (touches the flag inside the test).

**review.test.js** — describe blocks:
- "schema v1.0 emission: every required field present, severity in 4-tier set."
- "schema v1.1 emission: routing branch exercised; new fields present."
- "R18 AI-tell flags: each of 3 heuristics emits with `category: defect` + correct nx/ny."
- "structured-handoff mode: deck-spec in, JSON out, no fs roundtrip."
- "file-roundtrip mode: pptx path in, JSON + Markdown both written."

**content-review.test.js** — describe blocks:
- "each of 7 checks contributes findings" (Pyramid/MECE, narrative-arc, action-title, claim/evidence, redundancy, audience-fit, standalone-readability — 7 sub-tests).
- "schema parity with /review: same locked schema; same severity tiers; same finding grammar."
- "content-vs-design boundary: content-review does NOT emit visual/typographic findings (verify by checking categories in stubbed output flow through unchanged)."

**annotate.test.js** — describe blocks:
- "adapter collapses 4→3: Critical+Major→MAJOR; Minor→MINOR; Nitpick→POLISH."
- "adapter filters genuine==true."
- "annotate.js receives only 'major'|'minor'|'polish'."
- "produced PPTX normalized SHA matches Phase 1 baseline (integration anchor; mirrors Plan 8-03 tests/annotate-geometry.test.js but invoked via the SKILL.md instruction path through cli.js + adapter + annotate.js)."
- "standalone mode: pre-existing JSON path + deck path → outputs."
- "pipelined mode: in-memory deck-spec → outputs."

**doctor.test.js** — describe blocks:
- "doctor SKILL.md instructions parse correctly via harness."
- "all-green report: every tool present → exit 0 + green markers."
- "missing soffice → install instruction in stdout."
- "missing fc-list IBM Plex Sans → install instruction."
- "exit-code policy matches script behavior" (this overlaps with Plan 8-04 bats tests; intentional cross-coverage — Plan 8-04 tests the bash script directly, this test invokes through the SKILL.md surface).

**SKILL.md instruction extraction strategy:**
Each SKILL.md has a "Playbook" / "Instructions" / "Steps" section. The harness's `parseInstructions` function locates the first ordered list under such a heading and returns it. If a SKILL.md has multiple instruction blocks, the harness concatenates them in document order.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: harness + llm-mock + 7 stub fixtures</name>
  <files>tests/skill-outcome-harness.js, tests/helpers/llm-mock.js, tests/fixtures/llm-stubs/create-cycle-1.json, tests/fixtures/llm-stubs/create-cycle-2-converged.json, tests/fixtures/llm-stubs/review-design-findings.json, tests/fixtures/llm-stubs/review-design-v11.json, tests/fixtures/llm-stubs/content-review-findings.json, tests/fixtures/llm-stubs/annotate-passthrough.json, tests/fixtures/llm-stubs/doctor-report.json</files>
  <read_first>
    - /Users/shafqat/Documents/Projects/instadecks/skills/create/SKILL.md, review/SKILL.md, content-review/SKILL.md, annotate/SKILL.md, doctor/SKILL.md (read all 5 — confirm where the instruction list lives in each; section heading + list shape)
    - /Users/shafqat/Documents/Projects/instadecks/skills/review/references/findings-schema.md (the locked JSON contract — fixtures MUST conform)
    - /Users/shafqat/Documents/Projects/instadecks/tests/fixtures/sample-findings.json (canonical example — base review-design-findings.json on this shape)
    - /Users/shafqat/Documents/Projects/instadecks/tests/auto-refine-integration.test.js (existing _test_setRunReview pattern — confirms the DI surface area for the harness)
    - /Users/shafqat/Documents/Projects/instadecks/skills/{create,review,content-review,annotate}/scripts/index.js (confirm each orchestrator's LLM-call signature so stubLlmResponse returns the right shape)
  </read_first>
  <action>
    **Step A — author tests/helpers/llm-mock.js** per <interfaces>. ≤30 LOC.

    **Step B — author the 7 fixture JSONs:**
    - Use sample-findings.json as the structural template for review-design-findings.json + content-review-findings.json.
    - For create-cycle-1.json + create-cycle-2-converged.json: include the full per-cycle response shape the orchestrator expects (deck spec, findings array, design rationale partial). Read skills/create/scripts/index.js to confirm the response contract.
    - review-design-v11.json: same as review-design-findings.json but schema_version field set to "1.1" + any v1.1-specific fields (read tests/findings-schema-v11.test.js for the v1.1 delta).
    - annotate-passthrough.json: 4-tier severity inputs that test the adapter's collapse.
    - doctor-report.json: minimal canned doctor response (may go unused; keep small).

    **Step C — author tests/skill-outcome-harness.js** per <interfaces>. parseInstructions uses regex `^#+\s*(Playbook|Instructions|Steps)/im` then captures the first numbered list. runInstruction dispatches by skillName to the matching orchestrator's existing `_test_setLlm(stub)` (added by Plan 8-02 — do NOT add hooks here per BLOCKER B-3) + invokes the entry point. ≤150 LOC.

    **Step D — verify harness in isolation:**
    ```bash
    node -e "const h=require('./tests/skill-outcome-harness'); const ins=h.parseInstructions('skills/create/SKILL.md'); console.log('count:', ins.length); console.log('first:', ins[0]?.slice(0,80))"
    ```
    Expect non-zero count + plausible first instruction. If parseInstructions fails (no matching section), tune the regex and document the SKILL.md heading conventions in the harness header comment.

    **Step E — atomic commits:**
    ```bash
    git add tests/helpers/llm-mock.js tests/fixtures/llm-stubs/
    git commit -m "$(cat <<'EOF'
test(08-05): add llm-mock helper + 7 deterministic LLM stub fixtures

- stubLlmResponse(scenarioName) loads canned JSON; no network.
- 7 fixtures: create-cycle-1, create-cycle-2-converged, review-design-findings,
  review-design-v11, content-review-findings, annotate-passthrough, doctor-report.
- Each conforms to findings-schema.md where applicable.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"

    git add tests/skill-outcome-harness.js
    git commit -m "$(cat <<'EOF'
test(08-05): add skill-outcome-harness — parseInstructions + runInstruction

- parseInstructions: extract numbered list under Playbook/Instructions/Steps heading.
- runInstruction(skillName, idx, llmStub): dispatch to matching orchestrator with
  injected LLM stub via existing _test_setLlm DI hooks (Plan 8-02 Task 3).
- ≤150 LOC; pure plumbing — no test assertions live here.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
    ```
  </action>
  <verify>
    <automated>node -e "const h=require('./tests/skill-outcome-harness'); for (const sk of ['create','review','content-review','annotate','doctor']) { const ins=h.parseInstructions('skills/'+sk+'/SKILL.md'); if(!ins||!ins.length){console.error('parseInstructions failed for', sk); process.exit(1);} }" && node -e "const m=require('./tests/helpers/llm-mock'); m.stubLlmResponse('create-cycle-1').then(r=>process.exit(0)).catch(()=>process.exit(2));" && for f in create-cycle-1 create-cycle-2-converged review-design-findings review-design-v11 content-review-findings annotate-passthrough doctor-report; do test -f "tests/fixtures/llm-stubs/$f.json" || exit 3; done</automated>
  </verify>
  <acceptance_criteria>
    - tests/helpers/llm-mock.js exports `stubLlmResponse`.
    - tests/skill-outcome-harness.js exports `parseInstructions` and `runInstruction`.
    - 7 fixture JSONs exist under tests/fixtures/llm-stubs/.
    - parseInstructions returns ≥1 instruction for ALL 5 SKILL.md files (create, review, content-review, annotate, doctor) — verified in Task 1 Step D + verify automated (W-5).
    - 2 atomic commits landed.
  </acceptance_criteria>
  <done>Harness + mock + fixtures in place; 5 skill test files in Task 2 can target them.</done>
</task>

<task type="auto">
  <name>Task 2: 5 skill outcome test files (create / review / content-review / annotate / doctor)</name>
  <files>tests/skill-outcome/create.test.js, tests/skill-outcome/review.test.js, tests/skill-outcome/content-review.test.js, tests/skill-outcome/annotate.test.js, tests/skill-outcome/doctor.test.js</files>
  <read_first>
    - /Users/shafqat/Documents/Projects/instadecks/tests/skill-outcome-harness.js (Task 1 output)
    - /Users/shafqat/Documents/Projects/instadecks/tests/helpers/llm-mock.js (Task 1 output)
    - /Users/shafqat/Documents/Projects/instadecks/tests/fixtures/llm-stubs/ (Task 1 output)
    - /Users/shafqat/Documents/Projects/instadecks/skills/{create,review,content-review,annotate,doctor}/SKILL.md (each fully — instruction lists drive test enumeration)
    - /Users/shafqat/Documents/Projects/instadecks/tests/auto-refine-integration.test.js (precedent for cycle-driven testing)
    - /Users/shafqat/Documents/Projects/instadecks/tests/findings-schema-v11.test.js (precedent for schema-version routing tests)
    - /Users/shafqat/Documents/Projects/instadecks/tests/annotate-adapter.test.js (precedent for severity collapse tests)
    - /Users/shafqat/Documents/Projects/instadecks/tests/content-review-checks.test.js (precedent for the 7 content checks)
    - /Users/shafqat/Documents/Projects/instadecks/tests/orchestrator-runCreate-branches.test.js, runReview-branches.test.js, runContentReview-branches.test.js, runAnnotate-branches.test.js (Plan 8-02 Task 3 outputs — outcome tests build on top, don't duplicate)
  </read_first>
  <action>
    **Step A — for each of the 5 skills, in order:**
    1. Read SKILL.md, list instructions with `parseInstructions`.
    2. Map each instruction to a `describe` + `test` per <interfaces> "Per-skill test outline".
    3. Author the test file using `runInstruction(skill, idx, stubLlmResponse(scenario))` for the LLM-driven branches.
    4. For non-LLM branches (e.g. doctor.test.js's bash-script paths), bypass the harness and call the orchestrator/script directly (still asserting outcome shape).
    5. Run `node --test tests/skill-outcome/<skill>.test.js` after each — green before moving on.

    **Step B — atomic commits, one per file (5 commits):**
    ```bash
    for skill in create review content-review annotate doctor; do
      git add "tests/skill-outcome/${skill}.test.js"
      git commit -m "$(cat <<EOF
test(08-05): outcome assertions for /${skill} SKILL.md instructions

Mocks LLM via stubLlmResponse; asserts deterministic outcomes (schema shape,
finding IDs, severity values, render artifact bytes/SHA, schema-version
routing) per CONTEXT D-05.
Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
    done
    ```

    **Step C — targeted c8 probe (single run, D-09):**
    ```bash
    npx c8 --reporter=text \
      --include 'skills/**/index.js' --include 'skills/**/cli.js' --include 'skills/**/adapter.js' \
      node --test tests/skill-outcome/ tests/orchestrator-*-branches.test.js tests/cli-*-branches.test.js tests/auto-refine-integration.test.js
    ```
    Target: 100% on each orchestrator + cli + adapter file.
  </action>
  <verify>
    <automated>node --test tests/skill-outcome/create.test.js tests/skill-outcome/review.test.js tests/skill-outcome/content-review.test.js tests/skill-outcome/annotate.test.js tests/skill-outcome/doctor.test.js</automated>
  </verify>
  <acceptance_criteria>
    - 5 test files exist under tests/skill-outcome/.
    - Each file imports the harness + llm-mock and uses `runInstruction` for at least the LLM-driven describes.
    - Each file's FIRST `test()` block asserts `assert.ok(instructions.length > 0)` after calling `parseInstructions` on the matching SKILL.md (W-5 first-assertion rule).
    - create.test.js covers all 6 cycle scenarios listed in <interfaces>.
    - review.test.js covers schema v1.0 + v1.1 + R18 AI-tells + both modes.
    - content-review.test.js covers all 7 checks + schema parity + boundary.
    - annotate.test.js covers severity collapse + genuine filter + standalone + pipelined + visual baseline.
    - doctor.test.js covers all-green + missing-tool + exit-code policy.
    - All 5 files run green.
    - 5 atomic commits landed.
  </acceptance_criteria>
  <done>Every SKILL.md instruction across all 5 skills has at least one outcome assertion driven by a deterministic LLM stub.</done>
</task>

</tasks>

<threat_model>
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-08-13 | Tampering | LLM stub diverges from real LLM behavior, masking bugs | mitigate | Stubs are derived from sample-findings.json + findings-schema.md (the locked contract); if a real LLM emits something off-schema, the schema validator catches it independently. |
| T-08-14 | Spoofing | parseInstructions misreads SKILL.md, silently dropping instructions | mitigate | Task 1 verify step asserts ≥1 instruction per SKILL.md; SUMMARY records the count per skill. |
| T-08-15 | Repudiation | SKILL.md updates after Phase 8 invalidate the test set | accept | Future SKILL.md edits trigger CI; if parseInstructions count drops without a test update, c8 coverage will surface gaps; this is the intended feedback loop. |
</threat_model>

<verification>
- 1 harness + 1 mock + 7 stubs + 5 outcome tests = 14 new files.
- All 5 outcome tests green via `node --test tests/skill-outcome/`.
- parseInstructions returns ≥1 instruction per SKILL.md (verified in Task 1 Step D).
- Targeted c8 probe 100% on orchestrators, cli, adapter.
- 7 atomic commits across 2 tasks.
</verification>

<success_criteria>
- TEST-04 (every SKILL.md has outcome-based unit tests with mocked LLM + deterministic outcomes) closed.
- LLM-DI carve-out (CONTEXT D-05) consumed reproducibly across 4 orchestrators (hooks added by Plan 8-02 per BLOCKER B-3; this plan only consumes them).
- Future SKILL.md changes are immediately auditable: instruction count + outcome assertion count are both grep-verifiable.
- Visual baseline + schema-version routing remain the system-level anchors of correctness.
</success_criteria>

<output>
`.planning/phases/08-test-coverage-100/08-05-SUMMARY.md` — instruction counts per SKILL.md, fixture inventory + provenance, list of any DI hooks added beyond Plan 8-02 Task 3, targeted c8 % per orchestrator, residual <2% branches with downstream Plan ownership.
</output>
