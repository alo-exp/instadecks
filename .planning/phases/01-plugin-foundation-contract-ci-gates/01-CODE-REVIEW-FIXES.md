# Phase 1 Code Review — Fix Application Summary

Applied 5 ISSUE-level fixes from the Phase 1 code review on 2026-04-27, working
directly on `main` with one commit per fix. The 5 INFO-level items (CR-06
through CR-10) are deferred to a v1.x polish pass — they are defense-in-depth
hardening notes, not correctness blockers.

## Status Table

| CR ID | Severity | Status                | Commit    | Notes                                                            |
| ----- | -------- | --------------------- | --------- | ---------------------------------------------------------------- |
| CR-01 | ISSUE    | FIXED                 | `91d4abf` | Tightened `tools/lint-paths.sh` exclusion; SKILL.md now linted   |
| CR-02 | ISSUE    | FIXED                 | `42c3757` | Validator now rejects implicit folded YAML continuations         |
| CR-03 | ISSUE    | FIXED                 | `2b5aa7d` | `check-deps.sh` falls back to `sha256sum` when `shasum` absent   |
| CR-04 | ISSUE    | FIXED                 | `b4f72cb` | Atomic-mkdir lock guards concurrent `npm ci` invocations         |
| CR-05 | ISSUE    | FIXED                 | `6fb93c8` | `ci.yml` discovers tests via `find` glob; new tests auto-pickup  |
| CR-06 | INFO     | DEFERRED (v1.x)       | n/a       | Hardening polish — low impact, no correctness gap                |
| CR-07 | INFO     | DEFERRED (v1.x)       | n/a       | Hardening polish — defense-in-depth                              |
| CR-08 | INFO     | DEFERRED (v1.x)       | n/a       | Hardening polish — cosmetic / observability                      |
| CR-09 | INFO     | DEFERRED (v1.x)       | n/a       | Hardening polish — defense-in-depth                              |
| CR-10 | INFO     | DEFERRED (v1.x)       | n/a       | Hardening polish — observability nicety                          |

## Per-Fix Notes

### CR-01 — Lint exclusion tightened

`.+\.md:` exempted ALL Markdown including agent-facing `skills/*/SKILL.md`.
Replaced with a targeted exclusion list (`README.md`, `HANDOFF.md`,
`CLAUDE.md`, `silver-bullet.md`, `NOTICE`, `LICENSE`, `docs/**/*.md`,
`.planning/**/*.md`). SKILL.md and test `*.md` files are now linted.
Regression subtest added.

### CR-02 — Implicit folded YAML continuation rejection

PC-05 only rejected EXPLICIT block scalars (`|` / `>`). Implicit indented
continuations (next line starts with whitespace) are also folded by real YAML
parsers into the description value. Validator now checks `descLineIdx + 1`
against the column-0-key / closing-`---` / EOF criteria and reports a
`single-line; indented continuation detected on line N+1` error otherwise.

### CR-03 — Hasher detect-or-fallback

`shasum` is missing on some minimal Linux images. Hook now picks
`shasum -a 256` → `sha256sum` → empty (with a `WARN` and the npm-ci block
skipped) so behavior is observable instead of silently broken.

### CR-04 — Concurrent-session race guard

Two SessionStart hooks running concurrently could race on `npm ci` and corrupt
`node_modules`. Wrapped the block with an atomic-mkdir lock at
`$PLUGIN_DATA/.npm-install.lock`. Loser logs an INFO line and skips. EXIT trap
ensures the lock dir is removed; the file-level `trap 'exit 0' ERR` is
preserved.

### CR-05 — Glob test discovery in CI

Hardcoded 7-file argv to `node --test` required a `ci.yml` edit every time a
new test file landed. Replaced with
`find tests -maxdepth 2 -name '*.test.js' -print0 | xargs -0 node --test`.
All 7 existing tests still execute; new test drops under `tests/` are picked
up automatically.

## Deferred (CR-06 .. CR-10)

INFO-level items are tracked but intentionally not blocking the v0.1.0 release.
They will be reconsidered during the v1.x polish pass; rationale per item:

- **Defense-in-depth** rather than active correctness gaps — no observed
  failure mode in the current pipeline.
- **Low blast radius** — hardening sharpens existing-but-working behavior.
- **Cosmetic / observability** improvements that don't change CI outcomes.

Re-triage during v1.x. If any INFO item escalates (e.g. a real Linux runner
trips a brittle check), promote to ISSUE and patch.

## Verification

After each fix:

- CR-01 → `node --test tests/path-lint.test.js` (9/9 pass; new SKILL.md
  regression subtest green) and `bash tools/lint-paths.sh` clean against
  the real repo (top-level `CLAUDE.md`, `silver-bullet.md` exempted as
  narrative docs).
- CR-02 → `node --test tests/manifest-validator.test.js` (8/8 pass; new
  implicit-fold subtest green) and `node tools/validate-manifest.js` clean.
- CR-03 / CR-04 → `node --test tests/check-deps.test.js` (7/7 pass).
- CR-05 → `find tests -maxdepth 2 -name '*.test.js' -print0` enumerates
  the same 7 files the previous explicit list captured.

All Phase 1 gates continue to pass on `main`.
