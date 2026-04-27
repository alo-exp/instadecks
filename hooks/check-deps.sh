#!/usr/bin/env bash
# Instadecks SessionStart hook — non-blocking dep check + first-run npm ci sentinel guard.
# Per Phase 1 D-08 (CONTEXT.md): always exits 0; surfaces a single `Instadecks:` prefixed line.
set -euo pipefail
trap 'exit 0' ERR
umask 0077

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:?CLAUDE_PLUGIN_ROOT must be set}"
PLUGIN_DATA="${CLAUDE_PLUGIN_DATA:?CLAUDE_PLUGIN_DATA must be set}"
mkdir -p "$PLUGIN_DATA"

WARN=()
INFO=()

# ── Tool availability ─────────────────────────────────────────────
for tool in soffice pdftoppm node; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    WARN+=("missing $tool")
  fi
done

# ── Node version ──────────────────────────────────────────────────
if command -v node >/dev/null 2>&1; then
  NODE_MAJ=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)
  if [ "${NODE_MAJ:-0}" -lt 18 ] 2>/dev/null; then
    WARN+=("node ${NODE_MAJ} < 18")
  fi
fi

# ── npm ci sentinel ───────────────────────────────────────────────
SENTINEL="$PLUGIN_DATA/.npm-installed-sentinel"
LOCK_SHA=""
if [ -f "$PLUGIN_ROOT/package-lock.json" ]; then
  LOCK_SHA=$(shasum -a 256 "$PLUGIN_ROOT/package-lock.json" 2>/dev/null | awk '{print $1}' || echo "")
fi
PREV_SHA=$(cat "$SENTINEL" 2>/dev/null || echo "")
if [ -n "$LOCK_SHA" ] && [ "$LOCK_SHA" != "$PREV_SHA" ]; then
  if command -v npm >/dev/null 2>&1; then
    # Copy package manifests into PLUGIN_DATA so node_modules lands there
    # (not in PLUGIN_ROOT). npm ci requires package-lock.json adjacent to cwd.
    if cp "$PLUGIN_ROOT/package.json" "$PLUGIN_DATA/package.json" 2>/dev/null \
       && cp "$PLUGIN_ROOT/package-lock.json" "$PLUGIN_DATA/package-lock.json" 2>/dev/null \
       && ( cd "$PLUGIN_DATA" && npm ci --omit=dev ) >/dev/null 2>&1; then
      echo "$LOCK_SHA" > "$SENTINEL" 2>/dev/null || true
      INFO+=("install complete")
    else
      WARN+=("npm ci failed")
    fi
  else
    WARN+=("missing npm")
  fi
fi

# ── Font detect (install in Plan 07 once fonts bundled) ───────────
if command -v fc-list >/dev/null 2>&1; then
  if ! fc-list 2>/dev/null | grep -qi "IBM Plex Sans"; then
    WARN+=("install IBM Plex Sans manually: see assets/fonts/IBM_Plex_Sans/")
  fi
fi

# ── Summary ───────────────────────────────────────────────────────
if [ ${#WARN[@]} -eq 0 ]; then
  if [ ${#INFO[@]} -eq 0 ]; then
    echo "Instadecks: deps OK"
  else
    echo "Instadecks: deps OK (${INFO[*]})"
  fi
else
  echo "Instadecks: ${WARN[*]}"
fi

exit 0
