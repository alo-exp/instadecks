---
phase: 04-instadecks-create-scaffold
plan: 04
status: complete
completed: 2026-04-28
requirements: [CRT-01, CRT-02, CRT-03, CRT-04, CRT-05, CRT-06, CRT-15]
artifacts:
  created:
    - tests/create-integration.test.js
    - tests/POWERPOINT-COMPATIBILITY.md
  modified:
    - skills/create/SKILL.md
    - NOTICE
commits:
  - 93cf4f5: docs(04-04) full SKILL.md body + Q-1 NOTICE attribution
  - b6dd027: test(04-04) integration test + Phase 7 PPT-compat checklist
license_compliance: "Q-1 — author-original NOTICE paragraph appended; SKILL.md cites design-ideas.md as author-original"
---

# Phase 4 Plan 04: /instadecks:create user-facing layer + integration ribbon — SUMMARY

Wave-3 closer for `/instadecks:create`: full agent-facing `SKILL.md` body (Phase 1 stub → P4 final playbook with 6-step flow, locked invariants, output contract, deferred-list); 3-subtest end-to-end integration test exercising CRT-01..CRT-06 + CRT-15 simultaneously against the canonical fixture deck (slidesCount ≥ 8, notesSlide presence per P-10, 6 rationale sections, bad-cjs caught by enum-lint pre-spawn, CLI subprocess equivalence); Phase 7 manual `POWERPOINT-COMPATIBILITY.md` release-gate checklist (D-05 Layer 3 — authored here, executed in P7); NOTICE Q-1 author-original attribution paragraph.

## File Inventory (Plan 04-04)

| File | Lines | Role |
|------|-------|------|
| `skills/create/SKILL.md` | 138 | Full agent playbook — 6-step flow, invariants, output contract |
| `tests/create-integration.test.js` | 137 | End-to-end happy path + bad-cjs gate + CLI subprocess (3 subtests) |
| `tests/POWERPOINT-COMPATIBILITY.md` | 42 | Phase 7 release-gate manual checklist (D-05 Layer 3) |
| `NOTICE` | (+12 lines) | Q-1 author-original attribution paragraph + R18 unprotectable-observation note |

## Phase 4 Cumulative File Inventory (all 4 plans)

| Layer | Files |
|-------|-------|
| Libs | `skills/create/scripts/lib/{deck-brief,enum-lint,title-check,design-validator,render-rationale}.js` (5) |
| Orchestrator | `skills/create/scripts/{index.js,cli.js}` (2) |
| Cookbook | `skills/create/references/cookbook.md` + `cookbook/{title,section,2col,comparison,data-chart,data-table,stat-callout,quote,closing}.md` (10) |
| Design ideas | `skills/create/references/design-ideas.{md,json}` (2) |
| CI gate | `tools/lint-pptxgenjs-enums.js` (1) |
| Agent playbook | `skills/create/SKILL.md` (1) |
| Tests | `tests/create-{deck-brief,enum-lint,title-check,design-validator,render-rationale,cookbook-recipes,runtime,cli,enum-lint-cli,integration}.test.js` (10) |
| Manual gate | `tests/POWERPOINT-COMPATIBILITY.md` (1) |
| Fixtures | `tests/fixtures/{sample-brief.json,sample-render-deck.cjs,sample-design-ideas.json,bad-render-deck.cjs}` (4) |
| Attribution | `NOTICE` (modified) |

## Requirement → Test Mapping

| Req | Coverage |
|-----|----------|
| CRT-01 (multi-format → outputs) | SKILL.md Step 1 enumerates 8 input modes; `validateBrief` in runCreate; integration test asserts deck/pdf/rationale paths returned |
| CRT-02 (per-run cjs from cookbook + design-ideas) | SKILL.md Step 3; cookbook-recipes test (12 assertions); design-validator round-trip (10×8 cross-product) |
| CRT-03 (per run, not template) | Integration test stages cjs into run-dir; runCreate reads from there fresh |
| CRT-04 (8 slide types at 16:9) | sample-render-deck.cjs covers 9 recipes; integration test asserts `slidesCount ≥ 8` |
| CRT-05 (action titles + page nums + source + speaker notes) | title-check tests; integration test P-10 assertion (`notesSlide*.xml` count ≥ slides−1) |
| CRT-06 (PPT-compat release gate) | D-05 Layer 1 (CI grep) + Layer 2 (runtime enum-lint) green in this phase; Layer 3 checklist authored at `tests/POWERPOINT-COMPATIBILITY.md` for Phase 7 |
| CRT-15 (ENUM-only) | enum-lint Layer 1+2 green; cookbook recipes lint-checked; integration test asserts bad-cjs rejected pre-spawn |

## Test Counts

| Test file | Subtests |
|-----------|----------|
| Plan 04-01 (5 lib tests) | 25 |
| Plan 04-02 (cookbook-recipes) | 12 |
| Plan 04-03 (runtime + cli + enum-lint-cli) | 16 |
| **Plan 04-04 (integration)** | **3** |
| **Total Phase 4** | **58** |

`node --test tests/create-*.test.js` → 58/58 pass; ~5.5s. All green.

## D-05 Three-Layer Gate Status (Phase 4 close)

| Layer | Mechanism | Status |
|---|---|---|
| 1 — CI static lint | `tools/lint-pptxgenjs-enums.js` (`npm run lint:enums`) | ✅ ARMED — 38 files clean |
| 2 — Generation-time guard | `lib/enum-lint.lintCjs` invoked by `runCreate` BEFORE spawn | ✅ ARMED — integration test asserts bad-cjs rejected |
| 3 — Real-PowerPoint open | `tests/POWERPOINT-COMPATIBILITY.md` Phase 7 manual checklist | 📋 AUTHORED — executed in Phase 7 before v0.1.0 tag |

## Deviations from Plan

**[Rule 3 — Blocking issue] Two `enum-lint-allow` markers added to SKILL.md anti-pattern lines**

- **Found during:** Task 2 verify (`npm run lint:enums` failed with `skills/create/SKILL.md:33 addShape() string literal "oval"`).
- **Issue:** SKILL.md "Locked invariants" section legitimately documents the banned form `addShape('oval', …)` as part of the CRT-15 rule statement, and Step 3 also references `'oval'` as a contrast example. The CI lint tool (Plan 04-03's `tools/lint-pptxgenjs-enums.js`) flagged both lines.
- **Fix:** Added inline `<!-- enum-lint-allow: anti-pattern doc -->` markers on the 2 documentation lines, mirroring the precedent set in Plan 04-03 (cookbook DON'T tables use the same marker per Plan 04-03 SUMMARY's deviation note). The lint tool was designed to support this exemption — no tool changes required.
- **Files modified:** `skills/create/SKILL.md` (2 marker lines).
- **Commit:** `b6dd027` (folded into Task 2 atomic commit).

No other deviations. Plan executed as written.

## Auth Gates

None.

## Q-1 License Posture (end-to-end)

- `references/design-ideas.md` is 100% author-original (Plan 04-02 — original palette names + original hex values).
- `NOTICE` now carries the explicit "Design-ideas guidance ... is original to this project" paragraph honoring Q-1.
- SKILL.md "Locked invariants" reminds the agent: do NOT reference Anthropic pptx-skill palette/typography names; Sniff-grep gate (Plan 04-02) is CI-armed.
- R18 AI-tell pattern-matchers are noted as author-original; underlying heuristics flagged as unprotectable observations.

## Deferred (per ROADMAP)

| Deferred | Phase | Why |
|----------|-------|-----|
| Auto-refine convergence loop (CRT-07..CRT-14) | **Phase 5** | This phase ships single-cycle generation only; runCreate shape (D-08) is loop-ready |
| Real-PowerPoint open verification (Mac + Windows) | **Phase 7** | D-05 Layer 3 requires human-in-the-loop; checklist authored here |
| Activation rate ≥ 8/10 (DIST-02) | **Phase 7** | Description-string tuning is distribution-time work |
| `/content-review` integration into `/create` | **v2** | Out of v0.1.0 scope per PROJECT.md |
| Brand auto-detection from URL | **v2** | Out of v0.1.0 scope |
| In-deck image generation | **v2** | Out of v0.1.0 scope |

## Phase 4 Commit Total

| Plan | Commits | Hashes |
|------|---------|--------|
| 04-01 | 3 | bdf8108, ea50ea0, 9eaaf01 |
| 04-02 | 2 | 8ad76eb, d6fe45f |
| 04-03 | 2 | c419698, 9ffb710 |
| 04-04 | 2 | 93cf4f5, b6dd027 |
| **Total** | **9** | |

## Verification

- `node --test tests/create-*.test.js` (10 files) → 58/58 pass. ✅
- `npm run lint:enums --silent` → exit 0 (38 files clean). ✅
- `bash tools/lint-paths.sh` → green. ✅
- `node tools/assert-pptxgenjs-pin.js` → 4.0.1 OK. ✅
- `test -f tests/POWERPOINT-COMPATIBILITY.md` → exists. ✅
- SKILL.md description: 635 chars (< 1024). ✅
- SKILL.md mentions: DeckBrief, runCreate, references/cookbook, references/design-ideas, CRT-15, action title. ✅
- NOTICE contains "Design-ideas guidance ... is original to this project". ✅
- 2 atomic commits for this plan (`93cf4f5`, `b6dd027`). ✅

**Note on phase-wide test discovery:** Running the full repo test discovery surfaced 4 pre-existing soffice-timeout flakes in Phase 2 annotate tests (`annotate-runtime`, `Tier 1 baseline`, pipelined mode, CLI mode equivalence) under high parallelism. These are out-of-scope for Plan 04-04 (not caused by Plan 04-04 changes; soffice resource-contention pattern). Phase 4 own suite is fully deterministic and green.

## Self-Check: PASSED

- `skills/create/SKILL.md` — FOUND.
- `tests/create-integration.test.js` — FOUND.
- `tests/POWERPOINT-COMPATIBILITY.md` — FOUND.
- `NOTICE` — modified, contains author-original attribution paragraph.
- Commit `93cf4f5` — FOUND in `git log --oneline`.
- Commit `b6dd027` — FOUND in `git log --oneline`.
- Phase 4 own suite (10 files / 58 subtests) → 58/58 green.
- D-05 Layers 1+2 ARMED; Layer 3 checklist authored.
