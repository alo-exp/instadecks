#!/usr/bin/env bash
# tools/lint-paths.sh — Hardcoded-path lint (Phase 1 D-02 / FOUND-02).
#
# Fails CI if any tracked file (excluding tests/fixtures/**, *.md docs,
# .silver-bullet.json (third-party tool config; JSON cannot host inline
# comments for the allowlist token), and lines bearing the trailing comment
# `# lint-allow:hardcoded-path`) reaches outside the plugin tree via
# /Users/, ~/.claude, /home/, or escaped C:\\.
#
# This is a CI tool (not a SessionStart hook), so we use `set -euo pipefail`
# and let errors bubble up. No `trap exit 0`.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

# `git ls-files -z | xargs -0 grep -nE` enumerates only tracked files.
# Trailing `|| true` keeps the pipeline alive when grep finds zero matches.
HITS=$(git ls-files -z \
  | xargs -0 grep -HInE '/Users/|~/\.claude|/home/|C:\\\\' 2>/dev/null \
  | grep -vE '^(tests/fixtures/|\.silver-bullet\.json:|.+\.md:)' \
  | grep -v '# lint-allow:hardcoded-path' \
  || true)

if [ -n "$HITS" ]; then
  echo "::error::Hardcoded paths found:"
  echo "$HITS"
  exit 1
fi
echo "Path lint OK"
