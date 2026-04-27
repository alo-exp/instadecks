---
phase: 01-plugin-foundation-contract-ci-gates
plan: 09
subsystem: ci-and-docs
tags: [ci, github-actions, readme, found-01, found-08, phase-1-integration]
requires: [01-01, 01-02, 01-03, 01-04, 01-05, 01-06, 01-07, 01-08]
provides:
  - ".github/workflows/ci.yml — Phase 1 day-1 gate orchestration on ubuntu-latest, Node 20"
  - "README.md — public-facing install/skills/requirements/license skeleton (Phase 7 polishes)"
affects: [Phase 7 marketplace publication, Phase 2/3 LibreOffice runner step uncomment]
tech-stack:
  added: []
  patterns:
    - "GitHub Actions workflow: checkout → setup-node@v4 (cache:npm) → npm ci → ordered gate steps with ::error:: annotations"
    - "Explicit `node --test <file list>` (NOT `node --test tests/`) — directory form is unreliable across Node 20–25"
key-files:
  created:
    - README.md (rewritten from 13-byte stub)
  modified:
    - .github/workflows/ci.yml (replaced interim Plan 05 skeleton with full Phase 1 workflow)
decisions:
  - "Use explicit per-file `node --test` invocation rather than `node --test tests/` — local Node 25 reproducibly fails on directory form (MODULE_NOT_FOUND); explicit list is also self-documenting and matches the plan's PC reference"
  - "No `git config --global` prelude — Plan 05's path-lint.test.js commits with `git -c user.email=... -c user.name=...` per-test (PC-12 option (a), hermetic). Comment in ci.yml documents this choice"
  - "license-checker invoked via `npx license-checker` resolving from the local devDep installed by `npm ci` (PC-13). No `npx --yes` and no `--exclude` flag — Plan 08 verified jszip's dual-license SPDX does not trip the `--failOn 'GPL'` substring filter"
  - "LibreOffice + Poppler install reserved as a commented block above the Node test step — uncommented when Plan 06's Tier 2 visual-regression `test.skip` cases are unsuspended in Phase 2/3"
  - "Optional `claude plugin validate` gate is soft-fail (`if command -v claude`) — stock GitHub runners don't ship the CLI; the gate self-activates when a future runner image does"
metrics:
  duration: "~10 min"
  tasks_completed: 2
  files_created: 0
  files_modified: 2
  completed_date: 2026-04-27
---

# Phase 1 Plan 09: CI Workflow + README Skeleton Summary

Wired all seven Phase 1 day-1 gates into `.github/workflows/ci.yml` and replaced the 13-byte README stub with a public-facing install/skills/requirements/license skeleton. FOUND-01 (loadable plugin verified end-to-end) and FOUND-08 (CI fails loud on day-1 violations) are now satisfied; Phase 1 is structurally complete.

## What Was Built

### Task 1 — `.github/workflows/ci.yml` (commit `2872ae6`)

Replaced the interim Plan 05 skeleton (which only ran `npm ci`, `npm test --if-present`, and `bash tools/lint-paths.sh`) with the full Phase 1 workflow. Trigger is `push: branches: [main]` + `pull_request` (any branch); single `validate` job on `ubuntu-latest` with `defaults.run.shell: bash`.

Steps in order:
1. `actions/checkout@v4`
2. `actions/setup-node@v4` with `node-version: '20'` and `cache: 'npm'`
3. `npm ci` (full install — devDeps required for license-checker, pixelmatch, pngjs per PC-13)
4. **Gate 1** — `node tools/validate-manifest.js` (manifest schema + path checks)
5. **Gate 2** — `bash tools/lint-paths.sh` (hardcoded-path lint)
6. **Gate 3** — `node tools/assert-pptxgenjs-pin.js` (exact-pin assertion)
7. **Gate 4** — `npx license-checker --production --failOn 'GPL;AGPL;SSPL' --summary`
8. **Gate 5** — `test -x hooks/check-deps.sh` (executability)
9. **Gate 6** — `node --test <explicit file list>` (findings-schema, manifest-validator, path-lint, assert-pin, check-deps, annotate-integrity, visual-regression)
10. **Gate 7 (optional)** — `if command -v claude; then claude plugin validate; fi` (soft-fail)

Each gate wraps the underlying tool with a fallback `echo "::error...::"` annotation so CI surfaces a GitHub-rendered error even when the tool itself doesn't emit one. A reserved comment block above Gate 6 documents the LibreOffice + Poppler install line to uncomment when Tier 2 visual regression unskips.

### Task 2 — `README.md` skeleton (commit `b7d4a77`)

Replaced the 13-byte stub (`# Instadecks\n`) with a 52-line public skeleton:
- **H1 + tagline:** "Generate, review, and annotate polished presentation decks from any input."
- **Overview:** what the plugin is, what it ships (4 user-invocable slash skills), where it comes from (productized v8 BluePrestige).
- **Install:** `/plugin marketplace add alo-exp/instadecks` + `/plugin install instadecks`; `git clone` block for development.
- **Skills:** 4-row markdown table matching the SKILL.md frontmatter descriptions for `/instadecks:create`, `/instadecks:review`, `/instadecks:content-review`, `/instadecks:annotate`.
- **Requirements:** Node ≥ 18, `soffice`, `pdftoppm`; SessionStart hook auto-installs npm deps + IBM Plex Sans.
- **License:** Apache-2.0 with links to `LICENSE`, `NOTICE`, and `licenses/`.

Phase 7 polish (badges, screenshots, `/instadecks:doctor` section, marketplace listing block) is explicitly NOT in this skeleton — reserved per ROADMAP.md.

## Decisions Made

- **Explicit `node --test` file list instead of `node --test tests/`.** Local validation on Node 25 reproducibly fails the directory form (`MODULE_NOT_FOUND`, treats `tests` as a single test name). The plan's `<execution_notes>` already flagged this; the workflow uses the explicit per-file form, which also serves as self-documentation of the test surface.
- **No `git config --global` in CI prelude.** Plan 05's `tests/path-lint.test.js` already commits hermetically with `git -c user.email=test@test.local -c user.name=test commit` per-test (PC-12 option (a)). The workflow comments this choice next to Gate 6.
- **license-checker via local devDep, no `--exclude` flag.** Plan 08 verified jszip's `(MIT OR GPL-3.0-or-later)` SPDX expression is correctly evaluated on the permissive side by license-checker 25.0.1 — no false-positive on `--failOn 'GPL'`. If a future bump regresses this, narrow with `--exclude '(MIT OR GPL-3.0-or-later)'`.
- **LibreOffice install reserved, not active.** Adding `sudo apt-get install -y libreoffice poppler-utils fontconfig` would add ~60s to every CI run for tests that are currently `test.skip`. The block is reserved as a comment immediately above Gate 6, with a clear "uncomment when …" trigger condition.
- **`claude plugin validate` gated on `command -v claude`.** Stock GitHub runners don't ship the CLI; making this a hard gate would break CI on day 1. Soft-fail self-activates when runner images change.

## Deviations from Plan

None — plan executed exactly as written. The `<execution_notes>` instruction to use an explicit file list (not `node --test tests/`) was followed; PC-12 and PC-13 choices match the plan; no `--exclude` flag added per Plan 08 verification.

## Verification

- `test -f .github/workflows/ci.yml && grep -q "validate-manifest.js" && grep -q "lint-paths.sh" && grep -q "assert-pptxgenjs-pin.js" && grep -q "license-checker" && grep -q "node --test" && grep -q "test -x hooks/check-deps.sh"`: **PASS**
- `test -f README.md && grep -q '^# Instadecks' && grep -q '## Install' && grep -q '## Skills' && grep -q '## Requirements' && grep -q '## License' && grep -q 'Apache-2.0'`: **PASS**
- End-to-end local gate run (mirrors ci.yml step list):
  - `node tools/validate-manifest.js` → `Manifest OK`
  - `bash tools/lint-paths.sh` → `Path lint OK`
  - `node tools/assert-pptxgenjs-pin.js` → `pptxgenjs pin OK: 4.0.1`
  - `npx license-checker --production --failOn 'GPL;AGPL;SSPL' --summary` → exit 0; MIT:15, ISC:2, Apache-2.0:1, `(MIT OR GPL-3.0-or-later)`:1, `(MIT AND Zlib)`:1
  - `test -x hooks/check-deps.sh` → 0
  - `node --test <explicit file list>` → **42 tests, 40 pass, 0 fail, 2 skipped** (Tier 2 visual regression + annotate-integrity Tier 2 — both intentional `test.skip` per Plan 06)

## Commits

| Task | Commit  | Subject                                                                  |
| ---- | ------- | ------------------------------------------------------------------------ |
| 1    | 2872ae6 | `ci(01-09): wire all Phase 1 day-1 gates into ci.yml`                    |
| 2    | b7d4a77 | `docs(01-09): add README skeleton with install, skills, requirements, license` |

## Self-Check: PASSED

- `.github/workflows/ci.yml`: FOUND
- `README.md`: FOUND (52 lines, all required sections + Apache-2.0)
- Commit `2872ae6`: FOUND
- Commit `b7d4a77`: FOUND
- All 7 gates locally green; 40/42 tests pass with 2 documented skips

## EXECUTION COMPLETE
