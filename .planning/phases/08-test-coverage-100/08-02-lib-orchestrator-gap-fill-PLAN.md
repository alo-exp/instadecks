---
plan: 08-02
phase: 08
slug: lib-orchestrator-gap-fill
status: ready
created: 2026-04-28
wave: 2
depends_on: [08-01]
autonomous: true
files_modified:
  - tests/lib-content-review-extract-content.test.js
  - tests/lib-content-review-jargon.test.js
  - tests/lib-content-review-length-check.test.js
  - tests/lib-content-review-redundancy.test.js
  - tests/lib-content-review-title-adapter.test.js
  - tests/lib-create-deck-brief-branches.test.js
  - tests/lib-create-design-validator-branches.test.js
  - tests/lib-create-enum-lint-branches.test.js
  - tests/lib-create-loop-primitives-branches.test.js
  - tests/lib-create-oscillation-branches.test.js
  - tests/lib-create-render-rationale-branches.test.js
  - tests/lib-create-title-check-branches.test.js
  - tests/lib-review-read-deck-xml-branches.test.js
  - tests/lib-review-schema-validator-branches.test.js
  - tests/cli-create-branches.test.js
  - tests/cli-review-branches.test.js
  - tests/cli-content-review-branches.test.js
  - tests/cli-annotate-branches.test.js
  - tests/orchestrator-runCreate-branches.test.js
  - tests/orchestrator-runReview-branches.test.js
  - tests/orchestrator-runContentReview-branches.test.js
  - tests/orchestrator-runAnnotate-branches.test.js
  - tests/tools-validate-manifest-branches.test.js
  - tests/tools-audit-allowed-tools-branches.test.js
  - tests/tools-license-audit-branches.test.js
  - tests/tools-assert-pptxgenjs-pin-branches.test.js
  - tests/tools-lint-pptxgenjs-enums-branches.test.js
  - tests/tools-normalize-pptx-sha-branches.test.js
  - tests/tools-build-cross-domain-fixture-branches.test.js
  - tests/tools-build-tiny-deck-fixture-branches.test.js
  - tests/tools-build-ai-tells-fixtures-branches.test.js
  - tests/render-fixed-branches.test.js
  - tests/render-content-fixed-branches.test.js
  - tests/ai-tells-branches.test.js
  - tests/auto-refine-integration.test.js
  - skills/create/scripts/index.js
  - skills/review/scripts/index.js
  - skills/content-review/scripts/index.js
  - skills/annotate/scripts/index.js
requirements: [TEST-02, TEST-06]

must_haves:
  truths:
    - "Every file under skills/*/scripts/lib/ has at least one branch-completion test file directly importing it (no test relies solely on integration coverage)."
    - "Every cli.js (annotate, create, review, content-review) has a dedicated branch-coverage test that exercises argv parsing, --help / --version exit shape, missing-arg error path, and the orchestrator dispatch happy path with a mocked orchestrator."
    - "Every orchestrator (runCreate, runReview, runContentReview, runAnnotate) has a branch-coverage test exercising: (a) soffice-failure path, (b) interrupt-flag top-of-cycle exit (where applicable), (c) oscillation early-exit (runCreate only), (d) soft-cap user-choice branches (runCreate only), (e) the schema-version routing branch (review + content-review v1.0 vs v1.1)."
    - "Every file under tools/ that is in CONTEXT D-03 scope has a branch-coverage test (validate-manifest, audit-allowed-tools, license-audit, assert-pptxgenjs-pin, lint-pptxgenjs-enums, normalize-pptx-sha, build-cross-domain-fixture, build-tiny-deck-fixture, build-ai-tells-fixtures) — fixture builders + normalize-pptx-sha included per BLOCKER B-1."
    - "`skills/review/scripts/render-fixed.js`, `skills/content-review/scripts/render-content-fixed.js`, and `skills/review/scripts/ai-tells.js` each have a dedicated branch-coverage test (W-3 closure)."
    - "`tests/auto-refine-integration.test.js` is extended with 6 explicit `test()` blocks covering D-07 branches (cycle-1 zero-findings confirmation, oscillation-strict (D-09), soft-cap 4-option UX, top-of-cycle interrupt, schema v1.1 routing, content-vs-design BIDIRECTIONAL) — canonical TEST-06 deliverable per BLOCKER B-4."
    - "Targeted c8 run `npx c8 --reporter=text --include 'skills/**/lib/**' --include 'skills/**/cli.js' --include 'skills/**/index.js' --include 'tools/**' node --test <new test files only>` shows 100% branch + line + function coverage on the targeted files (residual <2% is reserved for files Plans 8-03/8-04/8-05 close)."
    - "Plan 8-02 is the SINGLE source of truth for ALL DI hooks (`_test_setLlm`, `_test_setRenderImages`) AND the env-var bridge (`INSTADECKS_LLM_STUB`, `INSTADECKS_RENDER_STUB`) across every orchestrator (`skills/create/scripts/index.js`, `skills/review/scripts/index.js`, `skills/content-review/scripts/index.js`, `skills/annotate/scripts/index.js`). Plans 8-05 and 8-06 CONSUME these hooks and never add new ones (BLOCKER B-3)."
    - "Each `skills/*/scripts/index.js` has the env-var init block added by THIS plan (Plan 8-02), not Plan 8-06. Authored under CONTEXT D-05 single LLM-DI carve-out."
    - "No test file invokes the network, spawns soffice, or writes outside an os.tmpdir() scratch directory."
  artifacts:
    - path: "tests/lib-create-loop-primitives-branches.test.js"
      provides: "Edge-case coverage for appendLedger/readLedger/checkInterrupt/hashIssueSet/slideImagesSha/slidesChangedSinceLastCycle (truncated-line, ENOENT, missing-prior-cycle-slide, large-ledger)"
      contains: "appendLedger"
    - path: "tests/orchestrator-runCreate-branches.test.js"
      provides: "Coverage for soft-cap (each of accept/specify/continue branches), oscillation-early-exit, interrupt-flag exit, schema v1.1 routing"
      contains: "soft-cap"
    - path: "tests/orchestrator-runReview-branches.test.js"
      provides: "Coverage for soffice failure, schema v1.0 vs v1.1 routing, structured-handoff vs file-roundtrip mode"
      contains: "schema_version"
    - path: "tests/cli-annotate-branches.test.js"
      provides: "argv parsing edge cases (missing --findings, missing --deck, --help)"
      contains: "--help"
  key_links:
    - from: "tests/orchestrator-runCreate-branches.test.js"
      to: "skills/create/scripts/index.js"
      via: "imports runCreate + _test_setRunReview to inject a stub review function (mocked LLM via stub)"
      pattern: "_test_set"
    - from: "tests/orchestrator-runReview-branches.test.js"
      to: "scripts/pptx-to-images.sh"
      via: "stubs the image-render step via DI; never spawns soffice"
      pattern: "stub"
---

<objective>
Wave 2 (parallel with 8-03 + 8-04): close every uncovered branch in `skills/*/scripts/lib/*.js`, every `cli.js`, every orchestrator (`runCreate` / `runReview` / `runContentReview` / `runAnnotate`), and every `tools/*.js` in CONTEXT D-03 scope. New tests only — no production source edits beyond the single LLM-DI export carve-out (CONTEXT D-05) if any orchestrator currently hardcodes its LLM call.

Purpose: This is the bulk gap-fill plan. annotate.js geometry is Plan 8-03's job; bash scripts are Plan 8-04's job; SKILL.md outcome tests are Plan 8-05's job. Everything else lives here. CONTEXT D-09 forbids tight loops — each TDD red→green cycle uses targeted `node --test path/to/single.test.js`, NOT full-suite runs.

Output: ~31 new test files (lib + cli + tools + orchestrators + render-fixed + render-content-fixed + ai-tells + the 3 fixture-builder tools), DI hooks + env-var bridges added to all 4 orchestrators (single source of truth per BLOCKER B-3), and tests/auto-refine-integration.test.js extended with 6 D-07 branches (canonical TEST-06 deliverable per BLOCKER B-4); targeted c8 reaches 100% on the targeted set; full-suite run is reserved for Plan 8-07.
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
@tests/coverage-baseline.txt
@.c8rc.json
@skills/create/scripts/index.js
@skills/create/scripts/cli.js
@skills/create/scripts/lib/loop-primitives.js
@skills/create/scripts/lib/oscillation.js
@skills/create/scripts/lib/deck-brief.js
@skills/create/scripts/lib/design-validator.js
@skills/create/scripts/lib/enum-lint.js
@skills/create/scripts/lib/render-rationale.js
@skills/create/scripts/lib/title-check.js
@skills/review/scripts/index.js
@skills/review/scripts/cli.js
@skills/review/scripts/lib/read-deck-xml.js
@skills/review/scripts/lib/schema-validator.js
@skills/content-review/scripts/index.js
@skills/content-review/scripts/cli.js
@skills/content-review/scripts/lib/extract-content.js
@skills/content-review/scripts/lib/jargon.js
@skills/content-review/scripts/lib/length-check.js
@skills/content-review/scripts/lib/redundancy.js
@skills/content-review/scripts/lib/title-adapter.js
@skills/annotate/scripts/index.js
@skills/annotate/scripts/cli.js
@skills/annotate/scripts/adapter.js
@tools/validate-manifest.js
@tools/audit-allowed-tools.js
@tools/license-audit.js
@tools/assert-pptxgenjs-pin.js
@tools/lint-pptxgenjs-enums.js
@tools/normalize-pptx-sha.js
@tests/auto-refine-integration.test.js
@tests/create-cli.test.js
@tests/create-cli-soft-cap.test.js
@tests/oscillation.test.js
@tests/loop-primitives.test.js

<interfaces>
**Test taxonomy (one row per new test file):**

| File | Target source | Branches/edges to cover (must include) |
|---|---|---|
| tests/lib-content-review-extract-content.test.js | skills/content-review/scripts/lib/extract-content.js | empty deck, single-slide deck, malformed XML throw path, all extract-paths (title / bullets / notes) |
| tests/lib-content-review-jargon.test.js | skills/content-review/scripts/lib/jargon.js | known-jargon match, unknown-token miss, case-insensitive match, empty input early-return |
| tests/lib-content-review-length-check.test.js | skills/content-review/scripts/lib/length-check.js | under-min, in-range, over-max thresholds (each its own assertion) |
| tests/lib-content-review-redundancy.test.js | skills/content-review/scripts/lib/redundancy.js | duplicate detected, near-duplicate threshold, no-dup happy-path, empty input |
| tests/lib-content-review-title-adapter.test.js | skills/content-review/scripts/lib/title-adapter.js | claim-shaped title pass, topic-shaped title flag, empty title flag |
| tests/lib-create-deck-brief-branches.test.js | skills/create/scripts/lib/deck-brief.js | every input-type branch (md / pdf-text / pptx-readonly / url / image-skip / transcript / freeform) |
| tests/lib-create-design-validator-branches.test.js | skills/create/scripts/lib/design-validator.js | each rule pass + each rule fail (palette, typography, motif consistency, action title) |
| tests/lib-create-enum-lint-branches.test.js | skills/create/scripts/lib/enum-lint.js | bare-string-shape detection, enum-form pass, multi-shape file, no-violations file |
| tests/lib-create-loop-primitives-branches.test.js | skills/create/scripts/lib/loop-primitives.js | extends Plan 05-01 coverage: appendLedger throws on negative cycle, readLedger on totally empty file (no newline), slideImagesSha skipping non-`slide-NN.jpg` files, slidesChangedSinceLastCycle when the cycle dir itself is missing |
| tests/lib-create-oscillation-branches.test.js | skills/create/scripts/lib/oscillation.js | extends Plan 05-01: empty hash equality, exactly-3-entry ledger, ledger with non-array first arg throws |
| tests/lib-create-render-rationale-branches.test.js | skills/create/scripts/lib/render-rationale.js | every section block (palette / typography / motif / narrative / tradeoffs); empty findings produces minimum doc; non-genuine findings appear in deferred section |
| tests/lib-create-title-check-branches.test.js | skills/create/scripts/lib/title-check.js | claim title pass, topic title flag, missing title flag |
| tests/lib-review-read-deck-xml-branches.test.js | skills/review/scripts/lib/read-deck-xml.js | valid pptx zip, missing slide xml entry, malformed XML throw path |
| tests/lib-review-schema-validator-branches.test.js | skills/review/scripts/lib/schema-validator.js | extends tests/findings-schema.test.js: each REQUIRED_FIELDS missing → pinpoint error; each enum violation; valid v1.0 + valid v1.1 round-trip |
| tests/cli-create-branches.test.js | skills/create/scripts/cli.js | --help exit 0 first-line shape, --version exit 0, missing required arg → exit non-zero with stderr message, dispatches to runCreate (stubbed) |
| tests/cli-review-branches.test.js | skills/review/scripts/cli.js | as above for review |
| tests/cli-content-review-branches.test.js | skills/content-review/scripts/cli.js | as above for content-review |
| tests/cli-annotate-branches.test.js | skills/annotate/scripts/cli.js | as above for annotate (--findings + --deck required) |
| tests/orchestrator-runCreate-branches.test.js | skills/create/scripts/index.js (runCreate) | soft-cap accept-branch, soft-cap specify-what-to-fix branch, soft-cap continue branch, oscillation early-exit, interrupt-flag exit, schema v1.0/v1.1 routing |
| tests/orchestrator-runReview-branches.test.js | skills/review/scripts/index.js (runReview) | structured-handoff mode, file-roundtrip mode, schema v1.0 vs v1.1 routing, render-fixed pure path, soffice-failure (stubbed) |
| tests/orchestrator-runContentReview-branches.test.js | skills/content-review/scripts/index.js (runContentReview) | each of the 7 content checks contributes findings, schema v1.0 vs v1.1 routing, lazy-annotate gate (already partially in tests/content-review-lazy-annotate.test.js — extend) |
| tests/orchestrator-runAnnotate-branches.test.js | skills/annotate/scripts/index.js (runAnnotate) | empty-findings-array short-circuit, soffice-failure path, both standalone + pipelined modes, severity collapse 4→3 spot-check via adapter |
| tests/tools-validate-manifest-branches.test.js | tools/validate-manifest.js | valid manifest happy path, missing required field, malformed JSON, exit-code surface |
| tests/tools-audit-allowed-tools-branches.test.js | tools/audit-allowed-tools.js | scoped-allow happy path, unscoped-* violation, missing manifest |
| tests/tools-license-audit-branches.test.js | tools/license-audit.js | clean tree, GPL-detected exit non-zero, jszip dual-license carve-out |
| tests/tools-assert-pptxgenjs-pin-branches.test.js | tools/assert-pptxgenjs-pin.js | exact 4.0.1 pass, caret form fail, missing dep fail |
| tests/tools-lint-pptxgenjs-enums-branches.test.js | tools/lint-pptxgenjs-enums.js | enum-form pass, bare-string-form fail, ignores test/fixture dirs |
| tests/tools-normalize-pptx-sha-branches.test.js | tools/normalize-pptx-sha.js | normalizes timestamps + descr attrs, deterministic SHA across runs, throws on non-pptx input |
| tests/tools-build-cross-domain-fixture-branches.test.js | tools/build-cross-domain-fixture.js | invoke with mocked filesystem (tmpdir); assert deterministic output path + size + SHA; missing-input throw path (BLOCKER B-1) |
| tests/tools-build-tiny-deck-fixture-branches.test.js | tools/build-tiny-deck-fixture.js | as above for tiny-deck builder (BLOCKER B-1) |
| tests/tools-build-ai-tells-fixtures-branches.test.js | tools/build-ai-tells-fixtures.js | as above; each ai-tell category emits a fixture file (BLOCKER B-1) |
| tests/render-fixed-branches.test.js | skills/review/scripts/render-fixed.js | each branch of the pure render path; failure modes; deterministic output structure (W-3) |
| tests/render-content-fixed-branches.test.js | skills/content-review/scripts/render-content-fixed.js | as above for content-review's render-fixed sibling (W-3) |
| tests/ai-tells-branches.test.js | skills/review/scripts/ai-tells.js | each of the 3 R18 heuristics (positive + negative); category emission shape; nx/ny placement (W-3) |

**Mocking & DI conventions:**
- LLM calls: stub via the harness Plan 8-05 will introduce; for THIS plan, if an orchestrator currently hardcodes a real LLM call (no DI hook), add a single `_test_setLlm(stub)` export per the existing `_test_setRunReview` precedent in `skills/create/scripts/index.js`. This is the single LLM-DI carve-out from CONTEXT D-05. Default behavior unchanged.
- soffice: orchestrators that shell out to `pptx-to-images.sh` already gate behind a function reference; stub the function with a `_test_setRenderImages(stub)` export if not already present.
- argv: each cli test rewrites `process.argv` and captures `process.exit` via `t.mock.method`.
- stdout/stderr: capture via `t.mock.method(process.stdout, 'write')`.
- File I/O: every test uses `node:fs.mkdtempSync(path.join(os.tmpdir(), 'instadecks-08-02-'))` and `t.after` cleanup.

**Existing tests to extend (NOT replace):**
- tests/create-cli.test.js → don't duplicate; new cli-create-branches.test.js fills gaps only.
- tests/loop-primitives.test.js → extension lives in lib-create-loop-primitives-branches.test.js (separate file to keep PR diff readable).
- tests/findings-schema.test.js + tests/findings-schema-v11.test.js → covered for schema-validator basics; new lib-review-schema-validator-branches.test.js fills the residual error-path branches.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Lib branch-coverage tests (14 files)</name>
  <files>tests/lib-content-review-extract-content.test.js, tests/lib-content-review-jargon.test.js, tests/lib-content-review-length-check.test.js, tests/lib-content-review-redundancy.test.js, tests/lib-content-review-title-adapter.test.js, tests/lib-create-deck-brief-branches.test.js, tests/lib-create-design-validator-branches.test.js, tests/lib-create-enum-lint-branches.test.js, tests/lib-create-loop-primitives-branches.test.js, tests/lib-create-oscillation-branches.test.js, tests/lib-create-render-rationale-branches.test.js, tests/lib-create-title-check-branches.test.js, tests/lib-review-read-deck-xml-branches.test.js, tests/lib-review-schema-validator-branches.test.js</files>
  <read_first>
    - /Users/shafqat/Documents/Projects/instadecks/skills/content-review/scripts/lib/extract-content.js, jargon.js, length-check.js, redundancy.js, title-adapter.js (each fully — they are short)
    - /Users/shafqat/Documents/Projects/instadecks/skills/create/scripts/lib/deck-brief.js, design-validator.js, enum-lint.js, render-rationale.js, title-check.js, loop-primitives.js, oscillation.js
    - /Users/shafqat/Documents/Projects/instadecks/skills/review/scripts/lib/read-deck-xml.js, schema-validator.js
    - /Users/shafqat/Documents/Projects/instadecks/tests/loop-primitives.test.js (style anchor)
    - /Users/shafqat/Documents/Projects/instadecks/tests/oscillation.test.js (style anchor)
    - /Users/shafqat/Documents/Projects/instadecks/tests/findings-schema.test.js (REQUIRED_FIELDS enumeration pattern)
    - /Users/shafqat/Documents/Projects/instadecks/tests/create-render-rationale.test.js (rationale-doc test layout)
    - /Users/shafqat/Documents/Projects/instadecks/tests/create-design-validator.test.js (validator pattern)
    - /Users/shafqat/Documents/Projects/instadecks/tests/create-enum-lint.test.js (enum-lint pattern)
    - /Users/shafqat/Documents/Projects/instadecks/tests/content-review-extract.test.js (extract-content pattern)
  </read_first>
  <behavior>
    For each lib file, follow this template:
    1. **Read source** to enumerate every conditional / try-catch / early-return.
    2. **Write a test per branch** with a single assertion (avoids the "passes by accident" failure mode).
    3. **Cover error paths** by passing the inputs that trigger throws (NaN cycle, malformed XML, missing fields).
    4. **Cover boundary conditions** for any threshold-based code (length-check min/max, redundancy similarity threshold).
    5. **Determinism check** for any function with hashing or sorting (run twice, assert equal — already a Plan 05-01 pattern).

    Use `node:test` + `node:assert/strict`. Each test file uses `describe` + nested `test` blocks. Each test ≤30 LOC. Each file ≤300 LOC total.

    Specific branch enumerations per <interfaces> table; do not invent additional branches that aren't grounded in source code.
  </behavior>
  <action>
    **Step A — TDD-RED:** For each lib file, in order: read the source, list every branch, then author the test file asserting against current behavior. Run `node --test tests/<single-new-file>.test.js` after authoring each — most should pass first try (these are existing modules), but any unexpected failure means the test caught a real branch the existing tests missed (good — fix the test or surface a finding). Do NOT modify production source unless the source has a genuine bug; surface bugs as Rule 4 deviations and pause.

    **Step B — atomic commit per logical group:**
    Group A: 5 content-review lib tests
    ```bash
    git add tests/lib-content-review-*.test.js
    git commit -m "$(cat <<'EOF'
test(08-02): branch coverage for content-review lib (extract/jargon/length/redundancy/title-adapter)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
    ```
    Group B: 7 create lib tests (deck-brief, design-validator, enum-lint, loop-primitives, oscillation, render-rationale, title-check)
    ```bash
    git add tests/lib-create-*-branches.test.js
    git commit -m "$(cat <<'EOF'
test(08-02): branch coverage for create lib (deck-brief/design-validator/enum-lint/loop-primitives/oscillation/render-rationale/title-check)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
    ```
    Group C: 2 review lib tests (read-deck-xml, schema-validator)
    ```bash
    git add tests/lib-review-*-branches.test.js
    git commit -m "$(cat <<'EOF'
test(08-02): branch coverage for review lib (read-deck-xml/schema-validator)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
    ```

    **Step C — targeted coverage probe (D-09 single run):**
    ```bash
    npx c8 --reporter=text \
      --include 'skills/content-review/scripts/lib/**' \
      --include 'skills/create/scripts/lib/**' \
      --include 'skills/review/scripts/lib/**' \
      node --test tests/lib-*.test.js tests/loop-primitives.test.js tests/oscillation.test.js tests/create-render-rationale.test.js tests/create-design-validator.test.js tests/create-enum-lint.test.js tests/create-title-check.test.js tests/create-deck-brief.test.js tests/content-review-extract.test.js tests/content-review-checks.test.js tests/findings-schema.test.js tests/findings-schema-v11.test.js
    ```
    Capture the per-file table. Target: 100% on every targeted file. Files <98%: list residual branches in SUMMARY for downstream Plans (8-03/8-05/8-06) to consider.
  </action>
  <verify>
    <automated>node --test tests/lib-content-review-extract-content.test.js tests/lib-content-review-jargon.test.js tests/lib-content-review-length-check.test.js tests/lib-content-review-redundancy.test.js tests/lib-content-review-title-adapter.test.js tests/lib-create-deck-brief-branches.test.js tests/lib-create-design-validator-branches.test.js tests/lib-create-enum-lint-branches.test.js tests/lib-create-loop-primitives-branches.test.js tests/lib-create-oscillation-branches.test.js tests/lib-create-render-rationale-branches.test.js tests/lib-create-title-check-branches.test.js tests/lib-review-read-deck-xml-branches.test.js tests/lib-review-schema-validator-branches.test.js</automated>
  </verify>
  <acceptance_criteria>
    - 14 new test files exist; each contains `describe(` and at least 3 `test(` blocks.
    - `node --test` over all 14 files exits 0.
    - Targeted c8 probe reports 100% on each lib file in scope.
    - 3 atomic commits landed.
  </acceptance_criteria>
  <done>Lib branch gaps closed; targeted c8 100% on every lib file.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: cli.js + tools branch-coverage tests (10 files)</name>
  <files>tests/cli-create-branches.test.js, tests/cli-review-branches.test.js, tests/cli-content-review-branches.test.js, tests/cli-annotate-branches.test.js, tests/tools-validate-manifest-branches.test.js, tests/tools-audit-allowed-tools-branches.test.js, tests/tools-license-audit-branches.test.js, tests/tools-assert-pptxgenjs-pin-branches.test.js, tests/tools-lint-pptxgenjs-enums-branches.test.js, tests/tools-normalize-pptx-sha-branches.test.js, tests/tools-build-cross-domain-fixture-branches.test.js, tests/tools-build-tiny-deck-fixture-branches.test.js, tests/tools-build-ai-tells-fixtures-branches.test.js, tests/render-fixed-branches.test.js, tests/render-content-fixed-branches.test.js, tests/ai-tells-branches.test.js</files>
  <read_first>
    - /Users/shafqat/Documents/Projects/instadecks/skills/{create,review,content-review,annotate}/scripts/cli.js (each fully)
    - /Users/shafqat/Documents/Projects/instadecks/tools/validate-manifest.js, audit-allowed-tools.js, license-audit.js, assert-pptxgenjs-pin.js, lint-pptxgenjs-enums.js, normalize-pptx-sha.js
    - /Users/shafqat/Documents/Projects/instadecks/tests/create-cli.test.js, create-cli-soft-cap.test.js (cli test idiom: argv overwrite + process.exit mock)
    - /Users/shafqat/Documents/Projects/instadecks/tests/manifest-validator.test.js (tools test idiom)
    - /Users/shafqat/Documents/Projects/instadecks/tests/audit-allowed-tools.test.js
    - /Users/shafqat/Documents/Projects/instadecks/tests/license-audit.test.js
    - /Users/shafqat/Documents/Projects/instadecks/tests/assert-pin.test.js
    - /Users/shafqat/Documents/Projects/instadecks/tests/create-enum-lint-cli.test.js (enum-lint cli pattern)
  </read_first>
  <behavior>
    Per <interfaces> taxonomy. CLI tests follow the existing `tests/create-cli.test.js` shape: rewrite `process.argv`, mock `process.exit`, capture stdout/stderr, assert. For tools tests, use `child_process.execFileSync` against `node tools/<file>.js` ONLY when stdin/argv-driven; otherwise direct `require()` + function call (faster, deterministic). Each tool test covers happy path + at least one failure mode + boundary case.

    For cli tests that need to dispatch into an orchestrator without spawning the real one, set the `_test_set*` injection hooks BEFORE requiring the cli (the cli imports the orchestrator at module load).
  </behavior>
  <action>
    **Step A — TDD-RED for each cli test:** Read the cli source first, list argv branches (--help, --version, missing required, happy dispatch), author test, run `node --test tests/cli-<name>-branches.test.js` after each.

    **Step B — TDD-RED for each tools test:** Read the tool source, list exit-code branches, author test.

    **Step C — atomic commits in two groups:**
    ```bash
    git add tests/cli-*-branches.test.js
    git commit -m "$(cat <<'EOF'
test(08-02): branch coverage for cli.js (create/review/content-review/annotate) — argv parsing + dispatch

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"

    git add tests/tools-*-branches.test.js
    git commit -m "$(cat <<'EOF'
test(08-02): branch coverage for tools (validate-manifest/audit-allowed-tools/license-audit/assert-pptxgenjs-pin/lint-pptxgenjs-enums/normalize-pptx-sha)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
    ```

    **Step D — targeted c8 probe (single run):**
    ```bash
    npx c8 --reporter=text \
      --include 'skills/**/cli.js' --include 'tools/**' \
      node --test tests/cli-*-branches.test.js tests/tools-*-branches.test.js \
        tests/create-cli.test.js tests/create-cli-soft-cap.test.js tests/manifest-validator.test.js tests/audit-allowed-tools.test.js tests/license-audit.test.js tests/assert-pin.test.js tests/create-enum-lint-cli.test.js
    ```
    Capture per-file table; target 100% on every targeted file.
  </action>
  <verify>
    <automated>node --test tests/cli-create-branches.test.js tests/cli-review-branches.test.js tests/cli-content-review-branches.test.js tests/cli-annotate-branches.test.js tests/tools-validate-manifest-branches.test.js tests/tools-audit-allowed-tools-branches.test.js tests/tools-license-audit-branches.test.js tests/tools-assert-pptxgenjs-pin-branches.test.js tests/tools-lint-pptxgenjs-enums-branches.test.js tests/tools-normalize-pptx-sha-branches.test.js tests/tools-build-cross-domain-fixture-branches.test.js tests/tools-build-tiny-deck-fixture-branches.test.js tests/tools-build-ai-tells-fixtures-branches.test.js tests/render-fixed-branches.test.js tests/render-content-fixed-branches.test.js tests/ai-tells-branches.test.js</automated>
  </verify>
  <acceptance_criteria>
    - 4 cli + 9 tools (incl. 3 fixture builders + normalize-pptx-sha per BLOCKER B-1) + 3 review/content-review (render-fixed, render-content-fixed, ai-tells per W-3) test files exist; each runs green.
    - Each cli test asserts both `--help` exit 0 with first-line shape AND missing-required-arg exit non-zero.
    - Each tools test asserts at least one happy-path AND one failure-path branch.
    - 2 atomic commits landed.
  </acceptance_criteria>
  <done>cli + tools branch gaps closed; targeted c8 100%.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Orchestrator branch-coverage tests (4 files) + DI carve-out if needed</name>
  <files>tests/orchestrator-runCreate-branches.test.js, tests/orchestrator-runReview-branches.test.js, tests/orchestrator-runContentReview-branches.test.js, tests/orchestrator-runAnnotate-branches.test.js, tests/auto-refine-integration.test.js, skills/create/scripts/index.js, skills/review/scripts/index.js, skills/content-review/scripts/index.js, skills/annotate/scripts/index.js</files>
  <read_first>
    - /Users/shafqat/Documents/Projects/instadecks/skills/create/scripts/index.js (look for existing _test_set* exports; runCreate signature; soft-cap branch structure; oscillation gate; interrupt-flag check)
    - /Users/shafqat/Documents/Projects/instadecks/skills/review/scripts/index.js (handoff vs file-roundtrip mode; schema-version routing; soffice gating)
    - /Users/shafqat/Documents/Projects/instadecks/skills/content-review/scripts/index.js (lazy-annotate; schema-version routing)
    - /Users/shafqat/Documents/Projects/instadecks/skills/annotate/scripts/index.js (severity collapse; standalone vs pipelined)
    - /Users/shafqat/Documents/Projects/instadecks/tests/auto-refine-integration.test.js (the canonical _test_setRunReview pattern — copy this DI idiom)
    - /Users/shafqat/Documents/Projects/instadecks/tests/create-cli-soft-cap.test.js (soft-cap branches already partially tested — extend, don't duplicate)
    - /Users/shafqat/Documents/Projects/instadecks/tests/oscillation.test.js (oscillation early-exit precedent)
    - /Users/shafqat/Documents/Projects/instadecks/tests/review-runtime.test.js, tests/content-review-runtime.test.js, tests/annotate-runtime.test.js (existing orchestrator tests — extend, don't duplicate)
    - /Users/shafqat/Documents/Projects/instadecks/.planning/phases/08-test-coverage-100/08-CONTEXT.md (D-05: single LLM-DI carve-out is permitted IF current orchestrator hardcodes the LLM call)
  </read_first>
  <behavior>
    For each orchestrator, enumerate the branches per <interfaces> taxonomy, then write tests that exercise each via DI hooks. Use stub fns returning canned data — NO real LLM, NO real soffice, NO real file system beyond os.tmpdir().

    **DI carve-out rule (CONTEXT D-05) — Plan 8-02 is the SINGLE source of truth (BLOCKER B-3):** For EACH of the 4 orchestrators (`skills/{create,review,content-review,annotate}/scripts/index.js`):
    1. Ensure `_test_setLlm(stub)` export exists. Add it if missing (default behavior unchanged: real LLM client used when no stub set).
    2. Ensure `_test_setRenderImages(stub)` export exists wherever the orchestrator shells out to `pptx-to-images.sh`. Add it if missing (default = real shell-out).
    3. Add the env-var init block at the top of `skills/<skill>/scripts/index.js`, AFTER the `_test_set*` definitions:

```js
if (process.env.INSTADECKS_LLM_STUB) {
  try {
    const { stubLlmResponse } = require('../../../tests/helpers/llm-mock');
    const fixture = require('node:path').basename(process.env.INSTADECKS_LLM_STUB, '.json');
    _test_setLlm(stubLlmResponse(fixture));
  } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
}
if (process.env.INSTADECKS_RENDER_STUB === '1') {
  _test_setRenderImages(async () => 'stubbed-render');
}
```

    The try/catch around the require is intentional: Plan 8-05 Task 1 authors `tests/helpers/llm-mock.js`. Wrapping the require keeps Plan 8-02 verification green even when 8-05 has not yet landed.

    Plan 8-05 and Plan 8-06 CONSUME these hooks; they do NOT add hooks of their own. This is the ONLY production-source change permitted in Phase 8 outside the Plan 8-01 CLAUDE.md edit. Document each addition in the commit message and SUMMARY.

    Cover specifically:
    - **runCreate**: soft-cap accept (user picks "accept current"), soft-cap specify (user picks "specify what to fix"), soft-cap continue (user picks "continue another cycle"), oscillation early-exit (issue_set_hash equality), interrupt-flag exit (top-of-cycle .interrupt detected), schema v1.0 vs v1.1 routing.
    - **runReview**: structured-handoff mode (deck-spec passed in-memory), file-roundtrip mode (PPTX path passed), schema v1.0 emission, schema v1.1 emission, render-fixed pure path, soffice-failure path (DI stub throws).
    - **runContentReview**: each of the 7 content checks contributes findings, schema v1.0 vs v1.1 routing, lazy-annotate gate (off vs on).
    - **runAnnotate**: empty-findings short-circuit, soffice-failure path, standalone mode, pipelined mode, severity collapse 4→3 spot-check.

    **TEST-06 integration test extension (BLOCKER B-4 — canonical TEST-06 deliverable):** EXTEND `tests/auto-refine-integration.test.js` with 6 SEPARATE `test()` blocks covering all branches required by ROADMAP success #6 + CONTEXT D-07. Each branch is its own `test()` block (no consolidation):
      1. `test('cycle 1 zero-findings forces confirmation cycle')` — runReview returns 0 genuine findings on cycle 1; assert runCreate proceeds to a confirmation cycle, NOT exit.
      2. `test('oscillation: cycle N issue_set_hash strictly equals cycle N-2 hash → exit')` — D-09 strict equality; chain stubs to produce identical hashes across cycles N-2 and N; assert oscillation exit.
      3. `test('soft-cap 4-option UX: each option drives the documented branch')` — 4 sub-assertions (accept-current / specify-what-to-fix / continue-another-cycle / cap-and-stop).
      4. `test('top-of-cycle interrupt: .interrupt flag detected pre-cycle → clean exit')` — touch the flag file inside the test; assert orchestrator exits cleanly with the documented status.
      5. `test('schema v1.1 routing: stub returns schema_version=1.1 → v1.1 branch taken')` — assert v1.1-specific code path is exercised (v1.0 branch is NOT).
      6. `test('content-vs-design boundary BIDIRECTIONAL')` — TWO sub-assertions, BOTH required:
         - `runReview` invoked against a CONTENT-defect fixture flags ZERO findings (design reviewer ignores content defects).
         - `runContentReview` invoked against a DESIGN-defect fixture flags ZERO findings (content reviewer ignores visual/typographic defects).
         One direction alone does NOT satisfy CONTEXT D-07.
    Plan 8-07's RELEASE.md sign-off cites these 6 `test()` description strings VERBATIM.
  </behavior>
  <action>
    **Step A — read each orchestrator and grep for `_test_set`.** For each missing DI hook, plan the minimal export addition. Justify the addition in a comment block above the new export referencing CONTEXT D-05.

    **Step B — TDD-RED-GREEN per orchestrator:** author test, run targeted `node --test tests/orchestrator-<name>-branches.test.js`, expect failures from missing DI hooks; add the hook; rerun; green.

    **Step C — atomic commits — keep production source change separate from test additions:**
    ```bash
    # If any DI hook was added:
    git add skills/<which>/scripts/index.js
    git commit -m "$(cat <<'EOF'
feat(08-02): add _test_set* DI hook for runX (CONTEXT D-05 carve-out)

Single permitted production-source change in Phase 8: expose a setter
so test files can inject a stub LLM/render adapter. Default behavior
unchanged.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"

    # Then test files:
    git add tests/orchestrator-*-branches.test.js
    git commit -m "$(cat <<'EOF'
test(08-02): branch coverage for orchestrators (runCreate/runReview/runContentReview/runAnnotate)

Covers soft-cap (accept/specify/continue), oscillation early-exit, interrupt
flag, schema v1.0/v1.1 routing, structured-handoff vs file-roundtrip,
soffice-failure path, severity collapse spot-check. All via DI stubs;
no real LLM, no real soffice, no fs beyond tmpdir.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
    ```

    **Step D — targeted c8 probe (single run):**
    ```bash
    npx c8 --reporter=text \
      --include 'skills/**/index.js' \
      node --test tests/orchestrator-*-branches.test.js \
        tests/auto-refine-integration.test.js tests/review-runtime.test.js tests/content-review-runtime.test.js tests/annotate-runtime.test.js tests/create-runtime.test.js tests/create-integration.test.js tests/review-integration.test.js tests/content-review-integration.test.js tests/auto-refine-integration.test.js
    ```
    Target: 100% on every orchestrator file.
  </action>
  <verify>
    <automated>node --test tests/orchestrator-runCreate-branches.test.js tests/orchestrator-runReview-branches.test.js tests/orchestrator-runContentReview-branches.test.js tests/orchestrator-runAnnotate-branches.test.js</automated>
  </verify>
  <acceptance_criteria>
    - 4 orchestrator branch test files exist and run green.
    - Each test file contains explicit assertions for the branches enumerated in <behavior>.
    - All 4 orchestrators export `_test_setLlm` AND `_test_setRenderImages` (where applicable); `grep -l '_test_setLlm' skills/*/scripts/index.js` shows all 4.
    - All 4 orchestrators contain the env-var init block (`grep -l 'INSTADECKS_LLM_STUB' skills/*/scripts/index.js` shows all 4).
    - `tests/auto-refine-integration.test.js` contains the 6 NEW `test()` blocks listed in <behavior> (verifiable via grep on the description strings).
    - Targeted c8 probe 100% on each orchestrator file.
    - 2-3 atomic commits landed (orchestrator source changes; auto-refine-integration extension; orchestrator branch tests).
  </acceptance_criteria>
  <done>Orchestrator branch gaps closed; soft-cap, oscillation, interrupt, schema-routing, soffice-failure paths all asserted; ready for Wave 3 to layer SKILL.md outcome tests on top.</done>
</task>

</tasks>

<threat_model>
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-08-04 | Tampering | DI hooks expose internals to malicious test runs | accept | Hooks are dev-only setters with no network/secret surface; CONTEXT D-05 limits the carve-out to a single hook per orchestrator. |
| T-08-05 | Information Disclosure | Test fixtures contain sensitive deck content | mitigate | Reuse existing `tests/fixtures/` only; no new fixtures with non-synthetic content; lint-paths.sh asserts no absolute user paths. |
| T-08-06 | Tampering | Tests modify production source via require-cache patching | mitigate | Each test uses `t.mock.method` (auto-restored) + DI setters that the orchestrator already designed for; no `require.cache` poisoning. |
</threat_model>

<verification>
- All 24+ new test files run green when invoked individually with `node --test`.
- Targeted c8 probes (one per task) report 100% on the in-scope file groups.
- Total new test files = 14 (Task 1) + 13 (Task 2: 4 cli + 9 tools incl. 3 fixture builders + render-fixed + render-content-fixed + ai-tells) + 4 (Task 3 orchestrators) = 31; plus Task 3 EXTENDS tests/auto-refine-integration.test.js with 6 D-07 `test()` blocks.
- ≥7 atomic commits across the three tasks (extra commit for orchestrator source changes vs. test additions).
- `bash tools/lint-paths.sh` green.
- No production-source changes outside the documented DI carve-out (Task 3 Step A) — `git diff main -- skills/` shows ONLY the `_test_set*` additions if any.
</verification>

<success_criteria>
- Every lib/*.js, every cli.js, every orchestrator (runCreate/runReview/runContentReview/runAnnotate), every tools/*.js in CONTEXT D-03 scope has a dedicated branch-coverage test.
- Soft-cap (3 user-choice branches), oscillation early-exit, interrupt-flag exit, schema v1.0/v1.1 routing, soffice-failure, severity-collapse all directly asserted.
- TEST-02 closed at the unit level; TEST-06 fully closed via the 6-branch extension to `tests/auto-refine-integration.test.js` (canonical deliverable per BLOCKER B-4); orchestrator unit tests are supporting evidence per W-8.
- Targeted c8 100% on the in-scope file set (zero residual; CONTEXT D-02 zero-tolerance); full-suite 100% gate is Plan 8-07's job.
</success_criteria>

<output>
`.planning/phases/08-test-coverage-100/08-02-SUMMARY.md` — list of new test files, residual <2% branches per file (if any) with pointer to which downstream plan closes them, summary of any DI hook added (file + export name + commit SHA), targeted c8 percentages per file group.
</output>
