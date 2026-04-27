#!/usr/bin/env bash
# scripts/pptx-to-images.sh — PPTX → per-slide JPG @ 150 DPI for /review (and Phase 4/5/6).
# RVW-09/10/11: per-call -env:UserInstallation, 60s timeout, 1 retry, post-call validation, cleanup trap.
#
# Usage: pptx-to-images.sh <input.pptx> <output_dir>
# Exit codes:
#   0  success
#   1  invalid args / input not a file
#   2  soffice failed twice
#   3  soffice produced empty/missing PDF
#   4  pdftoppm failed twice
#   5  pdftoppm produced no JPGs / failed magic-bytes / size check

set -euo pipefail
umask 0077

INPUT="${1:-}"
OUTDIR="${2:-}"
if [[ -z "$INPUT" || -z "$OUTDIR" ]]; then
  echo "Usage: pptx-to-images.sh <input.pptx> <output_dir>" >&2
  exit 1
fi
[[ -f "$INPUT" ]] || { echo "Instadecks: input not a file: $INPUT" >&2; exit 1; }
mkdir -p "$OUTDIR"

# macOS portability: BSD lacks `timeout`. Probe for `timeout` (GNU coreutils on Linux,
# `gtimeout` from Homebrew coreutils on macOS); if neither is present, define a no-op
# shim that simply runs the command without a wall-clock cap. This preserves the literal
# `timeout 60 ...` invocation form below (so the script body matches the contract verbatim)
# while still functioning on dev hosts that have not installed coreutils. Production CI
# images SHOULD provide GNU coreutils so the 60s cap is enforced.
if ! command -v timeout >/dev/null 2>&1; then
  if command -v gtimeout >/dev/null 2>&1; then
    timeout() { gtimeout "$@"; }
  else
    echo "Instadecks: warning — no timeout/gtimeout in PATH; running without wall-clock cap" >&2
    timeout() { shift; "$@"; }
  fi
fi

SESSION_ID="${CLAUDE_SESSION_ID:-s$(date +%s)}"
LO_PROFILE="/tmp/lo-${SESSION_ID}-$$"
mkdir -p "$LO_PROFILE"
trap 'rm -rf "$LO_PROFILE"' EXIT INT TERM   # RVW-11

# --- 1. soffice → PDF ---------------------------------------------------------
PDF_PATH="$OUTDIR/$(basename "${INPUT%.*}").pdf"
attempt=0
while (( attempt < 2 )); do
  attempt=$(( attempt + 1 ))
  if timeout 60 soffice \
        --headless \
        "-env:UserInstallation=file://$LO_PROFILE" \
        --convert-to pdf \
        --outdir "$OUTDIR" \
        "$INPUT" 2> "$OUTDIR/soffice.stderr"; then
    break
  fi
  if (( attempt == 2 )); then
    echo "Instadecks: soffice failed twice (see $OUTDIR/soffice.stderr)" >&2
    exit 2
  fi
done

# RVW-10: existence + size + magic-bytes (P-02 / P-03 / P-05)
if [[ ! -f "$PDF_PATH" ]]; then
  echo "Instadecks: soffice exited 0 but PDF missing: $PDF_PATH" >&2
  exit 3
fi
SIZE=$(wc -c < "$PDF_PATH")           # Q-3: portable, POSIX-standard
if (( SIZE < 1024 )); then
  echo "Instadecks: soffice produced PDF < 1024 bytes (got $SIZE): $PDF_PATH" >&2
  exit 3
fi
MAGIC=$(head -c 4 "$PDF_PATH")
if [[ "$MAGIC" != "%PDF" ]]; then
  echo "Instadecks: soffice output is not a PDF (magic: $(printf '%q' "$MAGIC")): $PDF_PATH" >&2
  exit 3
fi

# --- 2. pdftoppm → JPG @ 150 DPI ---------------------------------------------
SLIDE_PREFIX="$OUTDIR/slide"
if ! timeout 60 pdftoppm -jpeg -r 150 "$PDF_PATH" "$SLIDE_PREFIX" 2> "$OUTDIR/pdftoppm.stderr"; then
  # 1 retry
  if ! timeout 60 pdftoppm -jpeg -r 150 "$PDF_PATH" "$SLIDE_PREFIX" 2> "$OUTDIR/pdftoppm.stderr"; then
    echo "Instadecks: pdftoppm failed twice (see $OUTDIR/pdftoppm.stderr)" >&2
    exit 4
  fi
fi
shopt -s nullglob
JPGS=( "$SLIDE_PREFIX"-*.jpg )
shopt -u nullglob
if (( ${#JPGS[@]} == 0 )); then
  echo "Instadecks: pdftoppm produced no JPGs in $OUTDIR" >&2
  exit 5
fi

# RVW-10: per-JPG smoke check
for jpg in "${JPGS[@]}"; do
  s=$(wc -c < "$jpg")
  if (( s < 1024 )); then
    echo "Instadecks: $jpg < 1024 bytes — pdftoppm partial-output suspected" >&2
    exit 5
  fi
  m=$(head -c 3 "$jpg" | xxd -p)
  # JPEG magic: FF D8 FF
  [[ "$m" == "ffd8ff" ]] || {
    echo "Instadecks: $jpg lacks JPEG magic bytes (got: $m)" >&2
    exit 5
  }
done

echo "Instadecks: $PDF_PATH + ${#JPGS[@]} slide JPGs → $OUTDIR"
