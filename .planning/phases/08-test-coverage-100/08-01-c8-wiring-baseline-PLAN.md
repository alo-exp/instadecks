---
plan: 08-01
phase: 08
slug: c8-wiring-baseline
status: ready
created: 2026-04-28
wave: 1
depends_on: []
autonomous: true
files_modified:
  - package.json
  - package-lock.json
  - .c8rc.json
  - tests/smoke/.gitkeep
  - tests/coverage-baseline.txt
  - .planning/REQUIREMENTS.md
  - CLAUDE.md
requirements: [TEST-01]

must_haves:
  truths:
    - "`c8` is a devDependency in package.json (no caret allowed; pin to a known-good 10.x release)."
    - "`npm test` runs `c8 --100 --check-coverage --reporter text node --test 'tests/**/*.test.js'` per CONTEXT D-02; today exits non-zero (coverage <100%) — that is expected at baseline; Plan 8-07 drives it to green and the green run becomes the CI gate."
    - "`npm run coverage` runs `c8 --reporter html --reporter text node --test 'tests/**/*.test.js'` (non-gating; for local debugging via the html report)."
    - "`.c8rc.json` exists with include = ['skills/**/*.js','tools/**/*.js'], exclude = ['tests/**','**/*.test.js','**/fixtures/**'] — fixture builders (`tools/build-*-fixture.js`) and `tools/normalize-pptx-sha.js` are NOT excluded; per CONTEXT D-03 they are in-scope product code and Plan 8-02 covers each with direct unit tests."
    - "`tests/smoke/.gitkeep` exists so the smoke directory is tracked even though Plans 8-06 populates it."
    - "`tests/coverage-baseline.txt` exists and contains the c8 text-summary table from a one-time baseline run; subsequent waves diff against this number."
    - "REQUIREMENTS.md gains a `### Phase 8 Test Coverage (TEST)` block with TEST-01..TEST-08 mapped 1:1 to ROADMAP Phase 8 success criteria #1..#8."
    - "CLAUDE.md is updated per CONTEXT D-01: the locked-invariant prohibition on annotate.js edits is removed; pptxgenjs 4.0.1 pin, severity 4-tier, content-vs-design boundary, plugin-relative paths invariants stand."
  artifacts:
    - path: ".c8rc.json"
      provides: "c8 config (include/exclude lists, threshold defaults)"
      contains: '"include"'
    - path: "package.json"
      provides: "test (gating, c8 --100) + coverage (non-gating html) + test:smoke + test:e2e scripts; c8 devDep"
      contains: '"--check-coverage"'
    - path: "tests/coverage-baseline.txt"
      provides: "Pinned baseline coverage % per file at start of Phase 8 (target: 100% by Plan 8-07)"
      min_lines: 5
    - path: ".planning/REQUIREMENTS.md"
      provides: "TEST-01..TEST-08 requirement IDs"
      contains: "TEST-08"
    - path: "CLAUDE.md"
      provides: "annotate.js policy reversal applied (CONTEXT D-01)"
  key_links:
    - from: "package.json"
      to: ".c8rc.json"
      via: "c8 reads .c8rc.json automatically when invoked"
      pattern: "c8 "
    - from: "tests/coverage-baseline.txt"
      to: "Plan 8-07"
      via: "8-07 overwrites this file with the final 100% report as sign-off evidence"
      pattern: "All files"
---

<objective>
Wave 1 foundation: install `c8`, configure include/exclude per CONTEXT D-02/D-03, set `npm test` to the gating `c8 --100 --check-coverage` form (D-02), add non-gating `coverage` + `test:smoke` + `test:e2e` scripts, capture a one-time baseline coverage report into `tests/coverage-baseline.txt`, scaffold the empty `tests/smoke/` directory, back-fill TEST-01..TEST-08 into REQUIREMENTS.md, and apply the CLAUDE.md edit removing the annotate.js locked-invariant framing (CONTEXT D-01).

Purpose: Wave 2 plans (8-02/8-03/8-04) need the coverage tool wired and a baseline number to target. CONTEXT D-09 forbids tight loops; this plan runs `c8` exactly once at the end of the plan to produce the baseline. The 100% threshold is not asserted here — Plan 8-07 closes that gate.

Output: c8 wired, baseline captured, REQUIREMENTS.md back-filled, CLAUDE.md de-locked, smoke dir scaffolded. No production source edits beyond CLAUDE.md.
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
@.planning/REQUIREMENTS.md
@.planning/ROADMAP.md
@package.json
@.github/workflows/ci.yml

<interfaces>
**npm scripts (package.json) — final shape after this plan:**
```json
{
  "scripts": {
    "test": "c8 --100 --check-coverage --reporter text node --test 'tests/**/*.test.js'",
    "coverage": "c8 --reporter html --reporter text node --test 'tests/**/*.test.js'",
    "test:smoke": "node --test 'tests/smoke/**/*.test.js'",
    "test:e2e": "node --test 'tests/e2e/**/*.test.js'",
    "lint:paths": "bash tools/lint-paths.sh",
    "validate:manifest": "node tools/validate-manifest.js",
    "assert:pin": "node tools/assert-pptxgenjs-pin.js",
    "lint:enums": "node tools/lint-pptxgenjs-enums.js",
    "audit:allowed-tools": "node tools/audit-allowed-tools.js",
    "audit:licenses": "node tools/license-audit.js"
  }
}
```

**.c8rc.json — final shape:**
```json
{
  "all": true,
  "include": ["skills/**/*.js", "tools/**/*.js"],
  "exclude": [
    "tests/**",
    "**/*.test.js",
    "**/fixtures/**"
  ],
  "reporter": ["text", "lcov"],
  "check-coverage": false
}
```
Notes:
- `all: true` ensures unhit source files surface as 0% rather than vanish from the report (per c8 docs).
- Per CONTEXT D-03 the three fixture-builder tools (`tools/build-cross-domain-fixture.js`, `tools/build-tiny-deck-fixture.js`, `tools/build-ai-tells-fixtures.js`) AND `tools/normalize-pptx-sha.js` are IN-SCOPE product code and MUST reach 100% — they are NOT excluded. Plan 8-02 authors direct unit tests for each.
- `check-coverage: false` keeps a bare `c8` invocation non-failing (e.g. `npm run coverage`); the gate is wired via the `--100 --check-coverage` flags baked into the `npm test` script (CONTEXT D-02). Plan 8-07's CI invokes `npm test` directly.

**REQUIREMENTS.md — TEST block (append at end of v1 Requirements):**
```
### Test Coverage (TEST)

- [ ] **TEST-01**: `npm test` produces a c8 coverage report showing 100% lines/branches/functions/statements across every covered file (annotate.js INCLUDED, not excluded); CI fails on regression below 100%
- [ ] **TEST-02**: Every `lib/*.js`, every cli.js, every orchestrator (`runCreate`/`runReview`/`runContentReview`/`runAnnotate`), every `tools/*.js`, and `skills/annotate/scripts/annotate.js` has direct unit tests covering all branches including failure paths (soffice missing, network errors, interrupt flag, oscillation hash equality, soft-cap user-choice paths)
- [ ] **TEST-03**: Every bash script (`scripts/pptx-to-images.sh`, `hooks/check-deps.sh`, `skills/doctor/scripts/check.sh`) has bats tests covering happy-path + failure modes
- [ ] **TEST-04**: Every SKILL.md (5 skills) has outcome-based unit tests that mock the LLM step and assert deterministic outcomes (JSON shape, finding IDs, severity values, render artifacts, schema conformance) for every instruction in the playbook
- [ ] **TEST-05**: New `tests/smoke/` suite invokes each cli.js with `--help` + minimal valid input, asserts exit 0 + expected stdout shape; runs in CI in <30s
- [ ] **TEST-06**: Integration tests cover every branch of the auto-refine loop: cycle 1 zero-findings confirmation, oscillation hash equality (D-09), soft-cap 4-option UX, top-of-cycle interrupt, schema v1.1 routing, content-vs-design boundary bidirectional
- [ ] **TEST-07**: `npm run test:e2e` runs real-soffice E2E locally if `soffice` is on PATH; skipped silently when absent; never runs in CI; FRESH-INSTALL.md remains the human E2E gate for v0.1.0
- [ ] **TEST-08**: Coverage gate added to CI workflow: `npm test` (c8 --100 --check-coverage per D-02) fails the build on any regression below 100%
```

**CLAUDE.md edit (D-01) — surgical, NOT a rewrite:**
Find the bullet starting with "**`annotate.js` is treated as a SHA-pinned binary asset.**" under `## Locked invariants`. Replace that entire bullet with:
```
- **`annotate.js` is under standard test discipline.** Phase 8 (Test Coverage to 100%) reversed the prior verbatim-only prohibition; the file is treated like any other source file and is covered by direct unit tests on its geometry primitives. The single documented require-path patch remains the only historical edit on record (no other content changes have been bundled). Treat geometry/charPts/miter logic as load-bearing — changes still require visual-regression sign-off because v8 BluePrestige output IS the spec.
```
Leave every other bullet under "Locked invariants" untouched (pptxgenjs 4.0.1 pin, severity 4-tier, content-vs-design boundary, plugin-relative paths).
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install c8, write .c8rc.json, update package.json scripts, scaffold tests/smoke/</name>
  <files>package.json, package-lock.json, .c8rc.json, tests/smoke/.gitkeep</files>
  <read_first>
    - /Users/shafqat/Documents/Projects/instadecks/package.json (current scripts + devDeps)
    - /Users/shafqat/Documents/Projects/instadecks/.github/workflows/ci.yml (Gate 6 currently uses `find tests -maxdepth 2 -name '*.test.js' -print0 | xargs -0 node --test` — this plan does NOT change ci.yml; Plan 8-07 swaps Gate 6 to `npm test` per CONTEXT D-02)
    - /Users/shafqat/Documents/Projects/instadecks/.planning/phases/08-test-coverage-100/08-CONTEXT.md (D-02 — npm script shapes; D-03 — files in scope; D-09 — CPU constraint: only ONE end-to-end run permitted)
  </read_first>
  <action>
    **Step A — install c8 as devDep (pinned, no caret):**
    ```bash
    npm install --save-dev --save-exact c8@10.1.3
    ```
    Verify package.json `devDependencies.c8` is `"10.1.3"` (no caret). package-lock.json is updated by npm.

    **Step B — author `.c8rc.json` per <interfaces>** (exact JSON shape above; do not deviate from the include/exclude lists).

    **Step C — update `package.json` scripts** to the final shape in <interfaces>. Keep all existing scripts (lint:paths, validate:manifest, assert:pin, lint:enums, audit:allowed-tools, audit:licenses) — REPLACE `test` with the gating `c8 --100 --check-coverage` form (CONTEXT D-02) and ADD non-gating `coverage`, `test:smoke`, `test:e2e`.

    **Step D — scaffold `tests/smoke/`:**
    ```bash
    mkdir -p tests/smoke
    touch tests/smoke/.gitkeep
    ```

    **Step E — sanity-run (NOT the baseline; just confirm c8 loads):**
    ```bash
    npx c8 --version
    npx c8 --reporter=text node -e "console.log('hello')"
    ```
    Both commands exit 0.

    **Step F — atomic commit:**
    ```bash
    git add package.json package-lock.json .c8rc.json tests/smoke/.gitkeep
    git commit -m "$(cat <<'EOF'
chore(08-01): wire c8 + coverage scripts + tests/smoke scaffold

- Add c8@10.1.3 as exact-pinned devDep (D-02).
- .c8rc.json: include skills/**/*.js + tools/**/*.js; exclude tests, fixtures,
  fixture-builder tools, normalize-pptx-sha (D-03 scope).
- npm scripts: `test` is now `c8 --100 --check-coverage ... node --test`
  per CONTEXT D-02 (gating; Plan 8-07 drives it green). Non-gating helpers
  added: coverage (html), test:smoke, test:e2e.
- tests/smoke/.gitkeep so the directory is tracked before Plan 8-06 populates it.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
    ```
  </action>
  <verify>
    <automated>node -e "const p=require('./package.json'); if(p.devDependencies.c8!=='10.1.3') process.exit(1); if(!/c8 --100 --check-coverage/.test(p.scripts.test||'')) process.exit(2); for (const s of ['coverage','test:smoke','test:e2e']) if(!p.scripts[s]) process.exit(2);" && node -e "const c=require('./.c8rc.json'); if(!c.include.includes('skills/**/*.js')||!c.include.includes('tools/**/*.js')) process.exit(3);" && test -f tests/smoke/.gitkeep && npx c8 --version</automated>
  </verify>
  <acceptance_criteria>
    - `package.json` devDependencies includes `"c8": "10.1.3"` (no caret).
    - `package.json` scripts.test contains `c8 --100 --check-coverage` (CONTEXT D-02); scripts also includes `coverage`, `test:smoke`, `test:e2e`.
    - `.c8rc.json` exists; `include` array contains `skills/**/*.js` and `tools/**/*.js`; `exclude` array contains `tests/**`, `**/fixtures/**`, and the three fixture-builder tools.
    - `tests/smoke/.gitkeep` exists.
    - `npx c8 --version` exits 0.
    - At least 1 commit landed.
  </acceptance_criteria>
  <done>c8 wired; coverage scripts in place; smoke directory tracked.</done>
</task>

<task type="auto">
  <name>Task 2: Run baseline coverage once, write tests/coverage-baseline.txt, back-fill REQUIREMENTS.md TEST-01..TEST-08, apply CLAUDE.md D-01 edit</name>
  <files>tests/coverage-baseline.txt, .planning/REQUIREMENTS.md, CLAUDE.md</files>
  <read_first>
    - /Users/shafqat/Documents/Projects/instadecks/.planning/REQUIREMENTS.md (current end-of-file format; append after the last existing requirement block, before any "Out of Scope" section if present)
    - /Users/shafqat/Documents/Projects/instadecks/CLAUDE.md (current "Locked invariants" block — find the annotate.js bullet to replace per <interfaces> Step C)
    - /Users/shafqat/Documents/Projects/instadecks/.planning/ROADMAP.md (Phase 8 success criteria 1..8 — confirm 1:1 mapping to TEST-01..TEST-08)
    - /Users/shafqat/Documents/Projects/instadecks/.planning/phases/08-test-coverage-100/08-CONTEXT.md (D-09: this plan runs the baseline coverage exactly ONCE; do not loop)
  </read_first>
  <action>
    **Step A — run baseline coverage exactly ONCE (D-09 honored):**
    ```bash
    npm run coverage 2>&1 | tee /tmp/cov-baseline.txt
    ```
    The full test suite runs under c8; this is the only full-suite run permitted in Plan 8-01. Expected: many tests pass; coverage <100% (gap-fill happens in Wave 2/3). The exit code may be 0 (coverage script does NOT use `--check-coverage`).

    **Step B — extract the `All files` summary table block from /tmp/cov-baseline.txt and write it verbatim to `tests/coverage-baseline.txt`** with this header prepended:
    ```
    # Coverage Baseline — Phase 8 Wave 1
    # Captured: <ISO date>
    # Tool: c8 10.1.3
    # Command: npm run coverage
    # Goal: 100% lines/branches/functions/statements by end of Phase 8 (Plan 8-07).
    # This file is overwritten by Plan 8-07 with the final 100% report.

    ```
    Then the c8 text-table dump (the "----" framed table c8 emits, including per-file rows and the `All files` summary row).

    **Step C — append TEST-01..TEST-08 block to REQUIREMENTS.md** at the end of the v1 Requirements section, exactly as specified in <interfaces>. Do not modify any existing requirement.

    **Step D — apply CLAUDE.md D-01 edit** per <interfaces>: locate the bullet `**\`annotate.js\` is treated as a SHA-pinned binary asset.**` under `### Locked invariants (do not violate)` and replace it with the new bullet text. Use the Edit tool with old_string = the entire current bullet (multi-line) and new_string = the new bullet text. Leave all four other invariant bullets untouched.

    **Step E — verify edits parse:**
    ```bash
    grep -c 'TEST-08' .planning/REQUIREMENTS.md     # must be ≥ 1
    grep -c 'SHA-pinned binary asset' CLAUDE.md      # must be 0 (the old phrasing is gone)
    grep -c 'standard test discipline' CLAUDE.md     # must be ≥ 1
    test -s tests/coverage-baseline.txt              # non-empty
    grep -E 'pptxgenjs.*4\.0\.1|pinned' CLAUDE.md   # ≥ 1 (other invariants intact)
    ```

    **Step F — atomic commit:**
    ```bash
    git add tests/coverage-baseline.txt .planning/REQUIREMENTS.md CLAUDE.md
    git commit -m "$(cat <<'EOF'
docs(08-01): baseline coverage + TEST-01..TEST-08 + CLAUDE.md D-01 reversal

- tests/coverage-baseline.txt: c8 text-summary at start of Phase 8 (one-time
  capture; D-09 CPU constraint honored — single full-suite run).
- REQUIREMENTS.md: append TEST-01..TEST-08 mapped 1:1 to ROADMAP Phase 8
  success criteria #1..#8.
- CLAUDE.md: replace annotate.js verbatim-only locked-invariant bullet with
  the standard-test-discipline framing (CONTEXT D-01). Other invariants
  (pptxgenjs 4.0.1 pin, severity 4-tier, content-vs-design boundary,
  plugin-relative paths) untouched.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
    ```
  </action>
  <verify>
    <automated>grep -q 'TEST-08' .planning/REQUIREMENTS.md && grep -q 'standard test discipline' CLAUDE.md && ! grep -q 'SHA-pinned binary asset' CLAUDE.md && test -s tests/coverage-baseline.txt && grep -q 'pptxgenjs is pinned at exactly' CLAUDE.md</automated>
  </verify>
  <acceptance_criteria>
    - `tests/coverage-baseline.txt` exists, non-empty, contains a c8 `All files` summary row.
    - `.planning/REQUIREMENTS.md` contains TEST-01, TEST-02, ..., TEST-08 each as a `- [ ] **TEST-0N**: ...` bullet.
    - `CLAUDE.md` no longer contains the string `SHA-pinned binary asset`.
    - `CLAUDE.md` contains `standard test discipline`.
    - `CLAUDE.md` still contains the pptxgenjs 4.0.1 pin invariant (other invariants intact).
    - Atomic commit landed.
  </acceptance_criteria>
  <done>Baseline pinned; requirements traceable; CLAUDE.md aligned with CONTEXT D-01.</done>
</task>

</tasks>

<threat_model>
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-08-01 | Tampering | `.c8rc.json` exclude list silently hides product code from coverage | mitigate | exclude list is enumerated explicitly in PLAN <interfaces>; Plan 8-07 verification step asserts every file in CONTEXT D-03 scope appears in the final coverage report. |
| T-08-02 | Repudiation | Baseline number is unverifiable later | mitigate | tests/coverage-baseline.txt is committed and Plan 8-07 overwrites it with the 100% final report; git history preserves both. |
| T-08-03 | DoS | c8 instrumented full-suite run pegs CI runner | accept | One run per plan (D-09); CI runs `npm test` once per push, c8 overhead is well-bounded for this codebase size. |
</threat_model>

<verification>
- `node -e "const p=require('./package.json'); console.log(p.devDependencies.c8, p.scripts.test, Object.keys(p.scripts).filter(k=>k.startsWith('coverage')||k.startsWith('test:')))"` shows c8 10.1.3, the test script containing `c8 --100 --check-coverage`, and the scripts list includes `coverage`, `test:smoke`, `test:e2e`.
- `.c8rc.json` parses; `include` covers product code, `exclude` covers tests + fixture builders.
- `tests/coverage-baseline.txt` exists and has content.
- `grep TEST-0 .planning/REQUIREMENTS.md | wc -l` ≥ 8.
- `grep -c 'SHA-pinned binary asset' CLAUDE.md` = 0; `grep -c 'standard test discipline' CLAUDE.md` ≥ 1.
- 2 atomic commits in `git log`.
</verification>

<success_criteria>
- c8 wired and pinned (10.1.3, no caret).
- Baseline coverage report committed.
- TEST-01..TEST-08 traceable in REQUIREMENTS.md.
- CLAUDE.md aligned with CONTEXT D-01 (annotate.js policy reversal applied; other invariants intact).
- Wave 2 plans (8-02, 8-03, 8-04) can begin in parallel against this foundation.
- TEST-01 (the 100%-or-CI-fails outcome) is now ready to be driven to green by Waves 2 and 3.
</success_criteria>

<output>
`.planning/phases/08-test-coverage-100/08-01-SUMMARY.md` — c8 version pinned, .c8rc.json shape, baseline coverage % per file (paste the c8 `All files` row), enumerated TEST-01..TEST-08 mapping, CLAUDE.md diff summary, downstream consumers (Wave 2 plans target the gaps; Plan 8-07 overwrites baseline with final 100% report).
</output>
