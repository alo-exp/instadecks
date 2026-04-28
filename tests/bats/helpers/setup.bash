# tests/bats/helpers/setup.bash
# Hermetic helpers for stubbing binaries inside $BATS_TEST_TMPDIR.
#
# Usage in a .bats file:
#   load 'helpers/setup'
#   setup() { setup_stubdir; }
#
# All shims live under $BATS_TEST_TMPDIR/bin which bats auto-removes per test;
# PATH mutation is process-local so cross-test bleed is impossible.

# setup_stubdir: create $BATS_TEST_TMPDIR/bin and prepend to PATH (process-local).
setup_stubdir() {
  mkdir -p "$BATS_TEST_TMPDIR/bin"
  export PATH="$BATS_TEST_TMPDIR/bin:$PATH"
  export STUB_LOG="$BATS_TEST_TMPDIR/stub.log"
  : > "$STUB_LOG"
}

# stub_bin NAME EXITCODE [BODY]
# Creates $BATS_TEST_TMPDIR/bin/<NAME> as an executable shell script.
# BODY (optional) is appended verbatim before the final `exit EXITCODE` so the
# stub can write fake output files, sleep, log argv, etc. Argv is always
# appended to $STUB_LOG with a `<name>:` prefix.
stub_bin() {
  local name="$1" exitcode="$2"
  local body="${3:-}"
  mkdir -p "$BATS_TEST_TMPDIR/bin"
  cat > "$BATS_TEST_TMPDIR/bin/$name" <<EOF
#!/usr/bin/env bash
echo "$name: \$*" >> "$STUB_LOG"
$body
exit $exitcode
EOF
  chmod +x "$BATS_TEST_TMPDIR/bin/$name"
}

# unstub_bin NAME — remove a stub mid-test.
unstub_bin() {
  rm -f "$BATS_TEST_TMPDIR/bin/$1"
}

# isolate_path: reset PATH to ONLY the stub dir + minimal coreutils so real
# soffice/pdftoppm/node on the host cannot leak into a test.
isolate_path() {
  export PATH="$BATS_TEST_TMPDIR/bin:/usr/bin:/bin"
}

# fixture_pptx DEST — copy a known-good pptx fixture to DEST (creates parent).
fixture_pptx() {
  local dest="$1"
  mkdir -p "$(dirname "$dest")"
  if [ -f "$BATS_TEST_DIRNAME/../fixtures/tiny-deck.pptx" ]; then
    cp "$BATS_TEST_DIRNAME/../fixtures/tiny-deck.pptx" "$dest"
  elif [ -f "tests/fixtures/tiny-deck.pptx" ]; then
    cp "tests/fixtures/tiny-deck.pptx" "$dest"
  else
    # last-resort: a non-empty placeholder file (script only checks -f, not zip magic)
    printf 'PK\x03\x04fakepptx' > "$dest"
  fi
}
