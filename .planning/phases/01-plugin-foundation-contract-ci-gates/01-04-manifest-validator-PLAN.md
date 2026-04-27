---
phase: 01-plugin-foundation-contract-ci-gates
plan: 04
type: execute
wave: 2
depends_on: [01]
files_modified:
  - tools/validate-manifest.js
  - tests/manifest-validator.test.js
autonomous: true
requirements: [FOUND-08]
must_haves:
  truths:
    - "tools/validate-manifest.js exits 0 on valid manifest, non-zero on schema/path/description violations"
    - "Validator catches kebab-case violations, semver violations, missing component paths, descriptions > 1024 chars, descriptions starting with non-imperative words"
    - "Validator hard-rejects multi-line YAML description block scalars (`description: |` or `description: >`) — descriptions MUST be single-line"
  artifacts:
    - path: "tools/validate-manifest.js"
      provides: "Bespoke manifest validator (D-04) — primary CI gate for plugin.json"
    - path: "tests/manifest-validator.test.js"
      provides: "Unit test exercising validator on valid + 6 deliberate-failure fixtures (incl. multi-line description)"
  key_links:
    - from: "tools/validate-manifest.js"
      to: ".claude-plugin/plugin.json + skills/*/SKILL.md"
      via: "fs.readFileSync + path resolution + frontmatter parse"
      pattern: "plugin.json"
---

<objective>
Implement `tools/validate-manifest.js` (D-04) — bespoke validator that checks (a) manifest schema shape (kebab-case name, semver version), (b) component path resolution, (c) skill descriptions ≤ 1024 chars, single-line, and starting with imperative verbs. Add unit test using temp-dir fixtures.

Purpose: FOUND-08 part 1 — first CI gate. Description-quality scoring deferred to Phase 7 DIST-02 per D-04.
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
</context>

<tasks>

<task type="auto">
  <name>Task 1: Write tools/validate-manifest.js</name>
  <files>tools/validate-manifest.js</files>
  <action>
    Per D-04, RESEARCH.md Pattern 3 skeleton, and PATTERNS.md "Node script header" + "tools/validate-manifest.js" rows:

    First line: `#!/usr/bin/env node`. Second line: file purpose comment + reference to D-04. Use `node:fs`, `node:path` only (zero deps).

    Accept optional first arg as plugin root (defaults to `path.resolve(__dirname, '..')`). Read `<root>/.claude-plugin/plugin.json`.

    Validations (collect all errors, exit non-zero if any):
    (a) Manifest shape:
      - `m.name` exists, matches `/^[a-z][a-z0-9-]*$/` (kebab-case).
      - If `m.version` set, matches `/^\d+\.\d+\.\d+/` (semver).
      - If `m.license` set, is a non-empty string.
    (b) Component paths — for each of `skills`, `commands`, `agents`, `hooks`, `mcpServers`: if explicitly set as a string path, `fs.existsSync` resolves; if not set, default path used (no error).
    (c) Skill descriptions — iterate `<root>/<skillsDir>/<skill>/SKILL.md` (skillsDir = `m.skills` if string else `'skills'`):
      - Parse YAML frontmatter between `^---$` markers.
      - **(PC-05) Multi-line block-scalar rejection — HARD FAILURE:** if the `description:` line matches `/^description:\s*[|>]/`, emit error `<file>: description MUST be single-line; block scalars (| or >) are forbidden` and exit 1. This check runs BEFORE the length / first-word checks since they assume a single-line scalar.
      - Description must be ≤ 1024 chars (after stripping the leading `description:` key, surrounding quotes, and trailing whitespace).
      - First word (strip leading quote) must NOT be in `['a','an','the','this','tool','skill','plugin']` (case-insensitive). Imperative-verb heuristic per D-04.
      - User-invocable check: if frontmatter contains `user-invocable: true`, the description rules apply strictly; otherwise log info but don't fail.

    On any error: print to stderr each error as `<file>: <message>`, exit 1. On clean: `console.log('Manifest OK')`, exit 0.

    Make executable: `chmod +x tools/validate-manifest.js`. Also runnable via `node tools/validate-manifest.js`.
  </action>
  <verify>
    <automated>node tools/validate-manifest.js && test -x tools/validate-manifest.js</automated>
  </verify>
  <done>Validator runs against actual repo manifest from Plan 01 + skills from Plan 01 and prints "Manifest OK"; rejects multi-line description block scalars.</done>
</task>

<task type="auto">
  <name>Task 2: Write tests/manifest-validator.test.js</name>
  <files>tests/manifest-validator.test.js</files>
  <action>
    Use `node:test`, `node:assert/strict`, `node:child_process` (spawnSync), `node:fs/promises`, `node:os`, `node:path`. First-line banner.

    For each test, build a minimal plugin tree in `fs.mkdtempSync(...)`:
    - `<tmp>/.claude-plugin/plugin.json` (the manifest under test)
    - `<tmp>/skills/<name>/SKILL.md` (frontmatter + H1 + body)

    Then `spawnSync('node', ['tools/validate-manifest.js', tmpRoot], {cwd: process.cwd()})`.

    Subtests:
    1. `'valid manifest passes'` — kebab-case name, semver version, valid skill description starting with imperative verb. Assert exit 0 + stdout includes "Manifest OK".
    2. `'rejects non-kebab-case name'` — `name: "Instadecks"` (capital I). Assert exit 1 + stderr mentions kebab-case.
    3. `'rejects bad semver'` — `version: "1.0"`. Assert exit 1.
    4. `'rejects skill description > 1024 chars'` — generate 1100-char description. Assert exit 1.
    5. `'rejects skill description starting with "the"'` — assert exit 1 + stderr mentions imperative verb.
    6. `'rejects missing component path when explicitly set'` — set `skills: "./does-not-exist/"`. Assert exit 1.
    7. **(PC-05) `'rejects multi-line description block scalar'`** — write SKILL.md frontmatter with `description: |\n  Generate a deck.\n  Multi-line continuation.`; assert exit 1 + stderr mentions "single-line" / "block scalar". Repeat for `description: >` folded scalar form (sub-assertion in same subtest is acceptable).

    All tests are hermetic — temp dir per test, cleaned up after.
  </action>
  <verify>
    <automated>node --test tests/manifest-validator.test.js</automated>
  </verify>
  <done>All 7 subtests pass; validator exits non-zero on each deliberate failure including multi-line description block scalar.</done>
</task>

</tasks>

<verification>
- `node tools/validate-manifest.js` against repo passes
- `node --test tests/manifest-validator.test.js` all green
</verification>

<success_criteria>
- FOUND-08 part 1: manifest validator implemented with full coverage of (a)/(b)/(c) checks + multi-line description hard-rejection
- Description-quality / activation-rate scoring NOT implemented (deferred to Phase 7 DIST-02 per D-04)
</success_criteria>

<output>
After completion, create `.planning/phases/01-plugin-foundation-contract-ci-gates/01-04-SUMMARY.md`
</output>
