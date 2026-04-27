---
phase: 01-plugin-foundation-contract-ci-gates
plan: 05
type: execute
wave: 2
depends_on: [01]
files_modified:
  - tools/lint-paths.sh
  - tools/assert-pptxgenjs-pin.js
  - tests/path-lint.test.js
  - tests/assert-pin.test.js
autonomous: true
requirements: [FOUND-02, FOUND-05, FOUND-08]
must_haves:
  truths:
    - "tools/lint-paths.sh fails on /Users/, ~/.claude, /home/, C:\\\\ in any tracked file"
    - "Lint excludes tests/fixtures/**, *.md, and lines containing `# lint-allow:hardcoded-path`"
    - "tools/assert-pptxgenjs-pin.js fails if pptxgenjs is anything other than exactly 4.0.1"
    - "path-lint.test.js is hermetic: each test sets git user.email/user.name via `-c` flags on the commit command (no global git config mutation, per PC-12 option (a))"
  artifacts:
    - path: "tools/lint-paths.sh"
      provides: "Hardcoded-path lint (D-02)"
    - path: "tools/assert-pptxgenjs-pin.js"
      provides: "Version-pin assertion (FOUND-05)"
    - path: "tests/path-lint.test.js"
      provides: "Lint tests (positive + 4 deliberate hits + allowlist token + Windows-path coverage)"
    - path: "tests/assert-pin.test.js"
      provides: "Pin-assert tests (4.0.1, ^4.0.1, 4.0.0, missing)"
  key_links:
    - from: "tools/lint-paths.sh"
      to: "git ls-files"
      via: "git ls-files -z | xargs -0 grep -nE"
      pattern: "git ls-files"
    - from: "tools/assert-pptxgenjs-pin.js"
      to: "package.json"
      via: "require('../package.json').dependencies.pptxgenjs"
      pattern: "pptxgenjs"
---

<objective>
Implement the two remaining day-1 CI lint gates: `tools/lint-paths.sh` (hardcoded-path lint per D-02) and `tools/assert-pptxgenjs-pin.js` (exact-pin assertion per FOUND-05). Add `node --test` coverage for both, with hermetic git config (no global mutation, per PC-12).

Purpose: FOUND-02 + FOUND-05 + FOUND-08 part 2 — locks the path discipline and dep pin invariants from CLAUDE.md.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-CONTEXT.md
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-RESEARCH.md
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-PATTERNS.md
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-01-SUMMARY.md
@CLAUDE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Write tools/lint-paths.sh + tests/path-lint.test.js</name>
  <files>tools/lint-paths.sh, tests/path-lint.test.js</files>
  <action>
    Per D-02, RESEARCH.md Pattern 6, PATTERNS.md "tools/lint-paths.sh" row:

    `tools/lint-paths.sh`:
    - Shebang `#!/usr/bin/env bash`, then `set -euo pipefail` (CI-tool: NOT a SessionStart hook so no `trap exit 0`).
    - `cd "$(git rev-parse --show-toplevel)"`.
    - Pipeline: `git ls-files -z | xargs -0 grep -nE '/Users/|~/\.claude|/home/|C:\\\\\\\\' 2>/dev/null | grep -vE '^(tests/fixtures/|.+\.md:)' | grep -v '# lint-allow:hardcoded-path' || true`.
    - On any HITS: print `::error::Hardcoded paths found:` then the hits, exit 1. On none: `echo "Path lint OK"`, exit 0.

    Make executable: `chmod +x tools/lint-paths.sh`.

    `tests/path-lint.test.js`:
    Use `child_process.spawnSync` to invoke `bash` against `lint-paths.sh` from a temp git repo set up via `git init` + `git add` + `git commit`.

    **(PC-06) cwd + absolute-path requirement:** Each `spawnSync` invocation MUST set `cwd: tmpRepo` (the temp git repo root) AND pass an **absolute path** to `lint-paths.sh` as the script argument: `spawnSync('bash', [path.resolve(process.cwd(), 'tools/lint-paths.sh')], { cwd: tmpRepo, env: {...} })`. This is required because `lint-paths.sh` runs `git rev-parse --show-toplevel` to resolve the repo root — running from `cwd: tmpRepo` ensures it discovers the temp repo's toplevel, while the absolute script path ensures bash can locate the script regardless of cwd. Add an inline comment in the test file documenting this (PC-06).

    **(PC-12 option (a)) Hermetic git config:** Each `git commit` invocation in test setup MUST use `git -c user.email=test@test.local -c user.name=test commit ...`. Do NOT mutate global git config. This keeps tests hermetic and avoids needing a CI prelude step. Document this choice in the file's header comment.

    Subtests:
    1. `'clean repo passes'` — only innocent files; assert exit 0.
    2. `'/Users/ in source file fails'` — write `src/x.js` containing `/Users/foo/bar`; assert exit 1 + stderr/stdout includes "src/x.js".
    3. `'~/.claude in source fails'`.
    4. `'/home/ fails'`.
    5. `'tests/fixtures/foo.json with /Users/ is exempt'` — assert exit 0.
    6. `'*.md with /Users/ is exempt'`.
    7. `'line with `# lint-allow:hardcoded-path` is exempt'`.
    8. **(PC-07) `'C:\\Users on a single line is caught'`** — write `src/y.js` containing the literal string `C:\\Users\\foo\\bar` (escaped backslashes — the typical form in JS/JSON source where the regex `C:\\\\\\\\` is intended to match the four-character escape sequence `C:\\\\`). Assert exit 1 + output includes "src/y.js". **Scope note:** matches escaped-backslash form (typical in JS string literals); single-backslash literals (e.g. raw bash strings) are out of scope and intentionally not caught — document this in the test header comment.

    All hermetic — temp git repo per test; per-test `git -c user.email=... -c user.name=... commit`.
  </action>
  <verify>
    <automated>bash tools/lint-paths.sh && test -x tools/lint-paths.sh && node --test tests/path-lint.test.js</automated>
  </verify>
  <done>Lint passes against current repo; all 8 subtests green; spawnSync uses cwd:tmpRepo + absolute script path; commits use `-c user.email/-c user.name` (no global git config mutation).</done>
</task>

<task type="auto">
  <name>Task 2: Write tools/assert-pptxgenjs-pin.js + tests/assert-pin.test.js</name>
  <files>tools/assert-pptxgenjs-pin.js, tests/assert-pin.test.js</files>
  <action>
    Per FOUND-05 and RESEARCH.md Pattern 4:

    `tools/assert-pptxgenjs-pin.js`:
    - Shebang `#!/usr/bin/env node`. Header comment referencing FOUND-05 invariant.
    - Accept optional first arg = path to `package.json` (default `path.resolve(__dirname, '..', 'package.json')`).
    - Read JSON, get `dependencies.pptxgenjs`.
    - If string is exactly `"4.0.1"` (no caret, no tilde, no range): print `pptxgenjs pin OK: 4.0.1`, exit 0.
    - Else: print to stderr `::error::pptxgenjs must be exactly "4.0.1", got "<value>". No caret/tilde/range allowed (FOUND-05 invariant).`, exit 1.

    Make executable: `chmod +x tools/assert-pptxgenjs-pin.js`.

    `tests/assert-pin.test.js`:
    Use spawnSync. Build temp `package.json` per test.
    Subtests:
    1. `'4.0.1 exact passes'` — `dependencies: {pptxgenjs: "4.0.1"}`; assert exit 0.
    2. `'^4.0.1 fails'` — assert exit 1 + stderr mentions invariant.
    3. `'~4.0.1 fails'`.
    4. `'4.0.0 fails'`.
    5. `'missing dep fails'`.
    6. `'4.0.1 with surrounding spaces fails'` — `" 4.0.1 "`.
  </action>
  <verify>
    <automated>node tools/assert-pptxgenjs-pin.js && node --test tests/assert-pin.test.js</automated>
  </verify>
  <done>Pin-assert passes against repo; all 6 subtests green.</done>
</task>

</tasks>

<threat_model>
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-05-01 | Tampering | lint-allow:hardcoded-path bypass abuse | accept | Token is documented, intentional, grep-able in code review; reviewer catches misuse |
| T-05-02 | Tampering | pptxgenjs version drift via direct lockfile edit | mitigate | Pin assertion checks package.json (source of truth); CI also runs `npm ci` which refuses lockfile drift |
</threat_model>

<verification>
- `bash tools/lint-paths.sh` exits 0 against current repo
- `node tools/assert-pptxgenjs-pin.js` prints OK
- All node --test subtests pass with hermetic git config
</verification>

<success_criteria>
- FOUND-02: hardcoded-path lint live with documented allowlist token + Windows-path coverage (escaped-backslash form)
- FOUND-05: pptxgenjs exact-pin assertion live
- FOUND-08 part 2: both gates ready for CI wiring (Plan 09); no global git config mutation required
</success_criteria>

<output>
After completion, create `.planning/phases/01-plugin-foundation-contract-ci-gates/01-05-SUMMARY.md`
</output>
