# Requirements

**Project:** Instadecks
**Created:** 2026-04-27
**Status:** v1 active scope

> All v1 requirements are hypotheses until shipped and validated. Validated set populates after each phase ships and proves valuable. Out of Scope captures explicit exclusions with rationale to prevent re-adding.

---

## v1 Requirements

### Plugin Foundation (FOUND)

- [ ] **FOUND-01**: Plugin loads in Claude Code via `/plugin install alo-exp/instadecks` with no manual setup steps beyond pre-installed system tools (soffice, pdftoppm, node)
- [ ] **FOUND-02**: Plugin self-contains all bundled scripts (annotate.js, samples.js, render-deck cookbook, design-ideas guidance, palette JSON, font assets) — no reaches into `~/.claude/skills/` or absolute user-machine paths
- [ ] **FOUND-03**: SessionStart hook performs non-blocking dependency check (soffice / pdftoppm / node ≥ 18) and surfaces a single clear message if anything is missing
- [ ] **FOUND-04**: SessionStart hook runs `npm ci --omit=dev` into `${CLAUDE_PLUGIN_DATA}/node_modules` on first activation, with `diff -q` guard so re-installs are skipped
- [ ] **FOUND-05**: pptxgenjs is pinned at exactly `4.0.1` (no caret) in `package.json` and `package-lock.json` is committed
- [ ] **FOUND-06**: `findings-schema.md` reference doc defines the locked JSON contract (slideNum, title, annotations[{sev, nx, ny, text, genuine, rationale, category, severity_reviewer}], schema_version) that maps 1:1 to `annotate.js`'s SAMPLES array
- [ ] **FOUND-07**: `tests/fixtures/sample-findings.json` provides a canonical fixture honoring the schema, used by all four skills
- [ ] **FOUND-08**: CI gates from day 1: manifest validator (`tools/validate-manifest.js`), hardcoded-path lint (`grep -r '/Users/|~/.claude|/home/|C:\\\\'`), pptxgenjs version-pin assertion, license-checker (zero GPL transitive deps)
- [ ] **FOUND-09**: Visual regression baselines committed under `tests/fixtures/v8-reference/` (samples.js, expected `Annotations_Sample.pptx` SHA, per-slide JPGs at 150 dpi)
- [ ] **FOUND-10**: IBM Plex Sans fonts bundled under `assets/fonts/` with SIL OFL license; `fc-list` detection + first-run install/register flow
- [ ] **FOUND-11**: Apache-2.0 LICENSE (full text + bundled-software section), NOTICE file, per-dep `licenses/` directory

### `/instadecks:annotate` skill (ANNO)

- [x] **ANNO-01**: `/instadecks:annotate` is invocable as a slash skill with imperative-keyword-front-loaded description that triggers Claude reliably (≥ 8/10 prompt activation) *(Phase 7 DIST-02 finalizes activation tuning)*
- [x] **ANNO-02**: `annotate.js` is bundled verbatim under `skills/annotate/scripts/` with banner comment "VERBATIM v8 BLUE PRESTIGE — DO NOT EDIT" and SHA-pinned in `tests/annotate-integrity.test.js`
- [x] **ANNO-03**: The only modification to `annotate.js` is the documented one-line require-path patch so pptxgenjs resolves out of `${CLAUDE_PLUGIN_DATA}/node_modules`; algorithm code is unchanged
- [x] **ANNO-04**: The `SAMPLES` example data is extracted to a separate `samples.js` module so geometry code stays unmodified; runtime data is written into a fresh JSON consumed via the same module shape
- [x] **ANNO-05**: JSON-to-SAMPLES adapter implements 4-tier→3-tier severity collapse (Critical→MAJOR, Major→MAJOR, Minor→MINOR, Nitpick→POLISH) at the adapter only; `annotate.js` continues to see only `'major' | 'minor' | 'polish'`
- [x] **ANNO-06**: Adapter filters `genuine == true` findings before passing to annotate.js; non-genuine findings are recorded in the design-rationale doc but do not appear in the overlay
- [x] **ANNO-07**: Slide-image symlink approach: skill creates a temp working dir, symlinks `slide-NN.jpg` → `v8s-NN.jpg` names so annotate.js's hardcoded image-name expectation is satisfied without code changes
- [x] **ANNO-08**: Output is both an annotated PPTX overlay and an annotated PDF; both written to the run directory and a project-relative output path
- [x] **ANNO-09**: Standalone-invocable mode: user provides findings JSON path + deck file path; skill produces annotated outputs without requiring `/review` to have run in the same session
- [x] **ANNO-10**: Pipelined invocation mode: when called by `/review` (default pipeline), receives the in-memory deck-spec handoff and skips the file-read roundtrip
- [x] **ANNO-11**: Validates against `tests/fixtures/sample-findings.json` → produces output with byte-identical PPTX vs v8 reference (or pixel-diff < 0.5% if non-deterministic bytes) *(Tier 1 satisfied via structural-XML normalized SHA per Plan 02-04 Rule 4 deviation; Tier 2 pixelmatch staged behind Phase 7 ci.yml RESERVED block)*

### `/instadecks:review` skill — Design Review (RVW)

- [x] **RVW-01**: `/instadecks:review` is invocable as a slash skill with imperative-keyword description (≥ 8/10 prompt activation) *(Phase 3 Plan 05 — 5fe5210; pattern landed; Phase 7 DIST-02 finalizes ≥8/10 tuning)*
- [x] **RVW-02**: Bundles deck-design-review skill content verbatim: DECK-VDA 4-pass methodology, finding grammar `[Severity] | [Category] — [Location] — [Defect] — [Standard violated] — [Fix]`, 4-tier severity (Critical/Major/Minor/Nitpick), exhaustive per-slide §3 findings, deck-level §1 systemic findings, §4 maturity scoreboard, §5 top-10 fixes *(Phase 3 Plan 04 — 9bf101b; Plan 05 — 5fe5210; canonicalized as re-expressed Apache-2.0 content per D-01, NOT verbatim vendor — see NOTICE attribution)*
- [x] **RVW-03**: Adds R18 AI-tell detection: flags accent lines under titles, default blue, identical layouts repeated, and other AI-generator hallmarks specific to LLM-authored decks *(Phase 3 Plan 03 — 3e07e4f)*
- [x] **RVW-04**: Each finding includes `genuine` flag, `category` (defect/improvement/style), `nx`/`ny` annotation positioning, and `rationale` for the determination *(Phase 3 Plan 02 — d5e40a9; schema-validator enforces)*
- [x] **RVW-05**: Output is a JSON sidecar in the locked schema (FOUND-06) AND a human-readable Markdown report; both written to the run directory *(Phase 3 Plan 02 — d5e40a9; Plan 04 — 9bf101b real renderer; Plan 05 — 33b1a33 integration test)*
- [x] **RVW-06**: Pipeline-by-default into `/instadecks:annotate` so a single invocation produces deck + JSON + Markdown report + annotated PPTX + annotated PDF *(Phase 3 Plan 02 — d5e40a9 lazy require + gating; documented in SKILL.md per Plan 05 — 5fe5210)*
- [x] **RVW-07**: Standalone mode: accepts a deck file path (PPTX or PDF) and produces JSON + Markdown without invoking `/annotate` *(Phase 3 Plan 02 — a00b1a3 CLI; Plan 05 — 33b1a33 integration test)*
- [x] **RVW-08**: Structured-handoff mode: accepts a pre-rendered deck-spec object (when pipelined from `/create`) to skip the file-read roundtrip *(Phase 3 Plan 02 — d5e40a9 mode parameter; Plan 05 — 33b1a33 integration test)*
- [x] **RVW-09**: `scripts/pptx-to-images.sh` uses `-env:UserInstallation=file:///tmp/lo-${SESSION_ID}-${PID}` per call to prevent soffice race conditions *(Phase 3 Plan 01 — df5a4bb)*
- [x] **RVW-10**: After every `soffice` and `pdftoppm` invocation, file-existence + size check verifies success (don't trust exit codes — both have known silent-failure modes); 60s timeout with one retry *(Phase 3 Plan 01 — df5a4bb)*
- [x] **RVW-11**: Cleanup trap removes `/tmp/lo-${SESSION_ID}-${PID}` on exit (success or failure) *(Phase 3 Plan 01 — df5a4bb)*

### `/instadecks:create` skill — Auto-Refine Orchestrator (CRT)

- [ ] **CRT-01**: `/instadecks:create` is invocable as a slash skill with imperative-keyword description (≥ 8/10 prompt activation)
- [ ] **CRT-02**: Accepts any input the agent can read (markdown, plain text, PPTX as read-only template, PDF, URL, image, transcript, freeform brief — including multiple files combined)
- [ ] **CRT-03**: Generates `render-deck.cjs` per run (not from a fixed template) using pptxgenjs cookbook patterns, the bundled design-ideas guidance (10 palettes, 8 typography pairings, 10 anti-patterns), and palette/typography choice informed by input content
- [ ] **CRT-04**: Supports 8 slide types: title, section, 2-column, comparison, data-chart, data-table, stat-callout, quote, closing — at 16:9 widescreen
- [ ] **CRT-05**: Action titles (claim, not topic), page numbers, source lines, speaker notes are emitted by default
- [ ] **CRT-06**: Outputs PPTX + PDF + a sidecar design-rationale doc (palette choice, typography pairing, motif, narrative arc, key tradeoffs); design-rationale also captures non-genuine findings the reviewer raised but `/create` chose not to fix
- [ ] **CRT-07**: Auto-refine loop runs until convergence: invokes `/instadecks:review` internally, parses findings, regenerates fixes for `genuine == true && category == defect` findings, repeats
- [ ] **CRT-08**: Convergence rule: `genuine_findings == 0 AND cycle ≥ 2` (cycle 1 returning 0 findings is suspicious — force one confirmation cycle)
- [ ] **CRT-09**: Soft cap at cycle 5 surfaces "continue / accept / specify what to fix" to user; user (not a hardcoded limit) chooses to continue, satisfying "no fixed cap"
- [ ] **CRT-10**: Oscillation detection: if cycle N's issue set ⊆ cycle N-2's issue set, declare oscillation, stop, surface to user with the issue ledger
- [ ] **CRT-11**: User interrupt: `.planning/instadecks/<run-id>/.interrupt` flag file is checked at the top of each cycle; user touches the flag → next cycle iteration exits cleanly
- [ ] **CRT-12**: Per-cycle inputs: cycle 1 = full deck review; cycle 2+ = diff-only review (slides that changed) for token discipline
- [ ] **CRT-13**: Issue ledger across cycles: each cycle writes `{cycle, issues_found, issues_fixed, issues_intentionally_skipped}` JSON; generator reads previous ledger before applying fixes so intentionally-skipped issues are not re-fixed
- [ ] **CRT-14**: Pipelines `/instadecks:annotate` by default so a single invocation produces the full artifact bundle (deck + PDF + design rationale + JSON findings + annotated PPTX + annotated PDF)
- [ ] **CRT-15**: PowerPoint compatibility release gate: every test deck opens cleanly in real Microsoft PowerPoint (Mac and Windows); pptxgenjs OOXML enum string literals like `addShape('oval', ...)` are forbidden (use `pres.shapes.OVAL` enum)

### `/instadecks:content-review` skill (CRV)

- [ ] **CRV-01**: `/instadecks:content-review` is invocable as a slash skill with imperative-keyword description (≥ 8/10 prompt activation)
- [ ] **CRV-02**: Performs Pyramid Principle / MECE structural check on the deck's argument
- [ ] **CRV-03**: Performs narrative-arc check (problem → insight → resolution flow)
- [ ] **CRV-04**: Action-title quality check — each title must make a claim, not just label a topic
- [ ] **CRV-05**: Claim/evidence balance check — every assertion is backed by data, source, or example
- [ ] **CRV-06**: Redundancy detection (same claim or evidence repeated across slides)
- [ ] **CRV-07**: Audience-fit check (jargon level, prerequisite knowledge, length-per-slide flags)
- [ ] **CRV-08**: Standalone-readability test — deck makes sense to someone not present at the talk
- [ ] **CRV-09**: Uses the same 4-tier severity scale and finding grammar as `/instadecks:review` so output can pipe into `/instadecks:annotate` via the same adapter
- [ ] **CRV-10**: Hard content-vs-design boundary: content-review does NOT comment on visual/typographic/layout issues (those are `/review`'s domain); `/review` does NOT comment on argument structure or narrative
- [ ] **CRV-11**: Standalone in v1 (NOT integrated into `/create`'s auto-refine loop — that's a v2 candidate); but pipeline-into-`/annotate` works for content findings

### Test Coverage (TEST)

- [ ] **TEST-01**: `npm test` produces a c8 coverage report showing 100% lines/branches/functions/statements across every covered file (annotate.js INCLUDED, not excluded); CI fails on regression below 100%
- [ ] **TEST-02**: Every `lib/*.js`, every cli.js, every orchestrator (`runCreate`/`runReview`/`runContentReview`/`runAnnotate`), every `tools/*.js`, and `skills/annotate/scripts/annotate.js` has direct unit tests covering all branches including failure paths (soffice missing, network errors, interrupt flag, oscillation hash equality, soft-cap user-choice paths)
- [ ] **TEST-03**: Every bash script (`scripts/pptx-to-images.sh`, `hooks/check-deps.sh`, `skills/doctor/scripts/check.sh`) has bats tests covering happy-path + failure modes
- [ ] **TEST-04**: Every SKILL.md (5 skills) has outcome-based unit tests that mock the LLM step and assert deterministic outcomes (JSON shape, finding IDs, severity values, render artifacts, schema conformance) for every instruction in the playbook
- [ ] **TEST-05**: New `tests/smoke/` suite invokes each cli.js with `--help` + minimal valid input, asserts exit 0 + expected stdout shape; runs in CI in <30s
- [ ] **TEST-06**: Integration tests cover every branch of the auto-refine loop: cycle 1 zero-findings confirmation, oscillation hash equality (D-09), soft-cap 4-option UX, top-of-cycle interrupt, schema v1.1 routing, content-vs-design boundary bidirectional
- [ ] **TEST-07**: `npm run test:e2e` runs real-soffice E2E locally if `soffice` is on PATH; skipped silently when absent; never runs in CI; FRESH-INSTALL.md remains the human E2E gate for v0.1.0
- [ ] **TEST-08**: Coverage gate added to CI workflow: `npm test` (c8 --100 --check-coverage per D-02) fails the build on any regression below 100%

### Marketplace & Distribution (DIST)

- [ ] **DIST-01**: All four user-invocable skill descriptions follow the imperative-voice keyword-front-loaded pattern, ≤ 1024 chars, third-person voice, with embedded examples
- [ ] **DIST-02**: 10-prompt activation test ≥ 8/10 must pass for each skill before publication
- [ ] **DIST-03**: `allowed-tools` per skill scoped to: `Bash(soffice:*)`, `Bash(pdftoppm:*)`, `Bash(node:*)`, `Bash(npm:*)` — tested in `default` and `dontAsk` permission modes (not just `bypassPermissions`)
- [ ] **DIST-04**: Apache-2.0 LICENSE complete with bundled-software section; NOTICE file; per-bundled-dep `licenses/` directory; license-checker reports zero GPL transitive deps
- [ ] **DIST-05**: Repository at `github.com/alo-exp/instadecks` (already created) with README.md including install / usage / examples / `/instadecks:doctor` self-check
- [ ] **DIST-06**: Marketplace listing PR to `alo-labs/claude-plugins` adding `instadecks` entry, `source: { source: "github", repo: "alo-exp/instadecks" }`, category `productivity`, semver-tagged
- [ ] **DIST-07**: `claude plugin tag --push` releases v0.1.0 cleanly; fresh-machine install validation passes
- [ ] **DIST-08**: `/instadecks:doctor` self-check skill verifies system tool availability and reports any gaps with install instructions

---

## v2 Requirements (Deferred)

These are valuable but out of v1 scope to prevent feature creep:

- v1.x: JSON-out / exit-code mode for CI pipelines
- v1.x: Convergence diagnostics surfaced in design-rationale doc
- v1.x: Full WCAG audit (alt-text, color-only-info checks added to `/review`)
- v1.x: Stress-test fixtures (8 annotations per slide / max overflow) added to visual regression suite
- v1.x: Windows path-detection in `pptx-to-images.sh`
- v2: Visual regression / version diff between deck versions
- v2: Brand auto-detection from URL (logo, palette, typography extraction)
- v2: Multi-language localization
- v2: Voice/tone analysis layered onto content-review
- v2: In-deck image generation
- v2: `/instadecks:content-review` integrated into `/create`'s auto-refine loop

## Out of Scope (Explicit Exclusions)

- **Bundled visual templates / template library** — Palette + design-ideas guidance is the contract; generated decks are fresh each time, not template-driven. Avoids template debt.
- **python-pptx or any non-pptxgenjs rendering engine** — Toolchain consistency with v8 BluePrestige and `annotate.js` requires pptxgenjs.
- **Editing existing PPTX files in place** — `/instadecks:create` only authors new decks; templates can inform style but the plugin doesn't mutate user-supplied decks.
- **Rewriting the v8 annotation algorithm** — `annotate.js` is locked verbatim. Geometry/color/transparency/alignment math is preserved exactly.
- **Standalone `deck-design-review` skill** — Superseded by the bundled review inside the plugin. Single canonical home.
- **Fixed cap on auto-refine cycles** — Refinement runs until the reviewer reports no genuine issues; user can interrupt or specify acceptance at the soft cap.
- **Web UI / GUI** — Slash-skill CLI surface only.
- **Real-time collaboration** — Single-user invocation model.
- **Embedded video / animations / slide transitions** — pptxgenjs static-deck output only.
- **Stock-photo bundling** — Plugin doesn't ship with imagery; user provides assets if needed.
- **PPTX → Google Slides export** — Out of scope for the plugin's deliverables.
- **`annotate.js` algorithm modifications** — VERBATIM only. The require-path patch is the single documented change, SHA-pinned post-patch.
- **Sourcevo-specific branding / single-user customization** — Public marketplace plugin; no internal Sourcevo assumptions.
- **Slide-count caps** — Decks of any length supported; performance characteristics depend on user's machine.

---

## Traceability

Phase ↔ requirement mapping (filled by roadmap, updated as phases ship):

| Phase | Phase Name | Requirements | Status |
|-------|-----------|--------------|--------|
| 1 | Plugin Foundation, Contract & CI Gates | FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07, FOUND-08, FOUND-09, FOUND-10, FOUND-11 | Pending |
| 2 | `/instadecks:annotate` | ANNO-01, ANNO-02, ANNO-03, ANNO-04, ANNO-05, ANNO-06, ANNO-07, ANNO-08, ANNO-09, ANNO-10, ANNO-11 | In Progress (9/11 — ANNO-01, ANNO-11 deferred to plan 02-04) |
| 3 | `/instadecks:review` (Design Review) | RVW-01, RVW-02, RVW-03, RVW-04, RVW-05, RVW-06, RVW-07, RVW-08, RVW-09, RVW-10, RVW-11 | Complete (11/11; Phase 7 DIST-02 finalizes RVW-01 ≥8/10 activation) |
| 4 | `/instadecks:create` Scaffold + Render Cookbook | CRT-01, CRT-02, CRT-03, CRT-04, CRT-05, CRT-06, CRT-15 | Pending |
| 5 | `/instadecks:create` Auto-Refine Loop | CRT-07, CRT-08, CRT-09, CRT-10, CRT-11, CRT-12, CRT-13, CRT-14 | Pending |
| 6 | `/instadecks:content-review` | CRV-01, CRV-02, CRV-03, CRV-04, CRV-05, CRV-06, CRV-07, CRV-08, CRV-09, CRV-10, CRV-11 | Pending |
| 7 | Marketplace Publication & Release Polish | DIST-01, DIST-02, DIST-03, DIST-04, DIST-05, DIST-06, DIST-07, DIST-08 | Pending |

**Coverage:** 67/67 v1 requirements mapped (FOUND × 11 + ANNO × 11 + RVW × 11 + CRT × 15 + CRV × 11 + DIST × 8). No orphans, no duplicates.

**Note on /create split:** The original research synthesis placed all of CRT-01..15 in a single Phase 4. Per granularity = "fine" (and per `/gsd-roadmap` instructions to isolate the highest-risk subsystem), `/create` is split into Phase 4 (scaffold + render cookbook + 8 slide types + PowerPoint compatibility gate — CRT-01..06, CRT-15) and Phase 5 (auto-refine loop, convergence rule, oscillation detection, issue ledger, soft cap, user interrupt — CRT-07..14). Content-review moves to Phase 6; marketplace to Phase 7. The original "Phase 7 — Post-Launch Hardening" is dropped from v1; its items are tracked in v2 / v1.x deferred.

---

*Last updated: 2026-04-27 after roadmap creation (7 phases, 100% coverage).*
