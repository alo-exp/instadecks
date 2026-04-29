## [0.2.0] — 2026-04-30

### Added
- `/instadecks-update` command — self-update from GitHub releases, following topgun-update pattern; scoped `allowed-tools`, SHA security gate, stale registry pruning
- `docs/pre-release-quality-gate.md` — adapted from topgun quality gate, 4-stage release process
- `tools/audit-allowed-tools.js` now scans `commands/*.md` in addition to legacy `skills/*/SKILL.md`

### Fixed
- Auto-refine loop in `/instadecks-create` no longer skipped — removed "single-cycle" statement that caused agents to bypass the loop
- Post-loop outputs mirrored to `/tmp/<project_slug>/` with clickable `file://` URIs for macOS terminal
- CI ENOENT failures from `skills/*/SKILL.md` path refs after skills→commands migration (5 test files updated)

### Changed
- All `/instadecks:name` colon-namespaced references updated to `/instadecks-name` hyphen style across docs and references
- `plugin.json` version bumped to 0.2.0
- README updated: version badge, 6-command table, architecture description
- `docs/ARCHITECTURE.md` updated to reflect commands/ layout and 6 commands

---

## [0.1.0] — 2026-04-29

- First marketplace release; see .planning/RELEASE.md

# Task Log

> Rolling log of completed tasks. One entry per non-trivial task, written at step 15.
> Most recent entry first.

---

<!-- Entry format:
## YYYY-MM-DD — task-slug
**What**: one sentence description
**Commits**: abc1234, def5678
**Skills run**: brainstorming, write-spec, security, ...
**Virtual cost**: ~$0.04 (Sonnet, medium complexity)
**Knowledge**: updated knowledge/YYYY-MM.md (sections) | no changes
**Lessons**: updated lessons/YYYY-MM.md (categories) | no changes
-->

<!-- ENTRIES BELOW — newest first -->

## 2026-04-29 — Phase 10 closed: v0.1.0 release-automation chain live

- 10-01: backlog defects HARD-01/02/03 closed (enum-lint typo detection, runCreate cwd lock, license-audit OK-path coverage)
- 10-02: doc-scheme.md compliance — knowledge/lessons populated, SECURITY.md + CONTRIBUTING.md scaffolded, lint-doc-size.js + CI Gate 7 wired
- 10-03: activation-panel + permission-mode automation (Jaccard scorer + script walker)
- 10-04: fresh-install Docker harness (Linux runner; Mac+Win deferred to v1.x)
- 10-05: marketplace-PR + release-v0.1.0 scripts + npm release/release:dry-run
- 10-06: release dry-run E2E integration test (opt-in via RUN_RELEASE_E2E=1)

## 2026-04-29 — Phase 10: Hardening, Documentation Compliance, and Release Automation

**What**: Closes the v0.1.0 release-readiness gate by hardening the build, bringing documentation to 100% compliance with `docs/doc-scheme.md`, and wiring release automation.

**Plans (6)**:
- **10-01** — Runtime hardening: `.runCreate.lock` for parallel `runCreate` (HARD-02)
- **10-02** — Doc-scheme compliance: knowledge/lessons populated, SECURITY.md + CONTRIBUTING.md scaffolded, `tools/lint-doc-size.js` + CI Gate 7 (HARD-04..HARD-09)
- **10-03** — Skill activation panel gate: 10 prompts × 4 skills, ≥ 8/10 each (`npm run gate:activation-panel`)
- **10-04** — Permission-mode audit gate (`npm run gate:permission-mode`)
- **10-05** — Fresh-machine install gate (`npm run gate:fresh-install`)
- **10-06** — Release automation: `npm run release:dry-run`, `npm run release`

**Skills run**: gsd-execute-phase, gsd-execute-plan

