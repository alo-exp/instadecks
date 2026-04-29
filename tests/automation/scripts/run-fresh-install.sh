#!/usr/bin/env bash
# tests/automation/scripts/run-fresh-install.sh — Plan 10-04 (HARD-12)
#
# In-container fresh-install harness. Runs the 4 user-invocable skill CLIs
# against tests/automation/lib/canonical-brief.json and verifies the byte
# sizes of the 5 produced artifacts. Final stdout line is `RESULT=<base64>`
# carrying a JSON manifest the host-side test parses.
#
# On any failure: emits `RESULT={"ok":false,...}` and exits 1.
#
# Env:
#   KEEP_OUT=1   — skip cleanup of $OUT (useful when diagnosing failures)

set -u
set -o pipefail

# ---- Helpers ----------------------------------------------------------------

emit_result() {
  # $1 = JSON payload
  local b64
  b64=$(printf '%s' "$1" | base64 | tr -d '\n')
  printf 'RESULT=%s\n' "$b64"
}

fail() {
  local msg="$1"
  emit_result "$(printf '{"ok":false,"error":%s}' "$(printf '%s' "$msg" | node -e 'process.stdout.write(JSON.stringify(require("fs").readFileSync(0,"utf8")))')")"
  exit 1
}

byte_size() {
  # POSIX-compatible byte size. Echoes 0 for missing files.
  if [ -f "$1" ]; then
    wc -c < "$1" | tr -d ' '
  else
    echo 0
  fi
}

# ---- Setup ------------------------------------------------------------------

REPO_ROOT="${REPO_ROOT:-/instadecks}"
cd "$REPO_ROOT" || fail "cd to REPO_ROOT failed: $REPO_ROOT"

OUT=$(mktemp -d -t instadecks-XXXXXX) || fail "mktemp failed"

cleanup() {
  if [ "${KEEP_OUT:-0}" != "1" ]; then
    rm -rf "$OUT"
  fi
}
trap cleanup EXIT

BRIEF="$REPO_ROOT/tests/automation/lib/canonical-brief.json"
STUB_FINDINGS="$REPO_ROOT/tests/fixtures/sample-findings.json"

if [ ! -f "$BRIEF" ]; then
  fail "canonical brief not found: $BRIEF"
fi
if [ ! -f "$STUB_FINDINGS" ]; then
  fail "stub findings fixture not found: $STUB_FINDINGS"
fi

# ---- Step 1: /create --------------------------------------------------------

echo "[run-fresh-install] step 1/4: /instadecks:create" >&2
if ! node skills/create/scripts/cli.js --brief "$BRIEF" --out-dir "$OUT" >/dev/null 2>"$OUT/create.err"; then
  fail "create failed (see $OUT/create.err)"
fi

DECK_PPTX="$OUT/deck.pptx"
DECK_PDF="$OUT/deck.pdf"
if [ ! -f "$DECK_PPTX" ]; then
  fail "create did not produce deck.pptx in $OUT"
fi

# ---- Step 2: /review --------------------------------------------------------
# The reviewer LLM step is agent-mode-only; standalone CLI requires a
# pre-authored findings JSON. We supply tests/fixtures/sample-findings.json
# (rebound to the actual deck path) so the byte-level integration is exercised.

echo "[run-fresh-install] step 2/4: /instadecks:review" >&2
REVIEW_FINDINGS_IN="$OUT/findings-input.json"
node -e '
  const fs = require("fs");
  const f = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  f.deck = process.argv[2];
  fs.writeFileSync(process.argv[3], JSON.stringify(f, null, 2));
' "$STUB_FINDINGS" "$DECK_PPTX" "$REVIEW_FINDINGS_IN" \
  || fail "rewriting findings.deck path failed"

if ! node skills/review/scripts/cli.js "$DECK_PPTX" --findings "$REVIEW_FINDINGS_IN" --out-dir "$OUT" >/dev/null 2>"$OUT/review.err"; then
  fail "review failed (see $OUT/review.err)"
fi

# review writes a sibling deck.review.json next to the deck.
DECK_REVIEW_JSON="$OUT/deck.review.json"
if [ ! -f "$DECK_REVIEW_JSON" ]; then
  fail "review did not produce deck.review.json"
fi
node -e 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))' "$DECK_REVIEW_JSON" \
  || fail "deck.review.json is not valid JSON"

# ---- Step 3: /content-review -----------------------------------------------

echo "[run-fresh-install] step 3/4: /instadecks:content-review" >&2
if ! node skills/content-review/scripts/cli.js "$DECK_PPTX" --findings "$REVIEW_FINDINGS_IN" --out-dir "$OUT" >/dev/null 2>"$OUT/content-review.err"; then
  fail "content-review failed (see $OUT/content-review.err)"
fi

# ---- Step 4: /annotate ------------------------------------------------------

echo "[run-fresh-install] step 4/4: /instadecks:annotate" >&2
if ! node skills/annotate/scripts/cli.js --deck "$DECK_PPTX" --findings "$DECK_REVIEW_JSON" --out-dir "$OUT" >/dev/null 2>"$OUT/annotate.err"; then
  fail "annotate failed (see $OUT/annotate.err)"
fi

ANN_PPTX="$OUT/deck.annotated.pptx"
ANN_PDF="$OUT/deck.annotated.pdf"
if [ ! -f "$ANN_PPTX" ]; then
  fail "annotate did not produce deck.annotated.pptx"
fi

# ---- Verify byte sizes ------------------------------------------------------

DECK_PPTX_SIZE=$(byte_size "$DECK_PPTX")
DECK_PDF_SIZE=$(byte_size "$DECK_PDF")
DECK_REVIEW_SIZE=$(byte_size "$DECK_REVIEW_JSON")
ANN_PPTX_SIZE=$(byte_size "$ANN_PPTX")
ANN_PDF_SIZE=$(byte_size "$ANN_PDF")

# Thresholds per plan 10-04: PPTX ≥ 10240, PDF ≥ 5120.
[ "$DECK_PPTX_SIZE" -ge 10240 ] || fail "deck.pptx too small ($DECK_PPTX_SIZE bytes; need >=10240)"
[ "$DECK_PDF_SIZE" -ge 5120 ]   || fail "deck.pdf too small ($DECK_PDF_SIZE bytes; need >=5120)"
[ "$ANN_PPTX_SIZE" -ge 10240 ]  || fail "deck.annotated.pptx too small ($ANN_PPTX_SIZE bytes; need >=10240)"
[ "$ANN_PDF_SIZE" -ge 5120 ]    || fail "deck.annotated.pdf too small ($ANN_PDF_SIZE bytes; need >=5120)"

# ---- Emit success manifest --------------------------------------------------

MANIFEST=$(node -e '
  const out = {
    ok: true,
    artifacts: [
      {name:"deckPptx",      path: process.argv[1], bytes: parseInt(process.argv[2],10)},
      {name:"deckPdf",       path: process.argv[3], bytes: parseInt(process.argv[4],10)},
      {name:"deckReview",    path: process.argv[5], bytes: parseInt(process.argv[6],10)},
      {name:"annotatedPptx", path: process.argv[7], bytes: parseInt(process.argv[8],10)},
      {name:"annotatedPdf",  path: process.argv[9], bytes: parseInt(process.argv[10],10)},
    ],
    byteSizes: {
      deckPptx:      parseInt(process.argv[2],10),
      deckPdf:       parseInt(process.argv[4],10),
      deckReview:    parseInt(process.argv[6],10),
      annotatedPptx: parseInt(process.argv[8],10),
      annotatedPdf:  parseInt(process.argv[10],10),
    },
  };
  process.stdout.write(JSON.stringify(out));
' \
  "$DECK_PPTX"        "$DECK_PPTX_SIZE" \
  "$DECK_PDF"         "$DECK_PDF_SIZE" \
  "$DECK_REVIEW_JSON" "$DECK_REVIEW_SIZE" \
  "$ANN_PPTX"         "$ANN_PPTX_SIZE" \
  "$ANN_PDF"          "$ANN_PDF_SIZE")

# Best-effort persist (ignored if /tmp not writable).
printf '%s\n' "$MANIFEST" > /tmp/fresh-install-result.json 2>/dev/null || true

emit_result "$MANIFEST"
exit 0
