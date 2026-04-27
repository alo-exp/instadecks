---
phase: 01-plugin-foundation-contract-ci-gates
plan: 02
subsystem: hooks
tags: [sessionstart, hook, npm-ci, sentinel, non-blocking]
requirements: [FOUND-03, FOUND-04]
requires: []
provides:
  - hooks/hooks.json (SessionStart registration)
  - hooks/check-deps.sh (dep check + npm ci sentinel + font detect stub)
  - tests/check-deps.test.js (integration test, 5 subtests)
affects:
  - SessionStart event flow
tech_stack:
  added: []
  patterns: [bash-shebang+set-euo-pipefail+trap-ERR+umask, spawnSync-integration-test]
key_files:
  created:
    - hooks/hooks.json
    - hooks/check-deps.sh
    - tests/check-deps.test.js
  modified: []
decisions:
  - npm ci runs from copied package.json+package-lock.json inside CLAUDE_PLUGIN_DATA so node_modules cannot pollute CLAUDE_PLUGIN_ROOT (PC-04 fix; --prefix flag did not isolate as expected)
  - Summary line always appends INFO in parens, even when WARN is non-empty, so "install complete" remains observable to tests when unrelated warnings (e.g. missing fonts) are present
  - Font handling kept as detect-only stub; full copy + fc-cache wiring deferred to Plan 07
metrics:
  duration: ~10min
  tasks_completed: 2
  files_created: 3
  completed: 2026-04-27
---

# Phase 1 Plan 02: SessionStart Hook Summary

Non-blocking SessionStart hook for Instadecks plugin: runs dep checks (soffice/pdftoppm/node ≥ 18), guards `npm ci --omit=dev` with a `package-lock.json`-SHA sentinel, surfaces a single `Instadecks:`-prefixed summary line, and ALWAYS exits 0. Backed by a hermetic `node --test` integration test that asserts the always-exit-0 contract, the prefix, sentinel creation, sentinel-guard re-run skip, and PC-04 install isolation (node_modules lands in `${CLAUDE_PLUGIN_DATA}`, never in `${CLAUDE_PLUGIN_ROOT}`).

## What Was Built

### `hooks/hooks.json`
Single SessionStart entry, matcher `"startup|clear|compact"`, command `"\"${CLAUDE_PLUGIN_ROOT}/hooks/check-deps.sh\""`, `async: false`, `timeout: 30`. Two-space indent, valid JSON.

### `hooks/check-deps.sh` (executable)
- Header per PATTERNS.md hook convention: `#!/usr/bin/env bash` + `set -euo pipefail` + `trap 'exit 0' ERR` + `umask 0077`. The trap converts any failure under `-e` into a clean exit 0, enforcing D-08's non-blocking contract.
- Resolves `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_PLUGIN_DATA}` (errors if unset, but the trap still ensures exit 0); `mkdir -p` the data dir.
- **Tool availability**: loops `command -v soffice pdftoppm node`; collects misses into `WARN`.
- **Node version**: parses major via `node -p`; `WARN` if `< 18`.
- **npm ci sentinel**: SHA-256 of `package-lock.json` compared to `${CLAUDE_PLUGIN_DATA}/.npm-installed-sentinel`. On change/miss: copies `package.json` + `package-lock.json` into `${CLAUDE_PLUGIN_DATA}` and runs `npm ci --omit=dev` from that dir, so `node_modules` lands inside data, not root. On success: writes new SHA to sentinel and appends `install complete` to `INFO`. On failure: appends `npm ci failed` to `WARN`.
- **Font detect**: stub — if `fc-list` exists and IBM Plex Sans is absent, append manual-install pointer to `WARN`. Plan 07 replaces this with the actual copy + `fc-cache` flow.
- **Summary line**: `Instadecks: <head>[ (<info>)]`, where `<head>` is `deps OK` or the joined warnings, and INFO (e.g. `install complete`) is always appended in parens when present.
- Final `exit 0` regardless.

### `tests/check-deps.test.js`
`node:test` + `node:assert/strict` + `child_process.spawnSync`. One top-level `test('check-deps.sh')` with 5 subtests, each running the hook against a fresh `fs.mkdtempSync` PLUGIN_DATA dir. Subtests gracefully `t.skip` when `npm` is unavailable.

1. Always exits 0 (D-08 non-blocking contract).
2. stdout starts with `Instadecks:`.
3. Sentinel file created after first run when `install complete` is reported.
4. Sentinel guard prevents re-install on a second invocation against the same data dir.
5. **(PC-04)** Install lands in `${CLAUDE_PLUGIN_DATA}/node_modules` and contains `pptxgenjs`; `${CLAUDE_PLUGIN_ROOT}/node_modules` state is unchanged by the hook.

All 5 subtests green locally on Node v25.6.0.

## Verification

- `test -x hooks/check-deps.sh` — passes
- `node -e "JSON.parse(require('fs').readFileSync('hooks/hooks.json'))"` — passes
- `grep -q 'set -euo pipefail' hooks/check-deps.sh` — passes
- `grep -q "trap 'exit 0' ERR" hooks/check-deps.sh` — passes
- `grep -q 'exit 0' hooks/check-deps.sh` — passes
- `grep -q "Instadecks:" hooks/check-deps.sh` — passes
- `node --test tests/check-deps.test.js` — 5/5 pass, 0 skipped, 0 failed
- Manual smoke: `CLAUDE_PLUGIN_ROOT=$PWD CLAUDE_PLUGIN_DATA=$(mktemp -d) bash hooks/check-deps.sh` exits 0, populates `${CLAUDE_PLUGIN_DATA}/node_modules` with pptxgenjs, leaves `${CLAUDE_PLUGIN_ROOT}/node_modules` absent.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] `npm ci --prefix` does not isolate `node_modules` to the prefix dir**
- **Found during:** Task 1 smoke test
- **Issue:** RESEARCH.md Pattern 2 used `( cd "$PLUGIN_ROOT" && npm ci --omit=dev --prefix "$PLUGIN_DATA" )`. In practice, current npm rejects this: `--prefix` re-roots the project to `$PLUGIN_DATA`, but there's no `package-lock.json` there, so `npm ci` errors with `EUSAGE`. The hook then surfaced `npm ci failed` and the test's PC-04 assertion could not be exercised.
- **Fix:** Copy `package.json` + `package-lock.json` into `${CLAUDE_PLUGIN_DATA}` first, then `cd` there and run `npm ci --omit=dev` without `--prefix`. Verified manually that `node_modules` lands in `${CLAUDE_PLUGIN_DATA}` and the root tree is untouched.
- **Files modified:** `hooks/check-deps.sh`
- **Commit:** `699f3e8`

**2. [Rule 1 — Bug] Summary line suppressed INFO when WARN was non-empty, hiding the install signal**
- **Found during:** Task 2 first test run (3 of 5 subtests skipped)
- **Issue:** Original branchy summary printed either `(info)` OR `warns`, never both. On a dev machine without IBM Plex Sans (or any other warning), the test could not observe `install complete` in stdout, so the sentinel/install/PC-04 subtests could not run their strict assertions.
- **Fix:** Single composition — `Instadecks: <head> (<info>)` where `<head>` is either `deps OK` or the joined warnings, and `<info>` is appended whenever non-empty. INFO and WARN are now independent dimensions of the single-line output.
- **Files modified:** `hooks/check-deps.sh`
- **Commit:** `e854dde`

## Threat Surface

No new threat surface beyond the plan's threat register. The npm ci copy step still runs `npm ci --omit=dev` against the same lockfile, so T-02-01 (lockfile drift) remains the only supply-chain vector and is still mitigated by the lockfile guarantee. T-02-04 (sentinel disclosure) is unchanged — `umask 0077` applies to the copied manifests and node_modules tree as well.

## Self-Check

- `[ -f hooks/hooks.json ]` — FOUND
- `[ -x hooks/check-deps.sh ]` — FOUND (executable)
- `[ -f tests/check-deps.test.js ]` — FOUND
- `git log --oneline | grep 699f3e8` — FOUND (`feat(01-02): add SessionStart hook with dep check + npm ci sentinel guard`)
- `git log --oneline | grep e854dde` — FOUND (`feat(01-02): add check-deps.sh integration test (5 subtests, PC-04 isolation)`)
- `node --test tests/check-deps.test.js` — 5/5 pass

## Self-Check: PASSED

## EXECUTION COMPLETE
