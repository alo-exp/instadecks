---
phase: 01-plugin-foundation-contract-ci-gates
plan: 04
subsystem: ci-gates
tags: [validator, manifest, ci, FOUND-08, D-04, PC-05]
requires:
  - .claude-plugin/plugin.json (Plan 01)
  - skills/*/SKILL.md (Plan 01)
provides:
  - tools/validate-manifest.js
  - tests/manifest-validator.test.js
affects:
  - CI pipeline (consumed by future Phase 1 CI workflow plan)
tech-stack:
  added: []
  patterns:
    - "Zero-dep Node validator using node:fs + node:path"
    - "Hermetic tests via fs.mkdtempSync + spawnSync per subtest"
key-files:
  created:
    - tools/validate-manifest.js
    - tests/manifest-validator.test.js
  modified: []
decisions:
  - "PC-05 multi-line block-scalar rejection runs BEFORE length/first-word checks (early return) so those checks can safely assume a single-line scalar."
  - "Imperative-verb heuristic uses a stop-word denylist (a/an/the/this/tool/skill/plugin) rather than a verb allowlist — matches D-04's deferred description-quality scoring posture."
  - "user-invocable: false skills downgrade the first-word rule to an info log on stdout (no exit 1). All current Instadecks skills are user-invocable so this is dormant but documented."
metrics:
  duration: ~6 min
  completed: 2026-04-27
---

# Phase 1 Plan 04: Manifest Validator Summary

Bespoke Node validator for `.claude-plugin/plugin.json` (D-04) plus a 7-subtest hermetic suite. Validates manifest shape (kebab-case name, semver, license string), component-path resolution (skills/commands/agents/hooks/mcpServers), and skill-description quality (≤1024 chars, single-line, imperative-verb opener) — with PC-05 hard-rejection of YAML block scalars (`|` / `>`) gating before the length/first-word checks.

## What Was Built

### `tools/validate-manifest.js` (179 LOC, executable)
- Zero deps: `node:fs`, `node:path` only.
- Accepts optional first arg as plugin root (defaults to repo root via `__dirname/..`).
- Collects all errors, prints each as `<file>: <message>` to stderr, exits 1 on any error; otherwise prints `Manifest OK` and exits 0.
- Validations:
  - **(a) Shape:** `name` required + kebab-case (`/^[a-z][a-z0-9-]*$/`); `version` if set must match `/^\d+\.\d+\.\d+/`; `license` if set must be a non-empty string.
  - **(b) Component paths:** for each of `skills`, `commands`, `agents`, `hooks`, `mcpServers` — when explicitly set as a string path, verifies via `fs.existsSync`; supports array-of-objects-with-path form too.
  - **(c) Skill descriptions:** iterates `<skillsDir>/*/SKILL.md`, parses YAML frontmatter, applies the four rules (block-scalar reject → length → first-word → user-invocable gate).

### `tests/manifest-validator.test.js` (187 LOC, 7 subtests)
All hermetic — each test builds a fresh temp tree with `fs.mkdtempSync`, runs the validator via `spawnSync`, and cleans up. Subtests:
1. Valid manifest passes (exit 0, "Manifest OK")
2. Rejects `name: "Instadecks"` (capital I) — stderr mentions "kebab-case"
3. Rejects `version: "1.0"` — stderr mentions "semver"
4. Rejects 1100-char description — stderr mentions "1024"
5. Rejects description starting with "The" — stderr mentions "imperative verb"
6. Rejects `skills: "./does-not-exist/"` — stderr mentions the path
7. **PC-05:** Rejects both `description: |` and `description: >` block scalars in a single subtest (two sub-assertions) — stderr mentions "single-line" / "block scalar"

## Verification

```
$ node tools/validate-manifest.js
Manifest OK

$ node --test tests/manifest-validator.test.js
✔ valid manifest passes (86ms)
✔ rejects non-kebab-case name (85ms)
✔ rejects bad semver (90ms)
✔ rejects skill description > 1024 chars (82ms)
✔ rejects skill description starting with "the" (84ms)
✔ rejects missing component path when explicitly set (84ms)
✔ rejects multi-line description block scalar (PC-05) (172ms)
ℹ tests 7  pass 7  fail 0
```

The validator runs clean against the live repo (`.claude-plugin/plugin.json` + the four scaffolded skills from Plan 01).

## Deviations from Plan

None — plan executed exactly as written. Plan-specified PC-05 ordering (block-scalar reject before length/first-word checks) was implemented as an early `return` after pushing the block-scalar error so subsequent checks never see a multi-line `description:` value.

## Commits

- `605d258` feat(01-04): add bespoke manifest validator (D-04)
- `c0706c8` test(01-04): add manifest validator unit tests with PC-05 coverage

## Self-Check: PASSED

- FOUND: tools/validate-manifest.js (executable bit set)
- FOUND: tests/manifest-validator.test.js
- FOUND commit: 605d258
- FOUND commit: c0706c8
- Live repo validation: `Manifest OK`
- Test suite: 7/7 pass

## EXECUTION COMPLETE
