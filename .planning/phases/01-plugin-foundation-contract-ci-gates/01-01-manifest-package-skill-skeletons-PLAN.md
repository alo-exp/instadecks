---
phase: 01-plugin-foundation-contract-ci-gates
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .claude-plugin/plugin.json
  - package.json
  - package-lock.json
  - skills/annotate/SKILL.md
  - skills/review/SKILL.md
  - skills/content-review/SKILL.md
  - skills/create/SKILL.md
autonomous: true
requirements: [FOUND-01, FOUND-02, FOUND-05]
must_haves:
  truths:
    - "Plugin loads via /plugin install alo-exp/instadecks (manifest is valid JSON, kebab-case name)"
    - "All four skill skeletons present with imperative-verb descriptions ≤ 1024 chars"
    - "pptxgenjs pinned exactly 4.0.1 in package.json (no caret) AND package-lock.json packages['node_modules/pptxgenjs'].version === '4.0.1'"
    - "devDependencies declared in package.json for license-checker, pixelmatch, pngjs (so CI uses cached local installs and npx resolves locally)"
    - "plugin.json explicitly sets `skills: \"./skills/\"` and `hooks: \"./hooks/hooks.json\"` (per PATTERNS.md row 1, matching topgun analog)"
  artifacts:
    - path: ".claude-plugin/plugin.json"
      provides: "Plugin manifest (name, version, license, author, repository, explicit skills + hooks paths)"
      contains: '"name": "instadecks"'
    - path: "package.json"
      provides: "Node package metadata + exact pptxgenjs pin + devDependencies (license-checker, pixelmatch, pngjs)"
      contains: '"pptxgenjs": "4.0.1"'
    - path: "package-lock.json"
      provides: "Reproducible-install lockfile; packages['node_modules/pptxgenjs'].version === '4.0.1'"
    - path: "skills/annotate/SKILL.md"
      provides: "/instadecks:annotate skill skeleton"
    - path: "skills/review/SKILL.md"
      provides: "/instadecks:review skill skeleton"
    - path: "skills/content-review/SKILL.md"
      provides: "/instadecks:content-review skill skeleton"
    - path: "skills/create/SKILL.md"
      provides: "/instadecks:create skill skeleton"
  key_links:
    - from: ".claude-plugin/plugin.json"
      to: "skills/{annotate,review,content-review,create}/SKILL.md"
      via: "explicit skills: \"./skills/\" path"
      pattern: "user-invocable: true"
    - from: "package.json"
      to: "package-lock.json"
      via: "npm ci sentinel guard (Plan 02)"
      pattern: '"pptxgenjs": "4.0.1"'
---

<objective>
Establish the loadable plugin skeleton: `.claude-plugin/plugin.json` manifest, `package.json` with the exact `pptxgenjs@4.0.1` pin + devDependencies, committed `package-lock.json`, and skeleton SKILL.md files for all four user-invocable skills (annotate, review, content-review, create).

Purpose: Phase 1 foundation — every later plan and phase depends on a loadable plugin name, the locked dep pin, and discoverable skill stubs.
Output: 7 new files. Plugin installs cleanly; skills are discoverable as `/instadecks:<name>`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-CONTEXT.md
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-RESEARCH.md
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-PATTERNS.md
@CLAUDE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Write plugin manifest + package.json + lockfile</name>
  <files>.claude-plugin/plugin.json, package.json, package-lock.json</files>
  <action>
    Per D-04, FOUND-05, and PATTERNS.md row for `.claude-plugin/plugin.json`:

    Create `.claude-plugin/plugin.json` with two-space indent and these top-level keys in this order: `name` ("instadecks", lowercase kebab-case), `version` ("0.1.0"), `description` (imperative-verb sentence describing the plugin, ≤ 1024 chars), `author` (object: `name: "Alo Labs"`, `url: "https://github.com/alo-exp/instadecks"`), `repository` ("https://github.com/alo-exp/instadecks"), `license` ("Apache-2.0"), `keywords` (array including "presentations", "pptx", "design-review", "annotation"), **`skills: "./skills/"`** (explicit, per PATTERNS.md row 1 — matches topgun analog; do NOT rely on defaults), **`hooks: "./hooks/hooks.json"`** (explicit). Do NOT set `commands` or `agents` (those defaults remain implicit since this plugin ships none).

    Create `package.json` with: `name: "instadecks"`, `version: "0.1.0"` (must match plugin.json), `license: "Apache-2.0"`, `engines.node: ">=18"`, `dependencies: { "pptxgenjs": "4.0.1" }` (EXACT, no caret/tilde — FOUND-05 invariant), `devDependencies: { "license-checker": "^25.0.1", "pixelmatch": "^5.3.0", "pngjs": "^7.0.0" }` (PC-13 — devDeps so CI runs `npm ci` once and `npx` resolves locally instead of fetching on every invocation; license-checker used by Plan 08 + Plan 09; pixelmatch + pngjs reserved for Plan 06 Tier 2 visual regression unsuspended in Phase 2), `scripts: { test: "node --test", "lint:paths": "bash tools/lint-paths.sh", "validate:manifest": "node tools/validate-manifest.js", "assert:pin": "node tools/assert-pptxgenjs-pin.js" }`.

    Run `npm install --save-exact pptxgenjs@4.0.1` (production dep), then `npm install --save-dev license-checker@^25.0.1 pixelmatch@^5.3.0 pngjs@^7.0.0` to populate devDependencies. This produces a single `package-lock.json` with both prod + dev pinned.

    **Lockfile assertion (PC-01):** Verify the lockfile records pptxgenjs at exactly 4.0.1:
    ```
    node -e "const l=require('./package-lock.json'); const v=l.packages['node_modules/pptxgenjs'].version; if(v!=='4.0.1'){console.error('lockfile drift: '+v); process.exit(1)}"
    ```
    Both the package.json assertion AND the lockfile-version assertion must pass before commit. Commit `package-lock.json`.

    No hardcoded user paths anywhere (lint-paths.sh enforces in Plan 05).
  </action>
  <verify>
    <automated>node -e "const p=require('./package.json'); if(p.dependencies.pptxgenjs!=='4.0.1') process.exit(1); for(const d of ['license-checker','pixelmatch','pngjs']){ if(!p.devDependencies||!p.devDependencies[d]) process.exit(2) }" && node -e "const l=require('./package-lock.json'); if(l.packages['node_modules/pptxgenjs'].version!=='4.0.1') process.exit(3)" && node -e "const m=require('./.claude-plugin/plugin.json'); if(m.name!=='instadecks'||!/^[a-z][a-z0-9-]*$/.test(m.name)) process.exit(4); if(m.skills!=='./skills/'||m.hooks!=='./hooks/hooks.json') process.exit(5)" && test -f package-lock.json</automated>
  </verify>
  <done>plugin.json valid JSON with kebab-case name + explicit skills/hooks paths; package.json has exact pptxgenjs 4.0.1 + three devDependencies; package-lock.json committed and lockfile pptxgenjs version === "4.0.1".</done>
</task>

<task type="auto">
  <name>Task 2: Write four SKILL.md skeletons</name>
  <files>skills/annotate/SKILL.md, skills/review/SKILL.md, skills/content-review/SKILL.md, skills/create/SKILL.md</files>
  <action>
    Per PATTERNS.md "Skill frontmatter" convention and CLAUDE.md File-layout § (skeletons only — full content lands in later phases):

    Each file has YAML frontmatter with EXACTLY these keys: `name` (skill name), `description` (single-line imperative-verb sentence ≤ 1024 chars; first word must be a verb like "Generate"/"Review"/"Critique"/"Annotate" — NOT "a"/"an"/"the"/"this"/"tool"/"skill"/"plugin"; mention trigger phrases like "This skill should be used when..."), `user-invocable: true`, `version: 0.1.0`. **The description MUST be a single-line scalar** — Plan 04's manifest validator hard-rejects multi-line block scalars (`description: |` or `description: >`).

    Below frontmatter, H1 in this exact form: `# /instadecks:<name> — <One-Line Title>`.

    Body is a single line: `Status: scaffold — full playbook lands in Phase <N>.` Phase mapping per CLAUDE.md: annotate→Phase 2, review→Phase 3, create→Phase 4, content-review→Phase 6.

    Sample descriptions (imperative, third-person voice, ≤1024 chars):
    - annotate: "Annotate a presentation deck with design-review findings. This skill should be used when the user has a deck file and a findings JSON in the locked schema and wants visual annotations overlaid as a PPTX + PDF."
    - review: "Review a presentation deck for design defects using DECK-VDA 4-pass methodology. This skill should be used when the user wants a design critique with finding-grammar output and AI-tell detection, optionally pipelined into annotation."
    - content-review: "Critique a deck's argument structure, narrative arc, and claim-evidence balance. This skill should be used when the user wants Pyramid Principle / MECE / standalone-readability checks distinct from visual review."
    - create: "Generate a polished presentation deck from any input (markdown, PDF, transcript, brief, URL). This skill should be used when the user wants a fresh deck authored with palette, typography, and 8 slide types — auto-refined to convergence."

    Use these or refine while keeping imperative-verb-first and ≤1024 char rule.
  </action>
  <verify>
    <automated>for f in skills/annotate/SKILL.md skills/review/SKILL.md skills/content-review/SKILL.md skills/create/SKILL.md; do test -f "$f" || exit 1; grep -q '^user-invocable: true' "$f" || exit 1; grep -q '^# /instadecks:' "$f" || exit 1; grep -qE '^description: \|' "$f" && exit 1; grep -qE '^description: >' "$f" && exit 1; done; exit 0</automated>
  </verify>
  <done>Four SKILL.md files exist with valid frontmatter, single-line imperative-verb descriptions (no block scalars), and H1 in the locked form.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| npm registry → developer machine | Lockfile-pinned install; transitive deps fetched from registry |
| plugin.json → Claude Code loader | Manifest is parsed; malformed JSON would crash loader |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-01 | Tampering | package-lock.json (supply chain) | mitigate | Commit lockfile; CI in Plan 09 enforces `npm ci` (refuses to mutate lockfile); license-checker (Plan 08) blocks GPL drift |
| T-01-02 | Information Disclosure | plugin.json author/email exposure | accept | All info is intentionally public (Apache-2.0 plugin on public GitHub) |
| T-01-03 | Denial of Service | Malformed plugin.json crashes loader | mitigate | Plan 04 manifest validator runs in CI; bespoke `node -e` smoke test in this plan's verify |
</threat_model>

<verification>
- `node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json'))"` passes
- `npm ci --omit=dev` succeeds with no lockfile drift
- All four skills/*/SKILL.md exist and pass imperative-verb / ≤1024 char check
</verification>

<success_criteria>
- plugin.json kebab-case name, valid JSON, two-space indent, explicit `skills` + `hooks` paths
- package.json has exactly `"pptxgenjs": "4.0.1"` (no caret); devDependencies declare license-checker, pixelmatch, pngjs; lockfile committed AND lockfile pptxgenjs version === "4.0.1"
- Four SKILL.md skeletons in place with correct frontmatter (single-line descriptions) and H1 form
</success_criteria>

<output>
After completion, create `.planning/phases/01-plugin-foundation-contract-ci-gates/01-01-SUMMARY.md`
</output>
