---
spec-version: 1
status: Draft
jira-id: ""
figma-url: ""
source-artifacts:
  - .planning/ROADMAP.md (Phase 10 entry)
  - .planning/RELEASE.md
  - docs/doc-scheme.md
  - .planning/phases/01-plugin-foundation-contract-ci-gates/ through .planning/phases/09-design-variety-and-brief-polymorphism/
created: 2026-04-29
last-updated: 2026-04-29
---

# Phase 10 — Hardening, Documentation Compliance, and Release Automation — Spec

## Overview

Instadecks v0.1.0 is functionally release-ready (8 phases shipped, 2 consecutive clean live-E2E iterations, 100% test coverage, 1133 tests). Five gates explicitly carved out of automation per Phase 7 D-06 still block the v0.1.0 tag push: activation panel, permission-mode matrix, fresh-install Mac+Win, marketplace PR, tag push. In addition, 4 backlog defects remain (`pres.shapes.<KEY>` typo lint, soffice cold-start race, license-audit.js test gap, GSD/SB protection-layer issues already filed externally as alo-exp/silver-bullet#93 and the new SDK mismatch issue) and project documentation is not yet 100% compliant with `docs/doc-scheme.md`. Phase 10 closes all three buckets so v0.1.0 ships with zero human-in-the-loop steps.

## User Stories

- As the project maintainer, I want to run `npm run release:dry-run` and see every previously-human gate execute automatically and pass, so that I can `git tag v0.1.0 && git push origin v0.1.0` with confidence.
- As a future contributor, I want documentation that reflects every shipped phase (architecture, testing strategy, knowledge captures, lessons) per `docs/doc-scheme.md`, so that I can onboard without reading 10 phase directories.
- As a downstream consumer of the marketplace plugin, I want the marketplace PR submitted automatically with the prepared body so that v0.1.0 reaches `alo-labs/claude-plugins` without manual gh-CLI work.
- As a CI maintainer, I want the c8 100% coverage gate to pass without exclusions so that no class of code (including the previously-deferred `tools/license-audit.js:133-134` happy-path) escapes the gate.

## UX Flows

**Primary flow — Automated release dry-run:**

1. Maintainer runs `npm run release:dry-run`
2. System runs `c8 --100 --check-coverage npm test` — gates A
3. System runs `npm run test:bats` — gate B
4. System runs `npm run test:e2e` (locally; skipped under CI=true) — gate C
5. System runs `npm run gate:activation-panel` — programmatic skill-activation match against the 40-prompt panel; asserts ≥8/10 per skill
6. System runs `npm run gate:permission-mode` — parses each SKILL.md `allowed-tools`, validates against actual `Bash(<tool>:*)` invocations in the script, asserts coverage in default + dontAsk simulation modes
7. System runs `npm run gate:fresh-install` — Docker container with isolated `CLAUDE_PLUGIN_ROOT/CLAUDE_PLUGIN_DATA`, exercises all 4 user-invocable skills against a canonical brief, verifies output bytes
8. System prepares marketplace PR body and tag annotation but does NOT push
9. System reports green or fail
10. On green, maintainer runs `npm run release` — same chain plus gh marketplace PR submission, signed tag, and push

## Acceptance Criteria

- [ ] **AC-01 (HARD-01)**: `tools/lint-pptxgenjs-enums.js` extended to detect `pres.shapes.<KEY>` references where `<KEY>` is not an exported enum (e.g., `RECT` instead of `RECTANGLE`); CI gate fails on typo'd usage with actionable error + suggested correction
- [ ] **AC-02 (HARD-02)**: `runCreate` parallel invocations against the same project tree no longer race on soffice user-profile lock; serializes via flock-style cwd lock with 30-second timeout + soft-fail
- [ ] **AC-03 (HARD-03)**: `tools/license-audit.js:133-134` (CLI happy-path stdout branch) covered by direct unit test; `npx c8 --100 --check-coverage npm test` exits 0 across ALL files (no exclusion list residuals)
- [ ] **AC-04 (HARD-04)**: All required `docs/doc-scheme.md` core files present and current: ARCHITECTURE.md, TESTING.md, CHANGELOG.md, knowledge/INDEX.md, doc-scheme.md
- [ ] **AC-05 (HARD-05)**: `docs/knowledge/2026-04.md` populated with non-trivial entries from Phases 1-10 (≥10 entries: architecture patterns, key decisions, recurring patterns, known gotchas)
- [ ] **AC-06 (HARD-06)**: `docs/lessons/2026-04.md` populated with portable lessons (≥6 entries: stack:pptxgenjs, practice:tdd-with-mocked-llm, practice:auto-refine-loop, design:cookbook-variants, devops:c8-100-gate, design:design-dna-picker)
- [ ] **AC-07 (HARD-07)**: All `docs/*.md` ≤500 lines; all `docs/knowledge/*.md` and `docs/lessons/*.md` ≤300 lines; size-cap check enforced via `tools/lint-doc-size.js` and CI gate
- [ ] **AC-08 (HARD-08)**: `docs/knowledge/INDEX.md` links every doc under `docs/`; CI gate verifies no orphans
- [ ] **AC-09 (HARD-09)**: New `docs/SECURITY.md` (post-audit) and `docs/CONTRIBUTING.md` scaffolded
- [ ] **AC-10 (HARD-10)**: `tests/automation/activation-panel.test.js` simulates Claude Code skill-activation matching against the 40-prompt panel using a deterministic description-keyword scorer; passes ≥8/10 per skill (4 skills × 10 prompts); runs in CI <30s
- [ ] **AC-11 (HARD-11)**: `tests/automation/permission-mode.test.js` parses each SKILL.md `allowed-tools` list, validates against actual `Bash(<tool>:*)` invocations in `scripts/` and `lib/`, asserts coverage in default + dontAsk simulation modes; replaces manual `tests/PERMISSION-MODE.md` runs
- [ ] **AC-12 (HARD-12)**: `tests/automation/fresh-install.test.js` exercises `/plugin install` flow against an isolated `CLAUDE_PLUGIN_ROOT/CLAUDE_PLUGIN_DATA` via Docker; runs all 4 user-invocable skills against canonical brief; produces real PPTX/PDF/findings/annotated artifacts; verifies bytes; passes on Linux runner
- [ ] **AC-13 (HARD-13)**: `tools/submit-marketplace-pr.sh` uses `gh` to fork `alo-labs/claude-plugins`, applies the patch from `.planning/marketplace-patch.json`, opens PR with the body from `.planning/marketplace-pr.md`, captures URL into `.planning/RELEASE.md`
- [ ] **AC-14 (HARD-14)**: `tools/release-v0.1.0.sh` runs all gates (AC-01..AC-12) and on green flips STATE.md to `released`, generates CHANGELOG entry, signs and pushes tag
- [ ] **AC-15 (HARD-15)**: `npm run release:dry-run` runs the full automated chain without pushing; on success, `npm run release` does the real thing

## Assumptions

- [ASSUMPTION: Skill-activation matching is reproducible enough for a deterministic test harness given fixed description text + prompt + matcher rules. | Status: Accepted | Owner: maintainer — if matcher behavior diverges from the real Claude Code activation engine in production, AC-10 may need to be augmented with a periodic real-LLM smoke test]
- [ASSUMPTION: Fresh-install Docker harness on Linux is sufficient evidence for cross-platform release — Mac+Windows runner variants are documented as platform-specific concerns but not required for v0.1.0 tag push. | Status: Accepted | Owner: maintainer — Mac native install is verified by 2 consecutive clean live-E2E iterations on this machine; Windows install is best-effort]
- [ASSUMPTION: `alo-labs/claude-plugins` accepts gh-CLI-driven PRs from forks. | Status: Accepted | Owner: maintainer]
- [ASSUMPTION: Documentation 100% compliance per doc-scheme.md is interpreted as "all required core files present and current; size caps respected; INDEX.md links every doc" — not "every line of code referenced in a knowledge entry". | Status: Accepted | Owner: maintainer]

## Open Questions

- [ ] None at this time. All open questions from prior phases are resolved or scoped out as deferred (v1.x or v2 per `Out of Scope` sections of phase CONTEXT files).

## Out of Scope

- Mac and Windows native fresh-install runners in CI (Linux Docker only for v0.1.0; native runners deferred to v1.x)
- Marketplace PR review/merge (gh-CLI submits; alo-labs maintainer reviews and merges — not in our automation scope)
- Full real-Claude-API activation matching (deterministic-keyword matcher is sufficient evidence per AC-10 assumption; real-API smoke test deferred)
- Bundle size minimization (current ~1.5MB Plex font bundle is accepted)
- pptxgenjs upgrade beyond 4.0.1 (locked invariant per CLAUDE.md)
- Adding additional cookbook recipes / palette / typography / motif entries beyond Phase 9's 14 / 9 / 9 (deferred to v1.x)

## Implementations

<!-- Populated automatically by pr-traceability.sh hook post-merge. -->
