---
phase: 01-plugin-foundation-contract-ci-gates
plan: 08
subsystem: legal-licensing
tags: [apache-2.0, notice, license-checker, bundled-software, found-11, d-05]
requires: [01-01, 01-07]
provides:
  - "LICENSE at project root (Apache-2.0 + bundled-software section)"
  - "NOTICE at project root (D-05 relicensing note + per-dep credits)"
  - "licenses/<dep>/LICENSE per-bundled-dep directory (pptxgenjs, IBM_Plex_Sans, jszip, image-size)"
  - "Verified license-checker green on production tree (no GPL/AGPL/SSPL)"
affects: [Plan 09 CI workflow license-checker step]
tech-stack:
  added: []
  patterns: ["per-dep licenses/<dep>/LICENSE layout (lowercase-with-underscores naming)"]
key-files:
  created:
    - LICENSE
    - NOTICE
    - licenses/pptxgenjs/LICENSE
    - licenses/IBM_Plex_Sans/LICENSE
    - licenses/jszip/LICENSE
    - licenses/image-size/LICENSE
  modified: []
decisions:
  - "jszip dual-license `(MIT OR GPL-3.0-or-later)` does NOT trip license-checker --failOn 'GPL' substring filter — no --exclude flag needed in Plan 09 CI"
  - "License files use upstream verbatim text (no edits): pptxgenjs/LICENSE, image-size/LICENSE, jszip/LICENSE.markdown → renamed to LICENSE; IBM Plex Sans uses assets/fonts/IBM_Plex_Sans/OFL.txt copied to licenses/IBM_Plex_Sans/LICENSE"
metrics:
  duration: "~5 min"
  tasks_completed: 2
  files_created: 6
  completed_date: 2026-04-27
---

# Phase 1 Plan 08: Apache-2.0 LICENSE + NOTICE + per-dep licenses + license-checker Summary

Apache-2.0 LICENSE with bundled-software section, NOTICE with D-05 relicensing note for `annotate.js`, and per-bundled-dep `licenses/<dep>/LICENSE` directory landed; license-checker verified green on the production dep tree (FOUND-11 satisfied).

## What Was Built

### Task 1 — LICENSE + NOTICE (commit `41e0585`)

- **LICENSE** (214 lines): full Apache-2.0 v2.0 text downloaded verbatim from `https://www.apache.org/licenses/LICENSE-2.0.txt`, followed by a `BUNDLED SOFTWARE` separator section listing each bundled dep (pptxgenjs MIT, IBM Plex Sans OFL-1.1, jszip MIT-or-GPL-used-under-MIT, image-size MIT) with upstream URLs.
- **NOTICE**: copyright header (`Instadecks` / `Copyright 2026 Alo Labs`), the verbatim D-05 relicensing note (`annotate.js originally developed for internal Sourcevo use; relicensed under Apache-2.0 by the author for inclusion in this plugin.`), and per-bundled-dep credits with copyright lines mirroring the LICENSE bundled-software section.

### Task 2 — Per-dep licenses/ + license-checker verification (commit `c38997d`)

- Ran `npm ci` (full install incl. devDeps) at repo root to populate `node_modules/` — this is required because Plan 02's SessionStart hook installs into `${CLAUDE_PLUGIN_DATA}/node_modules` and does NOT pollute root `node_modules/`. license-checker reads from root, so the explicit `npm ci` here is mandatory (PC-11 fix).
- Populated four per-dep license files (lowercase-with-underscores naming per PATTERNS.md):
  - `licenses/pptxgenjs/LICENSE` ← `node_modules/pptxgenjs/LICENSE` (MIT, verbatim)
  - `licenses/IBM_Plex_Sans/LICENSE` ← `assets/fonts/IBM_Plex_Sans/OFL.txt` (SIL OFL 1.1, verbatim)
  - `licenses/jszip/LICENSE` ← `node_modules/jszip/LICENSE.markdown` (MIT or GPL-3.0 dual, verbatim)
  - `licenses/image-size/LICENSE` ← `node_modules/image-size/LICENSE` (MIT, verbatim)
- Ran `npx license-checker --production --failOn 'GPL;AGPL;SSPL' --summary`. **Exit 0.** Summary:
  ```
  ├─ MIT: 15
  ├─ ISC: 2
  ├─ Apache-2.0: 1
  ├─ (MIT OR GPL-3.0-or-later): 1   ← jszip; checker correctly accepts permissive side
  └─ (MIT AND Zlib): 1
  ```

## Decisions Made

- **jszip false-positive risk did not materialize.** RESEARCH.md Pitfall 2 warned that license-checker's `--failOn 'GPL'` substring match might trip on jszip's `(MIT OR GPL-3.0-or-later)` SPDX expression. It did NOT trip in this run — license-checker 25.0.1 correctly evaluates dual-licensed packages on the permissive side. **Plan 09 CI does NOT need an `--exclude` flag.** If a future bump to license-checker changes this behavior, the fix is `--exclude '(MIT OR GPL-3.0-or-later)'` — narrowly scoped to jszip's exact SPDX expression, never a blanket `GPL` exclusion.
- **License file naming.** Used `licenses/<dep>/LICENSE` (no extension on the filename, even though jszip's upstream is `LICENSE.markdown`) for consistent globbing in any future audit script. The content is verbatim Markdown — readers can render it if needed.
- **IBM_Plex_Sans directory casing.** Kept `IBM_Plex_Sans` (matches `assets/fonts/IBM_Plex_Sans/`). PATTERNS.md describes this as "lowercase-with-underscores" but the canonical asset-dir form is the source of truth and uses CamelCase-with-underscores; matching the asset dir is more important than strict lowercase since cross-references in docs and scripts hit both directories.

## Deviations from Plan

None — plan executed exactly as written. The PC-11 prerequisite (`npm ci` at root) was followed; both verify automateds passed; license-checker exited 0 with no false-positives.

## Verification

- `test -f LICENSE && grep -q "Apache License" LICENSE && grep -q "BUNDLED SOFTWARE" LICENSE`: PASS
- `test -f NOTICE && grep -q "annotate.js originally developed for internal Sourcevo use" NOTICE`: PASS
- `test -f licenses/pptxgenjs/LICENSE && test -f licenses/IBM_Plex_Sans/LICENSE && test -f licenses/jszip/LICENSE && test -f licenses/image-size/LICENSE`: PASS (all 4)
- `npm ci`: 80 packages, 0 vulnerabilities
- `npx license-checker --production --failOn 'GPL;AGPL;SSPL' --summary`: exit 0

## Success Criteria

- [x] FOUND-11: Apache-2.0 LICENSE + NOTICE + per-dep licenses/ + license-checker green
- [x] D-05 honored verbatim (relicensing note exactly as specified)
- [x] Root `node_modules` populated explicitly (Plan 02's hook does NOT cover this — handled here)

## Commits

| Hash | Subject |
|------|---------|
| `41e0585` | feat(01-08): add Apache-2.0 LICENSE + NOTICE with relicensing note |
| `c38997d` | feat(01-08): add per-dep licenses/ + verify license-checker green |

## Threat Flags

None. No new attack surface introduced; all changes are static legal text + license file copies. T-08-01 (future deps without attribution) remains a Plan 09 CI gate concern; T-08-02 (author email in NOTICE) — note: Plan 1 NOTICE uses entity name "Alo Labs" only, no email exposed.

## Self-Check: PASSED

- LICENSE: FOUND
- NOTICE: FOUND
- licenses/pptxgenjs/LICENSE: FOUND
- licenses/IBM_Plex_Sans/LICENSE: FOUND
- licenses/jszip/LICENSE: FOUND
- licenses/image-size/LICENSE: FOUND
- Commit 41e0585: FOUND
- Commit c38997d: FOUND

## EXECUTION COMPLETE
