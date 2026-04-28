---
plan: 08-04
phase: 08
slug: bats-bash-coverage
status: ready
created: 2026-04-28
wave: 2
depends_on: [08-01]
autonomous: true
files_modified:
  - package.json
  - tests/bats/pptx-to-images.bats
  - tests/bats/check-deps.bats
  - tests/bats/doctor-check.bats
  - tests/bats/helpers/setup.bash
  - tests/bats/README.md
requirements: [TEST-03]

must_haves:
  truths:
    - "package.json gains a `test:bats` script: `bats tests/bats/` (only runs when bats binary is on PATH; CI installs it explicitly per CONTEXT D-04)."
    - "package.json gains a `test:bats:if-installed` script that gates `bats` on `command -v bats` so local devs without bats installed don't see a hard failure when running `npm run test:bats:if-installed`."
    - "tests/bats/pptx-to-images.bats covers happy-path (deck PPTX in → JPGs out), missing-soffice failure mode, missing-pdftoppm failure mode, file-existence-after-soffice gate, file-existence-after-pdftoppm gate, 60s-timeout-with-one-retry gate, and the macOS no-`timeout`-binary shim (Plan 03-01 Rule 3 deviation already on record)."
    - "tests/bats/check-deps.bats covers all-deps-present happy path, soffice-missing message path, pdftoppm-missing message path, node-version-too-low message path, the `npm ci --omit=dev` first-run install branch, and the `diff -q` skip-on-already-installed branch (FOUND-04)."
    - "tests/bats/doctor-check.bats covers all-green report, each individual missing-tool gap report, exit-code shape (0 when green, non-zero when any tool missing — verify by reading skills/doctor/scripts/check.sh first)."
    - "tests/bats/helpers/setup.bash exports a portable shim/stub mechanism: `stub_bin <name> <stdout> <exitcode>` creates a fake executable in $BATS_TEST_TMPDIR/bin and prepends it to PATH, so tests can simulate missing-binary and broken-binary modes without touching the real system."
    - "All bats tests are hermetic — `BATS_TEST_TMPDIR` for any file ops; `unset` env vars touched; PATH restored on teardown via `setup`/`teardown` functions."
    - "tests/bats/README.md documents: how to install bats locally (`brew install bats-core` or `git submodule add https://github.com/bats-core/bats-core.git tests/bats/.bats-core` fallback), how to run the suite, what each test asserts."
  artifacts:
    - path: "tests/bats/pptx-to-images.bats"
      provides: "Bats coverage for scripts/pptx-to-images.sh — RVW-09/10/11 branches"
      contains: "@test"
    - path: "tests/bats/check-deps.bats"
      provides: "Bats coverage for hooks/check-deps.sh — FOUND-03/04 branches"
      contains: "@test"
    - path: "tests/bats/doctor-check.bats"
      provides: "Bats coverage for skills/doctor/scripts/check.sh — DIST-08 self-check branches"
      contains: "@test"
    - path: "tests/bats/helpers/setup.bash"
      provides: "stub_bin helper for hermetic missing-binary simulation"
      contains: "stub_bin"
    - path: "tests/bats/README.md"
      provides: "Local-install docs + run instructions + per-test inventory"
  key_links:
    - from: "tests/bats/pptx-to-images.bats"
      to: "tests/bats/helpers/setup.bash"
      via: "load 'helpers/setup' at file head"
      pattern: "load 'helpers/setup'"
    - from: "package.json"
      to: "tests/bats/"
      via: "test:bats script invokes `bats tests/bats/`"
      pattern: "bats tests/bats"
---

<objective>
Wave 2 (parallel with 8-02 + 8-03): bats-core coverage for the three bash scripts in CONTEXT D-04 — `scripts/pptx-to-images.sh`, `hooks/check-deps.sh`, `skills/doctor/scripts/check.sh`. Each script gets happy-path + every documented failure mode asserted via bats `@test` blocks. A shared `helpers/setup.bash` provides a hermetic `stub_bin` shim so missing-binary / broken-binary modes are testable without touching the real soffice / pdftoppm / node binaries on the host.

Per CONTEXT D-04, bats coverage is NOT folded into c8's 100% gate (c8 only covers Node sources). Bats branch coverage is asserted by test-case enumeration: every conditional / failure-message branch in each script gets a dedicated `@test`.

Output: 3 .bats files (~15-25 @test blocks each), 1 helpers file, 1 README, package.json gains 2 scripts. CI installs bats explicitly (Plan 8-07 wires it).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@CLAUDE.md
@.planning/phases/08-test-coverage-100/08-CONTEXT.md
@.planning/phases/08-test-coverage-100/08-01-c8-wiring-baseline-PLAN.md
@scripts/pptx-to-images.sh
@hooks/check-deps.sh
@skills/doctor/scripts/check.sh
@tests/check-deps.test.js
@tests/pptx-to-images.test.js
@package.json
@.github/workflows/ci.yml

<interfaces>
**Bats install assumption:**
- Local dev: `brew install bats-core` (documented in README.md).
- CI: Plan 8-07 adds `apt-get install -y bats` to ci.yml before invoking `npm run test:bats`.
- Skip-when-absent path: `npm run test:bats:if-installed` exits 0 cleanly if `command -v bats` returns nothing.

**package.json scripts to add:**
```json
{
  "test:bats": "bats tests/bats/",
  "test:bats:if-installed": "command -v bats >/dev/null 2>&1 && bats tests/bats/ || echo 'bats not installed; skipping'"
}
```

**helpers/setup.bash — stub_bin contract:**
```bash
# stub_bin NAME STDOUT EXITCODE
# Creates $BATS_TEST_TMPDIR/bin/<NAME> as an executable shell script that
# prints STDOUT to stdout and exits with EXITCODE, then prepends
# $BATS_TEST_TMPDIR/bin to PATH. Auto-cleaned by bats's tmpdir teardown.
stub_bin() {
  local name="$1" stdout="$2" exitcode="$3"
  mkdir -p "$BATS_TEST_TMPDIR/bin"
  cat > "$BATS_TEST_TMPDIR/bin/$name" <<EOF
#!/usr/bin/env bash
echo "$stdout"
exit $exitcode
EOF
  chmod +x "$BATS_TEST_TMPDIR/bin/$name"
  PATH="$BATS_TEST_TMPDIR/bin:$PATH"
}

# unstub_bin NAME — removes a stub mid-test (for sequence tests)
unstub_bin() {
  rm -f "$BATS_TEST_TMPDIR/bin/$1"
}

# fixture_pptx — writes a minimal valid pptx (or copies from tests/fixtures)
fixture_pptx() {
  local dest="$1"
  cp tests/fixtures/v8-reference/Annotations_Sample.pptx "$dest" 2>/dev/null \
    || cp tests/fixtures/tiny-deck.pptx "$dest"
}
```

**pptx-to-images.bats — minimum @test enumeration (read scripts/pptx-to-images.sh first to confirm + extend):**
1. `@test "happy path: pptx in, JPGs out"` — stub soffice (writes a fake PDF), stub pdftoppm (writes fake JPGs), run script, assert exit 0 + JPG files present.
2. `@test "missing soffice fails fast"` — PATH without soffice; assert exit non-zero + error message contains "soffice".
3. `@test "missing pdftoppm fails fast"` — stub soffice success, no pdftoppm; assert exit non-zero + "pdftoppm" in stderr.
4. `@test "soffice produces no PDF — fail with file-existence error"` — stub soffice exits 0 but writes nothing; script must check + fail.
5. `@test "soffice PDF is zero bytes — fail with size check"` — stub soffice creates empty PDF; script's size check fires.
6. `@test "pdftoppm produces no JPG — fail"` — stub pdftoppm exits 0 but writes nothing.
7. `@test "soffice timeout triggers retry then fails"` — stub soffice that sleeps; script retries once; assert eventual failure.
8. `@test "macOS no-timeout-binary shim activates when neither timeout nor gtimeout exists"` — drop both from PATH; verify the script's shim function is defined; verify soffice still invoked verbatim (Plan 03-01 Rule 3 deviation; STATE.md decision).
9. `@test "concurrent invocations use unique UserInstallation paths"` — run two instances back-to-back; assert two distinct `-env:UserInstallation=file:///tmp/lo-…` strings appear in soffice stub's argv log.
10. `@test "cleanup trap fires on exit"` — assert tmp dir is removed after run.

**check-deps.bats — minimum @test enumeration (read hooks/check-deps.sh first):**
1. `@test "all deps present: clean exit, no error message"` — stub soffice/pdftoppm/node available, node version high enough; exit 0; stdout silent or single OK line.
2. `@test "soffice missing"` — stub soffice removed; assert non-zero exit OR documented warning message; stderr/stdout contains "soffice".
3. `@test "pdftoppm missing"` — same pattern.
4. `@test "node version too low"` — stub `node --version` to print v16; assert message about Node ≥ 18.
5. `@test "first-run install: npm ci --omit=dev runs when node_modules absent"` — run in temp dir; stub npm; assert npm ci was invoked.
6. `@test "skip-on-already-installed: diff -q gate prevents reinstall"` — pre-create node_modules with sentinel; stub npm to fail loud; assert npm NOT invoked.
7. `@test "non-blocking: hook exits 0 even when deps missing (FOUND-03 message-only)"` — verify exit code 0 when deps missing; the hook surfaces a message, doesn't block session.

**doctor-check.bats — minimum @test enumeration (read skills/doctor/scripts/check.sh first):**
1. `@test "all green: every tool present"` — stub soffice/pdftoppm/node/npm/fc-list available; exit 0; report contains expected green markers.
2. `@test "soffice missing: report names it + install hint"` — assert install instruction present.
3. `@test "pdftoppm missing"` — same.
4. `@test "node missing"` — same.
5. `@test "IBM Plex Sans missing: fc-list returns no match"` — stub fc-list to print no IBM Plex line; assert font-missing message.
6. `@test "exit code reflects gap presence"` — at least one missing → exit non-zero (read script to confirm).
7. `@test "report format is stable: top line + per-tool rows"` — assert stdout has the documented header.

**README.md — minimum content:**
- Install: `brew install bats-core` OR git submodule fallback.
- Run all: `npm run test:bats`.
- Run single: `bats tests/bats/pptx-to-images.bats`.
- Per-file inventory of @test blocks (just title list — keep <100 lines).
- Note: bats coverage is by test-case enumeration; not folded into c8.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: helpers/setup.bash + tests/bats/pptx-to-images.bats</name>
  <files>tests/bats/helpers/setup.bash, tests/bats/pptx-to-images.bats, package.json</files>
  <read_first>
    - /Users/shafqat/Documents/Projects/instadecks/scripts/pptx-to-images.sh (read fully — confirm every conditional, the macOS timeout shim, the UserInstallation path pattern, the cleanup trap, the size-check + retry logic)
    - /Users/shafqat/Documents/Projects/instadecks/tests/pptx-to-images.test.js (existing JS-side tests — do not duplicate; this plan adds bash-script-level coverage)
    - /Users/shafqat/Documents/Projects/instadecks/.planning/phases/08-test-coverage-100/08-CONTEXT.md (D-04 — bats setup; D-09 — no full-suite runs)
    - /Users/shafqat/Documents/Projects/instadecks/.planning/STATE.md (Plan 03-01 Rule 3 macOS timeout shim — must be tested @test 8)
    - https://bats-core.readthedocs.io/ (only via Context7 if syntax unclear; skip if confident)
  </read_first>
  <action>
    **Step A — author tests/bats/helpers/setup.bash** per <interfaces> stub_bin contract. Keep it ≤80 LOC.

    **Step B — author tests/bats/pptx-to-images.bats** with the 10 @test blocks per <interfaces>. Each test:
    - `setup()` calls `load 'helpers/setup'`, sets up tmp workspace, copies fixture pptx.
    - Body: stub binaries via `stub_bin`, run `bash scripts/pptx-to-images.sh "$tmpdir/in.pptx" "$tmpdir/out"`, capture exit code + output, assert.
    - `teardown()` is bats-default (tmpdir auto-cleaned).

    **Step C — update package.json** to add `test:bats` and `test:bats:if-installed` scripts per <interfaces>.

    **Step D — verify locally (W-4: hard requirement, no defer-to-8-07 loophole):**
    ```bash
    if ! command -v bats >/dev/null; then
      # Install bats — this plan REQUIRES a local bats run.
      if [[ "$(uname)" == "Darwin" ]]; then
        brew install bats-core
      else
        sudo apt-get update && sudo apt-get install -y bats
      fi
    fi
    bats --version
    bats tests/bats/pptx-to-images.bats
    ```
    The local `bats tests/bats/pptx-to-images.bats` invocation MUST exit 0 for this task to complete. Deferring to Plan 8-07's CI run is NOT permitted (W-4).

    **Step E — atomic commit:**
    ```bash
    git add tests/bats/helpers/setup.bash tests/bats/pptx-to-images.bats package.json
    git commit -m "$(cat <<'EOF'
test(08-04): bats coverage for scripts/pptx-to-images.sh + stub_bin helper

- helpers/setup.bash: stub_bin / unstub_bin / fixture_pptx hermetic helpers.
- pptx-to-images.bats: 10 @test blocks covering happy path, missing soffice,
  missing pdftoppm, file-existence + size-check gates after both binaries,
  60s-timeout-with-retry, macOS no-timeout shim (Plan 03-01 Rule 3 deviation),
  unique UserInstallation paths, cleanup trap.
- package.json: test:bats + test:bats:if-installed scripts.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
    ```
  </action>
  <verify>
    <automated>test -f tests/bats/helpers/setup.bash && test -f tests/bats/pptx-to-images.bats && grep -q 'stub_bin' tests/bats/helpers/setup.bash && grep -cE '^@test ' tests/bats/pptx-to-images.bats | awk '{exit ($1<10)?1:0}' && node -e "const p=require('./package.json'); if(!p.scripts['test:bats']||!p.scripts['test:bats:if-installed']) process.exit(1);" && command -v bats >/dev/null && bats tests/bats/pptx-to-images.bats</automated>
  </verify>
  <acceptance_criteria>
    - `tests/bats/helpers/setup.bash` exists and exports `stub_bin` (grep-verifiable).
    - `tests/bats/pptx-to-images.bats` exists with ≥10 `@test` blocks.
    - `package.json scripts` contains `test:bats` and `test:bats:if-installed`.
    - `bats tests/bats/pptx-to-images.bats` exits 0 locally during this plan run (executor MUST install bats if absent — no defer-to-CI per W-4).
    - Atomic commit landed.
  </acceptance_criteria>
  <done>pptx-to-images.sh covered with 10 hermetic bats @tests; stub_bin helper reusable.</done>
</task>

<task type="auto">
  <name>Task 2: check-deps.bats + doctor-check.bats + README.md</name>
  <files>tests/bats/check-deps.bats, tests/bats/doctor-check.bats, tests/bats/README.md</files>
  <read_first>
    - /Users/shafqat/Documents/Projects/instadecks/hooks/check-deps.sh (read fully — confirm exit-code policy, FOUND-03 non-blocking message, FOUND-04 npm-ci first-run gate, diff -q skip path)
    - /Users/shafqat/Documents/Projects/instadecks/skills/doctor/scripts/check.sh (read fully — confirm reporting format, exit code on missing tools, fc-list font check, install-hint format)
    - /Users/shafqat/Documents/Projects/instadecks/tests/check-deps.test.js (existing JS tests — don't duplicate)
    - /Users/shafqat/Documents/Projects/instadecks/tests/bats/helpers/setup.bash (Task 1 output — load + reuse stub_bin)
    - /Users/shafqat/Documents/Projects/instadecks/tests/bats/pptx-to-images.bats (Task 1 output — match style + structure)
  </read_first>
  <action>
    **Step A — author tests/bats/check-deps.bats** with the 7 @test blocks per <interfaces>. Each test stubs the relevant binaries via `stub_bin`, sources or runs `hooks/check-deps.sh` directly. Pay attention to FOUND-03's "non-blocking" requirement: missing-deps must NOT cause exit non-zero in the SessionStart context — only surface a message. (Verify by reading the script; the test asserts the documented behavior.)

    **Step B — author tests/bats/doctor-check.bats** with the 7 @test blocks per <interfaces>. Different exit-code policy than check-deps.sh: doctor IS allowed to exit non-zero on missing tools (it's a user-invoked diagnostic, not a hook). Verify by reading the script first.

    **Step C — author tests/bats/README.md** with install instructions, run commands, per-file @test inventory (just titles), and a note that bats coverage is enumeration-based (not folded into c8).

    **Step D — verify locally (W-4: hard requirement):**
    ```bash
    if ! command -v bats >/dev/null; then
      if [[ "$(uname)" == "Darwin" ]]; then brew install bats-core; else sudo apt-get update && sudo apt-get install -y bats; fi
    fi
    bats tests/bats/
    ```
    The full `bats tests/bats/` invocation MUST exit 0 for this task to complete (W-4 closes the defer-to-CI loophole).

    **Step E — atomic commit:**
    ```bash
    git add tests/bats/check-deps.bats tests/bats/doctor-check.bats tests/bats/README.md
    git commit -m "$(cat <<'EOF'
test(08-04): bats coverage for hooks/check-deps.sh + skills/doctor/scripts/check.sh

- check-deps.bats: 7 @tests — all-green, missing soffice/pdftoppm/node-too-low,
  npm-ci first-run, diff -q skip path, FOUND-03 non-blocking exit-0 invariant.
- doctor-check.bats: 7 @tests — all-green, each missing-tool report path,
  IBM Plex Sans fc-list gap, exit-code policy, stable report format.
- README.md: brew install bats-core / submodule fallback / run instructions /
  per-file @test inventory / note on enumeration-based coverage.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
    ```
  </action>
  <verify>
    <automated>grep -cE '^@test ' tests/bats/check-deps.bats | awk '{exit ($1<7)?1:0}' && grep -cE '^@test ' tests/bats/doctor-check.bats | awk '{exit ($1<7)?1:0}' && test -f tests/bats/README.md && grep -q 'brew install bats-core' tests/bats/README.md && command -v bats >/dev/null && bats tests/bats/</automated>
  </verify>
  <acceptance_criteria>
    - `tests/bats/check-deps.bats` exists with ≥7 `@test` blocks; covers FOUND-03 non-blocking exit invariant.
    - `tests/bats/doctor-check.bats` exists with ≥7 `@test` blocks; covers all-green + each missing-tool path + font-check.
    - `tests/bats/README.md` documents install + run + per-file @test titles.
    - `bats tests/bats/` exits 0 locally during this plan run (W-4 hard requirement; install via brew/apt if absent).
    - Atomic commit landed.
  </acceptance_criteria>
  <done>All 3 bash scripts in CONTEXT D-04 covered with hermetic bats tests; documentation in place; CI wiring deferred to Plan 8-07.</done>
</task>

</tasks>

<threat_model>
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-08-10 | Tampering | stub_bin shims persist beyond test if PATH not restored | mitigate | All shims live under $BATS_TEST_TMPDIR which bats auto-removes per test; PATH change is process-local. |
| T-08-11 | Spoofing | A test passes locally but fails in CI due to bats version drift | mitigate | README documents the bats-core version expectation; Plan 8-07 pins the apt/brew package and verifies `bats --version` in CI. |
| T-08-12 | Information Disclosure | bats tests log soffice argv containing tmp paths | accept | tmp paths are ephemeral; no secrets. |
</threat_model>

<verification>
- 3 .bats files present under tests/bats/.
- `helpers/setup.bash` exports `stub_bin`.
- `tests/bats/README.md` has install + run + inventory.
- package.json has `test:bats` and `test:bats:if-installed`.
- ≥10 + ≥7 + ≥7 = ≥24 @test blocks total (grep `^@test ` count).
- 2 atomic commits landed.
- `bats tests/bats/` exits 0 locally during plan execution (W-4: install bats via brew/apt if absent — no defer-to-8-07 loophole).
</verification>

<success_criteria>
- All 3 bash scripts in CONTEXT D-04 (`scripts/pptx-to-images.sh`, `hooks/check-deps.sh`, `skills/doctor/scripts/check.sh`) have direct bats coverage of happy path + every documented failure mode.
- Tests are hermetic (stub_bin + $BATS_TEST_TMPDIR — no real soffice / pdftoppm / fc-list / node-version dependence).
- TEST-03 (every bash script has bats tests covering happy-path + failure modes) closed.
- CI wiring (apt-get install + npm run test:bats step) staged for Plan 8-07.
</success_criteria>

<output>
`.planning/phases/08-test-coverage-100/08-04-SUMMARY.md` — list of bats files + @test counts, stub_bin helper inventory, local-verify status (if bats was/wasn't on PATH at execute time), CI install command for Plan 8-07 to copy, any FOUND-03 non-blocking exit-code clarifications discovered while reading the source.
</output>
