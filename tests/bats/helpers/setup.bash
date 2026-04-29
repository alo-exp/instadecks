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

# isolate_path: reset PATH to ONLY the stub dir + a curated coreutils sandbox so
# real soffice/pdftoppm/node/fc-list on the host cannot leak into a test.
#
# Mac happens to ship /usr/bin without soffice/pdftoppm/fc-list. Linux CI runners
# (and any host with libreoffice/poppler/fontconfig installed) DO have those in
# /usr/bin, which would defeat the missing-tool branches. Build a per-test
# sandbox at $BATS_TEST_TMPDIR/cu/ that symlinks ONLY a curated coreutils list
# (sed/grep/head/etc.) — explicitly excluding soffice, pdftoppm, fc-list, node,
# timeout, gtimeout — and use that instead of /usr/bin:/bin.
isolate_path() {
  local cu="$BATS_TEST_TMPDIR/cu"
  mkdir -p "$cu"
  local utils=(sed grep head basename dirname tr cat ls cut awk bash sh env wc \
               mkdir rm cp mv chmod find sort uniq tee tail printf echo test \
               stat readlink which command id whoami uname date xargs unzip \
               sleep tar gzip gunzip jq mktemp file)
  local roots=(/usr/bin /bin /usr/local/bin /opt/homebrew/bin)
  local u r src
  for u in "${utils[@]}"; do
    for r in "${roots[@]}"; do
      src="$r/$u"
      if [ -e "$src" ] && [ ! -e "$cu/$u" ]; then
        ln -sf "$src" "$cu/$u" 2>/dev/null || true
      fi
    done
  done
  export PATH="$BATS_TEST_TMPDIR/bin:$cu"
}

# iso_path: build the coreutils sandbox (idempotent) and echo the curated PATH
# string. Use inside `run env PATH="$(iso_path)" ...` to substitute for the old
# `PATH="$BATS_TEST_TMPDIR/bin:/usr/bin:/bin"` pattern that leaked real
# soffice/pdftoppm/fc-list/timeout from /usr/bin on Linux CI runners.
iso_path() {
  local cu="$BATS_TEST_TMPDIR/cu"
  if [ ! -d "$cu" ]; then
    mkdir -p "$cu"
    local utils=(sed grep head basename dirname tr cat ls cut awk bash sh env wc \
                 mkdir rm cp mv chmod find sort uniq tee tail printf echo test \
                 stat readlink which command id whoami uname date xargs unzip \
                 sleep tar gzip gunzip jq mktemp file xxd od dd shasum sha256sum \
                 touch ln expr seq diff hostname true false yes cmp)
    local roots=(/usr/bin /bin /usr/local/bin /opt/homebrew/bin)
    local u r src
    for u in "${utils[@]}"; do
      for r in "${roots[@]}"; do
        src="$r/$u"
        if [ -e "$src" ] && [ ! -e "$cu/$u" ]; then
          ln -sf "$src" "$cu/$u" 2>/dev/null || true
        fi
      done
    done
  fi
  echo "$BATS_TEST_TMPDIR/bin:$cu"
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
