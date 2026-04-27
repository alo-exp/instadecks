---
phase: 01-plugin-foundation-contract-ci-gates
plan: 09
type: execute
wave: 4
depends_on: [01, 02, 03, 04, 05, 06, 07, 08]
files_modified:
  - .github/workflows/ci.yml
  - README.md
autonomous: true
requirements: [FOUND-01, FOUND-08]
must_haves:
  truths:
    - "CI workflow runs on push + pull_request to main, on ubuntu-latest"
    - "All Phase 1 gates wired: manifest validator, hardcoded-path lint, pptxgenjs version-pin, license-checker, hook executability check, node --test full suite, Tier 1 SHA self-check"
    - "CI fails loud on any single gate violation; uses ::error:: annotations for failures"
    - "README.md skeleton present: install instructions (marketplace + git clone), four skills table, requirements, license"
    - "No global git config mutation in CI prelude — Plan 05's path-lint.test.js uses `git -c user.email=... -c user.name=...` per-commit (PC-12 option (a)). devDependencies (license-checker, pixelmatch, pngjs) declared in Plan 01 package.json so `npm ci` populates them once and `npx` resolves locally (PC-13)."
  artifacts:
    - path: ".github/workflows/ci.yml"
      provides: "CI orchestration of all Phase 1 day-1 gates"
    - path: "README.md"
      provides: "Public-facing install + usage skeleton (Phase 7 polishes)"
  key_links:
    - from: ".github/workflows/ci.yml"
      to: "tools/validate-manifest.js + tools/lint-paths.sh + tools/assert-pptxgenjs-pin.js + license-checker + node --test"
      via: "explicit job steps in declared order"
      pattern: "tools/"
---

<objective>
Wire all Phase 1 gates into a single CI workflow (`.github/workflows/ci.yml`) and ship a README.md skeleton (Phase 7 polishes for marketplace).

Purpose: FOUND-01 (loadable plugin verified end-to-end) + FOUND-08 (CI fails loud on day-1 violations). This is the integration plan — every prior plan's deliverable is exercised here.
Depends on all prior plans (01–08).
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
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-02-SUMMARY.md
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-03-SUMMARY.md
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-04-SUMMARY.md
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-05-SUMMARY.md
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-06-SUMMARY.md
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-07-SUMMARY.md
@.planning/phases/01-plugin-foundation-contract-ci-gates/01-08-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Write .github/workflows/ci.yml</name>
  <files>.github/workflows/ci.yml</files>
  <action>
    Per FOUND-01, FOUND-08, RESEARCH.md "System Architecture Diagram" CI section, PATTERNS.md ".github/workflows/ci.yml" row.

    NOTE: An existing `.github/workflows/ci.yml` skeleton may already exist (Silver Bullet init created one per HANDOFF.md). Read it first; either extend it in place or replace with the Phase 1 version. Preserve any existing job names/triggers if compatible.

    Workflow:
    - `name: CI`
    - `on: [push, pull_request]` (or `push: branches: [main]` + `pull_request:` if more specific; match existing style)
    - Single job `validate` on `ubuntu-latest`.

    **(PC-12) Hermetic git config choice — option (a):** Plan 05's `tests/path-lint.test.js` sets `git -c user.email=test@test.local -c user.name=test commit ...` per-commit, so this CI workflow does NOT need a `git config --global` prelude step. Add a comment near the `node --test` step: `# Plan 05's path-lint.test.js commits with -c user.email/-c user.name flags per-test (hermetic) — no global git config required.`

    **(PC-13) devDependencies note:** `license-checker`, `pixelmatch`, and `pngjs` are declared as devDependencies in Plan 01's package.json. Step 3 (`npm ci`) installs them once into root `node_modules`; subsequent `npx license-checker` resolves locally without re-fetching. No separate `npx --yes` flags needed in CI.

    Steps in this order:
    1. `actions/checkout@v4`
    2. `actions/setup-node@v4` with `node-version: '20'` and `cache: 'npm'`
    3. `npm ci` — runs root install (no `--omit=dev` here so license-checker + pixelmatch + pngjs devDeps are available; production-only check is a separate flag)
    4. `node tools/validate-manifest.js` — manifest validator gate
    5. `bash tools/lint-paths.sh` — hardcoded-path lint
    6. `node tools/assert-pptxgenjs-pin.js` — version-pin assertion
    7. `npx license-checker --production --failOn 'GPL;AGPL;SSPL' --summary` — license gate (use `--exclude` flag for jszip if Plan 08 SUMMARY documented a false-positive). Resolves locally from devDep installed in step 3.
    8. `test -x hooks/check-deps.sh` — hook executability check (silver-bullet ci.yml line 47–50 pattern)
    9. `node --test tests/` — full suite (manifest-validator.test.js, path-lint.test.js, assert-pin.test.js, check-deps.test.js, findings-schema.test.js, visual-regression.test.js [Tier 1 active], annotate-integrity.test.js [skipped]). Per PC-12, no global git config prelude needed.
    10. (Optional) `claude plugin validate` if `claude` CLI on PATH — soft fail (don't block CI on absence). Use `if command -v claude >/dev/null 2>&1; then claude plugin validate; fi`.

    Each step that can fail must use `::error::` annotation prefix on failure where the underlying tool doesn't already emit one. Use `shell: bash` consistently.

    NOTE: No LibreOffice install in CI yet — Tier 2 visual regression is `test.skip` until Phase 2/3 (per RESEARCH.md A3). Add a comment block reserving the LibreOffice install step (`sudo apt-get install -y libreoffice poppler-utils`) for a later phase.
  </action>
  <verify>
    <automated>test -f .github/workflows/ci.yml && grep -q "validate-manifest.js" .github/workflows/ci.yml && grep -q "lint-paths.sh" .github/workflows/ci.yml && grep -q "assert-pptxgenjs-pin.js" .github/workflows/ci.yml && grep -q "license-checker" .github/workflows/ci.yml && grep -q "node --test" .github/workflows/ci.yml && grep -q "test -x hooks/check-deps.sh" .github/workflows/ci.yml</automated>
  </verify>
  <done>ci.yml wires all 7 mandatory gates; comment reserves the LibreOffice install for later phases; no `git config --global` prelude (PC-12 option (a)); license-checker resolves from local devDep (PC-13).</done>
</task>

<task type="auto">
  <name>Task 2: Write README.md skeleton</name>
  <files>README.md</files>
  <action>
    Per PATTERNS.md "README.md" row + ROADMAP.md Phase 7 (full polish lands later).

    Replace the existing 13-byte stub. Public-facing skeleton with these sections:

    1. `# Instadecks` — H1 + one-line tagline ("Generate, review, and annotate polished presentation decks from any input.")
    2. **Overview** — short paragraph: what it is (a Claude Code marketplace plugin), what it ships (4 user-invocable slash skills), where it comes from (productized v8 BluePrestige workflow).
    3. **Install** — show `/plugin marketplace add alo-labs/claude-plugins` then `/plugin install instadecks` (or whatever the actual marketplace command form is — verify against alo-labs/silver-bullet README pattern); also a `git clone` note for development.
    4. **Skills** — table of four `/instadecks:*` slash commands with one-line descriptions matching the SKILL.md frontmatter from Plan 01.
    5. **Requirements** — Node ≥ 18, `soffice` (LibreOffice), `pdftoppm` (Poppler). Note: SessionStart hook auto-installs npm deps + IBM Plex Sans.
    6. **License** — Apache-2.0; bundled software credits referenced (link to LICENSE / NOTICE).

    Phase 7 (DIST polish) will add badges, examples, screenshots, `/instadecks:doctor` self-check section, and the marketplace listing block. Do NOT add those here.

    Two-space indent for code blocks; UTF-8; trailing newline.
  </action>
  <verify>
    <automated>test -f README.md && grep -q '^# Instadecks' README.md && grep -q '## Install' README.md && grep -q '## Skills' README.md && grep -q '## Requirements' README.md && grep -q '## License' README.md && grep -q 'Apache-2.0' README.md</automated>
  </verify>
  <done>README.md has H1, Install, Skills (4 rows), Requirements, License sections.</done>
</task>

</tasks>

<threat_model>
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-09-01 | Tampering | CI bypass via `[skip ci]` or workflow disable | accept | GitHub branch protection rules (Phase 7) lock this; out of Phase 1 scope but documented in HANDOFF for marketplace publication |
| T-09-02 | Information Disclosure | CI logs leak filesystem paths | mitigate | All tools print plugin-relative paths only; lint-paths.sh enforces no absolute paths in source |
</threat_model>

<verification>
- All 7 CI gates run locally end-to-end:
  - `node tools/validate-manifest.js` → OK
  - `bash tools/lint-paths.sh` → OK
  - `node tools/assert-pptxgenjs-pin.js` → OK
  - `npx license-checker --production --failOn 'GPL;AGPL;SSPL' --summary` → OK
  - `test -x hooks/check-deps.sh` → 0
  - `node --test tests/` → all green or documented skips
- README skeleton present
</verification>

<success_criteria>
- FOUND-01: plugin loads end-to-end (`/plugin install` works on a clean clone — manual smoke test before phase verification)
- FOUND-08: all four day-1 CI gates wired (manifest validator, path lint, version-pin, license-checker) + integrity-test scaffold + visual-regression Tier 1
- README.md skeleton sufficient for Phase 7 polish to extend
- Hermetic CI: no global git config mutation; devDeps declared upstream so `npm ci` is the single source of truth for tooling availability
</success_criteria>

<output>
After completion, create `.planning/phases/01-plugin-foundation-contract-ci-gates/01-09-SUMMARY.md`. Note any deviations from the planned step list (e.g., LibreOffice install reservation, jszip license-checker exclusion if used).
</output>
