#!/usr/bin/env bash
# tools/lint-paths.sh — Hardcoded-path lint (Phase 1 D-02 / FOUND-02).
#
# Fails CI if any tracked file reaches outside the plugin tree via
# /Users/, ~/.claude, /home/, or escaped C:\\ (four-backslash JS-string form).
#
# Excluded paths (by-purpose contents that legitimately hold the patterns):
#   - tests/fixtures/**         — frozen baseline data
#   - tests/path-lint.test.js   — exercises the lint itself; its strings ARE
#                                  the negative test cases
#   - tools/lint-paths.sh       — this script's own grep regex literally names
#                                  the patterns it searches for
#   - .silver-bullet.json       — third-party tool config (silver-bullet state
#                                  paths under ~/.claude); JSON cannot host the
#                                  inline `# lint-allow:hardcoded-path` token
#   - README.md, HANDOFF.md, CLAUDE.md, silver-bullet.md, NOTICE, LICENSE
#                                — top-level narrative docs
#   - docs/**/*.md              — narrative discussion of the patterns
#   - .planning/**/*.md         — planning narrative
# NOTE: skills/**/*.md (incl. SKILL.md) and tests/**/*.md DO get linted —
# they are operational/agent-facing artifacts.
#
# All other files: a line opts in via the trailing comment
# `# lint-allow:hardcoded-path`.
#
# This is a CI tool (not a SessionStart hook), so we use `set -euo pipefail`
# and let errors bubble up. No `trap exit 0`.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

# `git ls-files -z | xargs -0 grep -nE` enumerates only tracked files.
# Trailing `|| true` keeps the pipeline alive when grep finds zero matches.
HITS=$(git ls-files -z \
  | xargs -0 grep -HInE '/Users/|~/\.claude|/home/|C:\\\\' 2>/dev/null \
  | grep -vE '^(tests/fixtures/|tests/path-lint\.test\.js:|tools/lint-paths\.sh:|\.silver-bullet\.json:|(^|/)README\.md:|(^|/)HANDOFF\.md:|(^|/)CLAUDE\.md:|(^|/)silver-bullet\.md:|(^|/)NOTICE:|(^|/)LICENSE:|docs/.+\.md:|\.planning/.+\.md:)' \
  | grep -v '# lint-allow:hardcoded-path' \
  || true)

if [ -n "$HITS" ]; then
  echo "::error::Hardcoded paths found:"
  echo "$HITS"
  exit 1
fi
echo "Path lint OK"
