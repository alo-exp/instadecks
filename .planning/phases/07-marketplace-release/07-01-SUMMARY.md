---
phase: 07
plan: 01
subsystem: marketplace-release
status: complete
completed: 2026-04-28
tags: [doctor, ci, audit, activation-panel, marketplace]
requirements: [DIST-01, DIST-02, DIST-08]
key-files:
  created:
    - tools/audit-allowed-tools.js
    - tests/audit-allowed-tools.test.js
    - skills/doctor/SKILL.md
    - skills/doctor/scripts/check.sh
    - tests/activation-panel.md
    - tests/activation-results.md
  modified:
    - package.json
commits:
  - 7ab0664: feat(07-01) audit-allowed-tools.js CI gate
  - 9d0a1a4: feat(07-01) /instadecks:doctor self-check skill
  - a074827: docs(07-01) 40-prompt activation panel + results template
---

# Phase 7 Plan 01: Marketplace-Readiness Scaffold Summary

Phase 7 Wave 1 — stood up the three CI/release scaffolds Plan 07-03 needs to verify v0.1.0 marketplace readiness empirically: a 5th user-invocable `/instadecks:doctor` skill, a `tools/audit-allowed-tools.js` CI gate that rejects unscoped Bash globs in any SKILL.md frontmatter, and a 40-prompt activation panel with empty scoring template ready for the human verification checkpoint.

## What Shipped

- **`tools/audit-allowed-tools.js` (D-08)** — pure-stdlib Node CLI; parses SKILL.md frontmatter, lints `allowed-tools` entries, exits 1 on `Bash(*)`, bare `Bash`, `Bash(<cmd>)` without `:*`, or missing key. Globs `skills/*/SKILL.md` automatically — picks up new skills with no config. Exposed via `npm run audit:allowed-tools`.
- **`tests/audit-allowed-tools.test.js`** — 6 node:test cases (1 green, 4 red modes, 1 run-aggregator). All pass.
- **`/instadecks:doctor` (D-03)** — 5th user-invocable skill. SKILL.md description is imperative, keyword-front-loaded, ≤ 1024 chars. `scripts/check.sh` probes node ≥ 18, soffice, pdftoppm, pinned `pptxgenjs@4.0.1` under `${CLAUDE_PLUGIN_DATA}/node_modules`, and IBM Plex Sans via fc-list (soft on missing fc-list). Per-OS install hints (brew/apt/choco) on every MISSING row. Exit 0 green / 1 red.
- **`tests/activation-panel.md`** — 4 skills × 10 prompts = 40 total. 8 canonical keyword-front-loaded prompts per skill + 2 deliberately ambiguous edge cases per skill (e.g. "Look at my deck", "Read my deck", "Build a deck", "Comment my slides") to stress-test description quality.
- **`tests/activation-results.md`** — empty scoring matrix template for the human tester to fill in Plan 07-03.

## Verification

- `node --test tests/audit-allowed-tools.test.js` → 6/6 pass.
- `node tools/audit-allowed-tools.js` → `audit-allowed-tools: OK (5 SKILL.md files passed)` — covers annotate, review, create, content-review, doctor.
- `bash skills/doctor/scripts/check.sh` → exits 0 with all 5 probes green on dev machine (node v25.6.0, soffice + pdftoppm + pptxgenjs 4.0.1 + IBM Plex Sans all OK).
- `bash tools/lint-paths.sh` → no hardcoded paths.
- `grep -c "^[0-9]\+\. " tests/activation-panel.md` → 40 numbered prompts.

## Deviations from Plan

None. Plan executed exactly as written. The Node 25.6 parser flagged a subtle template-literal-in-CommonJS edge case in the first audit-tool draft; rewrote with string concat + plain function expressions and shipped clean. Not a deviation in the rule sense — same artifact, same behavior, same tests pass.

## Self-Check: PASSED

- tools/audit-allowed-tools.js → FOUND
- tests/audit-allowed-tools.test.js → FOUND
- skills/doctor/SKILL.md → FOUND
- skills/doctor/scripts/check.sh → FOUND (executable bit set)
- tests/activation-panel.md → FOUND (40 prompts)
- tests/activation-results.md → FOUND (empty template)
- Commits 7ab0664, 9d0a1a4, a074827 → all present in git log.
