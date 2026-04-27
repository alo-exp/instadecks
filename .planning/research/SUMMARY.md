# Project Research Summary

**Project:** Instadecks
**Domain:** Claude Code plugin shipping slash skills + bundled Node tooling for PPTX generation, design/content review, and annotation overlay
**Researched:** 2026-04-27
**Confidence:** HIGH

## Executive Summary

Instadecks is a Claude Code marketplace plugin that productizes a refined deck-building workflow into four namespaced slash skills (`/instadecks:create`, `/instadecks:review`, `/instadecks:content-review`, `/instadecks:annotate`). It is built on a small, anchored stack — pptxgenjs **pinned exactly at 4.0.1**, Node ≥ 18, and system-installed LibreOffice (`soffice`) + Poppler (`pdftoppm`) — with all logic bundled inside the plugin tree under `${CLAUDE_PLUGIN_ROOT}` so no install reaches into user-machine paths. The locked v8 BluePrestige `annotate.js` is the rendering anchor: its custom-geometry arrow math, color/transparency choices, IBM Plex Sans 7.5pt body metrics, and `BAR_TOP_OFFSET=0.027` calibration are treated as a binary asset (SHA-pinned, lint-excluded, visual-regression-gated). The plugin's distinctive moat is a four-point combination no current AI deck tool ships: (1) exhaustive design review, (2) separate content review, (3) reviewer-driven auto-refine to convergence, (4) annotation overlay as a first-class artifact, plus a sidecar design-rationale doc.

The recommended approach is contract-first build order. The single highest-leverage decision is the `/review → /annotate` JSON contract (the SAMPLES schema + severity collapse rule), and the second-highest is the auto-refine convergence rule. Both must be locked before significant code, because /create's auto-refine loop, /review's output, and /annotate's input all triangulate on the same JSON shape. The architecture is thin-skill / thick-script: SKILL.md files are agent-facing playbooks, heavy Node logic lives in `scripts/`, inter-skill handoff happens via filesystem JSON in `.planning/instadecks/<run-id>/` (mirroring topgun's pattern), and per-run state survives crashes. The auto-refine loop owner is `/create` itself (the agent runs the loop because each "is this issue genuine?" decision is a judgment call).

The dominant risks are (a) the auto-refine loop oscillating or burning tokens unboundedly, (b) any modification to `annotate.js` regressing v8 pixel-fidelity, (c) hard-coded paths or `~/.claude/` reaches breaking marketplace installs, (d) LibreOffice headless conversion races without isolated user profiles, and (e) PowerPoint strict-parser rejecting OOXML that LibreOffice forgives. Mitigations are well-known and built into Phase 1's CI gates (SHA pinning, manifest validator, hardcoded-path lint, visual regression baselines) so violations fail loud rather than ship silently. The project has no truly novel research gaps; every component is anchored in canonical sources (Anthropic plugin/skills docs, the bundled `pptx` skill, alo-labs in-house plugin precedents, the verbatim v8 source).

## Key Findings

### Recommended Stack

The stack is small and prescriptive: a single Claude Code plugin with two model-only inner skills (`design-review`, `content-review`) and four user-invocable orchestrators. pptxgenjs is the only npm runtime dependency and must be pinned exactly at 4.0.1 (the version annotate.js was calibrated against; 4.0.0 has a known table-hyperlink corruption bug; caret ranges risk silent rendering drift). LibreOffice and Poppler stay system-installed — bundling them is 300+MB and licence-incompatible — but invocation must use `-env:UserInstallation=file:///tmp/lo-${PID}` to avoid concurrent-conversion lock collisions. Node modules install into `${CLAUDE_PLUGIN_DATA}/node_modules` via a `SessionStart` hook so they survive plugin updates.

**Core technologies:**
- **Claude Code plugin spec** (current): namespaced slash skills (`/instadecks:create` etc.), `${CLAUDE_PLUGIN_ROOT}` for code paths, `${CLAUDE_PLUGIN_DATA}` for persistent state — only sane delivery channel
- **Node.js ≥ 18 (≥ 20 recommended)**: `annotate.js` and `render-deck.cjs` runtime; pptxgenjs 4.x dual ESM/CJS via `exports` field requires modern Node
- **pptxgenjs 4.0.1 (exact pin, no caret)**: PPTX rendering engine; calibrated baseline for `annotate.js` geometry
- **LibreOffice ≥ 7.4 (system-installed `soffice`)**: PPTX → PDF conversion; matches v8 BluePrestige toolchain and Anthropic-bundled `pptx` skill
- **Poppler ≥ 22 (system-installed `pdftoppm`)**: PDF → JPG rasterization at 150 DPI for subagent visual review
- **`node --test` built-in test runner**: zero-dep unit testing matching silver-bullet/topgun in-house precedent
- **alo-exp/instadecks repo + alo-labs/claude-plugins marketplace**: distribution path is the same one used by silver-bullet, topgun, multai

For full detail see `.planning/research/STACK.md`.

### Expected Features

The feature set is anchored in PROJECT.md's Active list, the existing `deck-design-review` skill, and the verbatim `annotate.js`. The bundled Anthropic `pptx` skill design-ideas guidance (10 curated palettes, 8 typography pairings, 10 anti-patterns including "NEVER use accent lines under titles") is non-negotiable and ships verbatim into `/create`'s prompt context. Severity-level system: design-review and content-review both use the **4-tier scale (Critical / Major / Minor / Nitpick)**; `annotate.js` uses a 3-tier scale (MAJOR / MINOR / POLISH). The collapse happens only at the annotation adapter — see "Critical Alignment Decisions" below.

**Must have (table stakes):**
- `/create`: 8 slide types (title / section / 2-column / comparison / data-chart / data-table / stat-callout / quote / closing), 16:9 widescreen, action-titles, page numbers, source lines, speaker notes, sidecar design rationale doc, multi-format input (md / PDF / PPTX-read-only / URL / image / transcript)
- `/review`: bundles existing deck-design-review verbatim — DECK-VDA 4-pass methodology, finding grammar `[Severity] | [Category] — [Location] — [Defect] — [Standard violated] — [Fix]`, 4-tier severity, exhaustive per-slide §3, deck-level §1 systemic findings, §4 maturity scoreboard, §5 top-10 fixes, two input modes (deck-file path OR pre-render structured deck-spec handoff)
- `/content-review`: separate v1 skill; pyramid principle / MECE structural check, action-title quality (claim not topic), narrative-arc check, claim/evidence balance, redundancy detection, audience-fit check, content-vs-design boundary preserved
- `/annotate`: bundles `annotate.js` verbatim — 3-tier severity color rail, merged-polygon arrow geometry with miter-join elbows, 50%-transparency, IBM Plex Sans 7.5pt body, MAX_SIDE=3 with above/below overflow, both PPTX and PDF overlay outputs

**Should have (competitive differentiators):**
- Auto-refine loop until reviewer reports zero genuine issues (no fixed cap; user-interruptible) — the central moat
- Sidecar design-rationale doc explaining palette / typography / motif / narrative arc — black-box generators (Gamma, Beautiful.ai) don't expose rationale
- AI-tell detection in `/review` (accent lines under titles, default blue, identical layouts repeated) — net-new addition to deck-design-review
- Curated palette guidance over template library — every deck fresh; no template debt
- Annotation overlay as separate artifact — only Figma-class tooling has comparable visual critique; no AI deck tool ships annotated overlay

**Defer (v1.x or v2+):**
- v1.x: JSON-out / exit-code mode for CI pipelines; full WCAG audit (alt-text, color-only-info — contrast already in v1 via R11); convergence diagnostics surfaced in rationale doc; speaker-rehearsal mode
- v2+: visual regression / version diff between deck versions; brand auto-detection from URL; multi-language localization; voice/tone analysis; in-deck image generation

**Anti-features (explicit exclusions):** template library, python-pptx, mutating user decks in-place, real-time collaboration, embedded video / animations / transitions, stock-photo bundling, slide-count caps, web UI / GUI, PPTX→Google Slides conversion, any rewrite of `annotate.js` geometry.

For full detail see `.planning/research/FEATURES.md`.

### Architecture Approach

Multi-skill, single-plugin layout (topgun pattern, not silver-bullet's mega-plugin). Skill-script split is deliberate: heavy Node logic in `scripts/`, SKILL.md as agent playbook. Inter-skill handoff is filesystem JSON in `.planning/instadecks/<run-id>/` per-run state directories — debuggable, crash-survivable, matches topgun precedent. Auto-refine loop owner is the `/create` skill itself (the agent runs the loop) because each "is this finding genuine?" decision is a judgment call, not pure code. The `/review → /annotate` contract is locked by `annotate.js`'s `SAMPLES` array shape (slideNum / title / annotations[{sev, nx, ny, text}]).

**Major components:**
1. **`/instadecks:create` (skill orchestrator)** — input ingestion, agent-generated `render-deck.cjs` per run, auto-refine loop control with convergence detection, default pipelining into /annotate
2. **`scripts/render-deck.cjs` (agent-generated, per-run)** — one-shot PPTX rendering using pptxgenjs with cookbook-driven layouts; not a fixed template
3. **`scripts/pptx-to-images.sh` (shared utility)** — soffice → PDF → pdftoppm → per-slide JPEG pipeline at 150 DPI; isolated user profile per call
4. **`/instadecks:review` (skill)** — DECK-VDA 4-pass methodology, finding triage (genuine vs non-genuine), nx/ny annotation positioning, JSON output to locked schema
5. **`/instadecks:content-review` (skill)** — narrative coherence, claim-evidence balance, MECE structural check; emits same finding grammar; standalone in v1 (NOT in /create's loop yet — v2 may add)
6. **`/instadecks:annotate` (skill)** — reads findings JSON, severity normalisation (4→3), SAMPLES adaptation, slide-image symlinking to `v8s-NN.jpg` names; invokes `annotate.js` verbatim
7. **`scripts/annotate.js` (bundled verbatim)** — locked v8 algorithm; SHA-pinned; lint-excluded; only one-line require-path patch documented (see Critical Alignment Decisions)
8. **`scripts/lib/run-state.js`** — atomic state.json read/write, run-id generation
9. **`hooks/check-deps.sh` (SessionStart, non-blocking)** — informs user if soffice/pdftoppm/node missing without halting session

**Critical contract:** `reviews/design-cycle-N.json` shape maps 1:1 to `annotate.js`'s `SAMPLES` array (slideNum, title, annotations[{sev, nx, ny, text}]) plus genuine flag and rationale. Schema versioned via `schema_version` field for forward migration.

For full detail see `.planning/research/ARCHITECTURE.md`.

### Critical Pitfalls

The four pitfalls below are the highest-cost-if-missed; all twelve from PITFALLS.md are addressed by the recommended phase ordering and CI gates.

1. **`annotate.js` modification destroys v8 pixel-fidelity** — Treat as binary asset: copy verbatim, apply only the documented one-line require-path patch (resolves pptxgenjs out of `${CLAUDE_PLUGIN_DATA}/node_modules` instead of `../node_modules`), SHA-pin post-patch, exclude from prettier/eslint, banner comment "VERBATIM v8 BLUE PRESTIGE — DO NOT EDIT," visual regression on every PR.
2. **Auto-refine loop oscillates or burns unbounded tokens** — Issue ledger across cycles (`{cycle, issues_found, issues_fixed, issues_intentionally_skipped}`); convergence detection (cycle N's issues ⊆ cycle N-2's = oscillation, stop); soft cap at 5 cycles surfaces "continue / accept / specify what to fix?" to user (PROJECT.md's "no fixed cap" satisfied because the user, not a hard limit, decides to continue); confirmation cycle on first-pass-clean (cycle 1 returning 0 genuine is suspicious); diff-only review after cycle 1; user-interrupt flag file checked at top of each cycle.
3. **Hardcoded paths break every install** — Lint check from day 1: `grep -r '/Users/\|~/.claude\|/home/\|C:\\\\' plugin-tree/` returns zero; all paths via `${CLAUDE_PLUGIN_ROOT}` or `${CLAUDE_PLUGIN_DATA}`; pptxgenjs bundled as real npm dependency installed by `SessionStart` hook into persistent data dir.
4. **LibreOffice concurrent conversion races silently** — `-env:UserInstallation=file:///tmp/lo-${SESSION_ID}-${PID}` per call; file-existence + size check after every `soffice` and `pdftoppm` call (don't trust exit codes — both have known silent-failure modes); 60s timeout with retry; cleanup `/tmp/lo-*` on exit; sequential conversion lock within a single session.

Other significant pitfalls handled in-phase: pptxgenjs OOXML violations rejected by PowerPoint but accepted by LibreOffice (Phase 4 release gate: open every test deck in real PowerPoint); IBM Plex Sans missing on user machine destroys `charPts` calibration (Phase 1: bundle font under SIL OFL, install on first run); skill description that doesn't trigger activation (Phase 6: 10-prompt activation test ≥ 8/10); manifest schema validation errors (Phase 1: `validate-manifest.js` in CI); Apache-2.0 LICENSE/NOTICE file mistakes (Phase 6: full Apache text + bundled-software section + `licenses/` dir per dep); `allowed-tools` permissions silent-fail in real users' permission modes (Phase 6: test in `default` and `dontAsk`, not just `bypassPermissions`).

For full detail see `.planning/research/PITFALLS.md`.

## Critical Alignment Decisions (Cross-Cutting)

These five decisions reconcile divergent signals across the four research files. Each must be locked before the relevant phase begins. They are starting points for `/gsd-roadmap`, not final answers — the roadmapper may refine wording.

### 1. Severity Mapping: 4-tier review → 3-tier annotate (LOCKED RULE)

**Convergent rule (apply at the /annotate adapter, never in `annotate.js` itself):**

| Reviewer (DECK-VDA, 4-tier) | annotate.js (3-tier) | Rationale |
|------------------------------|----------------------|-----------|
| Critical | MAJOR (orange) | Critical issues are user-blocking; collapse into the most-severe-rendered tier |
| Major | MAJOR (orange) | Both severities deserve the same visual weight in the overlay |
| Minor | MINOR (blue) | Medium-severity rail |
| Nitpick | POLISH (grey) | Lowest-severity rail |

**Implementation rules:**
- The reviewer (`/review`, `/content-review`) keeps its full 4-tier taxonomy in JSON output. The 4→3 collapse happens **only** in the `/annotate` skill's adapter step that builds the SAMPLES array — `annotate.js` itself sees only `'major' | 'minor' | 'polish'`. This preserves "annotate.js verbatim" while letting reviewers retain expressive precision.
- A12 (the highest-leverage spec decision flagged in FEATURES.md) is resolved by this rule.

### 2. annotate.js: Verbatim Algorithm + Documented Minimal Require-Path Patch

**Convergent rule:** `annotate.js` is treated as a SHA-pinned binary asset, with one — and only one — documented modification.

| Aspect | Treatment |
|--------|-----------|
| Algorithm (geometry, polygon math, charPts table, layout constants, color/transparency, miter-join logic, MAX_SIDE overflow) | **VERBATIM. No edits ever.** |
| Line 6 require: `require(path.join(__dirname, '..', 'node_modules', 'pptxgenjs'))` | **Documented one-line patch:** change to a Node-module-resolution call that finds pptxgenjs via `NODE_PATH=${CLAUDE_PLUGIN_DATA}/node_modules` (or equivalent — the skill body sets `NODE_PATH` so a plain `require('pptxgenjs')` resolves correctly). The patch is the smallest possible diff to make verbatim execute inside the plugin layout. |
| `SAMPLES` example data array (lines 107–150) | **Extracted to a separate `samples.js`** so geometry/algorithm code stays unmodified; the /annotate skill writes runtime data into a fresh JSON consumed via the same module shape. |
| Image-path expectation `v8s-NN.jpg` co-located with script | **Preserved by symlink approach:** /annotate creates a temp working dir, symlinks `deck/slides/slide-NN.jpg` → `v8s-NN.jpg` names, copies/symlinks `annotate.js` into that dir, runs `node annotate.js` with cwd set there. Naming pattern abstracted; verbatim file unchanged. |
| Banner comment | Add at top: `// VERBATIM v8 BLUE PRESTIGE — DO NOT EDIT. See PITFALLS.md.` |
| SHA pin | Recorded in `tests/annotate-integrity.test.js`. CI fails on drift. Bumping requires explicit "update annotate baseline" PR with visual-regression sign-off. |

**Reconciliation note:** STACK.md flagged the require-path; PITFALLS.md treats annotate.js as binary. Both are correct: the file is binary except for one documented minimal change, SHA-pinned post-patch.

### 3. Build Order: 7-Phase Synthesis (incorporates STACK 5-phase + ARCHITECTURE 7-phase + PITFALLS in-phase mapping)

This phase outline merges every research signal. Phase numbers are starting points for `/gsd-roadmap`; the roadmapper may rename or merge.

**Phase 1 — Plugin Foundation, Contract, and CI Gates** *(combines scaffold + contract-lock + Phase 1 pitfall mitigations)*
- Repo skeleton: `.claude-plugin/plugin.json`, `hooks/hooks.json` SessionStart dep check, `package.json` with pinned `pptxgenjs@4.0.1` + lockfile, LICENSE (Apache-2.0 + bundled-software section), NOTICE, `licenses/` dir per bundled dep, README stub, `CHANGELOG.md`
- **Contract lock:** `skills/review/references/findings-schema.md` defining JSON shape that maps 1:1 to `annotate.js`'s SAMPLES; `tests/fixtures/sample-findings.json` canonical fixture
- **CI gates from day 1:** `tools/validate-manifest.js` (manifest + frontmatter schema), hardcoded-path lint (`grep -r '/Users/|~/.claude|/home/|C:\\\\'`), pptxgenjs version pin assertion, license-checker for GPL transitive deps
- **Visual regression baselines:** `tests/fixtures/v8-reference/` with samples.js + expected `Annotations_Sample.pptx` SHA + per-slide JPGs at 150dpi
- **Font handling:** bundle IBM Plex Sans .ttf under `assets/fonts/`, add `fc-list | grep "IBM Plex Sans"` detection + first-run install/register flow
- **Pitfalls addressed:** P1 (annotate verbatim infrastructure), P3 (manifest validation), P4 (hardcoded paths), P7 (font), P9 (pptxgenjs pin), P10 (visual regression).

**Phase 2 — `/instadecks:annotate` (smallest, most-locked skill ships first)**
- Bundle `annotate.js` verbatim with the one documented require-path patch (see Decision 2)
- Build the JSON-to-SAMPLES adapter (severity collapse per Decision 1, slide-image symlink to v8s-NN.jpg names, `genuine == true` filter)
- Standalone-invocable mode (user provides findings JSON + deck path)
- Validate against `tests/fixtures/sample-findings.json` → byte-identical PPTX vs v8 reference; pixel-diff < 0.5%
- **Pitfalls addressed:** P1 (verbatim integrity test), P10 (regression test live).

**Phase 3 — `/instadecks:review` (Design Review)**
- Bundle deck-design-review skill content verbatim (DECK-VDA methodology, 4-tier severity, finding grammar, §1–§5 structure)
- Add R18 AI-tell detection (accent lines, default blue, identical-layouts-repeated)
- JSON sidecar output in locked schema; pipeline-by-default into /annotate; standalone mode
- **Soffice race fix:** `scripts/pptx-to-images.sh` uses `-env:UserInstallation=file:///tmp/lo-${SESSION_ID}-${PID}` per call; file-existence + size checks after `soffice` and `pdftoppm`; sequential conversion lock; cleanup trap
- **Pitfalls addressed:** P5 (soffice race), continued P1/P10 enforcement.

**Phase 4 — `/instadecks:create` (Auto-Refine Orchestrator)**
- Input ingestion (md / PDF / PPTX-read-only / URL / image / transcript)
- Agent-generated `render-deck.cjs` per run from pptxgenjs cookbook + design-ideas.md (10 palettes, 8 typography, 10 anti-patterns)
- All 8 slide types, 16:9, action titles, page numbers, source lines, speaker notes, sidecar design-rationale doc
- **Auto-refine loop with the convergence rule from Decision 4 below**
- Pipelines /review and /annotate by default; user-interrupt flag file
- **PowerPoint compatibility release gate:** open every test deck in real Microsoft PowerPoint; lint banning `addShape('oval', ...)` string literal (use `pres.shapes.OVAL` enum)
- **Pitfalls addressed:** P2 (auto-refine runaway), P6 (OOXML violations).

**Phase 5 — `/instadecks:content-review`**
- Pyramid Principle / MECE structural check, narrative-arc check, action-title quality (claim not topic), claim/evidence balance, redundancy detection, audience-fit, length-per-slide flags, standalone-readability test
- Same 4-tier severity + finding grammar as /review (so output can pipe into /annotate)
- Hard boundary: content-review does NOT comment on design (and vice versa)
- Standalone in v1; NOT integrated into /create's loop yet (v2 candidate)
- Independent of /create — can build in parallel after Phase 1 contract is locked

**Phase 6 — Marketplace Publication & Release Polish**
- Skill descriptions: imperative voice, keyword-front-loaded, ≤ 1024 chars, third-person, examples (10-prompt activation test ≥ 8/10 must pass)
- `allowed-tools` per skill scoped: `Bash(soffice:*)`, `Bash(pdftoppm:*)`, `Bash(node:*)`, `Bash(npm:*)`; tested in `default` + `dontAsk` modes (not just `bypassPermissions`)
- License compliance final pass: full Apache-2.0 LICENSE with bundled-software section; minimal NOTICE; `licenses/` dir for each bundled dep; `license-checker` reports zero GPL transitive deps
- Repo: `alo-exp/instadecks` (already created at github.com/alo-exp/instadecks per user's git init choice)
- Marketplace listing: PR to `alo-labs/claude-plugins` adding `instadecks` entry pointed at `alo-exp/instadecks` (org disambiguation: see Decision 5)
- README finalization: install / usage / examples / `/instadecks:doctor` self-check on first run
- `claude plugin tag --push` releases v0.1.0
- **Pitfalls addressed:** P3 (manifest validation final), P8 (skill activation), P11 (license), P12 (permissions).

**Phase 7 — Post-Launch Hardening (Optional v0.1.x)**
- JSON-out / exit-code mode for CI pipelines (D12)
- Convergence diagnostics surfaced in design-rationale doc (D18)
- Full WCAG audit (alt-text, color-only-info checks added to /review; D9 expansion)
- Stress-test fixtures (8 annotations / max overflow) added to visual regression suite
- Windows path-detection in `pptx-to-images.sh` (defer to v0.2.0 per STACK)

**Why /annotate before /create (counterintuitive but correct):** /annotate is the most constrained component (one verbatim file with locked geometry), so it has the lowest implementation risk and validates the contract earliest. If /create were built first and produced findings in a shape /annotate couldn't consume, an entire phase would be wasted. Building the consumer (/annotate) before the producer (/create's auto-refine output) is contract-first design — every component downstream of `tests/fixtures/sample-findings.json` is then tested against a known-good consumer.

### 4. Auto-Refine Convergence Rule (LOCKED)

**Convergent rule (combines ARCHITECTURE's "genuine_findings == 0 AND cycle ≥ 2" + PITFALLS' soft cap and oscillation detection + FEATURES' "no fixed cap, user-interruptible"):**

```
Loop condition: genuine_findings > 0 AND NOT user_interrupt AND NOT oscillation_detected

Convergence (clean exit):
  genuine_findings == 0 AND cycle ≥ 2
  (cycle == 1 with 0 findings is suspicious — agent reviews itself; force one
   confirmation cycle that re-renders + re-images before declaring clean)

Soft cap with user override (PROJECT.md's "no fixed cap" satisfied):
  After cycle 5, the agent stops auto-iterating and surfaces:
    "I've completed 5 refine cycles. {N} concerns remain. Continue refining,
     accept current version, or specify exactly what to fix?"
  The USER (not a hardcoded limit) chooses to continue. The cap is advisory.

Oscillation detection (forced stop):
  If cycle N's issue set ⊆ cycle N-2's issue set (same issues two cycles back),
  declare oscillation, stop, surface to user with the issue ledger:
    "I detected oscillation between cycles N-2 and N — please pick the version
     you prefer or specify what to fix manually."

User interrupt:
  Each cycle iteration first checks .planning/instadecks/<run-id>/.interrupt
  flag file. User asks Claude to stop → Claude touches the flag → next
  cycle iteration sees it and exits cleanly.

Per-cycle inputs (token discipline):
  Cycle 1: full deck review.
  Cycle 2+: review only the diff (slides that changed).
  Reviewer's "issues" must be categorized: defect | improvement | style.
  Generator only auto-fixes `defect`; surfaces `improvement` / `style` for
  user choice. (Prevents "title could be punchier" from preventing convergence.)

Issue ledger (cross-cycle memory):
  Each cycle writes structured JSON:
    { cycle, issues_found, issues_fixed, issues_intentionally_skipped }
  Generator reads previous ledger before applying fixes. If issue X was
  "intentionally_skipped" in cycle N-1, generator marks accepted, not refixes.
```

**Reconciliation note:** PROJECT.md's "no fixed cap on auto-refine cycles" is honored — the cap is not hard, it's a user-choice point. PITFALLS.md's soft-cap-with-override is the precise mechanism. ARCHITECTURE.md's confirmation-cycle on first-pass-clean is preserved. FEATURES.md's user-interruptible requirement is preserved via the flag file.

### 5. Org Disambiguation: alo-exp (repo) + alo-labs (marketplace listing)

**Status: NON-BLOCKER, already resolved.**

- The Instadecks source repository **IS at `github.com/alo-exp/instadecks`** (created during git init per the user's choice).
- The marketplace listing under `github.com/alo-labs/claude-plugins/.claude-plugin/marketplace.json` will reference `alo-exp/instadecks` via `source: { source: "github", repo: "alo-exp/instadecks" }`. This is the same pattern used by silver-bullet, topgun, and multai — alo-labs is the marketplace owner; alo-exp is the source repo org.
- STACK.md's recommendation assumes alo-exp; ARCHITECTURE.md correctly flagged the question; the answer is **the repo is at alo-exp; the marketplace listing under alo-labs/claude-plugins points to it.**
- No action required during Phase 1–5 for this. Phase 6's marketplace PR adds the alo-labs entry pointed at alo-exp.

## Implications for Roadmap

The 7-phase build order in Decision 3 above IS the recommended starting structure. It is reproduced here in the template form `/gsd-roadmap` expects, with explicit research flags.

### Phase 1: Plugin Foundation, Contract Lock, and CI Gates

**Rationale:** Nothing else can be tested without a loadable plugin, and every later phase depends on the JSON contract + visual-regression baselines + lint gates being in place. Setting up CI day-1 (manifest validator, hardcoded-path lint, font detection, pptxgenjs version pin assertion, visual regression baselines) means violations fail loud during development, not at publish time.
**Delivers:** `.claude-plugin/plugin.json`, `hooks/hooks.json`, `package.json` with pinned pptxgenjs@4.0.1, LICENSE / NOTICE / `licenses/`, `findings-schema.md` contract, `tests/fixtures/sample-findings.json`, `tests/fixtures/v8-reference/`, `tools/validate-manifest.js` in CI, IBM Plex Sans bundled.
**Addresses:** Plugin self-containment requirement (no `~/.claude/skills/` reaches), license requirements.
**Avoids:** P1 (annotate verbatim infrastructure), P3 (manifest validation), P4 (hardcoded paths), P7 (font), P9 (pptxgenjs pin), P10 (visual regression).

### Phase 2: `/instadecks:annotate`

**Rationale:** Smallest, most-constrained, most-locked component — validates the JSON contract earliest with the lowest implementation risk. Building consumer before producer prevents wasted phases.
**Delivers:** `/instadecks:annotate` skill with bundled verbatim `annotate.js` (one-line require-path patch documented), JSON-to-SAMPLES adapter implementing 4→3 severity collapse (Decision 1), slide-image symlink approach, standalone-invocable mode.
**Uses:** pptxgenjs@4.0.1 (pinned), Node ≥ 18, IBM Plex Sans (bundled in Phase 1).
**Implements:** Component 6 (`/annotate` skill) + Component 7 (`scripts/annotate.js` verbatim) from architecture.
**Avoids:** P1 (verbatim integrity test live), P10 (regression test live).

### Phase 3: `/instadecks:review` (Design Review)

**Rationale:** Builds on the locked JSON contract; can be tested standalone (deck file → JSON → annotated output via Phase 2) before the auto-refine loop is built around it. Establishes the soffice / pdftoppm pipeline that later phases depend on.
**Delivers:** `/instadecks:review` skill with DECK-VDA 4-pass methodology (bundled verbatim from existing deck-design-review skill), R18 AI-tell detection added, JSON sidecar in locked schema, pipeline-default-into-/annotate, standalone mode, `scripts/pptx-to-images.sh` with isolated user profile per call.
**Uses:** soffice (system), pdftoppm (system), the contract from Phase 1, /annotate from Phase 2.
**Implements:** Components 3 + 4 (pptx-to-images.sh, /review skill) from architecture.
**Avoids:** P5 (soffice race conditions), continued P1/P10 enforcement.

### Phase 4: `/instadecks:create` (Auto-Refine Orchestrator)

**Rationale:** The most complex skill; benefits from /review and /annotate already being known-good so the loop has reliable building blocks. Resolves the project's central differentiator (auto-refine to convergence) on top of validated dependencies.
**Delivers:** `/instadecks:create` skill with multi-format input ingestion, agent-generated `render-deck.cjs` per run, all 8 slide types, design-rationale doc output, auto-refine loop implementing Decision 4 (issue ledger, convergence detection, soft cap with user override, oscillation detection, user-interrupt flag, diff-only review after cycle 1), default pipelining into /annotate.
**Uses:** pptxgenjs cookbook patterns, Anthropic pptx skill design-ideas (10 palettes, 8 typography, 10 anti-patterns), all of Phase 2 + Phase 3.
**Implements:** Components 1 + 2 + 8 (orchestrator, render-deck.cjs, run-state.js) from architecture.
**Avoids:** P2 (auto-refine runaway — the highest-risk pitfall in the project), P6 (PowerPoint OOXML violations — release gate).

### Phase 5: `/instadecks:content-review`

**Rationale:** Independent of /create's auto-refine loop in v1 (PROJECT.md treats it as a separate skill). Can build in parallel with Phase 4 after Phase 1's contract is locked, but typically sequenced after Phase 4 because /create's design-ideas guidance informs what content-review will see.
**Delivers:** `/instadecks:content-review` skill with pyramid principle / MECE check, narrative-arc check, action-title quality (claim not topic), claim/evidence balance, redundancy detection, audience-fit check, standalone-readability test, hard content-vs-design boundary, same 4-tier severity + finding grammar as /review.
**Uses:** consulting-presentation doctrine sources, the same finding grammar as /review.
**Implements:** Component 5 from architecture.

### Phase 6: Marketplace Publication and Release Polish

**Rationale:** Distribution gate. Comes last so we ship a working artifact. Skill descriptions, permissions testing, license compliance, marketplace PR — all validated against fresh-machine install before public release.
**Delivers:** All four skills with imperative-voice keyword-front-loaded descriptions (10-prompt activation test ≥ 8/10), scoped `allowed-tools` per skill (tested in `default` + `dontAsk` modes), final license compliance (Apache-2.0 + bundled-software + `licenses/`), marketplace PR to `alo-labs/claude-plugins`, README finalization with `/instadecks:doctor` self-check, `v0.1.0` tag pushed via `claude plugin tag --push`.
**Implements:** Marketplace mechanics from architecture §10 + STACK.md repo/release flow.
**Avoids:** P3 (manifest validation final), P8 (skill activation), P11 (license non-compliance), P12 (permissions silent fail).

### Phase 7: Post-Launch Hardening (optional v0.1.x)

**Rationale:** Demand-driven additions that don't gate v0.1.0. Hardens what shipped based on real-world feedback.
**Delivers:** JSON-out / exit-code mode for CI pipelines, convergence diagnostics in design-rationale doc, alt-text + color-only-info WCAG checks in /review, stress-test fixtures, Windows path-detection.

### Phase Ordering Rationale

- **Contract-first build (Phase 1 locks the JSON schema)** — every later phase consumes or produces this contract; locking it on day 1 prevents schema-drift waste.
- **Consumer-before-producer (Phase 2 ships /annotate before /create)** — /annotate is most-locked; validating the contract through the smallest, most-constrained component catches schema mismatches early.
- **Pipeline depth before breadth (Phases 2-3-4 build /annotate, /review, /create in dependency order; Phase 5 ships /content-review in parallel after Phase 4 to avoid late-phase blocking)** — auto-refine loop in Phase 4 needs both /review and /annotate as known-good blocks.
- **CI gates from day 1 (Phase 1)** — the 12 critical pitfalls have prevention mechanisms that all live in Phase 1's CI / lint / regression infrastructure. This is non-negotiable for a project where output fidelity is the contract.
- **Release polish at the end (Phase 6)** — skill activation, permissions, license compliance, fresh-machine install — all validated against finished artifact, not in-flight code.

### Research Flags

Phases likely needing deeper research during planning (`/gsd-research-phase`):

- **Phase 4 (auto-refine loop):** **Highest priority research flag.** Convergence detection, oscillation detection, issue ledger persistence, diff-only review, token-budget pre-flight — composing all of these is the project's central technical risk. Research before implementation: Reflexion-style loop best practices in 2026, oscillation-detection heuristics from agentic-AI literature, token-budget tracking patterns. The roadmapper should plan for a research subphase that grounds the implementation against current loop-control art.
- **Phase 2 (/annotate):** **Medium priority.** Validating the symlink-based image-naming approach against verbatim `annotate.js` may surface edge cases (Windows symlink handling, race in symlink creation vs. node startup). Worth a brief research/prototyping pass.
- **Phase 6 (marketplace publication):** **Low priority but specific gotchas.** Claude Code manifest schema is unstable across CC versions (issues #46786, #30366, #1331 in PITFALLS); a quick check that the alo-labs marketplace.json schema matches the user's installed Claude Code version is worth a research subphase before the marketplace PR.

Phases with standard, well-documented patterns (skip research-phase, go straight to plan):

- **Phase 1 (foundation):** Plugin scaffold, manifest, license, hooks — extensively documented in Anthropic plugin spec; precedent in silver-bullet/topgun/multai. Standard patterns throughout.
- **Phase 3 (/review):** Bundled verbatim from existing deck-design-review skill which is already battle-tested through v8 BluePrestige; only addition is R18 AI-tell detection (covered in FEATURES.md and PITFALLS.md). Soffice race fix is well-documented (`-env:UserInstallation`).
- **Phase 5 (/content-review):** Standard consulting-presentation doctrine (McKinsey/BCG/Bain frameworks well-documented in 2026 sources); finding grammar already locked from /review.
- **Phase 7 (post-launch):** Demand-driven; research as needed per item.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All anchors verified against canonical sources; user's machine versions confirmed |
| Features | HIGH | Anchored in v8 artifacts read in full + Anthropic pptx skill (WebFetch verified) + 2026 ecosystem scans |
| Architecture | HIGH | Three in-house plugin layouts read directly + locked annotate.js (line-numbered) + 1:1 SAMPLES contract mapping |
| Pitfalls | HIGH | Most critical pitfalls verified with primary GitHub issues + direct v8 BluePrestige experience |

**Overall confidence:** HIGH

### Gaps to Address

These are not blockers; they are explicit known-unknowns to validate during implementation.

- **Exact pptxgenjs version that v8 BluePrestige was calibrated against:** STACK.md recommends 4.0.1 as it is the current `latest`. PITFALLS Pitfall 9 calls out that the exact calibration version isn't recorded. **Action:** Phase 1 should `git log` the v5-blue-prestige `package.json` (if committed) or run a quick visual-regression test of the 4.0.1 baseline against existing v8 reference outputs. If 4.0.1 produces clean diff, lock it. If not, find the specific version and pin to that.
- **annotate.js's original license posture:** The verbatim file was authored as part of v5-blue-prestige (presumably internal). Phase 1's LICENSE work needs explicit author confirmation that re-licensing under Apache-2.0 for plugin distribution is acceptable. The user is the author so this is paperwork, but should be documented in NOTICE: "annotate.js originally developed for internal Sourcevo use; relicensed under Apache-2.0 by the author for inclusion in this plugin."
- **PowerPoint compatibility surface beyond OOXML enum violations:** Pitfall 6 lists known issues but pptxgenjs has many version-specific bugs. **Action:** Phase 4's release gate (open every test deck in real Microsoft PowerPoint Mac + Windows) is the safety net.
- **Skill auto-activation rate at marketplace scale:** Pitfall 8 cites recent research showing activation is roughly a coin-flip without keyword-engineered descriptions. **Action:** Build description-iteration time into Phase 6 estimates (assume ≥ 1 iteration cycle).
- **Schema migration path if `findings-schema.md` v1 needs to evolve in v2:** The `schema_version` field is in place but the migration mechanism isn't designed yet. **Action:** Phase 1 should document the migration policy; actual migration code is post-v0.1.0.

## Sources

### Primary (HIGH confidence)

- **PROJECT.md** — `/Users/shafqat/Documents/Projects/instadecks/.planning/PROJECT.md`
- **Anthropic Claude Code plugin spec** — code.claude.com/docs/en/plugins, plugins-reference, skills, plugin-marketplaces
- **Anthropic-bundled `pptx` skill** — design-ideas guidance (10 palettes, 8 typography, 10 anti-patterns)
- **Locked v8 `annotate.js`** — `/Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/annotate.js`
- **Existing `deck-design-review` skill** — DECK-VDA methodology
- **In-house plugin precedents** — silver-bullet, topgun, superpowers (read directly from cache)
- **alo-labs marketplace** — schema, owner block, plugins array, category vocabulary
- **pptxgenjs 4.0.1** — npm registry, GitHub releases, API docs
- **pptxgenjs known issues** — #1449 PowerPoint vs LibreOffice, #597 custom polygon, #511, #370
- **Claude Code marketplace / plugin issues** — #46786, #30366, #15717, #20676, #14956, #12232, #1331
- **Apache-2.0 + SIL OFL** — apache.org, infra.apache.org licensing-howto

### Secondary (MEDIUM confidence)

- 2026 AI presentation tool ecosystem scans
- McKinsey/BCG presentation doctrine
- Self-Refine paper / DesignLab framework
- LibreOffice headless concurrent-conversion patterns
- Skill auto-activation engineering writeups

### Tertiary (LOW confidence)

- Vizzly / pixelmatch visual regression patterns
- Claude Code permissions evolution

---

*Research completed: 2026-04-27*
*Ready for roadmap: yes*
