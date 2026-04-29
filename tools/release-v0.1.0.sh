#!/usr/bin/env bash
# tools/release-v0.1.0.sh — End-to-end v0.1.0 release automation.
#
# Modes:
#   bash tools/release-v0.1.0.sh                 # real run: gates → tag → push → marketplace PR
#   bash tools/release-v0.1.0.sh --dry-run       # gates run for real; tag/push/PR steps print DRY-RUN
#   STRICT=1 bash tools/release-v0.1.0.sh ...    # gate:fresh-install non-skippable when docker absent
#   INSTADECKS_RELEASE_SIMULATE=1 bash ... --dry-run   # short-circuit ALL gates to PLAN: lines (test-only)
#
# Gate ordering mirrors .github/workflows/ci.yml.
set -euo pipefail

DRY_RUN=0
STRICT=${STRICT:-0}
SIM=${INSTADECKS_RELEASE_SIMULATE:-0}
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    *) echo "release: unknown arg: $arg" >&2; exit 2 ;;
  esac
done

# In SIM mode (test only), force DRY_RUN=1 so destructive steps short-circuit too.
if [[ $SIM == 1 ]]; then DRY_RUN=1; fi

gate() {
  local label="$1"; shift
  if [[ $SIM == 1 ]]; then
    echo "PLAN: $label -> $*"
    return 0
  fi
  echo ">>> $label"
  "$@"
}

action() {
  local label="$1"; shift
  if [[ $DRY_RUN == 1 ]]; then
    echo "DRY-RUN: would $label -> $*"
    return 0
  fi
  echo "+++ $label"
  "$@"
}

# --- Pre-flight (skipped under SIM) ---
if [[ $SIM == 0 ]]; then
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "release: dirty working tree" >&2
    exit 1
  fi
  BRANCH=$(git rev-parse --abbrev-ref HEAD)
  if [[ "$BRANCH" != "main" ]]; then
    echo "release: not on main (HEAD=$BRANCH)" >&2
    exit 1
  fi
  if [[ $DRY_RUN == 0 ]]; then
    git fetch origin main >/dev/null
    if [[ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]]; then
      echo "release: HEAD diverges from origin/main" >&2
      exit 1
    fi
  fi
fi

# --- Gates 1-11 ---
gate "lint:paths"          bash tools/lint-paths.sh
gate "lint:enums"          node tools/lint-pptxgenjs-enums.js
gate "license-audit"       node tools/license-audit.js
gate "manifest-validator"  node tools/validate-manifest.js
gate "doc-size"            bash -c "node tools/lint-doc-size.js && node tools/lint-doc-size.js --orphans"
gate "test (c8 100%)"      npm test
gate "bats"                npm run test:bats
gate "activation-panel"    npm run gate:activation-panel
gate "permission-mode"     npm run gate:permission-mode

# --- Gate 12 — fresh-install (docker-conditional) ---
if [[ $SIM == 1 ]]; then
  echo "PLAN: fresh-install -> npm run gate:fresh-install (docker-conditional)"
elif command -v docker >/dev/null 2>&1; then
  gate "fresh-install" env RUN_DOCKER_TESTS=1 npm run gate:fresh-install
else
  if [[ $STRICT == 1 ]]; then
    echo "release: STRICT=1 + docker missing — fail" >&2
    exit 1
  fi
  echo "release: docker absent — gate:fresh-install SKIPPED (set STRICT=1 to require)"
fi

# --- Actions 13-17 (real run only; --dry-run prints DRY-RUN: lines) ---
TODAY=$(date +%Y-%m-%d)

action "flip STATE.md to released" \
  sed -i.bak 's/^Status:.*/Status: released/' .planning/STATE.md

action "prepend CHANGELOG entry" \
  bash -c "printf '## v0.1.0 — %s\n- First marketplace release; see .planning/RELEASE.md\n\n' '$TODAY' | cat - docs/CHANGELOG.md > /tmp/CHANGELOG.new && mv /tmp/CHANGELOG.new docs/CHANGELOG.md"

action "commit STATE + CHANGELOG" \
  git commit -am "release: v0.1.0"

# Signed-tag-with-fallback (W-1 contract): explicit conditional, no prose-only fallback.
if [[ $DRY_RUN == 1 ]]; then
  echo "DRY-RUN: would tag v0.1.0 -> git tag -s v0.1.0 (or -a fallback if no signing key)"
  echo "DRY-RUN: would push tag -> git push origin v0.1.0"
elif git config --get user.signingkey >/dev/null 2>&1; then
  echo "+++ tag v0.1.0 (signed)"
  git tag -s v0.1.0 -m "v0.1.0 — first marketplace release; see .planning/RELEASE.md"
  echo "+++ push commit"
  git push origin main
  echo "+++ push tag"
  git push origin v0.1.0
else
  echo "release: gpg signing key not configured — falling back to unsigned annotated tag" >&2
  echo "+++ tag v0.1.0 (unsigned)"
  git tag -a v0.1.0 -m "v0.1.0 — first marketplace release; see .planning/RELEASE.md"
  echo "+++ push commit"
  git push origin main
  echo "+++ push tag"
  git push origin v0.1.0
fi

action "submit marketplace PR" bash tools/submit-marketplace-pr.sh

echo "release: OK"
