#!/usr/bin/env bats
# Bats coverage for hooks/check-deps.sh — FOUND-03/04 branches.
# FOUND-03 invariant: hook ALWAYS exits 0 (non-blocking SessionStart) — verified
# via `trap 'exit 0' ERR` and explicit `exit 0` at script tail.
# FOUND-04 invariant: lockfile-SHA sentinel gates `npm ci --omit=dev` so a
# second SessionStart with an unchanged package-lock.json skips reinstall.

load 'helpers/setup'

SCRIPT="${BATS_TEST_DIRNAME}/../../hooks/check-deps.sh"

setup() {
  setup_stubdir
  export CLAUDE_PLUGIN_ROOT="$BATS_TEST_TMPDIR/plugin"
  export CLAUDE_PLUGIN_DATA="$BATS_TEST_TMPDIR/data"
  mkdir -p "$CLAUDE_PLUGIN_ROOT" "$CLAUDE_PLUGIN_DATA"
  # Lockfile so the npm ci branch is reachable.
  printf '{"name":"instadecks","version":"0.1.0"}\n' > "$CLAUDE_PLUGIN_ROOT/package.json"
  printf '{"lockfileVersion":3,"name":"instadecks","version":"0.1.0"}\n' > "$CLAUDE_PLUGIN_ROOT/package-lock.json"
  # Pre-create empty fonts dir so font-copy branch never errors.
  mkdir -p "$CLAUDE_PLUGIN_ROOT/assets/fonts/IBM_Plex_Sans"
  : > "$CLAUDE_PLUGIN_ROOT/assets/fonts/IBM_Plex_Sans/IBMPlexSans-Regular.ttf"
}

# Stub a node binary that reports the given major version.
stub_node() {
  local major="$1"
  stub_bin node 0 "
case \"\$1\" in
  -p) echo \"$major\"; exit 0 ;;
  --version) echo \"v$major.0.0\"; exit 0 ;;
  *) exit 0 ;;
esac
"
}

@test "all deps present: clean exit 0 with deps OK message" {
  stub_bin soffice 0 ''
  stub_bin pdftoppm 0 ''
  stub_node 20
  stub_bin shasum 0 'echo "deadbeef  -"'
  # No npm ci needed if sentinel matches; pre-seed sentinel.
  echo "deadbeef" > "$CLAUDE_PLUGIN_DATA/.npm-installed-sentinel"
  # check-deps.sh probes all three Plex families (Sans/Serif/Mono) — stub all
  # three so the font-install branch is not triggered (it would fail under the
  # bats sandbox because only IBM_Plex_Sans/ is seeded by the test setup).
  stub_bin fc-list 0 'echo "IBM Plex Sans:style=Regular"; echo "IBM Plex Serif:style=Regular"; echo "IBM Plex Mono:style=Regular"'
  run env PATH="$BATS_TEST_TMPDIR/bin:/usr/bin:/bin" bash "$SCRIPT"
  [ "$status" -eq 0 ]
  [[ "$output" == *"deps OK"* ]]
}

@test "soffice missing: surfaces 'missing soffice' but still exits 0 (FOUND-03 non-blocking)" {
  stub_bin pdftoppm 0 ''
  stub_node 20
  stub_bin shasum 0 'echo "abc  -"'
  echo "abc" > "$CLAUDE_PLUGIN_DATA/.npm-installed-sentinel"
  run env PATH="$BATS_TEST_TMPDIR/bin:/usr/bin:/bin" bash "$SCRIPT"
  [ "$status" -eq 0 ]
  [[ "$output" == *"missing soffice"* ]]
}

@test "pdftoppm missing: surfaces message + exits 0" {
  stub_bin soffice 0 ''
  stub_node 20
  stub_bin shasum 0 'echo "abc  -"'
  echo "abc" > "$CLAUDE_PLUGIN_DATA/.npm-installed-sentinel"
  run env PATH="$BATS_TEST_TMPDIR/bin:/usr/bin:/bin" bash "$SCRIPT"
  [ "$status" -eq 0 ]
  [[ "$output" == *"missing pdftoppm"* ]]
}

@test "node version too low: 'node 16 < 18' message + exits 0" {
  stub_bin soffice 0 ''
  stub_bin pdftoppm 0 ''
  stub_node 16
  stub_bin shasum 0 'echo "abc  -"'
  echo "abc" > "$CLAUDE_PLUGIN_DATA/.npm-installed-sentinel"
  run env PATH="$BATS_TEST_TMPDIR/bin:/usr/bin:/bin" bash "$SCRIPT"
  [ "$status" -eq 0 ]
  [[ "$output" == *"node 16 < 18"* ]]
}

@test "first-run install: npm ci --omit=dev is invoked when sentinel SHA mismatches" {
  stub_bin soffice 0 ''
  stub_bin pdftoppm 0 ''
  stub_node 20
  stub_bin shasum 0 'echo "newsha  -"'
  # No prior sentinel → mismatch → npm ci runs.
  stub_bin npm 0 ''
  run env PATH="$BATS_TEST_TMPDIR/bin:/usr/bin:/bin" bash "$SCRIPT"
  [ "$status" -eq 0 ]
  grep -q '^npm: ci --omit=dev' "$STUB_LOG"
  [ -f "$CLAUDE_PLUGIN_DATA/.npm-installed-sentinel" ]
  [[ "$output" == *"install complete"* ]]
}

@test "skip-on-already-installed: matching sentinel SHA prevents npm invocation" {
  stub_bin soffice 0 ''
  stub_bin pdftoppm 0 ''
  stub_node 20
  stub_bin shasum 0 'echo "samesha  -"'
  echo "samesha" > "$CLAUDE_PLUGIN_DATA/.npm-installed-sentinel"
  # Loud-fail npm so we'd see if it ran.
  stub_bin npm 99 'echo "should-not-run" >&2'
  run env PATH="$BATS_TEST_TMPDIR/bin:/usr/bin:/bin" bash "$SCRIPT"
  [ "$status" -eq 0 ]
  ! grep -q '^npm:' "$STUB_LOG"
}

@test "FOUND-03: hook exits 0 even when every dep is missing" {
  # No stubs → soffice/pdftoppm/node/npm/shasum all absent (PATH limited).
  run env PATH="$BATS_TEST_TMPDIR/bin:/usr/bin:/bin" bash "$SCRIPT"
  [ "$status" -eq 0 ]
  [[ "$output" == *"Instadecks:"* ]]
}

@test "npm ci failure path: 'npm ci failed' surfaced + exit 0" {
  stub_bin soffice 0 ''
  stub_bin pdftoppm 0 ''
  stub_node 20
  stub_bin shasum 0 'echo "newsha2  -"'
  stub_bin npm 1 'echo "boom" >&2'
  run env PATH="$BATS_TEST_TMPDIR/bin:/usr/bin:/bin" bash "$SCRIPT"
  [ "$status" -eq 0 ]
  [[ "$output" == *"npm ci failed"* ]]
}
