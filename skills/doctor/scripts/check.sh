#!/usr/bin/env bash
# skills/doctor/scripts/check.sh — Phase 7 D-03 system prerequisite self-check.
#
# Probes:
#   - node ≥ 18
#   - soffice (LibreOffice) on PATH
#   - pdftoppm (Poppler) on PATH
#   - pptxgenjs@4.0.1 under ${CLAUDE_PLUGIN_DATA}/node_modules
#   - IBM Plex Sans discoverable via fc-list (soft on missing fc-list)
#
# Honors ${CLAUDE_PLUGIN_DATA} and ${CLAUDE_PLUGIN_ROOT}; no hardcoded user paths.
# Exits 0 on full green; 1 on any MISSING row. WARN rows do not flip exit.

set -uo pipefail

FAIL=0

ok()      { echo "[OK] $*"; }
miss()    { echo "[MISSING] $*"; FAIL=1; }
warn()    { echo "[WARN] $*"; }

# --- node ≥ 18 ---
if command -v node >/dev/null 2>&1; then
  NODE_PATH_BIN=$(command -v node)
  NODE_VER=$(node --version 2>/dev/null || echo "unknown")
  NODE_MAJOR=$(echo "$NODE_VER" | sed -E 's/^v?([0-9]+).*/\1/')
  if [ -n "$NODE_MAJOR" ] && [ "$NODE_MAJOR" -ge 18 ] 2>/dev/null; then
    ok "node $NODE_VER — $NODE_PATH_BIN"
  else
    miss "node ≥ 18 (found $NODE_VER) — install: brew install node (Mac) | apt install nodejs (Linux) | choco install nodejs (Windows)"
  fi
else
  miss "node — install: brew install node (Mac) | apt install nodejs (Linux) | choco install nodejs (Windows)"
fi

# --- soffice (LibreOffice) ---
if command -v soffice >/dev/null 2>&1; then
  ok "soffice — $(command -v soffice)"
else
  miss "soffice (LibreOffice) — install: brew install --cask libreoffice (Mac) | apt install libreoffice (Linux) | choco install libreoffice-fresh (Windows)"
fi

# --- pdftoppm (Poppler) ---
if command -v pdftoppm >/dev/null 2>&1; then
  ok "pdftoppm — $(command -v pdftoppm)"
else
  miss "pdftoppm (Poppler) — install: brew install poppler (Mac) | apt install poppler-utils (Linux) | choco install poppler (Windows)"
fi

# --- pptxgenjs pinned 4.0.1 ---
PPTX_BASE="${CLAUDE_PLUGIN_DATA:-${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/../../.." && pwd)}}"
PPTX_PKG="${PPTX_BASE}/node_modules/pptxgenjs/package.json"
if [ -f "$PPTX_PKG" ]; then
  if grep -q '"version": "4.0.1"' "$PPTX_PKG"; then
    ok "pptxgenjs 4.0.1 — $PPTX_PKG"
  else
    FOUND_VER=$(grep -E '"version":' "$PPTX_PKG" | head -1 | sed -E 's/.*"version": "([^"]+)".*/\1/')
    miss "pptxgenjs version drift (found ${FOUND_VER:-unknown}; expected 4.0.1) — run: npm ci --omit=dev under \$CLAUDE_PLUGIN_DATA"
  fi
else
  miss "pptxgenjs not installed at $PPTX_PKG — run: npm ci --omit=dev (or wait for SessionStart hook)"
fi

# --- IBM Plex Sans (soft check) ---
if command -v fc-list >/dev/null 2>&1; then
  if fc-list 2>/dev/null | grep -i "IBM Plex Sans" >/dev/null; then
    ok "IBM Plex Sans — discoverable via fc-list"
  else
    warn "IBM Plex Sans not found via fc-list — install bundled fonts from \$CLAUDE_PLUGIN_ROOT/assets/fonts/IBM_Plex_Sans/"
  fi
else
  warn "fc-list not installed; cannot verify IBM Plex Sans presence — install fontconfig if you want this probe to run"
fi

if [ "$FAIL" -eq 0 ]; then
  echo "doctor: all required prerequisites OK"
  exit 0
fi

echo "doctor: $FAIL or more required prerequisites MISSING — see rows above for install hints"
exit 1
