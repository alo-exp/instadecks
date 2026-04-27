# Phase 1: Plugin Foundation, Contract & CI Gates - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 01-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 01-plugin-foundation-contract-ci-gates
**Areas discussed:** Font detection + install flow, Hardcoded-path lint scope, Visual regression comparison, Manifest validator scope, License layout, annotate.js SHA-pinning prep, Findings schema-version policy, SessionStart hook posture
**Mode:** Smart-discuss (autonomous mode) — Claude proposed batch table of recommendations grounded in CLAUDE.md locked invariants and research SUMMARY.md; user accepted all defaults in one pass.

---

## G1 — Font Detection + Install Flow (FOUND-10)

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-install on Unix-likes, manual instructions on Windows | `fc-list` check; copy to `~/Library/Fonts` (mac) / `~/.local/share/fonts` (linux) + `fc-cache -f`; non-blocking on write failure. Windows: warn + manual instructions. | ✓ |
| Detect-only with manual instructions on all platforms | Always print install command, never auto-install. | |
| Bundle within `${CLAUDE_PLUGIN_DATA}` only, no system register | Configure soffice fontconfig path to plugin data dir. | |

**User's choice:** Auto-install on Unix-likes, manual on Windows
**Rationale:** LibreOffice headless render needs system-installed fonts. One-shot UX win on the dominant platforms; Windows is rare for this plugin's audience.

---

## G2 — Hardcoded-Path Lint Scope (FOUND-08)

| Option | Description | Selected |
|--------|-------------|----------|
| All tracked text files with allowlist comment | `git ls-files \| xargs grep -nE '/Users/\|~/.claude\|/home/\|C:\\\\'`, exclude `tests/fixtures/**` and `*.md`; allow `# lint-allow:hardcoded-path` opt-out. | ✓ |
| String literals only (skip comments) | AST-level — only flag user-machine paths in code strings. | |
| Strict no-allowlist | Reject any match anywhere in tracked files. | |

**User's choice:** All tracked text files with allowlist comment
**Rationale:** Strings in comments are still leakage risk (paste-into-issue). Allowlist comment gives a documented escape hatch.

---

## G3 — Visual Regression Comparison (FOUND-09)

| Option | Description | Selected |
|--------|-------------|----------|
| Two-tier: SHA + 0.5% pixel-diff | Byte-level SHA assertion, then per-slide `pixelmatch` 0.5% threshold; CI Linux LO; mac-local-only allowed. | ✓ |
| SHA only | Strict byte-identical; reject any difference. | |
| Pixel-diff only at 0.5% | Skip SHA tier; tolerate timestamp/ID drift in PPTX bytes. | |

**User's choice:** Two-tier: SHA + 0.5% pixel-diff
**Rationale:** SHA is fastest signal; pixel-diff handles non-deterministic bytes. 0.5% aligns with ANNO-11 parity gate.

---

## G4 — Manifest Validator Scope (FOUND-08)

| Option | Description | Selected |
|--------|-------------|----------|
| Schema + path-existence + description-length | JSON shape, every referenced file exists, descriptions ≤1024 chars start with imperative verb. | ✓ |
| Schema only | Validate JSON shape against plugin contract; ignore content. | |
| Schema + activation-rate scoring | Add 10-prompt activation test inline. | |

**User's choice:** Schema + path-existence + description-length (defer activation scoring to Phase 7 DIST-02)
**Rationale:** Path-existence is the most common drift; cheap to enforce day 1. Quality scoring belongs to the Phase 7 activation gate.

---

## G5 — License Layout (FOUND-11)

| Option | Description | Selected |
|--------|-------------|----------|
| Standard SPDX layout: LICENSE + NOTICE + per-dep dir | Apache-2.0 root LICENSE with bundled-software section; NOTICE with annotate.js relicensing note; `licenses/<dep>/LICENSE`; license-checker fails on GPL/AGPL/SSPL. | ✓ |
| Single LICENSE file with embedded attributions | All third-party text concatenated into root LICENSE. | |
| `licenses/<dep>.txt` flat layout | One file per dep instead of per-dep directory. | |

**User's choice:** Standard SPDX layout
**Rationale:** Per-dep dir survives audits and matches Apache-2.0 §4(d) expectations.

---

## G6 — annotate.js SHA Integrity Test Scaffolding

| Option | Description | Selected |
|--------|-------------|----------|
| Skipped test in Phase 1, enabled in Phase 2 | `tests/annotate-integrity.test.js` exists Phase 1 as `it.skip`; Phase 2 unsuspends after copying file + recording post-patch SHA. | ✓ |
| Test only created in Phase 2 alongside the source | Defer test scaffolding to Phase 2. | |
| Inline integrity check in package.json prepare script | No dedicated test file; check at install time. | |

**User's choice:** Skipped test in Phase 1, enabled in Phase 2
**Rationale:** Locked invariant from CLAUDE.md — integrity infrastructure must exist day 1. Skipped pattern keeps Phase 1 CI green.

---

## G7 — Findings Schema-Version Policy (FOUND-06)

| Option | Description | Selected |
|--------|-------------|----------|
| Required schema_version 1.0; reject unknown major; migration policy doc only | Lock contract day 1; defer migration code to v2. | ✓ |
| Optional schema_version with sensible default | Be permissive in v0.1.0. | |
| No version field; full lock on shape | No future-proofing; require breaking change to evolve. | |

**User's choice:** Required schema_version 1.0; reject unknown major; migration policy doc only
**Rationale:** Locks contract day 1, defers code complexity. Matches HANDOFF.md guidance.

---

## G8 — SessionStart Hook Posture (FOUND-03, FOUND-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Single non-blocking script with sentinel-skip | `hooks/check-deps.sh`: dep-check + sentinel-gated `npm ci --omit=dev` + one summary line; always exits 0. | ✓ |
| Two scripts (check + install) | Separate concerns into two hook scripts. | |
| Inline shell in plugin.json | No script file; one-liner inside hooks config. | |

**User's choice:** Single non-blocking script with sentinel-skip
**Rationale:** Non-blocking is locked by FOUND-03. Sentinel avoids `npm ci` on every session. One script keeps hook surface minimal.

---

## Claude's Discretion

- Internal package layout under `tools/` (single-script vs sub-modules) — planner decides post-research.
- Exact wording of hook output messages — terse, prefix `Instadecks:`.
- Test runner choice — `node --test` unless research justifies a sharper assertion library.
- File names for CI workflow YAML and per-dep license folder casing.

## Deferred Ideas

- JSON-out / exit-code mode for CI pipelines (v1.x).
- Convergence diagnostics in design-rationale doc (v1.x).
- Full WCAG audit (v1.x).
- Stress-test fixtures (v1.x).
- Windows path-detection in pptx-to-images.sh (v1.x).
- Schema migration adapter for 2.0+ (v2 implementation; v0.1.0 ships policy doc only).
- Description-quality / activation-rate scoring (Phase 7 DIST-02).
