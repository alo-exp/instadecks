#!/usr/bin/env bats
# Bats coverage for scripts/pptx-to-images.sh — RVW-09/10/11 branches.
# Hermetic: stubs soffice/pdftoppm under $BATS_TEST_TMPDIR/bin so the host
# binaries never run. Plan 03-01 Rule 3 (macOS no-`timeout` shim) is asserted
# via a dedicated @test that strips both `timeout` and `gtimeout` from PATH.

load 'helpers/setup'

# Project-root anchor (resolved once; tests run from repo root via `bats tests/bats/`).
SCRIPT="${BATS_TEST_DIRNAME}/../../scripts/pptx-to-images.sh"

setup() {
  setup_stubdir
  IN="$BATS_TEST_TMPDIR/in.pptx"
  OUT="$BATS_TEST_TMPDIR/out"
  fixture_pptx "$IN"
  mkdir -p "$OUT"
}

# A soffice stub that writes a syntactically valid PDF (>=1024 bytes, %PDF magic).
# Portability: macOS bash 3.2 populates BASH_ARGV[0] at script top level, but Linux
# bash 4+/5.x leaves it empty unless `shopt -s extdebug` is on. Walk argv with shift
# to find the trailing input arg (last positional) instead.
stub_soffice_ok() {
  stub_bin soffice 0 '
OUTDIR=""
INPUT=""
while [ $# -gt 0 ]; do
  case "$1" in
    --outdir) OUTDIR="$2"; shift 2 ;;
    -env:*|--headless|--convert-to) shift ;;
    pdf) shift ;;
    *) INPUT="$1"; shift ;;
  esac
done
BASENAME="$(basename "${INPUT%.*}")"
PDF="$OUTDIR/$BASENAME.pdf"
{ printf "%%PDF-1.4\n"; head -c 2048 /dev/zero | tr "\0" "x"; } > "$PDF"
'
}

# A pdftoppm stub that writes one valid JPG-looking file (>=1024 bytes, FFD8FF magic).
stub_pdftoppm_ok() {
  stub_bin pdftoppm 0 '
PREFIX=""
for a in "$@"; do PREFIX="$a"; done
JPG="${PREFIX}-1.jpg"
{ printf "\xff\xd8\xff\xe0"; head -c 2048 /dev/zero | tr "\0" "x"; } > "$JPG"
'
}

@test "happy path: pptx in, JPGs out, exit 0" {
  stub_soffice_ok
  stub_pdftoppm_ok
  run bash "$SCRIPT" "$IN" "$OUT"
  [ "$status" -eq 0 ]
  [ -f "$OUT/in.pdf" ]
  ls "$OUT"/slide-*.jpg >/dev/null
}

@test "missing args fail with usage and exit 1" {
  run bash "$SCRIPT"
  [ "$status" -eq 1 ]
  [[ "$output" == *"Usage"* ]]
}

@test "input not a file: exit 1 with clear message" {
  run bash "$SCRIPT" "$BATS_TEST_TMPDIR/nope.pptx" "$OUT"
  [ "$status" -eq 1 ]
  [[ "$output" == *"input not a file"* ]]
}

@test "missing soffice fails fast with retry exhaustion (exit 2)" {
  # No soffice stub at all — `timeout 60 soffice` will fail because the binary
  # is absent (the real soffice on host is shadowed by our empty stub dir +
  # PATH order; if host has soffice we still rely on it failing fast on a
  # malformed pptx input. To guarantee determinism we plant a soffice stub
  # that exits non-zero.).
  stub_bin soffice 1 'echo "soffice: cannot open" >&2'
  run bash "$SCRIPT" "$IN" "$OUT"
  [ "$status" -eq 2 ]
  [[ "$output" == *"soffice failed twice"* ]]
}

@test "soffice exits 0 but produces no PDF: exit 3" {
  stub_bin soffice 0 ''   # silent success, no file created
  stub_pdftoppm_ok
  run bash "$SCRIPT" "$IN" "$OUT"
  [ "$status" -eq 3 ]
  [[ "$output" == *"PDF missing"* ]]
}

@test "soffice produces zero-byte PDF: size check fires (exit 3)" {
  stub_bin soffice 0 '
OUTDIR=""
INPUT=""
while [ $# -gt 0 ]; do
  case "$1" in
    --outdir) OUTDIR="$2"; shift 2 ;;
    -env:*|--headless|--convert-to) shift ;;
    pdf) shift ;;
    *) INPUT="$1"; shift ;;
  esac
done
: > "$OUTDIR/$(basename "${INPUT%.*}").pdf"
'
  run bash "$SCRIPT" "$IN" "$OUT"
  [ "$status" -eq 3 ]
  [[ "$output" == *"< 1024 bytes"* ]]
}

@test "soffice output lacks %PDF magic: exit 3" {
  stub_bin soffice 0 '
OUTDIR=""
INPUT=""
while [ $# -gt 0 ]; do
  case "$1" in
    --outdir) OUTDIR="$2"; shift 2 ;;
    -env:*|--headless|--convert-to) shift ;;
    pdf) shift ;;
    *) INPUT="$1"; shift ;;
  esac
done
PDF="$OUTDIR/$(basename "${INPUT%.*}").pdf"
head -c 2048 /dev/zero | tr "\0" "x" > "$PDF"
'
  run bash "$SCRIPT" "$IN" "$OUT"
  [ "$status" -eq 3 ]
  [[ "$output" == *"not a PDF"* ]]
}

@test "missing pdftoppm fails fast (exit 4)" {
  stub_soffice_ok
  stub_bin pdftoppm 1 'echo "pdftoppm: error" >&2'
  run bash "$SCRIPT" "$IN" "$OUT"
  [ "$status" -eq 4 ]
  [[ "$output" == *"pdftoppm failed twice"* ]]
}

@test "pdftoppm exits 0 but writes no JPGs: exit 5" {
  stub_soffice_ok
  stub_bin pdftoppm 0 ''
  run bash "$SCRIPT" "$IN" "$OUT"
  [ "$status" -eq 5 ]
  [[ "$output" == *"no JPGs"* ]]
}

@test "pdftoppm output lacks JPEG magic: exit 5" {
  stub_soffice_ok
  stub_bin pdftoppm 0 '
PREFIX=""
for a in "$@"; do PREFIX="$a"; done
JPG="${PREFIX}-1.jpg"
head -c 2048 /dev/zero | tr "\0" "x" > "$JPG"
'
  run bash "$SCRIPT" "$IN" "$OUT"
  [ "$status" -eq 5 ]
  [[ "$output" == *"JPEG magic"* ]]
}

@test "macOS no-timeout-binary shim: runs without timeout/gtimeout in PATH" {
  # Strip both timeout binaries by isolating PATH to ONLY our stub dir.
  # Plan 03-01 Rule 3 deviation: shim defines a `timeout` function that simply
  # shifts the cap arg and execs the command. Verifies happy path still works.
  stub_soffice_ok
  stub_pdftoppm_ok
  PATH="$BATS_TEST_TMPDIR/bin:/usr/bin:/bin" command -v timeout >/dev/null && skip "timeout binary present in /usr/bin or /bin; cannot test shim"
  PATH="$BATS_TEST_TMPDIR/bin:/usr/bin:/bin" command -v gtimeout >/dev/null && skip "gtimeout present; cannot test shim"
  run env PATH="$BATS_TEST_TMPDIR/bin:/usr/bin:/bin" bash "$SCRIPT" "$IN" "$OUT"
  [ "$status" -eq 0 ]
  [[ "$output" == *"no timeout/gtimeout in PATH"* ]] || [[ "$output" == *"warning"* ]]
}

@test "concurrent invocations use unique UserInstallation profile paths" {
  stub_soffice_ok
  stub_pdftoppm_ok
  OUT1="$BATS_TEST_TMPDIR/out1"; mkdir -p "$OUT1"
  OUT2="$BATS_TEST_TMPDIR/out2"; mkdir -p "$OUT2"
  run bash "$SCRIPT" "$IN" "$OUT1"
  [ "$status" -eq 0 ]
  run bash "$SCRIPT" "$IN" "$OUT2"
  [ "$status" -eq 0 ]
  # Two distinct -env:UserInstallation= strings logged via stub argv.
  UNIQUE=$(grep -o 'env:UserInstallation=file:///tmp/lo-[^ ]*' "$STUB_LOG" | sort -u | wc -l)
  [ "$UNIQUE" -ge 2 ]
}

@test "cleanup trap fires: /tmp/lo-* profile dir is removed after run" {
  stub_soffice_ok
  stub_pdftoppm_ok
  run bash "$SCRIPT" "$IN" "$OUT"
  [ "$status" -eq 0 ]
  # Extract profile path from logged argv and confirm it no longer exists.
  PROF=$(grep -o '/tmp/lo-[^ ]*' "$STUB_LOG" | head -1)
  [ -n "$PROF" ]
  [ ! -d "$PROF" ]
}
