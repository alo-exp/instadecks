#!/usr/bin/env bash
# tools/submit-marketplace-pr.sh — gh-CLI driven marketplace PR submission.
# Usage:
#   bash tools/submit-marketplace-pr.sh             # real run
#   bash tools/submit-marketplace-pr.sh --simulate  # print PLAN:, no side effects, no network
set -euo pipefail

SIMULATE=0
for arg in "$@"; do
  case "$arg" in
    --simulate) SIMULATE=1 ;;
    *) echo "submit-marketplace-pr: unknown arg: $arg" >&2; exit 2 ;;
  esac
done

plan() { echo "PLAN: $*"; }
run() {
  if [[ $SIMULATE == 1 ]]; then
    plan "$*"
  else
    "$@"
  fi
}

# --- Pre-flight ---
if [[ $SIMULATE == 0 ]]; then
  command -v gh >/dev/null || { echo "submit-marketplace-pr: gh not installed" >&2; exit 1; }
  gh auth status >/dev/null 2>&1 || { echo "submit-marketplace-pr: gh not authenticated" >&2; exit 1; }
fi

PATCH_FILE=".planning/marketplace-patch.json"
PR_BODY_FILE="$PWD/.planning/marketplace-pr.md"
[[ -f "$PATCH_FILE" ]] || { echo "submit-marketplace-pr: missing $PATCH_FILE" >&2; exit 1; }
[[ -f "$PR_BODY_FILE" ]] || { echo "submit-marketplace-pr: missing $PR_BODY_FILE" >&2; exit 1; }

# Step 1: fork (idempotent — gh skips if fork exists)
run gh repo fork --clone=false alo-labs/claude-plugins

# Step 2: discover fork owner
if [[ $SIMULATE == 1 ]]; then
  FORK_OWNER="<fork-owner>"
else
  FORK_OWNER=$(gh api user --jq .login)
fi

# Step 3: clone fork to temp dir
TMPDIR_FORK=$(mktemp -d -t marketplace-fork-XXXXXX)
run git clone "https://github.com/${FORK_OWNER}/claude-plugins.git" "$TMPDIR_FORK"

# Step 4: apply patch
if [[ $SIMULATE == 1 ]]; then
  plan "node -e <apply $PATCH_FILE to $TMPDIR_FORK/<target_file>>"
else
  TMPDIR_OVERRIDE="$TMPDIR_FORK" node -e "$(cat <<'EOF'
const fs = require('fs');
const path = require('path');
const patch = JSON.parse(fs.readFileSync('.planning/marketplace-patch.json', 'utf8'));
const target = path.join(process.env.TMPDIR_OVERRIDE, patch.target_file);
const cur = JSON.parse(fs.readFileSync(target, 'utf8'));
if (Array.isArray(cur.plugins)) {
  cur.plugins.push(patch.entry);
} else {
  throw new Error('marketplace target schema unexpected: no top-level plugins[] array');
}
fs.writeFileSync(target, JSON.stringify(cur, null, 2) + '\n');
console.log('patch applied: ' + target);
EOF
)"
fi

# Step 5-7: branch, commit, push
BRANCH="add-instadecks-v0.1.0"
run git -C "$TMPDIR_FORK" checkout -b "$BRANCH"
run git -C "$TMPDIR_FORK" add -A
run git -C "$TMPDIR_FORK" commit -m "Add instadecks plugin v0.1.0"
run git -C "$TMPDIR_FORK" push -u origin "$BRANCH"

# Step 8: open PR
run gh pr create --repo alo-labs/claude-plugins \
  --title "Add instadecks plugin v0.1.0" \
  --body-file "$PR_BODY_FILE" \
  --head "${FORK_OWNER}:${BRANCH}"

# Step 9: capture PR URL into RELEASE.md (real run only)
if [[ $SIMULATE == 0 ]]; then
  PR_URL=$(gh pr list --repo alo-labs/claude-plugins --head "${FORK_OWNER}:${BRANCH}" --json url --jq '.[0].url' 2>/dev/null || echo "")
  if [[ -z "$PR_URL" ]]; then
    PR_URL="<URL not available — check gh manually>"
  fi
  printf "\n### Marketplace PR\n%s\n" "$PR_URL" >> .planning/RELEASE.md
  echo "submit-marketplace-pr: PR -> $PR_URL"
fi

echo "submit-marketplace-pr: OK"
