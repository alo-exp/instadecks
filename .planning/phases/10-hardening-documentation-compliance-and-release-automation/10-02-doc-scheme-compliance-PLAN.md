---
plan: 10-02
phase: 10
slug: doc-scheme-compliance
status: ready
created: 2026-04-29
wave: 1
depends_on: []
autonomous: true
files_modified:
  - docs/ARCHITECTURE.md
  - docs/TESTING.md
  - docs/CHANGELOG.md
  - docs/CICD.md
  - docs/knowledge/INDEX.md
  - docs/knowledge/2026-04.md
  - docs/lessons/2026-04.md
  - docs/SECURITY.md
  - docs/CONTRIBUTING.md
  - README.md
  - tools/lint-doc-size.js
  - tests/tools-lint-doc-size-branches.test.js
  - .github/workflows/ci.yml
requirements: [HARD-04, HARD-05, HARD-06, HARD-07, HARD-08, HARD-09]

must_haves:
  truths:
    - "All 5 docs/doc-scheme.md required core files exist and are non-stale: docs/ARCHITECTURE.md, docs/TESTING.md, docs/CHANGELOG.md, docs/knowledge/INDEX.md, docs/doc-scheme.md (already present — audit + fill gaps if any header/section is empty or references pre-Phase-10 state)"
    - "docs/knowledge/2026-04.md contains ≥10 entries each formatted as `### <title>` followed by ≥3 lines, drawn from concrete Phase 1-10 history: at minimum these 10 — (1) JSON contract first / annotate.js as consumer (Phase 1-2 sequencing); (2) 4-tier→3-tier severity collapse at adapter only (CONTEXT D-decision); (3) annotate.js verbatim + require-path patch + SHA pin (locked invariant); (4) soffice race fix in pptx-to-images.sh (`-env:UserInstallation=file:///tmp/lo-...`); (5) auto-refine convergence rule `genuine_findings == 0 AND cycle ≥ 2` + oscillation `cycle N ⊆ cycle N-2`; (6) c8 100% hard gate (CI Gate 6) — Phase 8 closer; (7) bats local-only for bash; e2e local-only via CI=true env (CONTEXT D-08); (8) Cookbook ≥3 variants per slide type + design-DNA picker for visual variety (Phase 9); (9) Polymorphic brief intake via lib/brief-normalizer.js (Phase 9 DV-06/07); (10) cwd lock for parallel runCreate (Phase 10 HARD-02)"
    - "docs/lessons/2026-04.md contains ≥6 entries with portable categories: stack:pptxgenjs (4.0.1 pin + ShapeType enum gotchas + timestamps preclude byte-equivalent baselines); practice:tdd-with-mocked-llm (LLM-DI carve-out via _test_setLlm injection so unit tests stay deterministic); practice:auto-refine-loop (convergence rule + oscillation detection + soft cap + user interrupt as a portable pattern); design:cookbook-variants (≥3 variants per slide type as the antidote to AI-tell uniformity); devops:c8-100-gate (the discipline of `--100 --check-coverage` as a hard CI gate, no exclusions); design:design-dna-picker (palette × typography × motif rotation per deck — explicit diversity check). Each entry has no instadecks-specific file paths in its core lesson body (file paths allowed only in 'Reference' footer per lessons portability rule)"
    - "tools/lint-doc-size.js exists and exports a CLI that walks `docs/**/*.md`, asserts files matching `docs/*.md` (non-subdir) are ≤500 lines and files matching `docs/knowledge/*.md` or `docs/lessons/*.md` are ≤300 lines; emits `lint-doc-size: OK (<N> files clean)` on pass and `path:linecount exceeds cap of <cap>` per violation, exits 1 on any violation"
    - "tools/lint-doc-size.js wired into CI as a new step in `.github/workflows/ci.yml` BEFORE the existing coverage gate; named `Gate 7 — Doc size caps`"
    - "docs/knowledge/INDEX.md links every file under docs/ recursively (every `.md` file); `tools/lint-doc-size.js` includes a sub-check `--orphans` that asserts every doc has at least one matching link in `docs/knowledge/INDEX.md`; orphans surface as `path: not linked from docs/knowledge/INDEX.md`"
    - "docs/SECURITY.md scaffolded with 4 sections: 'Threat Model' (1 paragraph: plugin runs locally; trust boundary is the user's filesystem; soffice/pdftoppm/pptxgenjs subprocess scope); 'Bundled-software CVE policy' (license-audit + dependabot if enabled); 'Reporting' (mailto: shafqat@sourcevo.com); 'Known limitations' (3 bullets including: no input sanitization beyond what pptxgenjs does; LLM-driven extractor trusts file contents; no sandbox for soffice)"
    - "docs/CONTRIBUTING.md scaffolded with 5 sections: 'Development setup' (npm ci, system deps soffice + pdftoppm, IBM Plex Sans font); 'Test discipline' (npm test = c8 --100 --check-coverage; npm run test:bats; npm run test:e2e local only); 'Locked invariants' (pptxgenjs 4.0.1 pin, annotate.js standard test discipline, severity 4-tier at reviewers, plugin-relative paths only — pointers to CLAUDE.md); 'Commit + PR conventions' (Conventional Commits); 'Adding new cookbook variants / palettes / motifs' (link to skills/create/references/* + cookbook-variant-coverage tests)"
    - "docs/CICD.md updated to reflect Phase 10 release-automation chain: lists every `npm run gate:*` script + `npm run release:dry-run` + `npm run release` (forward-references Plans 10-03..10-06 outputs)"
    - "docs/ARCHITECTURE.md updated with a 'Release pipeline' section appended (≤30 lines) summarizing the 7-gate chain (lint paths, lint enums, license-audit, manifest-validator, doc-size, c8 100%, bats)"
    - "All docs/*.md ≤ 500 lines; all docs/knowledge/*.md ≤ 300; all docs/lessons/*.md ≤ 300 — verified by running tools/lint-doc-size.js after edits"
    - "docs/CHANGELOG.md gains a Phase 10 entry rolled forward (single ## section dated 2026-04-29 listing the 6 plans being landed)"
  artifacts:
    - path: "tools/lint-doc-size.js"
      provides: "Doc-size + orphan lint as CI gate"
      contains: "lint-doc-size: OK"
    - path: "docs/knowledge/2026-04.md"
      provides: "≥10 Phase 1-10 knowledge entries"
      contains: "annotate.js"
    - path: "docs/lessons/2026-04.md"
      provides: "≥6 portable lessons"
      contains: "stack:pptxgenjs"
    - path: "docs/SECURITY.md"
      provides: "Security scaffold post-audit"
      contains: "Threat Model"
    - path: "docs/CONTRIBUTING.md"
      provides: "Contributor guide"
      contains: "Locked invariants"
    - path: ".github/workflows/ci.yml"
      provides: "Gate 7 — Doc size caps wired before coverage gate"
      contains: "lint-doc-size"
  key_links:
    - from: "docs/knowledge/INDEX.md"
      to: "docs/**/*.md"
      via: "every doc has a markdown link in INDEX.md (verified by lint --orphans)"
      pattern: "\\[.*\\]\\(.*\\.md\\)"
    - from: ".github/workflows/ci.yml"
      to: "tools/lint-doc-size.js"
      via: "Gate 7 step runs `node tools/lint-doc-size.js`"
      pattern: "lint-doc-size"
---

<objective>
Wave 2 — bring documentation to 100% compliance with `docs/doc-scheme.md`. The scheme is already largely populated (ARCHITECTURE/TESTING/CHANGELOG/INDEX/doc-scheme exist; knowledge/2026-04.md and lessons/2026-04.md exist as files). Phase 10 fills them with non-trivial content from the 10-phase build, scaffolds SECURITY + CONTRIBUTING (post-audit / multi-contributor), enforces size caps via a new lint tool wired into CI, and verifies INDEX.md has zero orphans.

Purpose: a future contributor (or marketplace reviewer) reading only `docs/` should understand architecture + testing strategy + key decisions + portable lessons without spelunking 10 phase directories.
Output: 9 doc files updated/scaffolded + 1 new lint tool + 1 test file + CI workflow update.

**Scope note (revision — checker W-2):** This plan exceeds the standard 3-task / ≤5-files-per-task ceiling (5 tasks, 13 files in `files_modified`). The threshold is intentionally relaxed because every task here is doc-scaffolding/append work — no executable subsystem code, no cross-cutting refactor. Each task touches a disjoint subset of doc files (Task 1: tool + CI; Task 2: knowledge; Task 3: lessons; Task 4: SECURITY+CONTRIBUTING; Task 5: INDEX+ARCH+TESTING+CICD+CHANGELOG+README), so per-task context cost stays under the 30% target despite the aggregate file count. If any single task balloons during execution, split it then; do not split prophylactically.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/SPEC.md
@.planning/ROADMAP.md
@docs/doc-scheme.md
@docs/ARCHITECTURE.md
@docs/TESTING.md
@docs/knowledge/INDEX.md
@docs/knowledge/2026-04.md
@docs/lessons/2026-04.md
@CLAUDE.md
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Author tools/lint-doc-size.js + CI Gate 7 (HARD-07)</name>
  <read_first>tools/lint-pptxgenjs-enums.js (mirror walker style — fs.readdirSync withFileTypes, recursive); .github/workflows/ci.yml (find existing Gate 1-6 step block to know where to insert Gate 7); docs/doc-scheme.md (size-cap table at lines 79-87 — confirm 500/300/300 caps)</read_first>
  <files>tools/lint-doc-size.js, tests/tools-lint-doc-size-branches.test.js, .github/workflows/ci.yml</files>
  <behavior>
    - `node tools/lint-doc-size.js` against current repo exits 0 after Tasks 2-5 land (all docs within caps).
    - Synthesize a fixture doc at 501 lines under `docs/` → lint exits 1 with `docs/<file>:501 exceeds cap of 500`.
    - Synthesize a fixture at 301 lines under `docs/knowledge/` → exits 1 with `docs/knowledge/<file>:301 exceeds cap of 300`.
    - `node tools/lint-doc-size.js --orphans` additionally walks `docs/**/*.md` and asserts every path appears as a substring of a link in `docs/knowledge/INDEX.md`; missing → `path: not linked from docs/knowledge/INDEX.md`.
  </behavior>
  <action>
1. Create `tools/lint-doc-size.js` as a Node CLI:
   - `walk('docs')` returns all `.md` files.
   - For each: line count = `fs.readFileSync(p,'utf8').split('\n').length`. Cap = `300` if path matches `^docs/(knowledge|lessons)/`; else `500`. Push violation if exceeded.
   - If `--orphans` flag: read `docs/knowledge/INDEX.md` once; for each found doc path (relative to repo root), if INDEX content does not contain that path as a substring, push `not linked` violation.
   - Print `lint-doc-size: OK (<N> files clean)` on pass; print one line per violation; exit 0/1.
2. Create `tests/tools-lint-doc-size-branches.test.js` with 5 cases: (a) clean repo passes; (b) oversized docs/*.md fails; (c) oversized docs/knowledge/*.md fails; (d) --orphans flag detects a synthesized unlisted doc; (e) --orphans flag passes when all docs are linked. Use `tmpdir` + symlinks or `--root <dir>` flag (add this flag to the tool: `const root = process.argv.find(a => a.startsWith('--root='))?.split('=')[1] || process.cwd()`).
3. Edit `.github/workflows/ci.yml` to insert a new step labeled `- name: Gate 7 — Doc size caps` immediately BEFORE the existing coverage gate step. Step body: `run: node tools/lint-doc-size.js && node tools/lint-doc-size.js --orphans`.
  </action>
  <verify>
    <automated>node --test tests/tools-lint-doc-size-branches.test.js && node tools/lint-doc-size.js</automated>
  </verify>
  <acceptance_criteria>
    - `tools/lint-doc-size.js` exists; `node tools/lint-doc-size.js` exits 0 against current repo (after Tasks 2-5 complete)
    - 5 test cases pass
    - `grep "Gate 7" .github/workflows/ci.yml` returns 1 line
    - `grep "lint-doc-size" .github/workflows/ci.yml` returns ≥1 line
  </acceptance_criteria>
  <done>Doc-size + orphan lint live + CI gate wired.</done>
</task>

<task type="auto">
  <name>Task 2: Populate docs/knowledge/2026-04.md with ≥10 Phase 1-10 entries (HARD-05)</name>
  <read_first>docs/knowledge/2026-04.md (current contents — append, don't overwrite, if non-trivial entries exist); .planning/STATE.md Decisions section + .planning/RELEASE.md (source material for entries 6-7); .planning/phases/02-instadecks-annotate/02-CONTEXT.md, .planning/phases/03-instadecks-review/03-CONTEXT.md, .planning/phases/05-instadecks-create-auto-refine/05-CONTEXT.md, .planning/phases/08-test-coverage-100/08-CONTEXT.md, .planning/phases/09-design-variety-and-brief-polymorphism/09-CONTEXT.md (locked decisions per phase — source for entries 1-9)</read_first>
  <files>docs/knowledge/2026-04.md</files>
  <action>
Author exactly 10 entries (or append to whatever already exists in the file to reach ≥10) using this template per entry:

```
### <Title>

**Category:** <Architecture Patterns | Known Gotchas | Key Decisions | Recurring Patterns>
**Phases:** <comma-separated phase numbers>

<3-7 lines explaining the what + why + the source-of-truth file references>
```

The 10 required entries (titles must match these so the lint can verify):
1. "JSON contract first; annotate.js as consumer" — Key Decisions; Phase 1-2.
2. "4-tier→3-tier severity collapse at /annotate adapter only" — Key Decisions; Phase 1.
3. "annotate.js verbatim + require-path patch + SHA pin" — Architecture Patterns; Phase 2.
4. "soffice race fix via per-call -env:UserInstallation" — Known Gotchas; Phase 3.
5. "Auto-refine convergence: genuine_findings==0 AND cycle≥2 + oscillation cycle N ⊆ cycle N-2" — Architecture Patterns; Phase 5.
6. "c8 100% as a hard CI gate (no exclusions)" — Key Decisions; Phase 8.
7. "bats local-only for bash; e2e gated by CI=true env" — Recurring Patterns; Phase 8.
8. "Cookbook ≥3 variants per slide type + design-DNA rotation" — Architecture Patterns; Phase 9.
9. "Polymorphic brief intake via lib/brief-normalizer.js" — Architecture Patterns; Phase 9.
10. "cwd lock for parallel runCreate (`.runCreate.lock` + 30s soft-fail)" — Known Gotchas; Phase 10.

File MUST stay ≤300 lines. If existing content + new entries exceeds 300, split content body of each entry to 4-5 lines. Do not pad.
  </action>
  <verify>
    <automated>grep -c "^### " docs/knowledge/2026-04.md | awk '$1 >= 10 {exit 0} {exit 1}' && wc -l docs/knowledge/2026-04.md | awk '$1 <= 300 {exit 0} {exit 1}'</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "^### " docs/knowledge/2026-04.md` ≥ 10
    - `wc -l docs/knowledge/2026-04.md` ≤ 300
    - Each of the 10 required titles appears verbatim
    - File contains the strings "annotate.js" and ".runCreate.lock"
  </acceptance_criteria>
  <done>Knowledge entries populated; size cap respected.</done>
</task>

<task type="auto">
  <name>Task 3: Populate docs/lessons/2026-04.md with ≥6 portable lessons (HARD-06)</name>
  <read_first>docs/lessons/2026-04.md (current contents); docs/doc-scheme.md lines 36-44 (lessons portability rule — no project-specific paths in core body)</read_first>
  <files>docs/lessons/2026-04.md</files>
  <action>
Author exactly 6 entries using this template:

```
### <category>: <title>

**When this applies:** <portable scenario, no instadecks specifics>

<4-7 lines of portable lesson body>

**Reference:** <single line linking to the project-specific source — this is the ONLY place project-specific paths are allowed>
```

The 6 required entries (category prefix MUST match for lint verifiability):
1. `stack:pptxgenjs` — "pptxgenjs version pinning + ShapeType enum gotchas + timestamp non-determinism"
2. `practice:tdd-with-mocked-llm` — "LLM-driven code is testable: dependency-inject `getLlm()` and stub it in unit tests; reserve real-LLM calls for E2E only"
3. `practice:auto-refine-loop` — "Convergence loop pattern: cycle≥2 confirmation + oscillation detection (cycle N ⊆ cycle N-2) + soft cap with user override + interrupt flag file"
4. `design:cookbook-variants` — "Generative tools that ship one template per type produce homogeneous output. Ship ≥3 variants and rotate."
5. `devops:c8-100-gate` — "100% coverage as a hard gate (no exclusions, no thresholds <100%) eliminates the slow drift toward untested branches"
6. `design:design-dna-picker` — "Palette × typography × motif rotation per output, with explicit diversity check against prior runs, prevents stylistic monotony"

Body MUST NOT contain `instadecks` / `pres.shapes` / `runCreate` / `.planning/` etc. — only the **Reference:** line may. File ≤ 300 lines.
  </action>
  <verify>
    <automated>grep -c "^### " docs/lessons/2026-04.md | awk '$1 >= 6 {exit 0} {exit 1}' && wc -l docs/lessons/2026-04.md | awk '$1 <= 300 {exit 0} {exit 1}'</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "^### " docs/lessons/2026-04.md` ≥ 6
    - All 6 category prefixes present: `grep -E "^### (stack:pptxgenjs|practice:tdd-with-mocked-llm|practice:auto-refine-loop|design:cookbook-variants|devops:c8-100-gate|design:design-dna-picker)" docs/lessons/2026-04.md` returns 6 lines
    - `wc -l docs/lessons/2026-04.md` ≤ 300
    - Body content (lines NOT starting with `**Reference:**`) does NOT contain "instadecks" or "runCreate" or ".planning"
  </acceptance_criteria>
  <done>Portable lessons populated; size cap respected.</done>
</task>

<task type="auto">
  <name>Task 4: Scaffold docs/SECURITY.md + docs/CONTRIBUTING.md (HARD-09)</name>
  <read_first>docs/doc-scheme.md (optional-files table for SECURITY.md / CONTRIBUTING.md guidance); CLAUDE.md (locked invariants — these go in CONTRIBUTING under "Locked invariants" section)</read_first>
  <files>docs/SECURITY.md, docs/CONTRIBUTING.md</files>
  <action>
1. Create `docs/SECURITY.md` with these 4 H2 sections (verbatim names): "## Threat Model", "## Bundled-software CVE policy", "## Reporting", "## Known limitations". Body length 30-80 lines total. Reporting section: `Email: shafqat@sourcevo.com`. Known limitations 3 bullets (per must_haves).
2. Create `docs/CONTRIBUTING.md` with these 5 H2 sections (verbatim): "## Development setup", "## Test discipline", "## Locked invariants", "## Commit + PR conventions", "## Adding new cookbook variants / palettes / motifs". Body 50-150 lines. Locked invariants section MUST cite CLAUDE.md by relative path.
3. After creating both, add corresponding links to `docs/knowledge/INDEX.md` (Task 5).
  </action>
  <verify>
    <automated>grep -c "^## " docs/SECURITY.md | awk '$1 >= 4 {exit 0} {exit 1}' && grep -c "^## " docs/CONTRIBUTING.md | awk '$1 >= 5 {exit 0} {exit 1}'</automated>
  </verify>
  <acceptance_criteria>
    - `grep "## Threat Model" docs/SECURITY.md` returns 1
    - `grep "shafqat@sourcevo.com" docs/SECURITY.md` returns 1
    - `grep "## Locked invariants" docs/CONTRIBUTING.md` returns 1
    - `grep "CLAUDE.md" docs/CONTRIBUTING.md` returns ≥1
    - `wc -l docs/SECURITY.md` ≤ 500 AND `wc -l docs/CONTRIBUTING.md` ≤ 500
  </acceptance_criteria>
  <done>SECURITY + CONTRIBUTING scaffolded.</done>
</task>

<task type="auto">
  <name>Task 5: Update INDEX.md + ARCHITECTURE.md + TESTING.md + CICD.md + CHANGELOG.md + README.md; verify zero orphans (HARD-04, HARD-08)</name>
  <read_first>docs/knowledge/INDEX.md (current content — preserve sections, append new links); docs/ARCHITECTURE.md (find a clean append point — last H2); docs/CICD.md (current content); docs/CHANGELOG.md (rolling task log style — append, don't rewrite); README.md (Testing section + badges — leave the marketplace-finalized parts alone, just verify currency)</read_first>
  <files>docs/knowledge/INDEX.md, docs/ARCHITECTURE.md, docs/TESTING.md, docs/CICD.md, docs/CHANGELOG.md, README.md</files>
  <action>
1. **INDEX.md**: ensure every file under `docs/` recursively has a markdown link. After Tasks 2-4, the new files to add are: `docs/SECURITY.md`, `docs/CONTRIBUTING.md` (other 2026-04 files were already present per ls). Run `node tools/lint-doc-size.js --orphans` (Task 1) and patch INDEX.md until exit 0.
2. **ARCHITECTURE.md**: append a new H2 "## Release pipeline" section (≤30 lines) describing the 7-gate chain: (1) lint paths, (2) lint pptxgenjs enums, (3) license-audit, (4) manifest-validator, (5) lint-doc-size + orphans (NEW), (6) c8 100%, (7) bats. Forward-reference Plans 10-03..10-06 for activation/permission/fresh-install/release automation.
3. **TESTING.md**: ensure it lists all of: `npm test` (= c8 100% gate), `npm run test:bats`, `npm run test:e2e` (local-only), `npm run test:smoke`, plus the Phase-10 additions `npm run gate:activation-panel`, `npm run gate:permission-mode`, `npm run gate:fresh-install`, `npm run release:dry-run`, `npm run release` (forward references). If section "## Phase-10 release-automation gates" is missing, add it.
4. **CICD.md**: update to reflect the 7-gate sequence; add the 5 new `npm run gate:*` / `release:dry-run` / `release` scripts to the "Local commands" table.
5. **CHANGELOG.md**: append a new H2 dated 2026-04-29 titled `## 2026-04-29 — Phase 10: Hardening, Documentation Compliance, and Release Automation` with one bullet per plan (10-01..10-06 forward-references, even though plans 10-03..10-06 land in this same wave-cycle — list them as planned).
6. **README.md**: verify the Testing section badges and command list still accurate; if Phase 10 introduces new visible commands (`npm run release:dry-run`), add a single line. Do NOT touch the marketplace-finalized scope-reduction sentinels (Quick Start, Skills table, Acknowledgements, Architecture-paragraph).
7. Run `node tools/lint-doc-size.js && node tools/lint-doc-size.js --orphans`; both must exit 0.
  </action>
  <verify>
    <automated>node tools/lint-doc-size.js && node tools/lint-doc-size.js --orphans</automated>
  </verify>
  <acceptance_criteria>
    - `node tools/lint-doc-size.js --orphans` exits 0
    - `grep "Release pipeline" docs/ARCHITECTURE.md` returns 1 line
    - `grep "lint-doc-size" docs/CICD.md` returns ≥1 line
    - `grep "Phase 10" docs/CHANGELOG.md` returns ≥1 line
    - `grep -E "SECURITY\.md|CONTRIBUTING\.md" docs/knowledge/INDEX.md` returns 2 lines
  </acceptance_criteria>
  <done>doc-scheme.md compliance achieved; INDEX.md zero orphans; size caps green.</done>
</task>

</tasks>

<verification>
- All 5 doc-scheme.md core files current (HARD-04)
- ≥10 knowledge entries (HARD-05)
- ≥6 portable lessons with no project-specific paths in body (HARD-06)
- Size caps enforced via tools/lint-doc-size.js + CI Gate 7 (HARD-07)
- INDEX.md links every doc; --orphans clean (HARD-08)
- SECURITY.md + CONTRIBUTING.md scaffolded (HARD-09)
- Full `npm test` still green; c8 100% gate maintained
</verification>

<success_criteria>
- AC-04, AC-05, AC-06, AC-07, AC-08, AC-09 satisfied per SPEC.md
- `node tools/lint-doc-size.js && node tools/lint-doc-size.js --orphans` exits 0
- CI Gate 7 wired in `.github/workflows/ci.yml`
</success_criteria>

<output>
After completion, create `.planning/phases/10-hardening-documentation-compliance-and-release-automation/10-02-SUMMARY.md`.
</output>
