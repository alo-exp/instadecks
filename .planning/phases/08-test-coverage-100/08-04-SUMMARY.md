---
phase: 08
plan: 08-04
slug: bats-bash-coverage
status: complete
completed: 2026-04-28
wave: 2
requirements: [TEST-03]
tags: [testing, bats, bash, coverage, hermetic-stubs]

dependency-graph:
  requires:
    - "tests/fixtures/tiny-deck.pptx (existing — used by fixture_pptx helper)"
    - "scripts/pptx-to-images.sh, hooks/check-deps.sh, skills/doctor/scripts/check.sh (under test, unchanged)"
  provides:
    - "tests/bats/helpers/setup.bash → stub_bin / unstub_bin / setup_stubdir / fixture_pptx (reusable hermetic shim)"
    - "tests/bats/pptx-to-images.bats → 13 @tests covering RVW-09/10/11"
    - "tests/bats/check-deps.bats → 8 @tests covering FOUND-03/04"
    - "tests/bats/doctor-check.bats → 9 @tests covering DIST-08"
    - "tests/bats/README.md → install + run + per-file inventory"
    - "package.json scripts: test:bats, test:bats:if-installed"
  affects:
    - "Plan 8-07 — CI wiring step (apt-get install -y bats; npm run test:bats)"

tech-stack:
  added:
    - "bats-core 1.13.0 (system install via brew/apt; not a Node devDep)"
  patterns:
    - "Hermetic binary shims under $BATS_TEST_TMPDIR/bin"
    - "Process-local PATH mutation (T-08-10 mitigation)"
    - "stub_bin argv logging via $STUB_LOG for assertion of multi-call sequences"

key-files:
  created:
    - "tests/bats/helpers/setup.bash"
    - "tests/bats/pptx-to-images.bats"
    - "tests/bats/check-deps.bats"
    - "tests/bats/doctor-check.bats"
    - "tests/bats/README.md"
  modified:
    - "package.json (added test:bats + test:bats:if-installed scripts)"

decisions:
  - "Bats coverage asserted by test-case enumeration (per CONTEXT D-04); NOT folded into c8's 100% gate."
  - "FOUND-03 invariant locked into tests: hooks/check-deps.sh exits 0 even when every dep is missing (non-blocking SessionStart)."
  - "doctor/check.sh exit-code policy diverges from check-deps.sh: missing required tools flip exit to 1 (user-invoked diagnostic). WARN rows (fc-list, IBM Plex Sans) do NOT flip exit — verified via two dedicated @tests."
  - "stub_bin design uses $BATS_TEST_TMPDIR (auto-cleaned) + process-local PATH; no global filesystem mutation, no risk of cross-test bleed."

metrics:
  total_at_blocks: 30
  files_created: 5
  files_modified: 1
  commits: 2
  duration_minutes: ~15
  local_verify: "bats tests/bats/ → 30/30 pass on macOS 25.3.0 + bats-core 1.13.0"
---

# Phase 8 Plan 8-04: Bats Bash Coverage Summary

bats-core hermetic coverage for the three bash scripts in CONTEXT D-04. 30 `@test` blocks total: 13 for `scripts/pptx-to-images.sh` (RVW-09/10/11 — every exit code 1–5 path + macOS no-`timeout` shim from Plan 03-01 Rule 3 + cleanup trap + unique UserInstallation paths), 8 for `hooks/check-deps.sh` (FOUND-03 non-blocking exit-0 invariant + FOUND-04 npm-ci sentinel SHA gate), 9 for `skills/doctor/scripts/check.sh` (DIST-08 self-check — every [MISSING] path + [WARN]-without-exit-flip behavior). All tests run under `$BATS_TEST_TMPDIR` with stub binaries shimmed into a per-test bin dir so the host's real soffice/pdftoppm/node/fc-list never execute.

## Commits

| Task | Hash      | Summary                                                                              |
| ---- | --------- | ------------------------------------------------------------------------------------ |
| 1    | `4b4230d` | helpers/setup.bash + pptx-to-images.bats (13 @tests) + package.json scripts          |
| 2    | `6d77108` | check-deps.bats (8) + doctor-check.bats (9) + README.md                              |

## Local verification

```
$ bats tests/bats/
1..30
ok 1..30  (all green)
```

Run on macOS 25.3.0 / bats-core 1.13.0 (installed via `brew install bats-core` during this plan execution per Plan W-4 hard requirement — no defer-to-CI loophole).

## CI install command (for Plan 8-07 to wire)

```yaml
- name: Install bats
  run: sudo apt-get update && sudo apt-get install -y bats
- name: Bats coverage
  run: npm run test:bats
```

The `test:bats:if-installed` script is the local-dev-friendly variant (exits 0 cleanly when bats is not on PATH) and is NOT what CI should use — CI should hard-require bats and call `test:bats`.

## Per-file `@test` counts

| File                          | @test blocks |
| ----------------------------- | ------------ |
| pptx-to-images.bats           | 13           |
| check-deps.bats               | 8            |
| doctor-check.bats             | 9            |
| **Total**                     | **30**       |

(Plan minimums: 10 / 7 / 7 = 24 → exceeded.)

## stub_bin helper inventory

`tests/bats/helpers/setup.bash` (~50 LOC):

- `setup_stubdir` — creates `$BATS_TEST_TMPDIR/bin`, prepends to PATH, opens `$STUB_LOG`.
- `stub_bin NAME EXITCODE [BODY]` — fake executable that logs argv and runs optional body before exit.
- `unstub_bin NAME` — mid-test removal.
- `isolate_path` — restrict PATH to stub dir + minimal coreutils (defined but unused in current tests; kept for future use).
- `fixture_pptx DEST` — copies `tests/fixtures/tiny-deck.pptx` (or PK placeholder).

## Notable findings while reading source

- **`hooks/check-deps.sh` always exits 0** — confirmed by both `trap 'exit 0' ERR` at the top and a literal `exit 0` at the tail. FOUND-03 invariant is therefore baked into the script itself, not just the orchestrator. Two @tests assert this directly: one with all deps present, one with every dep missing.
- **`skills/doctor/scripts/check.sh` does NOT flip exit on WARN rows** — `set -uo pipefail` (no `-e`); only the `miss()` helper sets `FAIL=1`. The `warn()` helper logs but leaves `FAIL` alone. Two @tests assert this for fc-list-absent and IBM-Plex-Sans-absent paths.
- **doctor's pptxgenjs version probe uses `grep -q '"version": "4.0.1"'`** with literal `: ` spacing. Test fixtures must use the standard `npm`-formatted package.json (multi-line, two-space indent), not `JSON.stringify` minified output. Both fixtures in doctor-check.bats use `printf '{\n  "name": ..., \n  "version": "..."\n}\n'` to match.
- **No source modifications were made.** Only test files + package.json scripts.

## Deviations from Plan

None — plan executed exactly as written. All 13 + 7 + 7 minimum @test counts met or exceeded; both atomic commits landed; W-4 hard requirement (local `bats tests/bats/` exits 0 during plan execution) honored via `brew install bats-core`.

## Self-Check: PASSED

- `tests/bats/helpers/setup.bash` — FOUND
- `tests/bats/pptx-to-images.bats` — FOUND (13 @test blocks)
- `tests/bats/check-deps.bats` — FOUND (8 @test blocks)
- `tests/bats/doctor-check.bats` — FOUND (9 @test blocks)
- `tests/bats/README.md` — FOUND
- `package.json` test:bats / test:bats:if-installed — FOUND
- Commit `4b4230d` — FOUND in git log
- Commit `6d77108` — FOUND in git log
- `bats tests/bats/` → 30/30 pass — FOUND
- `npm run coverage` produces clean report (no regression from this plan; pre-existing 0% files belong to other Wave 2/3 plans)
