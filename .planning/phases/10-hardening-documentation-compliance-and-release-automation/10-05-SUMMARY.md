---
phase: 10
plan: 10-05
subsystem: release-automation
tags: [release, automation, gh-cli, marketplace, tag, dry-run]
requires: [10-03, 10-04]
provides: [release-automation, marketplace-pr-script, tag-automation, dry-run-gate]
affects: [package.json, .planning/RELEASE.md, .planning/STATE.md, docs/CHANGELOG.md]
tech-stack:
  added: []
  patterns: [bash-strict-mode, simulate-flag-sandbox, dry-run-flag, signed-tag-with-fallback, sim-short-circuit-via-env]
key-files:
  created:
    - tools/submit-marketplace-pr.sh
    - tools/release-v0.1.0.sh
    - tests/tools-submit-marketplace-pr.test.js
    - tests/tools-release-v0-1-0.test.js
    - .planning/marketplace-patch.json
  modified:
    - package.json
decisions:
  - "Two-script split: submit-marketplace-pr.sh is reusable across versions; release-v0.1.0.sh is v0.1.0-specific (handles first-tag flow incl. STATE.md released flip)."
  - "INSTADECKS_RELEASE_SIMULATE=1 forces DRY_RUN=1 implicitly so destructive steps short-circuit alongside gate short-circuits — keeps the test path single-flag."
  - "Signed-tag-with-fallback (W-1): explicit `if git config --get user.signingkey` conditional in script body; no prose-only fallback. Falls back to `git tag -a` (annotated, unsigned) with a warning."
  - "Tag push deliberately NOT exercised in this plan — only dry-run + simulate paths tested. Real push is gated to user-authorized invocation or Plan 10-06 E2E."
metrics:
  duration: ~15 min
  completed: 2026-04-29
  tests: 1209 pass / 0 fail / 32 skipped (c8 100% lines/branches/funcs/stmts intact)
---

# Phase 10 Plan 05: Release Automation Summary

**One-liner:** Two bash scripts (`submit-marketplace-pr.sh` for marketplace PR via gh CLI, `release-v0.1.0.sh` for end-to-end gate chain + tag + STATE flip) plus sandboxed tests that exercise `--simulate` / `--dry-run` paths with zero network or destructive side effects.

## What was built

**HARD-13 — `tools/submit-marketplace-pr.sh`:**

- gh-CLI driven; forks `alo-labs/claude-plugins` (idempotent — `gh repo fork --clone=false` skips existing fork).
- Clones fork to mktemp dir, applies `.planning/marketplace-patch.json` (appends `entry` to top-level `plugins[]` array).
- Creates branch `add-instadecks-v0.1.0`, commits, pushes, opens PR with body from `.planning/marketplace-pr.md`.
- Captures resolved PR URL into `.planning/RELEASE.md` under `### Marketplace PR`.
- `--simulate` flag: prints `PLAN: ...` lines for every step, makes zero network calls, exits 0.
- Pre-flight checks (`gh installed`, `gh auth status`) gated to real-run only.

**HARD-14 — `tools/release-v0.1.0.sh`:**

- Pre-flight: clean working tree + on `main` + HEAD == origin/main (skipped under SIM).
- Gates 1-12 with `>>> <label>` markers per W-4 contract:
  1. lint:paths
  2. lint:enums
  3. license-audit
  4. manifest-validator
  5. doc-size (incl. `--orphans`)
  6. test (c8 100%)
  7. bats
  8. activation-panel
  9. permission-mode
  10. fresh-install (docker-conditional; STRICT=1 makes it non-skippable)
- On green: flip `STATE.md` Status to `released`, prepend CHANGELOG entry, commit, signed tag (with W-1 fallback to annotated unsigned), push commit + tag, invoke `submit-marketplace-pr.sh`.
- `--dry-run` runs gates for real, prints `DRY-RUN: would <action> -> <cmd>` for steps 13-17.
- `INSTADECKS_RELEASE_SIMULATE=1` short-circuits gates to `PLAN: <gate> -> <cmd>` (test-only fast path; auto-implies `--dry-run`).
- Signed-tag-with-fallback: explicit `if git config --get user.signingkey >/dev/null 2>&1; then git tag -s ...; else git tag -a ...; fi` block in script body.

**npm scripts (package.json):**

- `release:dry-run` → `bash tools/release-v0.1.0.sh --dry-run`
- `release` → `bash tools/release-v0.1.0.sh`

## Verification

- `bash tools/submit-marketplace-pr.sh --simulate` → exits 0, prints all 7 PLAN lines.
- `INSTADECKS_RELEASE_SIMULATE=1 bash tools/release-v0.1.0.sh --dry-run` → exits 0, prints 10 gate plans + 6 DRY-RUN actions.
- `node --test tests/tools-submit-marketplace-pr.test.js` → 3/3 pass.
- `node --test tests/tools-release-v0-1-0.test.js` → 4/4 pass.
- `npm test` (full c8 100% gate) → 1209 pass / 0 fail / 32 skipped; all source files at 100% lines/branches/functions/statements.

## Commits

- `e5078e0` — feat(10-05): add tools/submit-marketplace-pr.sh with --simulate sandbox
- `92c484b` — feat(10-05): add tools/release-v0.1.0.sh + dry-run + npm scripts

## Deviations from Plan

None — plan executed exactly as written. Both scripts match the spec verbatim including:
- gh CLI command shape (fork --clone=false; pr create --head fork-owner:branch).
- Gate ordering identical to .github/workflows/ci.yml.
- W-1 signed-tag-with-fallback conditional present in script body (not prose-only).
- W-4 `>>> <label>` gate markers + `+++` action markers + `PLAN:` / `DRY-RUN:` prefixes for sandbox modes.

The signing-path branch was not exercised at runtime in this plan (no tag push happened — per execution context: "DO NOT actually push the tag in this run"). The conditional itself is statically verifiable in the script source and structurally equivalent across both branches.

## Acceptance Criteria

- [x] HARD-13: `tools/submit-marketplace-pr.sh --simulate` exits 0; PLAN lines present; `marketplace-patch.json` valid JSON; 3 sandbox tests green; no network calls in simulate path.
- [x] HARD-14: `INSTADECKS_RELEASE_SIMULATE=1 ... --dry-run` exits 0 with all 10 gate PLANs + 6 DRY-RUN actions; STRICT=1 + docker-missing fails; package.json has both npm scripts; signing fallback present.
- [x] AC-13, AC-14 (SPEC.md) satisfied.
- [x] Sandbox tests perform no destructive operations and no network I/O.

## Self-Check: PASSED

- FOUND: tools/submit-marketplace-pr.sh
- FOUND: tools/release-v0.1.0.sh
- FOUND: tests/tools-submit-marketplace-pr.test.js
- FOUND: tests/tools-release-v0-1-0.test.js
- FOUND: .planning/marketplace-patch.json
- FOUND: commit e5078e0
- FOUND: commit 92c484b
- VERIFIED: package.json contains `release:dry-run` and `release` scripts.
- VERIFIED: npm test → 1209 pass / 0 fail; c8 100% gate intact.
