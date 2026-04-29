# Roadmap: Instadecks

## Overview

Instadecks ships a Claude Code marketplace plugin with four user-invocable slash skills (`/create`, `/review`, `/content-review`, `/annotate`) plus the verbatim v8 BluePrestige `annotate.js` as a SHA-pinned binary asset. The build is contract-first: Phase 1 locks the JSON findings schema, CI gates, license bundle, font assets, and visual-regression baselines so every later phase fails loud rather than ships silently. Phase 2 ships `/annotate` first (smallest, most-locked component, validates the contract through its consumer before any producer exists). Phase 3 adds `/review` against the locked contract. Phases 4 and 5 split `/create` — scaffold + 8 slide types first (deterministic), then the auto-refine loop (the project's highest-risk subsystem) on top of known-good `/review` and `/annotate` building blocks. Phase 6 ships `/content-review` (independent of /create's loop). Phase 7 closes v1 with the marketplace PR, skill activation tuning, license compliance, and `v0.1.0` release.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Plugin Foundation, Contract & CI Gates** - Loadable plugin skeleton with locked JSON contract, CI gates, fonts, and visual-regression baselines
- [x] **Phase 8: Test Coverage to 100%** - c8 100% gate live in CI; bats wired; e2e local-only; 100% lines/branches/funcs/stmts achieved 2026-04-28 (878 tests)
- [x] **Phase 2: `/instadecks:annotate`** - Verbatim `annotate.js` wired to the locked contract; produces annotated PPTX + PDF overlays *(complete 2026-04-28 — 4/4 plans, ANNO-01..ANNO-11)*
- [x] **Phase 3: `/instadecks:review` (Design Review)** - DECK-VDA 4-pass design review with R18 AI-tell detection, pipelined into `/annotate` *(complete 2026-04-28 — 5/5 plans, RVW-01..RVW-11)*
- [ ] **Phase 4: `/instadecks:create` Scaffold + Render Cookbook** - Deck generator with 8 slide types, design-rationale doc, PowerPoint compatibility gate (no loop yet)
- [x] **Phase 5: `/instadecks:create` Auto-Refine Loop** - Convergence rule, oscillation detection, issue ledger, soft cap, user interrupt — the project's central differentiator
- [x] **Phase 6: `/instadecks:content-review`** - Pyramid Principle / MECE / narrative-arc / claim-evidence content critique with hard content-vs-design boundary
- [x] **Phase 7: Marketplace Publication & Release Polish** - Skill activation tuning, license compliance, marketplace PR to `alo-labs/claude-plugins`, v0.1.0 tag

## Phase Details

### Phase 1: Plugin Foundation, Contract & CI Gates
**Goal**: A loadable, lint-clean Instadecks plugin skeleton with the JSON contract locked, CI gates failing loud on day-1 violations, fonts bundled, and visual-regression baselines committed — so every subsequent phase has a stable foundation to build on.
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07, FOUND-08, FOUND-09, FOUND-10, FOUND-11
**Success Criteria** (what must be TRUE):
  1. Plugin loads in Claude Code from a clean `git clone` with `/plugin install alo-exp/instadecks` succeeding on a fresh machine that has only the prerequisites (`soffice`, `pdftoppm`, `node ≥ 18`); SessionStart hook reports any missing prereqs without halting the session
  2. CI fails loud on contract or path violations: manifest validator catches schema errors, hardcoded-path lint (`grep -r '/Users/|~/.claude|/home/|C:\\\\'`) returns zero matches, pptxgenjs version-pin assertion passes (exactly `4.0.1`, no caret), license-checker reports zero GPL transitive deps
  3. The locked findings schema (`skills/review/references/findings-schema.md` + `tests/fixtures/sample-findings.json`) maps 1:1 to `annotate.js`'s SAMPLES array shape and is consumable by all four skills
  4. IBM Plex Sans is bundled under `assets/fonts/` with SIL OFL license; `fc-list | grep "IBM Plex Sans"` detection plus first-run install/register flow works on a machine where the font isn't pre-installed
  5. Visual regression infrastructure is live: `tests/fixtures/v8-reference/` contains samples.js, expected `Annotations_Sample.pptx` SHA, and per-slide JPGs at 150 DPI — ready for Phase 2 to assert against
  6. Apache-2.0 LICENSE (full text + bundled-software section), NOTICE file, and per-dep `licenses/` directory are present and license-checker-clean
**Plans**: TBD

### Phase 2: `/instadecks:annotate`
**Goal**: A standalone-invocable `/instadecks:annotate` skill that consumes findings JSON in the locked schema and produces annotated PPTX + PDF overlays with byte-identical (or pixel-diff < 0.5%) parity to v8 BluePrestige reference output — proving the contract works end-to-end before any producer is built.
**Depends on**: Phase 1
**Requirements**: ANNO-01, ANNO-02, ANNO-03, ANNO-04, ANNO-05, ANNO-06, ANNO-07, ANNO-08, ANNO-09, ANNO-10, ANNO-11
**Success Criteria** (what must be TRUE):
  1. User invokes `/instadecks:annotate` with a findings JSON path + deck file path and receives an annotated PPTX overlay and an annotated PDF in the run directory plus a project-relative output path; activation rate ≥ 8/10 across the canonical prompt panel
  2. `annotate.js` is bundled verbatim under `skills/annotate/scripts/` with the "VERBATIM v8 BLUE PRESTIGE — DO NOT EDIT" banner, SHA-pinned in `tests/annotate-integrity.test.js`, and the only modification is the documented one-line require-path patch (verified by integrity test on every CI run)
  3. The JSON-to-SAMPLES adapter applies the 4-tier→3-tier severity collapse (Critical/Major→MAJOR, Minor→MINOR, Nitpick→POLISH) and the `genuine == true` filter at the adapter only; `annotate.js` continues to receive only `'major' | 'minor' | 'polish'`
  4. The slide-image symlink approach (`slide-NN.jpg` → `v8s-NN.jpg` in a temp working dir) lets `annotate.js` run without code changes
  5. Running the skill against `tests/fixtures/sample-findings.json` produces output that passes the visual regression baseline from Phase 1 (byte-identical PPTX or pixel-diff < 0.5%)
  6. Both standalone-invocable mode (user provides JSON + deck path) and pipelined-from-`/review` mode (in-memory deck-spec handoff, no file roundtrip) work
**Plans**: 4 plans
- [x] 02-01-PLAN.md — Verbatim annotate.js + require-path patch + SAMPLES extraction + JPG fixtures + integrity test unsuspend
- [x] 02-02-PLAN.md — JSON-to-SAMPLES adapter (validate → filter genuine → collapse 4→3) + unit tests
- [x] 02-03-PLAN.md — runAnnotate entry point + standalone CLI + soffice PDF + sibling outputs + integration tests
- [x] 02-04-PLAN.md — Visual-regression Tier 1 (normalized SHA per Rule 4 deviation) + Tier 2 (pixelmatch skip-guarded) + SKILL.md full body
**UI hint**: yes

### Phase 3: `/instadecks:review` (Design Review)
**Goal**: A `/instadecks:review` skill that bundles the deck-design-review skill verbatim (DECK-VDA 4-pass methodology, 4-tier severity, finding grammar, exhaustive §3 per-slide / §1 systemic / §4 maturity / §5 top-10 fixes), adds R18 AI-tell detection, emits findings JSON in the locked schema, and pipelines into `/annotate` by default — with the soffice race condition definitively fixed.
**Depends on**: Phase 2
**Requirements**: RVW-01, RVW-02, RVW-03, RVW-04, RVW-05, RVW-06, RVW-07, RVW-08, RVW-09, RVW-10, RVW-11
**Success Criteria** (what must be TRUE):
  1. User invokes `/instadecks:review` against a deck file (PPTX or PDF) and receives a JSON sidecar in the locked schema plus a human-readable Markdown report covering DECK-VDA's §1 systemic findings, §3 exhaustive per-slide findings, §4 maturity scoreboard, and §5 top-10 fixes; activation rate ≥ 8/10
  2. R18 AI-tell detection flags accent lines under titles, default blue, and identical-layouts-repeated patterns specific to LLM-authored decks; each finding includes `genuine`, `category` (defect/improvement/style), `nx`/`ny` positioning, and `rationale` per the Phase 1 schema
  3. `scripts/pptx-to-images.sh` runs without race conditions across concurrent invocations: `-env:UserInstallation=file:///tmp/lo-${SESSION_ID}-${PID}` per call, file-existence + size checks after every soffice and pdftoppm invocation, 60s timeout with one retry, cleanup trap on exit
  4. Default pipeline-into-`/annotate` mode produces deck + JSON + Markdown + annotated PPTX + annotated PDF in a single invocation; standalone mode produces JSON + Markdown only; structured-handoff mode (called from `/create`) skips the file-read roundtrip
**Plans**: 5 plans
- [x] 03-01-PLAN.md — `scripts/pptx-to-images.sh` hardened (RVW-09/10/11) + tiny-deck smoke fixture
- [x] 03-02-PLAN.md — runReview orchestrator + schema validator + render-fixed stub + standalone CLI (RVW-04/05/06/07/08)
- [x] 03-03-PLAN.md — ai-tells.js with 3 R18 heuristics + jszip devDep + read-deck-xml lib + fixtures (RVW-03)
- [x] 03-04-PLAN.md — render-fixed.js DECK-VDA renderer (pure, deterministic) + locked snapshot + property tests (RVW-02/05)
- [x] 03-05-PLAN.md — SKILL.md DECK-VDA canonicalization + NOTICE attribution + end-to-end integration test (RVW-01/02/03/05/06/07/08)
**UI hint**: yes

### Phase 4: `/instadecks:create` Scaffold + Render Cookbook
**Goal**: A `/instadecks:create` skill that ingests arbitrary input (md / PDF / PPTX-read-only / URL / image / transcript / freeform brief), generates a per-run `render-deck.cjs` from pptxgenjs cookbook patterns and the bundled design-ideas guidance (10 palettes, 8 typography pairings, 10 anti-patterns), produces a single-cycle deck (no auto-refine yet) covering all 8 slide types — and every test deck opens cleanly in real Microsoft PowerPoint.
**Depends on**: Phase 3
**Requirements**: CRT-01, CRT-02, CRT-03, CRT-04, CRT-05, CRT-06, CRT-15
**Success Criteria** (what must be TRUE):
  1. User invokes `/instadecks:create` with any supported input (markdown, plain text, read-only PPTX template, PDF, URL, image, transcript, freeform brief, or multiple files combined) and receives a PPTX, a PDF, and a sidecar design-rationale doc explaining palette / typography / motif / narrative arc / key tradeoffs in the run directory
  2. The agent generates `render-deck.cjs` per run (not a fixed template) using pptxgenjs cookbook patterns and the bundled design-ideas guidance; palette and typography choice is informed by input content
  3. All 8 slide types render at 16:9 widescreen — title, section, 2-column, comparison, data-chart, data-table, stat-callout, quote, closing — with action titles (claim, not topic), page numbers, source lines, and speaker notes emitted by default
  4. PowerPoint compatibility release gate passes: every test deck opens cleanly in real Microsoft PowerPoint on Mac and Windows; lint forbids OOXML enum string literals like `addShape('oval', ...)` (must use `pres.shapes.OVAL` enum)
  5. Activation rate for `/instadecks:create` is ≥ 8/10 across the canonical prompt panel
**Plans**: TBD
**UI hint**: yes

### Phase 5: `/instadecks:create` Auto-Refine Loop
**Goal**: The project's central differentiator — an auto-refine loop in `/instadecks:create` that calls `/review` internally each cycle, parses findings, regenerates fixes for `genuine == true && category == defect` issues, and converges to zero genuine findings (with cycle ≥ 2 confirmation, soft cap at 5 with user override, oscillation detection, issue ledger, user interrupt, and diff-only review after cycle 1) — producing the full artifact bundle (deck + PDF + design rationale + JSON findings + annotated PPTX + annotated PDF) in a single invocation.
**Depends on**: Phase 4
**Requirements**: CRT-07, CRT-08, CRT-09, CRT-10, CRT-11, CRT-12, CRT-13, CRT-14
**Success Criteria** (what must be TRUE):
  1. The loop converges cleanly: when `genuine_findings == 0 AND cycle ≥ 2` is reached, the run exits with the final deck and updates the design-rationale doc with non-genuine findings the agent chose not to fix (cycle 1 returning 0 findings forces one confirmation cycle that re-renders + re-images)
  2. Oscillation is detected and stopped: if cycle N's issue set ⊆ cycle N-2's issue set, the loop stops, surfaces the issue ledger, and asks the user which version to keep or what to fix manually
  3. Soft cap at cycle 5 surfaces "continue / accept / specify what to fix" to the user without a hardcoded limit; the user's choice (not a hard cap) determines continuation, satisfying PROJECT.md's "no fixed cap" constraint
  4. User interrupt works: touching `.planning/instadecks/<run-id>/.interrupt` causes the next cycle iteration to exit cleanly at the top-of-cycle check; per-cycle issue ledger (`{cycle, issues_found, issues_fixed, issues_intentionally_skipped}`) is persisted so intentionally-skipped issues are not re-fixed; cycle 1 = full deck review, cycle 2+ = diff-only review of changed slides
  5. Default-pipeline mode produces deck + PDF + design-rationale + JSON findings + annotated PPTX + annotated PDF as a single artifact bundle in the run directory; the bundled deck still passes the PowerPoint compatibility gate from Phase 4
**Plans**: TBD

### Phase 6: `/instadecks:content-review`
**Goal**: A `/instadecks:content-review` skill that performs Pyramid Principle / MECE structural check, narrative-arc check, action-title quality check, claim/evidence balance, redundancy detection, audience-fit check, and standalone-readability test — using the same 4-tier severity and finding grammar as `/review` so output pipes cleanly into `/annotate` — with a hard content-vs-design boundary preserved in both directions.
**Depends on**: Phase 1 (only the contract; v1 does not integrate content-review into /create's loop, so Phase 5 is not a hard dependency — but typically sequenced after for development simplicity)
**Requirements**: CRV-01, CRV-02, CRV-03, CRV-04, CRV-05, CRV-06, CRV-07, CRV-08, CRV-09, CRV-10, CRV-11
**Success Criteria** (what must be TRUE):
  1. User invokes `/instadecks:content-review` against a deck file and receives findings covering all seven content checks (Pyramid Principle / MECE structural, narrative-arc, action-title quality / claim-not-topic, claim/evidence balance, redundancy, audience-fit including jargon and length flags, standalone-readability); activation rate ≥ 8/10
  2. Content findings use the same 4-tier severity scale and finding grammar as `/review` and emit JSON in the same locked schema, so the same `/annotate` adapter consumes them without modification
  3. The content-vs-design boundary is preserved: content-review does not flag visual / typographic / layout issues (those are `/review`'s domain), and `/review` does not flag argument structure / narrative issues — verified by golden test fixtures with deliberate cross-domain content the skills must ignore
  4. `/instadecks:content-review` runs standalone in v1 (not in `/create`'s auto-refine loop, deferred to v2) but its output pipes into `/annotate` for content-finding overlays
**Plans**: TBD

### Phase 7: Marketplace Publication & Release Polish
**Goal**: Public release of Instadecks v0.1.0 — all four user-invocable skills with imperative-voice keyword-front-loaded descriptions passing the 10-prompt activation panel ≥ 8/10, scoped `allowed-tools` validated in `default` and `dontAsk` permission modes, license compliance final pass, marketplace PR landed in `alo-labs/claude-plugins`, README finalized with `/instadecks:doctor` self-check — all gated against fresh-machine install validation.
**Depends on**: Phase 6
**Requirements**: DIST-01, DIST-02, DIST-03, DIST-04, DIST-05, DIST-06, DIST-07, DIST-08
**Success Criteria** (what must be TRUE):
  1. All four user-invocable skill descriptions follow the imperative-voice keyword-front-loaded pattern (≤ 1024 chars, third-person voice, embedded examples) and each passes the 10-prompt activation test ≥ 8/10
  2. `allowed-tools` per skill is scoped to `Bash(soffice:*)`, `Bash(pdftoppm:*)`, `Bash(node:*)`, `Bash(npm:*)` and tested in `default` and `dontAsk` permission modes — not just `bypassPermissions`
  3. License compliance is final: full Apache-2.0 LICENSE with bundled-software section, complete NOTICE file, per-bundled-dep `licenses/` directory, license-checker reports zero GPL transitive deps
  4. The marketplace PR to `alo-labs/claude-plugins` adding the `instadecks` entry (with `source: { source: "github", repo: "alo-exp/instadecks" }`, category `productivity`, semver-tagged) is reviewed and merged; `claude plugin tag --push` releases v0.1.0 cleanly; fresh-machine install validation succeeds end-to-end (`/plugin install alo-exp/instadecks` → `/instadecks:doctor` reports green → `/instadecks:create` produces a valid deck)
  5. README.md is finalized with install / usage / examples / `/instadecks:doctor` self-check; the `doctor` skill verifies system tool availability and reports gaps with install instructions
**Plans**: TBD

### Phase 8: Test Coverage to 100%
**Goal**: Bring the entire Instadecks codebase to 100% test coverage across unit, integration, smoke, and (local-only) E2E layers — wire `c8` into CI as a hard gate so coverage regression fails the build. Includes outcome-based unit tests for every SKILL.md instruction (mocked LLM, deterministic asserted outcomes), bats tests for all bash scripts, geometry tests for `annotate.js`, and full branch coverage of orchestrators (soffice-failure, network-failure, interrupt, oscillation, soft-cap).
**Depends on**: Phase 7
**Requirements**: TEST-01..TEST-08 (to be defined in CONTEXT.md)
**Success Criteria** (what must be TRUE):
  1. `npm test` produces a c8 coverage report showing 100% lines/branches/functions/statements across every covered file (annotate.js INCLUDED, not excluded); CI fails on regression below 100%
  2. Every `lib/*.js`, every cli.js, every orchestrator (`runCreate` / `runReview` / `runContentReview` / `runAnnotate`), every `tools/*.js`, and `skills/annotate/scripts/annotate.js` has direct unit tests covering all branches including failure paths (soffice missing, network errors, interrupt flag, oscillation hash equality, soft-cap user-choice paths)
  3. Every bash script (`scripts/pptx-to-images.sh`, `hooks/check-deps.sh`, `skills/doctor/scripts/check.sh`) has bats tests covering happy-path + failure modes
  4. Every SKILL.md (5 skills) has outcome-based unit tests that mock the LLM step and assert deterministic outcomes (JSON shape, finding IDs, severity values, render artifacts, schema conformance) for every instruction in the playbook
  5. New `tests/smoke/` suite invokes each cli.js with `--help` + minimal valid input, asserts exit 0 + expected stdout shape; runs in CI in <30s
  6. Integration tests cover every branch of the auto-refine loop: cycle 1 zero-findings confirmation, oscillation hash equality (D-09), soft-cap 4-option UX, top-of-cycle interrupt, schema v1.1 routing, content-vs-design boundary bidirectional
  7. `npm run test:e2e` runs real-soffice E2E locally if `soffice` is on PATH; skipped silently when absent; never runs in CI; FRESH-INSTALL.md remains the human E2E gate for v0.1.0
  8. Coverage gate added to CI workflow: `c8 --100 npm test` (or equivalent) fails the build on any regression
**Plans**: TBD (waves: 8-01 c8 wiring + baseline, 8-02 lib/orchestrator gap-fill, 8-03 annotate.js geometry, 8-04 bats for bash scripts, 8-05 outcome-based SKILL.md tests, 8-06 smoke suite + E2E runner, 8-07 CI gate + sign-off)

### Phase 9: Design Variety & Modern Aesthetics + Brief-Shape Polymorphism
**Goal**: Eliminate the "every deck looks the same" defect surfaced by 5 live E2E rounds. Two root causes: (a) cookbook offers ONE template per slide type → uniform layouts; (b) brief intake assumes a single rigid JSON shape (title/audience/purpose/key_messages/data_points/tone) → uniform content structure even across domains. Real users hand Claude raw input (meeting transcripts, pasted strategy docs, research papers, Slack threads, one-line asks). Phase 9 makes the plugin's input surface polymorphic AND its design surface deeply varied.
**Depends on**: Phase 8 (relaxes the CLAUDE.md "match v8 BluePrestige output" invariant — recorded as Key Decision in PROJECT.md before execution)
**Requirements**: DV-01..DV-12 (to be defined in CONTEXT.md)
**Success Criteria** (what must be TRUE):
  1. Cookbook offers ≥3 documented variants per slide type (title, section, stat-callout, 2col, comparison, data-chart, data-table, quote, closing) with distinct VARIANT_IDs, working pptxgenjs 4.0.1 code, and use-case guidance
  2. New `references/palettes.md` library with ≥14 named modern palettes (Editorial Mono, Magazine Bold, Tech Noir, Pastel Tech, Silicon Valley, Editorial Serif, Monochrome+Accent, Carbon Neon, Cobalt Edge, Terracotta Editorial, plus the 4 existing earth-tone palettes) — NOT just muted greens
  3. New `references/typography.md` with ≥8 type pairings (sans-only modern, mono-headings, display-hero, italic-led, mixed-weight, type-as-image, etc.)
  4. New `references/motifs.md` with ≥8 motifs (underline, geometric-block, asymmetric-grid, number-as-design, diagonal-split, editorial-rule, minimalist-void, photo-led, gradient-overlay)
  5. SKILL.md instructs the agent to ROTATE design DNA per deck — never default to verdant-steel + serif + underline; explicit "diversity check" against prior runs
  6. Brief intake polymorphism: `runCreate` accepts brief in 4+ shapes — (a) structured JSON (current), (b) free-form Markdown narrative, (c) raw text (paste-from-anywhere), (d) attached files list (pdf/docx/transcript paths). A new `lib/brief-normalizer.js` extracts narrative-arc/audience/tone from any of these into the internal canonical shape
  7. Updated `design-validator.js` recognizes all 14+ palettes as legitimate; doesn't false-positive on saturated primaries, electric accents, asymmetric layouts; still catches the actual AI tells (default Calibri, Office-blue, generic stock-photo)
  8. New live E2E test set: 6 rounds with structurally-different inputs (JSON brief, raw transcript, pasted strategy doc, one-line ask, research-paper paragraph, photo-with-caption) — visual diff between rounds shows ≥80% layout/palette variation; 2 consecutive clean rounds required
  9. PROJECT.md Key Decisions log captures the v8-spec relaxation; CLAUDE.md updated to remove "match v8 BluePrestige output" as a hard invariant (replaced with "v8 is one valid design DNA among many")
  10. 100% c8 coverage gate stays green; all existing tests pass; new tests for variant coverage, palette library, typography library, motif library, brief normalizer
**Plans**: TBD (estimated waves: 9-01 palettes + typography + motifs libraries; 9-02 cookbook variant additions; 9-03 SKILL.md design-DNA picker + cookbook.md restructure; 9-04 brief-normalizer + polymorphic intake; 9-05 design-validator updates + invariant reversal; 9-06 live E2E with varied input shapes + 2-clean-rounds verification)

### Phase 10: Hardening, Documentation Compliance, and Release Automation
**Goal**: Close all known backlog items surfaced through 8 live E2E iterations + /silver-scan, bring documentation to 100% compliance with `docs/doc-scheme.md`, and AUTOMATE every previously-human gate from RELEASE.md §1 (activation panel, permission-mode matrix, fresh-install Mac+Win, marketplace PR, tag push) so v0.1.0 can ship without a human in the loop.
**Depends on**: Phase 9
**Requirements**: HARD-01..HARD-15 (defined in CONTEXT.md)
**Success Criteria** (what must be TRUE):
  1. **Backlog closure**: enum-lint extended to flag typo'd `pres.shapes.<KEY>` references that resolve to undefined; soffice cold-start race in parallel runCreate invocations gracefully serialized via cwd-locking; tools/license-audit.js test gap (lines 133-134) closed; `c8 --100 --check-coverage` gate passes without exclusions
  2. **Documentation compliance** (per `docs/doc-scheme.md`): all core files exist with current content (ARCHITECTURE.md, TESTING.md, CHANGELOG.md, knowledge/INDEX.md, doc-scheme.md); knowledge/`YYYY-MM.md` and lessons/`YYYY-MM.md` populated with non-trivial entries from the 10-phase build; size caps enforced (docs ≤500 lines, knowledge/lessons ≤300, planning ≤300); INDEX.md links every doc; CICD.md updated; README.md finalized for marketplace; SECURITY.md scaffolded post-audit; CONTRIBUTING.md added
  3. **Activation panel automation**: new harness in `tests/automation/activation-panel.test.js` that simulates Claude Code skill-activation matching against the 40-prompt panel using the agent's description-matching heuristics; passes ≥8/10 per skill; runs in CI (mocked deterministic matcher); replaces manual scoring in `tests/activation-panel.md`
  4. **Permission-mode automation**: `tests/automation/permission-mode.test.js` programmatically loads each SKILL.md's `allowed-tools` list, validates against actual `Bash(<tool>:*)` invocations in the script, and asserts coverage in both `default` and `dontAsk` simulation modes; replaces manual `tests/PERMISSION-MODE.md` runs
  5. **Fresh-install automation**: `tests/automation/fresh-install.test.js` that exercises `/plugin install` flow against an isolated CLAUDE_PLUGIN_ROOT/CLAUDE_PLUGIN_DATA via Docker container; runs all 4 user-invocable skills against canonical brief; produces real PPTX/PDF/findings/annotated artifacts; verifies bytes; passes on Linux runner (Mac+Windows variants documented as platform-specific runners)
  6. **Marketplace PR automation**: `tools/submit-marketplace-pr.sh` that uses `gh` to fork `alo-labs/claude-plugins`, applies the patch from `.planning/marketplace-patch.json`, opens PR with the prepared body from `.planning/marketplace-pr.md`, captures URL into `.planning/RELEASE.md`
  7. **Tag automation**: `tools/release-v0.1.0.sh` (or invocation of `/silver-create-release v0.1.0`) that runs all gates above, on green flips STATE.md to `released`, generates CHANGELOG entry, signs and pushes tag
  8. **End-to-end release simulation**: `npm run release:dry-run` runs the full automated chain (gates → marketplace PR draft → tag prep) without pushing; on success, `npm run release` does the real thing
**Plans**: TBD (estimated waves: 10-01 backlog closure, 10-02 doc-scheme audit + fill, 10-03 activation panel + permission-mode automation, 10-04 fresh-install Docker harness, 10-05 marketplace + tag automation, 10-06 release dry-run E2E)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Plugin Foundation, Contract & CI Gates | 0/TBD | Not started | - |
| 2. `/instadecks:annotate` | 3/4 | In Progress | - |
| 3. `/instadecks:review` (Design Review) | 0/TBD | Not started | - |
| 4. `/instadecks:create` Scaffold + Render Cookbook | 0/TBD | Not started | - |
| 5. `/instadecks:create` Auto-Refine Loop | 0/TBD | Not started | - |
| 6. `/instadecks:content-review` | 0/TBD | Not started | - |
| 7. Marketplace Publication & Release Polish | 0/TBD | Not started | - |
| 8. Test Coverage to 100% | 7/7 | Complete | 2026-04-28 |
| 9. Design Variety & Modern Aesthetics + Brief-Shape Polymorphism | 0/TBD | Not started | - |
| 10. Hardening, Documentation Compliance, and Release Automation | 0/TBD | Not started | - |
