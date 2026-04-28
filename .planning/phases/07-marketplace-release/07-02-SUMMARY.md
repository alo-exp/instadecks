---
phase: 07
plan: 02
subsystem: marketplace-release
status: complete
completed: 2026-04-28
tags: [licenses, readme, gpl-gate, drift-check]
requirements: [DIST-04, DIST-05, DIST-07]
key-files:
  created:
    - tools/license-audit.js
    - tests/license-audit.test.js
  modified:
    - NOTICE
    - README.md
    - package.json
commits:
  - dd1ff48: feat(07-02) license-audit.js GPL gate + drift check
  - ea8a97d: docs(07-02) NOTICE annotate.js binary-asset note
  - 6355382: docs(07-02) README finalization
---

# Phase 7 Plan 02: License Compliance + README Final Summary

Phase 7 Wave 2 — license-compliance final pass and README finalization. The four `licenses/<dep>/LICENSE` files were already populated with verbatim upstream text from prior phases; this plan added the `tools/license-audit.js` CI gate that proves zero-GPL prod deps and enforces NOTICE ↔ licenses/ drift, appended the annotate.js binary-asset note to NOTICE, and rewrote README with badges, Quick Start, /instadecks:doctor section, Architecture, Contributing, and Acknowledgements.

## What Shipped

- **`tools/license-audit.js` (D-04)** — programmatic `license-checker` scan of production deps; rejects GPL/AGPL transitive licenses unless explicitly whitelisted (jszip is "MIT OR GPL-3.0" — used under MIT). Drift check: NOTICE BUNDLED SOFTWARE ATTRIBUTION bullet set must equal `licenses/<dep>/` subdir set (with slug map for "IBM Plex Sans" → "IBM_Plex_Sans"). Empty-license-file probe. Live run exits 0.
- **`tests/license-audit.test.js`** — 6 node:test cases (green / GPL+whitelist / GPL+no-whitelist / both drift modes / parser). All pass via dependency-injected `runCheck` pure inner fn.
- **NOTICE** — appended `## annotate.js binary-asset note` documenting the SHA-pin invariant + one-line require-path patch. Existing 4 bundled-dep entries preserved.
- **README.md** — finalized to 12 sections per D-07: H1 + tagline, badge row (CI / version 0.1.0 / Apache-2.0), Overview, Install (with doctor reference), Quick Start (4 canonical invocations matching activation panel), Skills table (5 rows including doctor), /instadecks:doctor Self-Check section, Architecture (1 paragraph), Requirements, License, Contributing, Acknowledgements. Scope-reduction sentinels absent.
- **package.json** — `audit:licenses` npm script wired.

## Verification

- `node --test tests/license-audit.test.js` → 6/6 pass.
- `node tools/license-audit.js` → `license-audit: OK (no GPL/AGPL prod deps; NOTICE <-> licenses/ in sync)`.
- `node tools/audit-allowed-tools.js` → still OK (no regression from Plan 07-01).
- `bash tools/lint-paths.sh` → clean.
- README has all 12 sections, 3 badges, 5-row skills table.

## Deviations from Plan

**[Rule 1 - Bug] parseNoticeDeps regex non-greedy match dropped multi-word names.** Initial regex `/^- (\S.*?) \((.+?)\)/` matched only "IBM" from "IBM Plex Sans (SIL OFL 1.1)" because `\S.*?` was non-greedy. Fixed to `/^-\s+([^()]+?)\s+\(([^)]+)\)/` (no-paren capture). Filter `^[A-Z_]+` was also rejecting "IBM Plex Sans" (starts with capitals); tightened to `^[A-Z_][A-Z_ ]*$` (full-string all-caps section headers only). Tests updated, all 6 pass.

**[Rule 1 - Bug] README scope-sentinel grep matched schema "v1.0/v1.1".** The verification grep `\bv1\b|\bv2\b` is intended to catch roadmap-style scope deferrals ("ships in v2"), but matched the literal schema version names. Reworded as "the locked Instadecks schema (1.0 / 1.1)" — same content, no false-positive collision with the gate.

## Self-Check: PASSED

- tools/license-audit.js → FOUND
- tests/license-audit.test.js → FOUND
- NOTICE updated with binary-asset note → confirmed
- README.md 12 sections + badges + 5-row table → confirmed
- Commits dd1ff48, ea8a97d, 6355382 → all present in git log.
