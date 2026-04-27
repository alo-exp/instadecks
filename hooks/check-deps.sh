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
LOCK="$PLUGIN_ROOT/package-lock.json"
LOCK_SHA=""

# CR-03: detect-or-fallback for SHA hasher (some Linux distros lack `shasum`).
HASHER=""
if command -v shasum >/dev/null 2>&1; then
  HASHER="shasum -a 256"
elif command -v sha256sum >/dev/null 2>&1; then
  HASHER="sha256sum"
else
  WARN+=("missing shasum/sha256sum; cannot verify lockfile — npm install not run")
fi

if [ -n "$HASHER" ] && [ -f "$LOCK" ]; then
  LOCK_SHA=$($HASHER "$LOCK" 2>/dev/null | awk '{print $1}' || echo "")
fi
PREV_SHA=$(cat "$SENTINEL" 2>/dev/null || echo "")
if [ -n "$LOCK_SHA" ] && [ "$LOCK_SHA" != "$PREV_SHA" ]; then
  if command -v npm >/dev/null 2>&1; then
    # CR-04: concurrent-session race guard via atomic mkdir. If a sibling
    # session is already inside this block, mkdir fails and we skip cleanly.
    LOCK_DIR="$PLUGIN_DATA/.npm-install.lock"
    if mkdir "$LOCK_DIR" 2>/dev/null; then
      # Layered cleanup — preserve the original ERR-suppression contract while
      # ensuring the lock dir is removed on any exit path.
      trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT
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
      INFO+=("install in progress in another session; skipping")
    fi
  else
    WARN+=("missing npm")
  fi
fi

# ── Font detection + install (D-01) ───────────────────────────────
case "$(uname -s)" in
  Darwin)               FONT_DIR="$HOME/Library/Fonts" ;;
  Linux)                FONT_DIR="$HOME/.local/share/fonts" ;;
  MINGW*|CYGWIN*|MSYS*) FONT_DIR="" ;;
  *)                    FONT_DIR="" ;;
esac
if command -v fc-list >/dev/null 2>&1; then
  if ! fc-list 2>/dev/null | grep -qi "IBM Plex Sans"; then
    if [ -n "$FONT_DIR" ]; then
      if mkdir -p "$FONT_DIR" 2>/dev/null \
         && cp "$PLUGIN_ROOT/assets/fonts/IBM_Plex_Sans/"*.ttf "$FONT_DIR/" 2>/dev/null \
         && fc-cache -f >/dev/null 2>&1; then
        INFO+=("fonts installed")
      else
        WARN+=("font install failed; see assets/fonts/IBM_Plex_Sans/README.md")
      fi
    else
      WARN+=("install IBM Plex Sans manually: see \${CLAUDE_PLUGIN_ROOT}/assets/fonts/IBM_Plex_Sans/README.md")
    fi
  fi
fi

# ── Summary ───────────────────────────────────────────────────────
# Single line, always Instadecks:-prefixed. INFO is appended in parens so the
# install-complete signal is visible even when WARN is non-empty (e.g. fonts).
if [ ${#WARN[@]} -eq 0 ]; then
  HEAD="deps OK"
else
  HEAD="${WARN[*]}"
fi
if [ ${#INFO[@]} -eq 0 ]; then
  echo "Instadecks: ${HEAD}"
else
  echo "Instadecks: ${HEAD} (${INFO[*]})"
fi

exit 0
