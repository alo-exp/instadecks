# Phase 1: Plugin Foundation, Contract & CI Gates - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a loadable, lint-clean Instadecks plugin skeleton with the JSON findings contract locked, CI gates failing loud on day-1 violations, IBM Plex Sans bundled with auto-install flow, license/NOTICE in place, and visual-regression baseline infrastructure committed — so every later phase has a stable foundation to build on.

**In scope:** FOUND-01..FOUND-11 (plugin manifest + hooks, npm install bootstrap, pptxgenjs `4.0.1` pin, findings schema doc + canonical fixture, CI gates, fonts bundling + register flow, visual-regression baseline scaffolding, Apache-2.0 license + NOTICE + per-dep licenses dir).

**Out of scope (later phases):** Bundling `annotate.js` itself (Phase 2), `/review` content + soffice race fix (Phase 3), `/create` scaffold + render cookbook (Phase 4), auto-refine loop (Phase 5), `/content-review` (Phase 6), marketplace publication + activation tests (Phase 7).

</domain>

<decisions>
## Implementation Decisions

### Font Detection + Install Flow (FOUND-10)
- **D-01 (G1):** SessionStart hook runs `fc-list | grep -qi "IBM Plex Sans"`. On miss: copy bundled OFL fonts to `~/Library/Fonts` (macOS) / `~/.local/share/fonts/` (Linux) and run `fc-cache -f`. On Windows: skip auto-install; print one warning line with manual install instructions. Write failures are non-blocking — surface as warning, do not exit non-zero.

### Hardcoded-Path Lint (FOUND-08)
- **D-02 (G2):** `tools/lint-paths.sh` runs `git ls-files -z | xargs -0 grep -nE '/Users/|~/\.claude|/home/|C:\\\\\\\\'`, **excludes** `tests/fixtures/**`, `*.md` docs, and any line containing the trailing comment `# lint-allow:hardcoded-path`. Any other match fails CI with a clear file:line diff.

### Visual Regression (FOUND-09)
- **D-03 (G3):** Two-tier comparison. Tier 1: byte-level SHA assertion of `Annotations_Sample.pptx` against `tests/fixtures/v8-reference/Annotations_Sample.pptx.sha256`. Tier 2: per-slide pixel-diff via `pixelmatch` with **0.5%** tolerance threshold (matches Phase 2 ANNO-11 parity gate). Run in CI on Linux LibreOffice. macOS-local-only is acceptable when CI artifact regenerates the reference. Phase 1 scaffolding includes the directory layout + harness; v8 reference baseline binaries are committed in Phase 1 from the user's existing v8 BluePrestige output.

### Manifest Validator (FOUND-08)
- **D-04 (G4):** `tools/validate-manifest.js` validates: (a) JSON schema shape against the Claude Code plugin manifest contract; (b) every `commands[].path`, `hooks[].path`, and `skills[].path` resolves to an existing file; (c) skill descriptions ≤ 1024 chars and start with an imperative verb. Description-quality / activation-rate scoring is **deferred to Phase 7 DIST-02**.

### License Layout (FOUND-11)
- **D-05 (G5):** `LICENSE` at root (Apache-2.0 full text + bundled-software section listing each bundled dep). `NOTICE` at root, including the explicit relicensing note: "annotate.js originally developed for internal Sourcevo use; relicensed under Apache-2.0 by the author for inclusion in this plugin." Per-bundled-dep `licenses/<dep>/LICENSE` directory (pptxgenjs, IBM Plex Sans, any transitive that requires attribution). CI license-checker step (`npx license-checker --production --failOn 'GPL;AGPL;SSPL'`) fails on copyleft; allows MIT/Apache-2.0/BSD-2/BSD-3/ISC/OFL-1.1.

### `annotate.js` SHA Integrity Test Scaffolding (locked invariant)
- **D-06 (G6):** Phase 1 creates `tests/annotate-integrity.test.js` skeleton using `node --test`. The test reads `tests/fixtures/v8-reference/annotate.js.sha256` and computes SHA-256 of `skills/annotate/scripts/annotate.js`. Phase 1 commits the test as **`it.skip`** because the source file doesn't yet exist; Phase 2 enables it after copying `annotate.js` and committing the post-patch SHA. The test file is part of Phase 1 so the integrity infrastructure exists from day 1.

### Findings Schema Version Policy (FOUND-06)
- **D-07 (G7):** `skills/review/references/findings-schema.md` defines schema `1.0`. Top-level `schema_version` field is **required**. `/annotate` adapter's contract: accept `schema_version: "1.0"`, reject unknown major versions with explicit error `"Unsupported findings schema version X.Y. /annotate supports 1.x."`. Migration adapter for `2.0+` is documented in a "Migration Policy" section but not implemented in v0.1.0.

### SessionStart Hook Posture (FOUND-03, FOUND-04)
- **D-08 (G8):** Single shell script `hooks/check-deps.sh` registered for `SessionStart`. It performs: (a) `command -v soffice / pdftoppm / node` checks plus `node --version` ≥ 18 assertion; (b) compares `package-lock.json` SHA-256 to `${CLAUDE_PLUGIN_DATA}/.npm-installed-sentinel`; if changed or missing, runs `npm ci --omit=dev` into `${CLAUDE_PLUGIN_DATA}/node_modules` and updates the sentinel; (c) prints one summary line ("Instadecks: deps OK" / "Instadecks: install complete" / "Instadecks: missing soffice — see ..."). **Always exits 0** (non-blocking per FOUND-03).

### Claude's Discretion
- Internal package layout under `tools/` (single-script vs sub-modules) — Claude chooses based on size after research.
- Exact wording of hook output messages (kept terse, prefix `Instadecks:` for grep-ability).
- Whether to use `node --test` vs Vitest for unit tests — defer to Claude based on what existing fixtures and `tools/` need; lean toward `node --test` for zero deps unless a sharper assertion library is justified.
- File names for CI workflow YAML and per-dep license folder casing — follow the convention the planner discovers in research.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project anchor docs
- `CLAUDE.md` — Locked invariants (annotate.js verbatim, pptxgenjs pin, no out-of-tree paths, severity collapse boundary, file layout)
- `silver-bullet.md` — Enforcement rules (overrides defaults; review loops, GSD ownership, third-party plugin boundary)
- `.planning/PROJECT.md` — Project context, current milestone v0.1.0, key decisions
- `.planning/REQUIREMENTS.md` §FOUND-01..11 — The 11 requirements this phase satisfies
- `.planning/ROADMAP.md` Phase 1 — Goal, success criteria, requirements mapping
- `.planning/STATE.md` — Current position, deferred items
- `HANDOFF.md` — Session pickup notes; known-unknowns to resolve in Phase 1

### Research synthesis
- `.planning/research/SUMMARY.md` — 5 critical alignment decisions (severity collapse, annotate.js verbatim, auto-refine convergence, repo locations, Phase 4/5 split)
- `.planning/research/STACK.md` — pptxgenjs 4.0.1 pin rationale, system tools, font story
- `.planning/research/FEATURES.md` — Feature surfaces and contract handoffs
- `.planning/research/ARCHITECTURE.md` — File layout per CLAUDE.md "File layout" §
- `.planning/research/PITFALLS.md` — soffice race condition (Phase 3), font fallback, Apache-2.0 redistribution gotchas

### External / upstream references
- `/Users/shafqat/Documents/Projects/Sourcevo/v5-blue-prestige/annotate.js` — Source-of-truth `annotate.js` to be SHA-snapshot in Phase 1 (file copied in Phase 2)
- Claude Code plugin manifest schema — verified at planning time via Context7 / official docs (planner to fetch latest)
- pptxgenjs 4.0.1 release notes — Verify ENUM API for Phase 4 PowerPoint compatibility gate (CRT-15)
- IBM Plex Sans SIL OFL 1.1 license text — bundle verbatim under `licenses/IBM_Plex_Sans/LICENSE`
- Apache-2.0 license text — bundle verbatim at root `LICENSE` with bundled-software section

### Schema authoritativeness
- The forthcoming `skills/review/references/findings-schema.md` (Phase 1 deliverable) is the canonical contract. All consumers (`/annotate`, `/review`, `/content-review`, `/create`) read this file directly — do not duplicate the schema in code.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- v8 BluePrestige `annotate.js` (external repo) — Phase 1 records its SHA into `tests/fixtures/v8-reference/annotate.js.sha256` so Phase 2 can plug in.
- v8 BluePrestige `Annotations_Sample.pptx` and per-slide JPGs at 150 dpi — committed under `tests/fixtures/v8-reference/` as the visual-regression reference baseline. Reference deck must be regenerable from samples.js with locked SAMPLES contract.

### Established Patterns
- **None yet** — this is the foundational phase. Plan establishes the patterns (file layout, lint scripts, CI workflow, hook scripts, license bundling) that every later phase inherits.

### Integration Points
- SessionStart hook → `hooks/check-deps.sh` (FOUND-03, FOUND-04)
- CI workflow → `.github/workflows/ci.yml` (manifest validator + path lint + version-pin assertion + license-checker + visual regression harness)
- `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_PLUGIN_DATA}` — Plugin tree boundaries; lint enforces no escapes.
- `tests/fixtures/sample-findings.json` — Canonical fixture wired into all four future skills' tests.

</code_context>

<specifics>
## Specific Ideas

- The `findings-schema.md` JSON contract must include the full 4-tier severity vocabulary (Critical / Major / Minor / Nitpick) at the producer side; the 4→3 collapse (MAJOR / MINOR / POLISH) belongs to the `/annotate` adapter only and is documented as a downstream concern in the schema.
- Auto-refine fields (`genuine`, `category`, `nx`, `ny`, `rationale`) are part of the schema in v0.1.0 even though only Phase 5 implements the loop that consumes them.
- License-checker integration uses `npx license-checker` (no global install) so CI works on a fresh clone.
- The `it.skip` pattern in `tests/annotate-integrity.test.js` is an explicit, documented bridge between Phase 1 and Phase 2 — call this out in the test's banner comment.

</specifics>

<deferred>
## Deferred Ideas

- JSON-out / exit-code mode for CI pipelines — v1.x backlog.
- Convergence diagnostics surfaced in design-rationale doc — v1.x.
- Full WCAG audit (alt-text, color-only-info checks added to `/review`) — v1.x.
- Stress-test fixtures (8 annotations per slide / max overflow) added to visual regression suite — v1.x.
- Windows path-detection in `pptx-to-images.sh` — v1.x (Windows font auto-install in this phase is also deferred to v1.x; v0.1.0 prints manual instructions).
- Schema migration adapter for `2.0+` — implementation deferred to v2; only the policy doc lands in v0.1.0.
- Description-quality / activation-rate scoring lint in manifest validator — Phase 7 DIST-02 owns this.

</deferred>

---

*Phase: 01-plugin-foundation-contract-ci-gates*
*Context gathered: 2026-04-28*
