#!/usr/bin/env bats
# Bats coverage for skills/doctor/scripts/check.sh — DIST-08 self-check branches.
# Exit-code policy (per script body): 0 on full green; 1 if any required tool is
# MISSING. WARN rows (e.g. fc-list missing, IBM Plex Sans absent) do NOT flip exit.

load 'helpers/setup'

SCRIPT="${BATS_TEST_DIRNAME}/../../skills/doctor/scripts/check.sh"

setup() {
  setup_stubdir
  export CLAUDE_PLUGIN_DATA="$BATS_TEST_TMPDIR/data"
  export CLAUDE_PLUGIN_ROOT="$BATS_TEST_TMPDIR/root"
  mkdir -p "$CLAUDE_PLUGIN_DATA/node_modules/pptxgenjs" "$CLAUDE_PLUGIN_ROOT"
  printf '{\n  "name": "pptxgenjs",\n  "version": "4.0.1"\n}\n' \
    > "$CLAUDE_PLUGIN_DATA/node_modules/pptxgenjs/package.json"
}

stub_node() {
  local major="$1"
  stub_bin node 0 "
case \"\$1\" in
  --version) echo \"v$major.0.0\" ;;
  *) ;;
esac
exit 0
"
}

@test "all green: every required tool present + IBM Plex Sans found → exit 0" {
  stub_node 20
  stub_bin soffice 0 ''
  stub_bin pdftoppm 0 ''
  stub_bin fc-list 0 'echo "IBM Plex Sans:style=Regular"'
  run env PATH="$BATS_TEST_TMPDIR/bin:/usr/bin:/bin" bash "$SCRIPT"
  [ "$status" -eq 0 ]
  [[ "$output" == *"all required prerequisites OK"* ]]
  [[ "$output" == *"[OK] node"* ]]
  [[ "$output" == *"[OK] soffice"* ]]
  [[ "$output" == *"[OK] pdftoppm"* ]]
  [[ "$output" == *"[OK] pptxgenjs 4.0.1"* ]]
  [[ "$output" == *"[OK] IBM Plex Sans"* ]]
}

@test "soffice missing: [MISSING] row + install hint + exit 1" {
  stub_node 20
  stub_bin pdftoppm 0 ''
  stub_bin fc-list 0 'echo "IBM Plex Sans"'
  run env PATH="$BATS_TEST_TMPDIR/bin:/usr/bin:/bin" bash "$SCRIPT"
  [ "$status" -eq 1 ]
  [[ "$output" == *"[MISSING] soffice"* ]]
  [[ "$output" == *"brew install --cask libreoffice"* ]]
}

@test "pdftoppm missing: [MISSING] row + install hint + exit 1" {
  stub_node 20
  stub_bin soffice 0 ''
  stub_bin fc-list 0 'echo "IBM Plex Sans"'
  run env PATH="$BATS_TEST_TMPDIR/bin:/usr/bin:/bin" bash "$SCRIPT"
  [ "$status" -eq 1 ]
  [[ "$output" == *"[MISSING] pdftoppm"* ]]
  [[ "$output" == *"brew install poppler"* ]]
}

@test "node missing: [MISSING] row + install hint + exit 1" {
  stub_bin soffice 0 ''
  stub_bin pdftoppm 0 ''
  stub_bin fc-list 0 'echo "IBM Plex Sans"'
  run env PATH="$BATS_TEST_TMPDIR/bin:/usr/bin:/bin" bash "$SCRIPT"
  [ "$status" -eq 1 ]
  [[ "$output" == *"[MISSING] node"* ]]
}

@test "node too old (v16): [MISSING] node ≥ 18 row + exit 1" {
  stub_node 16
  stub_bin soffice 0 ''
  stub_bin pdftoppm 0 ''
  stub_bin fc-list 0 'echo "IBM Plex Sans"'
  run env PATH="$BATS_TEST_TMPDIR/bin:/usr/bin:/bin" bash "$SCRIPT"
  [ "$status" -eq 1 ]
  [[ "$output" == *"node ≥ 18"* ]] || [[ "$output" == *"node \xe2\x89\xa5 18"* ]]
}

@test "pptxgenjs version drift: [MISSING] with found-version note + exit 1" {
  stub_node 20
  stub_bin soffice 0 ''
  stub_bin pdftoppm 0 ''
  stub_bin fc-list 0 'echo "IBM Plex Sans"'
  printf '{\n  "name": "pptxgenjs",\n  "version": "3.12.0"\n}\n' \
    > "$CLAUDE_PLUGIN_DATA/node_modules/pptxgenjs/package.json"
  run env PATH="$BATS_TEST_TMPDIR/bin:/usr/bin:/bin" bash "$SCRIPT"
  [ "$status" -eq 1 ]
  [[ "$output" == *"pptxgenjs version drift"* ]]
  [[ "$output" == *"3.12.0"* ]]
}

@test "pptxgenjs not installed: [MISSING] with npm ci hint + exit 1" {
  stub_node 20
  stub_bin soffice 0 ''
  stub_bin pdftoppm 0 ''
  stub_bin fc-list 0 'echo "IBM Plex Sans"'
  rm -rf "$CLAUDE_PLUGIN_DATA/node_modules"
  run env PATH="$BATS_TEST_TMPDIR/bin:/usr/bin:/bin" bash "$SCRIPT"
  [ "$status" -eq 1 ]
  [[ "$output" == *"pptxgenjs not installed"* ]]
  [[ "$output" == *"npm ci --omit=dev"* ]]
}

@test "IBM Plex Sans missing via fc-list: [WARN] (does NOT flip exit) → exit 0" {
  stub_node 20
  stub_bin soffice 0 ''
  stub_bin pdftoppm 0 ''
  stub_bin fc-list 0 'echo "Helvetica:style=Regular"'  # no IBM Plex Sans line
  run env PATH="$BATS_TEST_TMPDIR/bin:/usr/bin:/bin" bash "$SCRIPT"
  [ "$status" -eq 0 ]
  [[ "$output" == *"[WARN] IBM Plex Sans"* ]]
}

@test "fc-list absent: soft warning, no exit-flip" {
  stub_node 20
  stub_bin soffice 0 ''
  stub_bin pdftoppm 0 ''
  # No fc-list stub.
  run env PATH="$BATS_TEST_TMPDIR/bin:/usr/bin:/bin" bash "$SCRIPT"
  [ "$status" -eq 0 ]
  [[ "$output" == *"[WARN] fc-list not installed"* ]]
}
