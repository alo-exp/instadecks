---
phase: 10
plan: 10-04
slug: fresh-install-docker
subsystem: release-automation
tags: [docker, integration-test, hardening, HARD-12]
status: complete
completed: 2026-04-29
duration_min: 8
requirements: [HARD-12]

requires:
  - hooks/check-deps.sh                        # prerequisite list (soffice, pdftoppm, IBM Plex Sans, node)
  - skills/create/scripts/cli.js               # /create CLI (--brief / --out-dir flags)
  - skills/review/scripts/cli.js               # /review CLI (--findings sibling output)
  - skills/content-review/scripts/cli.js       # /content-review CLI
  - skills/annotate/scripts/cli.js             # /annotate CLI (--deck / --findings flags)
  - tests/fixtures/sample-findings.json        # stub findings for review/content-review CLI gate
  - assets/fonts/IBM_Plex_Sans/                # bundled fonts copied into container

provides:
  - tests/automation/Dockerfile.fresh-install  # reproducible Linux container
  - tests/automation/scripts/run-fresh-install.sh  # 4-skill chain harness; emits RESULT=<base64> manifest
  - tests/automation/lib/canonical-brief.json  # single canonical brief
  - tests/automation/fresh-install.test.js     # node:test docker driver + assertions
  - npm run gate:fresh-install                 # wired in package.json scripts block

affects:
  - tests/FRESH-INSTALL.md  # superseded for Linux; Mac+Windows variants remain manual / deferred

tech_stack:
  added: []                  # no new runtime deps; docker is dev-only system prereq
  patterns:
    - "host→container manifest via final RESULT=<base64-json> stdout line (avoids volume mounts)"
    - "test gating: (CI=true || RUN_DOCKER_TESTS=1) && hasDocker(); skip silently otherwise"
    - "stub findings rebound at runtime so /review CLI's --findings gate passes without LLM"

key_files:
  created:
    - tests/automation/Dockerfile.fresh-install
    - tests/automation/lib/canonical-brief.json
    - tests/automation/scripts/run-fresh-install.sh
    - tests/automation/fresh-install.test.js
  modified:
    - package.json   # gate:fresh-install script appended after gate:permission-mode (10-03 ordering preserved)

decisions:
  - "Mac+Windows runner variants OUT OF SCOPE per SPEC §Out of Scope; deferred to v1.x; native Mac install verified via prior live-E2E iterations recorded in STATE.md"
  - "INSTADECKS_LLM_STUB=1 NOT set in Dockerfile — the harness uses a JSON canonical brief (legacy shape; normalizeBrief is a passthrough, no LLM needed for /create) and supplies tests/fixtures/sample-findings.json as the --findings input for /review and /content-review CLIs (those CLIs require pre-authored findings; the LLM step is agent-mode-only). Setting INSTADECKS_LLM_STUB=1 would attempt to load a non-existent fixture `tests/fixtures/llm-stubs/1.json` and silently no-op via the MODULE_NOT_FOUND catch — a no-op env var was preferred to be omitted entirely for clarity."
  - "Manifest delivery via RESULT=<base64-json> stdout line (not a mounted volume) — keeps `docker run --rm` invocation flag-minimal and avoids host/container path translation."
  - "5-minute build timeout / 10-minute run timeout: 5 min covers cold image build (apt + LibreOffice ~700MB); 10 min covers real soffice round-trips for 2 PDFs. Cached rebuild surfaced via t.diagnostic when run wall-clock exceeds 90s."

metrics:
  tasks: 2
  commits: 2
  files_created: 4
  files_modified: 1
  duration: ~8 min
---

# Phase 10 Plan 10-04: Fresh-Install Docker Harness Summary

One-liner: HARD-12 release-blocking fresh-install gate automated via Docker (Linux); replaces tests/FRESH-INSTALL.md's Mac+Windows manual checklist for the Linux variant; Mac+Windows deferred per SPEC.

## What Was Built

A self-contained Docker-driven integration test that proves the plugin installs and runs end-to-end on a Linux host with zero pre-existing Instadecks state:

1. **`tests/automation/Dockerfile.fresh-install`** — `node:22-bookworm-slim` base; installs `libreoffice-impress`, `poppler-utils`, `fontconfig`, `ca-certificates`; copies bundled IBM Plex Sans into `/usr/share/fonts/truetype/IBMPlex/` and runs `fc-cache -fv`; runs `npm ci --omit=dev` (matches the SessionStart hook first-run behavior); sets `CLAUDE_PLUGIN_ROOT=CLAUDE_PLUGIN_DATA=/instadecks`; default `CMD` invokes the harness.

2. **`tests/automation/lib/canonical-brief.json`** — single canonical "AI in Healthcare 2026 — Funding Ask" brief; structured to exercise all 8 cookbook slide types via the `narrative_arc` + `key_claims` shape; small enough that the chain completes well within the 10-minute budget.

3. **`tests/automation/scripts/run-fresh-install.sh`** — in-container bash harness:
   - `mktemp -d` per run; cleanup trap (skipped under `KEEP_OUT=1`).
   - Step 1: `node skills/create/scripts/cli.js --brief <BRIEF> --out-dir $OUT` → expects `deck.pptx` + `deck.pdf`.
   - Step 2: `node skills/review/scripts/cli.js <DECK> --findings <stub> --out-dir $OUT` → expects sibling `deck.review.json`.
   - Step 3: `node skills/content-review/scripts/cli.js <DECK> --findings <stub> --out-dir $OUT`.
   - Step 4: `node skills/annotate/scripts/cli.js --deck <DECK> --findings <DECK_REVIEW_JSON> --out-dir $OUT` → expects `deck.annotated.pptx` + `deck.annotated.pdf`.
   - Verifies byte sizes (PPTX ≥ 10240, PDF ≥ 5120, JSON parses).
   - Final stdout line: `RESULT=<base64-of-manifest-json>` carrying `{ok, artifacts[5], byteSizes{...}}`. On failure: `RESULT={"ok":false,"error":"..."}` + exit 1.

4. **`tests/automation/fresh-install.test.js`** — host-side `node:test` driver:
   - Gating: `(CI=true OR RUN_DOCKER_TESTS=1) AND hasDocker()`. Outside that intersection, `t.skip()` with a clear reason.
   - When enabled: `spawnSync('docker','build', ...)` (5min), then `spawnSync('docker','run','--rm', ...)` (10min); parses the trailing `RESULT=` line; base64-decodes; asserts `ok===true`, `artifacts.length===5`, all 4 byte thresholds; emits `t.diagnostic` if cached run exceeds 90s.

5. **`package.json`** — `gate:fresh-install` script appended after the 10-03 `gate:permission-mode` entry, preserving the script-block ordering 10-03 produced.

## Verification

- `npm run gate:fresh-install` on dev machine (no docker): exits 0, 1 test skipped with reason "docker binary not found on PATH". ✅
- `npm test` on dev machine: 1202 tests, 1170 pass, 0 fail, 32 skipped (includes the new fresh-install test + existing e2e gates). 100% c8 coverage gate intact across `skills/**/*.js` + `tools/**/*.js`. ✅
- `bash -n tests/automation/scripts/run-fresh-install.sh` passes syntax. ✅
- `node -e "JSON.parse(require('fs').readFileSync('tests/automation/lib/canonical-brief.json','utf8'))"` exits 0. ✅
- Dockerfile contains `libreoffice-impress`, `poppler-utils`, `IBMPlex`, `npm ci --omit=dev`. ✅
- `grep "gate:fresh-install" package.json` returns 1 line. ✅

The full container build+run path is intentionally not exercised on the dev host (no docker installed). It will run in CI on Linux runners where docker is present and `CI=true` is auto-set.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Plan ↔ CLI contract mismatch] `--out` vs `--out-dir` flag name**
- **Found during:** Task 1, while reading the 4 skill CLIs.
- **Issue:** Plan example uses `--out <dir>`; the actual CLIs accept `--out-dir` (with `--out` as an alias on `/content-review` and `/annotate` only — not `/create` or `/review`).
- **Fix:** Used `--out-dir` consistently in `run-fresh-install.sh` for all 4 CLI invocations.
- **Files modified:** `tests/automation/scripts/run-fresh-install.sh`
- **Commit:** 238d05e

**2. [Rule 2 — Missing critical functionality] Stub findings sourcing for /review + /content-review CLI**
- **Found during:** Task 1, while reviewing `skills/review/scripts/cli.js`.
- **Issue:** Plan describes `node skills/review/scripts/cli.js --deck <pptx>` as if it produced findings.json autonomously, but the standalone CLI requires `--findings <pre-authored-path>` (the LLM step is agent-mode-only and exits with code 2 if --findings is absent — see review/cli.js:38-58).
- **Fix:** Harness reuses `tests/fixtures/sample-findings.json` (rebound to point at the freshly created deck path via a 4-line `node -e` rewrite) as the `--findings` input. The integration still exercises the full schema-validation + JSON-mirror + sibling-write path inside `runReview`/`runContentReview`. The byte-threshold gate on `deck.review.json` validates the output side.
- **Files modified:** `tests/automation/scripts/run-fresh-install.sh` (added rewriting step + STUB_FINDINGS constant)
- **Commit:** 238d05e

**3. [Rule 3 — Blocking] `INSTADECKS_LLM_STUB=1` env value**
- **Found during:** Task 1, after reading `skills/create/scripts/index.js:324-331`.
- **Issue:** The plan asks for `ENV INSTADECKS_LLM_STUB=1` in the Dockerfile. The actual contract treats the value as a fixture *basename*: `INSTADECKS_LLM_STUB=1` would attempt to load `tests/fixtures/llm-stubs/1.json` (which doesn't exist). The MODULE_NOT_FOUND catch silently no-ops, so it wouldn't break the run — but the env var would be misleading and dead.
- **Fix:** Omitted `INSTADECKS_LLM_STUB` from the Dockerfile entirely. The canonical brief is JSON (legacy shape) → `normalizeBrief` is a passthrough → no LLM needed for `/create`. Decision recorded above.
- **Files modified:** `tests/automation/Dockerfile.fresh-install`
- **Commit:** 238d05e

### Architectural Decisions Surfaced (no Rule 4 stops needed)

None — all deviations were Rule 1/2/3 inline fixes within scope.

## Auth Gates

None — no third-party auth involved.

## Deferred Items

| Item | Status | Reason |
|------|--------|--------|
| Mac runner variant | v1.x | SPEC §Out of Scope; native Mac install verified via prior live-E2E iterations |
| Windows runner variant | v1.x | SPEC §Out of Scope |

## Threat Flags

None — this plan adds dev-only test infrastructure (docker harness + canonical brief fixture); no new runtime endpoints, auth paths, or schema changes.

## Self-Check

- FOUND: `tests/automation/Dockerfile.fresh-install` ✅
- FOUND: `tests/automation/lib/canonical-brief.json` ✅
- FOUND: `tests/automation/scripts/run-fresh-install.sh` (mode 755) ✅
- FOUND: `tests/automation/fresh-install.test.js` ✅
- FOUND: `gate:fresh-install` in `package.json` ✅
- FOUND: commit `238d05e` (Task 1) ✅
- FOUND: commit `addf406` (Task 2) ✅
- `npm test`: 1202/1170/0/32 (tests/pass/fail/skipped); 100% c8 across `skills/**/*.js` + `tools/**/*.js`. ✅

## Self-Check: PASSED
